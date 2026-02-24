const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const SURGEONS_LIST_PATH = path.join(__dirname, '../src/constants/surgeonsList.js');
const USERS_FILE = path.join(__dirname, 'users.json');

const ADMIN_PASSWORD = 'admin123';
const USER_PASSWORD = 'users123';

async function createUsers() {
    try {
        // 1. Read Surgeons List
        const surgeonsListContent = fs.readFileSync(SURGEONS_LIST_PATH, 'utf8');

        // Extract names using regex to avoid module issues
        // Matches strings inside single or double quotes inside the array
        const regex = /['"](Pr\.|Dr\.)\s+([^'"]+)['"]/g;
        let match;
        const surgeons = [];

        while ((match = regex.exec(surgeonsListContent)) !== null) {
            surgeons.push({
                prefix: match[1], // "Pr." or "Dr."
                fullName: match[2] // "TEBBAA EL HASSALI Achraf"
            });
        }

        console.log(`Found ${surgeons.length} surgeons.`);

        // 2. Read Existing Users
        let users = [];
        if (fs.existsSync(USERS_FILE)) {
            users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }

        let nextId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
        let newUsersCount = 0;

        // 3. Process Each Surgeon
        for (const surgeon of surgeons) {
            const fullString = `${surgeon.prefix} ${surgeon.fullName}`;

            // Parse Name for Username
            // "TEBBAA EL HASSALI Achraf" -> parts: ["TEBBAA", "EL", "HASSALI", "Achraf"]
            const nameParts = surgeon.fullName.trim().split(/\s+/);
            const firstName = nameParts[nameParts.length - 1]; // "Achraf"
            const lastNameParts = nameParts.slice(0, nameParts.length - 1); // ["TEBBAA", "EL", "HASSALI"]
            const lastName = lastNameParts.join(''); // "TEBBAAELHASSALI"

            // Username: First letter of First Name + Last Name
            const username = (firstName.charAt(0) + lastName).toUpperCase();

            // Determine Role
            let role = 'user';
            if (surgeon.prefix === 'Pr.') {
                role = 'admin';
            } else if (fullString.includes('Dr. SEBBAR Abdessabour')) {
                role = 'admin';
            }

            // Check if user already exists
            if (users.find(u => u.username === username)) {
                console.log(`Skipping existing user: ${username} (${fullString})`);
                continue;
            }

            // Hash Password
            const passwordPlain = role === 'admin' ? ADMIN_PASSWORD : USER_PASSWORD;
            const passwordHash = await bcrypt.hash(passwordPlain, 10);

            const newUser = {
                id: nextId++,
                username: username,
                password: passwordHash,
                role: role,
                fullName: fullString
            };

            users.push(newUser);
            newUsersCount++;
            console.log(`Created user: ${username} (${role}) - ${fullString}`);
        }

        // 4. Save Users
        if (newUsersCount > 0) {
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            console.log(`\nSuccessfully added ${newUsersCount} new users.`);
        } else {
            console.log('\nNo new users to add.');
        }

    } catch (error) {
        console.error('Error creating users:', error);
    }
}

createUsers();
