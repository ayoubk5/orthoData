const fs = require('fs');
const path = require('path');

const PATIENTS_FOLDER = 'H:\\Patients';

if (fs.existsSync(PATIENTS_FOLDER)) {
    const folders = fs.readdirSync(PATIENTS_FOLDER);
    folders.forEach(f => {
        const p = path.join(PATIENTS_FOLDER, f);
        const stats = fs.statSync(p);
        console.log(`${f}: Created: ${stats.birthtime}, Modified: ${stats.mtime}`);
    });
} else {
    console.log('Folder not found');
}
