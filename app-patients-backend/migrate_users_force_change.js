const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');

function migrateUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            console.error('users.json not found!');
            return;
        }

        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        let updatedCount = 0;

        const updatedUsers = users.map(user => {
            // Set forcePasswordChange to true for everyone
            // You might want to exclude specific admins if needed, but request said "every user"
            if (user.forcePasswordChange !== true) {
                updatedCount++;
                return { ...user, forcePasswordChange: true };
            }
            return user;
        });

        if (updatedCount > 0) {
            fs.writeFileSync(USERS_FILE, JSON.stringify(updatedUsers, null, 2));
            console.log(`Successfully updated ${updatedCount} users to force password change.`);
        } else {
            console.log('All users already have forcePasswordChange set.');
        }

    } catch (error) {
        console.error('Error migrating users:', error);
    }
}

migrateUsers();
