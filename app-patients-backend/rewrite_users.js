const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, 'users.json');

async function rewriteUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            console.error('❌ users.json not found!');
            return;
        }

        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        console.log(`Found ${users.length} users. Rewriting...`);

        const updatedUsers = [];

        for (const user of users) {
            const plainPassword = `${user.username}123`;
            const hashedPassword = await bcrypt.hash(plainPassword, 10);

            updatedUsers.push({
                ...user,
                password: hashedPassword,
                realPassword: plainPassword,
                forcePasswordChange: true // Optional: force them to change it again if needed, or remove if not
            });

            console.log(`✅ Updated ${user.username} -> Password: ${plainPassword}`);
        }

        fs.writeFileSync(USERS_FILE, JSON.stringify(updatedUsers, null, 2));
        console.log(`\n🎉 Successfully rewrote ${updatedUsers.length} users with real passwords.`);

    } catch (error) {
        console.error('❌ Error rewriting users:', error);
    }
}

rewriteUsers();
