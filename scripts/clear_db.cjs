const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = ['db.json', 'db-1773154307020.json'];

files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (data.exams) data.exams = [];
            if (data.questions) data.questions = [];
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`Cleared exams and questions in ${file}`);
        } catch (e) {
            console.error(`Error processing ${file}: ${e}`);
        }
    }
});
