/**
 * Smart Question & Option Parser for Examination Documents (PDF / DOCX)
 * Accurately extracts questions, options (A, B, C, D), and detects answer keys.
 */
export const parseQuestionsFromText = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return [];

    // Normalize line endings and clean non-printable characters
    const cleanText = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\u00A0/g, ' ')
        .replace(/\t/g, '    ');

    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
    const questions = [];
    let currentQ = null;

    // Pattern for Question Start:
    // Matches: 1. , 1) , Q1. , Q.1 , Question 1: , (1) , 1 - , Question 1.
    const qStartRegex = /^(?:(?:Q(?:uestion)?\s*[\.:#\-]?\s*\d+)|(?:\d+[\.\)\:\-])|(?:\(\d+\)))\s*(.*)/i;

    // Pattern for Answer Key Line:
    // Matches: Ans: A, Answer: (B), Correct Option: C, Ans = 2, Key: D, Answer: 1
    const ansKeyRegex = /^(?:Ans(?:wer)?|Correct\s*(?:Option|Answer)?|Key)\s*[:\-\=]\s*\(?([A-Da-d1-4])\)?/i;

    // Pattern to test if a line starts with a single option:
    // Matches: A) , A. , (A) , a) , a. , (a) , 1) , (1)
    const optStartRegex = /^(?:([A-Da-d1-4])[\.\)\:\-]|(?:\(([A-Da-d1-4])\)))\s*(.*)/;

    const finalizeCurrent = (q) => {
        if (!q || !q.text || q.text.trim().length === 0) return null;

        let qText = q.text.trim();
        let opts = q.options ? [...q.options] : [];

        // If no options were captured on separate lines, check if options were placed inline in question text
        if (opts.length < 2) {
            const matches = [...qText.matchAll(/(?:^|\s+)(?:([A-Da-d])[\.\)]|\(([A-Da-d])\))\s+([^A-Da-d\(\)]+)/g)];
            if (matches.length >= 2) {
                const firstMatchIndex = qText.search(/(?:^|\s+)(?:([A-Da-d])[\.\)]|\(([A-Da-d])\))/);
                if (firstMatchIndex > 0) {
                    qText = qText.substring(0, firstMatchIndex).trim();
                }
                opts = matches.map(m => (m[3] || '').trim()).filter(Boolean);
            }
        }

        // Clean option strings
        opts = opts.map(o => o.trim()).filter(Boolean);

        // Ensure 4 options
        while (opts.length < 4) {
            opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
        }

        return {
            id: Date.now() + Math.random().toString(36).substring(2, 7),
            text: qText,
            options: opts.slice(0, 4),
            correctAnswer: (typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer <= 3) ? q.correctAnswer : 0,
            hasAutoAnswer: q.hasAutoAnswer || false,
            type: 'MCQ',
            marks: 1
        };
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 1. Check Answer Key line
        const ansMatch = line.match(ansKeyRegex);
        if (ansMatch && currentQ) {
            const char = (ansMatch[1] || '').toUpperCase();
            let cIdx = 0;
            if (char === 'A' || char === '1') cIdx = 0;
            else if (char === 'B' || char === '2') cIdx = 1;
            else if (char === 'C' || char === '3') cIdx = 2;
            else if (char === 'D' || char === '4') cIdx = 3;
            currentQ.correctAnswer = cIdx;
            currentQ.hasAutoAnswer = true;
            continue;
        }

        // 2. Check Question Start
        const qMatch = line.match(qStartRegex);
        const hasFinishedOptions = currentQ && (currentQ.hasAutoAnswer || currentQ.options.length >= 4);
        const isLikelyOption = currentQ && !hasFinishedOptions && currentQ.options.length > 0 && currentQ.usesNumericOptions && /^[1-4][\.\)\:\-]/.test(line);

        if (qMatch && (!isLikelyOption || hasFinishedOptions)) {
            if (currentQ) {
                const fin = finalizeCurrent(currentQ);
                if (fin) questions.push(fin);
            }
            currentQ = {
                text: qMatch[1] || '',
                options: [],
                correctAnswer: 0,
                hasAutoAnswer: false,
                usesNumericOptions: false
            };
            continue;
        }

        // 3. Check for multiple inline options on a single line (e.g. (A) Apple (B) Banana (C) Orange (D) Mango)
        const splitPositions = [];
        let match;
        const testRegex = /(?:^|\s{2,}|\t|\s+)(?:([A-Da-d])[\.\)]|\(([A-Da-d])\))\s+/g;
        while ((match = testRegex.exec(line)) !== null) {
            splitPositions.push({
                index: match.index,
                letter: (match[1] || match[2]).toUpperCase(),
                matchLength: match[0].length
            });
        }

        if (splitPositions.length >= 2 && currentQ) {
            for (let s = 0; s < splitPositions.length; s++) {
                const start = splitPositions[s].index + splitPositions[s].matchLength;
                const end = (s + 1 < splitPositions.length) ? splitPositions[s + 1].index : line.length;
                const optVal = line.substring(start, end).trim();
                if (optVal) {
                    currentQ.options.push(optVal);
                }
            }
            continue;
        }

        // 4. Check Single Option Start on this line
        const optMatch = line.match(optStartRegex);
        if (optMatch && currentQ && !currentQ.hasAutoAnswer && currentQ.options.length < 4) {
            const optIndicator = (optMatch[1] || optMatch[2] || '').trim();
            if (/^[1-4]$/.test(optIndicator)) {
                currentQ.usesNumericOptions = true;
            }
            const optText = optMatch[3] || '';
            currentQ.options.push(optText);
            continue;
        }

        // 5. Append continuation text to question or last option
        if (currentQ) {
            if (currentQ.options.length === 0) {
                currentQ.text += (currentQ.text ? ' ' : '') + line;
            } else {
                const lastIdx = currentQ.options.length - 1;
                currentQ.options[lastIdx] += ' ' + line;
            }
        }
    }

    if (currentQ) {
        const fin = finalizeCurrent(currentQ);
        if (fin) questions.push(fin);
    }

    // Fallback if no questions matched the numbered regex
    if (questions.length === 0) {
        const sentences = rawText.split(/[.!?\n]/).filter(s => s.trim().length > 25);
        sentences.slice(0, 30).forEach((sentence, idx) => {
            questions.push({
                id: Date.now() + idx,
                text: sentence.trim(),
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswer: 0,
                hasAutoAnswer: false,
                type: 'MCQ',
                marks: 1
            });
        });
    }

    return questions;
};
