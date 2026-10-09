const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || (fs.existsSync(path.join(__dirname, 'db.json')) ? path.join(__dirname, 'db.json') : path.join(__dirname, '..', 'db.json'));

// Haversine formula to calculate accurate geospatial distance in meters
function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radius of Earth in meters
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

// Helpers to read and safely write db.json
const getDb = () => {
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (err) {
        console.error('[DATABASE READ ERROR]', err);
        return {};
    }
};

const saveDb = (data) => {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('[DATABASE WRITE ERROR]', err);
        return false;
    }
};

// Helper to reliably parse JSON request body
const getRequestBody = (req) => {
    return new Promise((resolve) => {
        if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
            return resolve(req.body);
        }
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            } catch (e) {
                resolve({});
            }
        });
    });
};

module.exports = async (req, res, next) => {
    const authToken = req.header('X-Spoko-Auth');
    const secretKey = 'spoko_academy_private_access_token_8899';

    // Allow preflight CORS
    if (req.method === 'OPTIONS') {
        return next();
    }

    // Allow Render health checks and root status without auth token
    if (req.url === '/' || req.url === '/health' || req.path === '/' || req.path === '/health') {
        return next();
    }

    // Verify token
    if (authToken !== secretKey) {
        console.warn(`[SECURITY] Blocked unauthorized ${req.method} ${req.url} from ${req.ip}`);
        return res.status(403).jsonp({
            error: "Access Denied",
            message: "Unauthorized request. Direct database browsing is blocked."
        });
    }

    // -------------------------------------------------------------
    // 1. MULTI-CAMPUS GEO-FENCING ATTENDANCE VERIFICATION
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/attendance/verify-location') && req.method === 'POST') {
        try {
            const body = await getRequestBody(req);
            const { latitude, longitude, userId, branchId } = body;

            if (latitude === undefined || longitude === undefined) {
                return res.status(400).jsonp({
                    error: "Invalid Parameters",
                    message: "Latitude and Longitude are required."
                });
            }

            const db = getDb();
            const branches = db.location_settings || [];
            if (branches.length === 0) {
                return res.status(500).jsonp({ error: "No campus branches configured in location_settings." });
            }

            const userLat = parseFloat(latitude);
            const userLon = parseFloat(longitude);

            // Determine target branch
            let targetBranch = null;
            if (branchId) {
                targetBranch = branches.find(b => b.id === branchId || b.branchCode === branchId);
            }
            if (!targetBranch && userId) {
                const user = (db.users || []).find(u => u.id === userId);
                const assignedBranch = user?.details?.assignedBranchId || user?.assignedBranchId;
                if (assignedBranch) {
                    targetBranch = branches.find(b => b.id === assignedBranch || b.branchCode === assignedBranch);
                }
            }

            // If still no branch specified, match closest branch
            if (!targetBranch) {
                let closestDistance = Infinity;
                branches.forEach(b => {
                    const dist = calculateHaversineDistanceMeters(userLat, userLon, parseFloat(b.latitude), parseFloat(b.longitude));
                    if (dist < closestDistance) {
                        closestDistance = dist;
                        targetBranch = b;
                    }
                });
            }

            if (!targetBranch) targetBranch = branches[0];

            const orgLat = parseFloat(targetBranch.latitude);
            const orgLon = parseFloat(targetBranch.longitude);
            const radius = parseFloat(targetBranch.allowedRadiusMeters) || 500;
            const distanceMeters = calculateHaversineDistanceMeters(userLat, userLon, orgLat, orgLon);
            const isValid = distanceMeters <= radius;

            console.log(`[ATTENDANCE GEO-CHECK] User: ${userId || 'unknown'} | Branch: ${targetBranch.orgName} | Distance: ${distanceMeters}m | Allowed: ${radius}m | Result: ${isValid ? 'VALID' : 'REJECTED'}`);

            return res.jsonp({
                success: true,
                valid: isValid,
                distanceMeters,
                allowedRadiusMeters: radius,
                matchedBranch: {
                    id: targetBranch.id,
                    orgName: targetBranch.orgName,
                    branchCode: targetBranch.branchCode,
                    latitude: orgLat,
                    longitude: orgLon
                },
                allBranches: branches.map(b => ({
                    id: b.id,
                    orgName: b.orgName,
                    branchCode: b.branchCode,
                    allowedRadiusMeters: b.allowedRadiusMeters
                })),
                userLocation: { latitude: userLat, longitude: userLon },
                message: isValid
                    ? `Attendance marked successfully at ${targetBranch.orgName}.`
                    : `Outside permitted radius for ${targetBranch.orgName} (${distanceMeters}m away, allowed: ${radius}m).`
            });
        } catch (err) {
            console.error('[ATTENDANCE GEO-CHECK ERROR]', err);
            return res.status(500).jsonp({ error: "Location validation error", details: err.message });
        }
    }

    // -------------------------------------------------------------
    // 2. ASSESSMENT PRE-FLIGHT CHECK & ATTEMPT INITIALIZATION
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/assessment/start-check') && req.method === 'POST') {
        try {
            const body = await getRequestBody(req);
            const { userId, examId } = body;

            const db = getDb();
            const user = (db.users || []).find(u => u.id === userId);
            const exam = (db.exams || []).find(e => String(e.id) === String(examId));

            if (!user) {
                return res.status(404).jsonp({ allowed: false, message: "User account not found." });
            }
            if (user.status && user.status !== 'active') {
                return res.status(403).jsonp({ allowed: false, message: `Account is not active (${user.status}). Access denied.` });
            }
            if (!exam || (exam.status && exam.status.toLowerCase() !== 'active')) {
                return res.status(404).jsonp({ allowed: false, message: "Assessment does not exist or is currently inactive." });
            }

            // Check department assignment
            const studentDept = user.department || user.details?.department || 'General';
            if (exam.department && exam.department !== 'Generic' && exam.department !== 'All' && exam.department !== studentDept) {
                // If not assigned to this department
                // allow if user is admin, else block
                if (user.role !== 'admin') {
                    return res.status(403).jsonp({ allowed: false, message: `This assessment is reserved for ${exam.department} Department students.` });
                }
            }

            const attempts = db.assessment_attempts || [];
            const userExamAttempts = attempts.filter(a => a.userId === userId && String(a.examId) === String(examId));

            // 1. Check for Active / In-Progress Attempt (Prevent concurrent attempts / support state recovery)
            const activeAttempt = userExamAttempts.find(a => a.status === 'in_progress');
            if (activeAttempt) {
                const now = Date.now();
                const expectedEnd = new Date(activeAttempt.expected_end_at).getTime();
                const remainingSeconds = Math.max(0, Math.floor((expectedEnd - now) / 1000));

                if (remainingSeconds <= 0) {
                    // Time has expired while away -> Mark expired
                    activeAttempt.status = 'time_expired';
                    activeAttempt.submitted_at = new Date().toISOString();
                    saveDb(db);
                } else {
                    // Resume active attempt
                    console.log(`[ASSESSMENT] Resuming active attempt ${activeAttempt.id} for user ${userId}. Remaining: ${remainingSeconds}s`);
                    return res.jsonp({
                        allowed: true,
                        isResume: true,
                        attempt: activeAttempt,
                        remainingSeconds,
                        maxViolations: activeAttempt.max_security_violations || exam.max_security_violations || 3,
                        message: "Resuming active test session."
                    });
                }
            }

            // 2. Check Attempt Limits
            const completedAttemptsCount = userExamAttempts.filter(a => a.status === 'completed' || a.status === 'violation_terminated' || a.status === 'time_expired').length;
            const maxAttemptsAllowed = exam.max_attempts || 3;

            if (completedAttemptsCount >= maxAttemptsAllowed && user.role !== 'admin') {
                return res.status(403).jsonp({
                    allowed: false,
                    reason: 'ATTEMPT_LIMIT_EXCEEDED',
                    message: `You have reached the maximum attempt limit (${maxAttemptsAllowed}) for this assessment.`
                });
            }

            // 3. Create New Secure Attempt
            const durationMinutes = exam.duration || 30;
            const startedAt = new Date();
            const expectedEndAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
            const maxViolations = exam.max_security_violations || 3;

            const newAttempt = {
                id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                userId: user.id,
                userName: user.name,
                examId: exam.id,
                examTitle: exam.title,
                totalQuestions: (exam.questions || []).length,
                started_at: startedAt.toISOString(),
                expected_end_at: expectedEndAt.toISOString(),
                status: 'in_progress',
                violationsCount: 0,
                max_security_violations: maxViolations,
                answers: {}
            };

            db.assessment_attempts = db.assessment_attempts || [];
            db.assessment_attempts.push(newAttempt);

            // Audit Log
            db.security_logs = db.security_logs || [];
            db.security_logs.push({
                id: Date.now(),
                userId: user.id,
                assessmentId: exam.id,
                attemptId: newAttempt.id,
                eventType: 'ASSESSMENT_STARTED',
                status: 'IN_PROGRESS',
                details: `Started assessment: "${exam.title}" in secure proctor mode`,
                timestamp: startedAt.toISOString()
            });

            saveDb(db);

            console.log(`[ASSESSMENT] Created attempt ${newAttempt.id} for user ${userId}. Duration: ${durationMinutes}m`);

            return res.jsonp({
                allowed: true,
                isResume: false,
                attempt: newAttempt,
                remainingSeconds: durationMinutes * 60,
                maxViolations,
                message: "Assessment started successfully in secure mode."
            });
        } catch (err) {
            console.error('[ASSESSMENT START CHECK ERROR]', err);
            return res.status(500).jsonp({ allowed: false, message: "Internal assessment start error: " + err.message });
        }
    }

    // -------------------------------------------------------------
    // 3. INCREMENTAL ANSWER PERSISTENCE (STATE RECOVERY)
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/assessment/save-answer') && req.method === 'POST') {
        try {
            const body = await getRequestBody(req);
            const { userId, attemptId, questionId, selectedOption } = body;

            const db = getDb();
            const attempt = (db.assessment_attempts || []).find(a => a.id === attemptId);

            if (!attempt) {
                return res.status(404).jsonp({ success: false, message: "Attempt not found." });
            }
            if (attempt.userId !== userId) {
                return res.status(403).jsonp({ success: false, message: "Unauthorized attempt modification." });
            }
            if (attempt.status !== 'in_progress') {
                return res.status(400).jsonp({ success: false, message: "Attempt is already closed." });
            }

            attempt.answers = attempt.answers || {};
            attempt.answers[questionId] = selectedOption;
            attempt.lastSavedAt = new Date().toISOString();

            saveDb(db);
            return res.jsonp({ success: true, savedAnswersCount: Object.keys(attempt.answers).length });
        } catch (err) {
            console.error('[SAVE ANSWER ERROR]', err);
            return res.status(500).jsonp({ success: false, error: err.message });
        }
    }

    // -------------------------------------------------------------
    // 4. ASSESSMENT SECURITY VIOLATION RECORDING
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/assessment/record-violation') && req.method === 'POST') {
        try {
            const body = await getRequestBody(req);
            const { userId, attemptId, examId, violationType, details } = body;

            const db = getDb();
            const attempt = (db.assessment_attempts || []).find(a => a.id === attemptId);

            if (!attempt || attempt.userId !== userId) {
                return res.status(403).jsonp({ success: false, message: "Unauthorized attempt access." });
            }

            attempt.violationsCount = (attempt.violationsCount || 0) + 1;
            const maxViolations = attempt.max_security_violations || 3;
            const isTerminated = attempt.violationsCount >= maxViolations;

            // Log event
            db.security_logs = db.security_logs || [];
            db.security_logs.push({
                id: Date.now(),
                userId,
                assessmentId: examId,
                attemptId,
                eventType: violationType || 'SECURITY_VIOLATION',
                status: isTerminated ? 'TERMINATED' : 'VIOLATION',
                details: `${details || violationType} (Violation count: ${attempt.violationsCount}/${maxViolations})`,
                timestamp: new Date().toISOString()
            });

            if (isTerminated) {
                attempt.status = 'violation_terminated';
                attempt.submitted_at = new Date().toISOString();
            }

            saveDb(db);

            console.warn(`[SECURITY VIOLATION] User ${userId} on Attempt ${attemptId}: ${violationType} (${attempt.violationsCount}/${maxViolations})`);

            return res.jsonp({
                success: true,
                violationsCount: attempt.violationsCount,
                maxViolations,
                isTerminated,
                message: isTerminated ? "Max violations exceeded. Assessment auto-terminated." : "Violation recorded."
            });
        } catch (err) {
            console.error('[RECORD VIOLATION ERROR]', err);
            return res.status(500).jsonp({ success: false, error: err.message });
        }
    }

    // -------------------------------------------------------------
    // 5. SERVER-SIDE RESULT CALCULATION & SUBMISSION
    // -------------------------------------------------------------
    if (req.url.startsWith('/api/assessment/submit') && req.method === 'POST') {
        try {
            const body = await getRequestBody(req);
            const { userId, attemptId, answers = {}, submissionType = 'manual' } = body;

            const db = getDb();
            const attempt = (db.assessment_attempts || []).find(a => a.id === attemptId);

            if (!attempt) {
                return res.status(404).jsonp({ success: false, message: "Attempt not found." });
            }
            if (attempt.userId !== userId) {
                return res.status(403).jsonp({ success: false, message: "Ownership validation failed: Attempt does not belong to user." });
            }

            const exam = (db.exams || []).find(e => String(e.id) === String(attempt.examId));
            if (!exam) {
                return res.status(404).jsonp({ success: false, message: "Associated assessment not found." });
            }

            // 1. Timer Validation on Server
            const now = Date.now();
            const expectedEnd = new Date(attempt.expected_end_at).getTime();
            // 60-second grace buffer for network latency
            const isTimeExpired = now > (expectedEnd + 60000);
            let finalSubmissionType = submissionType;
            if (isTimeExpired && finalSubmissionType !== 'violation_limit_reached') {
                finalSubmissionType = 'time_expired';
            }

            // 2. Merge answers: Saved on server + Final submit payload
            const mergedAnswers = { ...(attempt.answers || {}), ...answers };

            // 3. Accurate Server-Side Result Calculation
            const questions = exam.questions || [];
            const totalQuestions = questions.length;
            let correctCount = 0;
            let attemptedCount = 0;

            questions.forEach(q => {
                const userAns = mergedAnswers[q.id];
                if (userAns !== undefined && userAns !== null && userAns !== '') {
                    attemptedCount++;
                    if (Number(userAns) === Number(q.correctAnswer)) {
                        correctCount++;
                    }
                }
            });

            const incorrectCount = attemptedCount - correctCount;
            const unansweredCount = totalQuestions - attemptedCount;
            const scorePercentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

            // 4. Update Attempt Record
            const submittedAt = new Date().toISOString();
            attempt.status = finalSubmissionType === 'violation_limit_reached' ? 'violation_terminated' : 'completed';
            attempt.submitted_at = submittedAt;
            attempt.answers = mergedAnswers;
            attempt.score = scorePercentage;

            // 5. Create Result Record
            const user = (db.users || []).find(u => u.id === userId);
            const resultRecord = {
                id: Date.now(),
                attemptId: attempt.id,
                examId: exam.id,
                examTitle: exam.title,
                userId: user?.id || userId,
                studentName: user?.name || 'Student',
                score: scorePercentage,
                percentage: scorePercentage,
                totalQuestions,
                attemptedQuestions: attemptedCount,
                correctAnswers: correctCount,
                incorrectAnswers: incorrectCount,
                unansweredQuestions: unansweredCount,
                submissionType: finalSubmissionType,
                violationsCount: attempt.violationsCount || 0,
                submittedAt,
                date: submittedAt
            };

            db.results = db.results || [];
            db.results.push(resultRecord);

            // 6. Security Logging
            db.security_logs = db.security_logs || [];
            db.security_logs.push({
                id: Date.now() + 1,
                userId,
                assessmentId: exam.id,
                attemptId: attempt.id,
                eventType: finalSubmissionType === 'manual' ? 'ASSESSMENT_SUBMITTED' : 'AUTO_SUBMITTED',
                status: finalSubmissionType === 'violation_limit_reached' ? 'TERMINATED' : 'SUCCESS',
                details: `Assessment submitted (${finalSubmissionType}). Server-computed score: ${scorePercentage}% (${correctCount}/${totalQuestions} correct)`,
                timestamp: submittedAt
            });

            saveDb(db);

            console.log(`[ASSESSMENT SUBMITTED] User: ${userId} | Exam: ${exam.title} | Score: ${scorePercentage}% | Reason: ${finalSubmissionType}`);

            return res.jsonp({
                success: true,
                result: resultRecord
            });
        } catch (err) {
            console.error('[ASSESSMENT SUBMIT ERROR]', err);
            return res.status(500).jsonp({ success: false, message: "Submission calculation error: " + err.message });
        }
    }

    // Pass through standard json-server CRUD
    next();
};
