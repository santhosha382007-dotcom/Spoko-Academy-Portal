const CLOUD_API_URL = 'https://spoko-academy-portal-2.onrender.com';
const API_PORT = 3001;

// Production Cloud API endpoint (hidden internally)
const getBaseUrl = () => {
    return CLOUD_API_URL;
};

const fetchWithTimeout = async (resource, options = {}, retries = 1) => {
    const { timeout = 45000, ...restOptions } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    // Security Token to prevent unauthorized network access
    const SECURITY_TOKEN = 'spoko_academy_private_access_token_8899';

    try {
        const response = await fetch(resource, {
            ...restOptions,
            headers: {
                ...restOptions.headers,
                'X-Spoko-Auth': SECURITY_TOKEN
            },
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (err) {
        clearTimeout(id);
        if (retries > 0 && (err.name === 'AbortError' || err.message?.includes('fetch') || err.message?.includes('network'))) {
            console.warn(`[API] Retrying fetch for ${resource} after cold start delay...`);
            return fetchWithTimeout(resource, options, retries - 1);
        }
        throw err;
    }
}

export const api = {
    // Users
    getUsers: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/users`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetUsers Error:", e);
            throw { type: 'CONNECTION_ERROR', url: `${getBaseUrl()}/users`, original: e };
        }
    },
    getUserById: async (id) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/users/${id}`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error(`API GetUserById ${id} Error:`, e);
            throw e;
        }
    },
    getUsersByRole: async (role) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/users?role=${role}`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetUsersByRole Error:", e);
            throw e;
        }
    },
    createUser: async (user) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API Create User Error:", e);
            throw e;
        }
    },
    updateUser: async (id, data) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/users/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API Update User Error:", e);
            throw e;
        }
    },
    deleteUser: async (id) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/users/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        } catch (e) {
            console.error("API Delete User Error:", e);
            throw e;
        }
    },

    // Exams
    getExams: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/exams`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetExams Error:", e);
            throw { type: 'CONNECTION_ERROR', url: `${getBaseUrl()}/exams`, original: e };
        }
    },
    getExamById: async (id) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/exams/${id}`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error(`API GetExamById ${id} Error:`, e);
            throw e;
        }
    },
    createExam: async (exam) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/exams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(exam)
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API CreateExam Error:", e);
            throw e;
        }
    },
    deleteExam: async (id) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/exams/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        } catch (e) {
            console.error("API DeleteExam Error:", e);
            throw e;
        }
    },
    getExamsByCategory: async (category) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/exams?category=${encodeURIComponent(category)}`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetExamsByCategory Error:", e);
            throw e;
        }
    },

    // Questions (Global Bank)
    getQuestions: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/questions`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetQuestions Error:", e);
            throw { type: 'CONNECTION_ERROR', url: `${getBaseUrl()}/questions`, original: e };
        }
    },
    createQuestion: async (question) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(question)
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API CreateQuestion Error:", e);
            throw e;
        }
    },
    updateQuestion: async (id, question) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/questions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(question)
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API UpdateQuestion Error:", e);
            throw e;
        }
    },
    deleteQuestion: async (id) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/questions/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        } catch (e) {
            console.error("API DeleteQuestion Error:", e);
            throw e;
        }
    },

    // Results
    getResults: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/results`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetResults Error:", e);
            throw { type: 'CONNECTION_ERROR', url: `${getBaseUrl()}/results`, original: e };
        }
    },
    getResultsByUserId: async (userId) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/results?userId=${userId}`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetResultsByUserId Error:", e);
            throw e;
        }
    },
    getResultsByExamId: async (examId) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/results?examId=${examId}`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetResultsByExamId Error:", e);
            throw e;
        }
    },
    saveResult: async (result) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result)
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API SaveResult Error:", e);
            throw e;
        }
    },

    // Attendance
    getAttendance: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/attendance`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const data = await res.json();
            const attObj = {};
            if (Array.isArray(data)) {
                data.forEach(d => {
                    attObj[d.id] = d.records;
                });
            }
            return attObj;
        } catch (e) {
            console.error("API GetAttendance Error:", e);
            throw { type: 'CONNECTION_ERROR', url: `${getBaseUrl()}/attendance`, original: e };
        }
    },
    saveAttendance: async (date, records) => {
        try {
            // Check if exists
            const checkRes = await fetchWithTimeout(`${getBaseUrl()}/attendance/${date}`);
            if (checkRes.ok) {
                // Update
                const res = await fetchWithTimeout(`${getBaseUrl()}/attendance/${date}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ records })
                });
                if (!res.ok) throw new Error(`Update failed: ${res.status} ${res.statusText}`);
            } else {
                // Create
                const res = await fetchWithTimeout(`${getBaseUrl()}/attendance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: date, records })
                });
                if (!res.ok) throw new Error(`Create failed: ${res.status} ${res.statusText}`);
            }
        } catch (e) {
            console.error("API SaveAttendance Error:", e);
            throw e;
        }
    },

    // Schedules
    getSchedules: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/schedules`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetSchedules Error:", e);
            throw { type: 'CONNECTION_ERROR', url: `${getBaseUrl()}/schedules`, original: e };
        }
    },
    saveSchedule: async (schedule) => {
        try {
            const method = schedule.id ? 'PUT' : 'POST';
            const url = schedule.id ? `${getBaseUrl()}/schedules/${schedule.id}` : `${getBaseUrl()}/schedules`;
            const res = await fetchWithTimeout(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(schedule)
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API SaveSchedule Error:", e);
            throw e;
        }
    },
    deleteSchedule: async (id) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/schedules/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        } catch (e) {
            console.error("API DeleteSchedule Error:", e);
            throw e;
        }
    },

    // Requests (Teacher Edit Requests)
    getRequests: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/requests`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetRequests Error:", e);
            throw e;
        }
    },
    createRequest: async (request) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...request,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                })
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API CreateRequest Error:", e);
            throw e;
        }
    },
    updateRequest: async (id, data) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API UpdateRequest Error:", e);
            throw e;
        }
    },

    // Announcements
    getAnnouncements: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/announcements`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetAnnouncements Error:", e);
            throw e;
        }
    },
    createAnnouncement: async (announcement) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/announcements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...announcement,
                    createdAt: new Date().toISOString()
                })
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API CreateAnnouncement Error:", e);
            throw e;
        }
    },

    // Unitedsoft Location Settings (Multi-Campus Support)
    getLocationSettings: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/location_settings`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const data = await res.json();
            return Array.isArray(data) ? data : [data];
        } catch (e) {
            console.error("API GetLocationSettings Error:", e);
            return [
                {
                    id: 'branch-main',
                    orgName: 'Spoko Academy - Main Campus',
                    branchCode: 'MAIN',
                    latitude: 11.3410,
                    longitude: 77.7172,
                    allowedRadiusMeters: 500,
                    isDefault: true
                }
            ];
        }
    },
    createLocationBranch: async (branch) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/location_settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...branch,
                    updatedAt: new Date().toISOString()
                })
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API CreateLocationBranch Error:", e);
            throw e;
        }
    },
    updateLocationBranch: async (id, branch) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/location_settings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...branch,
                    updatedAt: new Date().toISOString()
                })
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API UpdateLocationBranch Error:", e);
            throw e;
        }
    },
    deleteLocationBranch: async (id) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/location_settings/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return true;
        } catch (e) {
            console.error("API DeleteLocationBranch Error:", e);
            throw e;
        }
    },
    updateLocationSettings: async (settings) => {
        try {
            const id = settings.id || 'branch-main';
            const res = await fetchWithTimeout(`${getBaseUrl()}/location_settings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...settings,
                    updatedAt: new Date().toISOString()
                })
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API UpdateLocationSettings Error:", e);
            throw e;
        }
    },
    verifyAttendanceLocation: async () => {
        return { success: true, valid: true, message: 'GPS attendance check disabled.' };
    },

    // Attendance Records (Rich Geo Logs)
    getAttendanceRecords: async (userId = null) => {
        try {
            const url = userId
                ? `${getBaseUrl()}/attendance_records?userId=${userId}`
                : `${getBaseUrl()}/attendance_records`;
            const res = await fetchWithTimeout(url);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetAttendanceRecords Error:", e);
            return [];
        }
    },
    recordAttendanceLog: async (record) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/attendance_records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...record,
                    createdAt: new Date().toISOString()
                })
            });
            if (!res.ok) throw new Error(`Server responded with ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API RecordAttendanceLog Error:", e);
            throw e;
        }
    },

    // Security Logs & Auditing
    createSecurityLog: async (log) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/security_logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...log,
                    timestamp: new Date().toISOString()
                })
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.warn("API CreateSecurityLog Error (non-blocking):", e);
            return null;
        }
    },
    getSecurityLogs: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/security_logs`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetSecurityLogs Error:", e);
            return [];
        }
    },

    // Session Management
    createSession: async (session) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...session,
                    createdAt: new Date().toISOString(),
                    lastActiveAt: new Date().toISOString(),
                    status: 'active'
                })
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.warn("API CreateSession Error:", e);
            return null;
        }
    },
    deleteSession: async (sessionId) => {
        try {
            await fetchWithTimeout(`${getBaseUrl()}/sessions/${sessionId}`, { method: 'DELETE' });
        } catch (e) {
            console.warn("API DeleteSession Error:", e);
        }
    },
    getSessions: async (userId = null) => {
        try {
            const url = userId ? `${getBaseUrl()}/sessions?userId=${userId}` : `${getBaseUrl()}/sessions`;
            const res = await fetchWithTimeout(url);
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            return [];
        }
    },

    // Assessment Attempts & Anti-Cheating Tracking
    createAssessmentAttempt: async (attempt) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/assessment_attempts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...attempt,
                    startedAt: new Date().toISOString(),
                    status: 'in_progress',
                    violationsCount: 0,
                    violations: []
                })
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.warn("API CreateAssessmentAttempt Error:", e);
            return null;
        }
    },
    updateAssessmentAttempt: async (id, data) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/assessment_attempts/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.warn("API UpdateAssessmentAttempt Error:", e);
            return null;
        }
    },
    getAssessmentAttempts: async (userId = null, examId = null) => {
        try {
            let url = `${getBaseUrl()}/assessment_attempts`;
            const params = [];
            if (userId) params.push(`userId=${userId}`);
            if (examId) params.push(`examId=${examId}`);
            if (params.length > 0) url += `?${params.join('&')}`;

            const res = await fetchWithTimeout(url);
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            console.warn("API GetAssessmentAttempts Error:", e);
            return [];
        }
    },
    // Phase 2 Assessment Engine APIs
    checkAndStartAssessment: async (params) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/api/assessment/start-check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            const data = await res.json();
            return data;
        } catch (e) {
            console.error("API CheckAndStartAssessment Error:", e);
            throw e;
        }
    },
    saveAssessmentAnswer: async (params) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/api/assessment/save-answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            return await res.json();
        } catch (e) {
            console.warn("API SaveAssessmentAnswer non-blocking error:", e);
            return null;
        }
    },
    recordAssessmentViolation: async (params) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/api/assessment/record-violation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            return await res.json();
        } catch (e) {
            console.warn("API RecordAssessmentViolation non-blocking error:", e);
            return null;
        }
    },
    submitAssessmentBackend: async (params) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/api/assessment/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Submission failed with status ${res.status}`);
            }
            return await res.json();
        } catch (e) {
            console.error("API SubmitAssessmentBackend Error:", e);
            throw e;
        }
    },

    // -------------------------------------------------------------
    // Departments Management (5 Academy Departments)
    // -------------------------------------------------------------
    getDepartments: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/departments`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetDepartments Error:", e);
            return [
                { id: 'dept-railway', name: 'Railway', code: 'RLY', description: 'Railway examination preparation', active: true },
                { id: 'dept-ssc', name: 'SSC', code: 'SSC', description: 'SSC examination preparation', active: true },
                { id: 'dept-gd', name: 'GD', code: 'GD', description: 'GD examination preparation', active: true },
                { id: 'dept-4', name: 'Department 4', code: 'DEPT4', description: "Replace with academy's actual fourth department", active: true },
                { id: 'dept-5', name: 'Department 5', code: 'DEPT5', description: "Replace with academy's actual fifth department", active: true }
            ];
        }
    },
    createDepartment: async (dept) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/departments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dept)
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API CreateDepartment Error:", e);
            throw e;
        }
    },
    updateDepartment: async (id, data) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/departments/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API UpdateDepartment Error:", e);
            throw e;
        }
    },
    deleteDepartment: async (id) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/departments/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
        } catch (e) {
            console.error("API DeleteDepartment Error:", e);
            throw e;
        }
    },

    // -------------------------------------------------------------
    // Leave Management (Admin & Student direct control)
    // -------------------------------------------------------------
    getLeaveRequests: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/leave_requests`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetLeaveRequests Error:", e);
            return [];
        }
    },
    getLeaveRequestsByUserId: async (userId) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/leave_requests?userId=${userId}`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetLeaveRequestsByUserId Error:", e);
            return [];
        }
    },
    createLeaveRequest: async (leaveData) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/leave_requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leaveData)
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API CreateLeaveRequest Error:", e);
            throw e;
        }
    },
    updateLeaveRequest: async (id, updateData) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/leave_requests/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API UpdateLeaveRequest Error:", e);
            throw e;
        }
    },
    deleteLeaveRequest: async (id) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/leave_requests/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
        } catch (e) {
            console.error("API DeleteLeaveRequest Error:", e);
            throw e;
        }
    },

    // Leave Balances
    getLeaveBalances: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/leave_balances`);
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            return [];
        }
    },
    getLeaveBalanceByUserId: async (userId) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/leave_balances?userId=${userId}`);
            if (!res.ok) return null;
            const list = await res.json();
            return list.length > 0 ? list[0] : null;
        } catch (e) {
            return null;
        }
    },
    saveLeaveBalance: async (balanceRecord) => {
        try {
            if (balanceRecord.id) {
                const res = await fetchWithTimeout(`${getBaseUrl()}/leave_balances/${balanceRecord.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(balanceRecord)
                });
                return await res.json();
            } else {
                const res = await fetchWithTimeout(`${getBaseUrl()}/leave_balances`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(balanceRecord)
                });
                return await res.json();
            }
        } catch (e) {
            console.error("API SaveLeaveBalance Error:", e);
            return null;
        }
    },

    // -------------------------------------------------------------
    // Audit Logs (Administrative and Security History)
    // -------------------------------------------------------------
    getAuditLogs: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/audit_logs`);
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("API GetAuditLogs Error:", e);
            return [];
        }
    },
    createAuditLog: async (logEntry) => {
        try {
            const payload = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                timestamp: new Date().toISOString(),
                ...logEntry
            };
            const res = await fetchWithTimeout(`${getBaseUrl()}/audit_logs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            console.warn("API CreateAuditLog non-blocking error:", e);
            return null;
        }
    },

    // -------------------------------------------------------------
    // Question Import Batches (PDF Import Tracking)
    // -------------------------------------------------------------
    getQuestionImportBatches: async () => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/question_import_batches`);
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            return [];
        }
    },
    createQuestionImportBatch: async (batch) => {
        try {
            const res = await fetchWithTimeout(`${getBaseUrl()}/question_import_batches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch)
            });
            return await res.json();
        } catch (e) {
            console.error("API CreateQuestionImportBatch Error:", e);
            return null;
        }
    }
};
