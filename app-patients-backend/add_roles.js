const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, 'users.json');

const addUsers = async () => {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            console.error("users.json introuvable !");
            return;
        }

        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

        const newUsers = [
            {
                username: 'Thesard',
                passwordPlain: 'trauma123',
                role: 'thesard',
                fullName: 'Thésard'
            },
            {
                username: 'secretaire',
                passwordPlain: 'secret123',
                role: 'secretaire',
                fullName: 'Secrétaire'
            }
        ];

        let addedCount = 0;

        for (const newUser of newUsers) {
            // Check if exists
            const exists = users.find(u => u.username === newUser.username);
            if (exists) {
                console.log(`L'utilisateur ${newUser.username} existe déjà.`);
            } else {
                const hashedPassword = await bcrypt.hash(newUser.passwordPlain, 10);
                const id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;

                users.push({
                    id: id,
                    username: newUser.username,
                    password: hashedPassword,
                    role: newUser.role,
                    fullName: newUser.fullName,
                    forcePasswordChange: false,
                    realPassword: newUser.passwordPlain // Storing plain for recovery as per previous pattern
                });
                console.log(`Ajout de l'utilisateur ${newUser.username}...`);
                addedCount++;
            }
        }

        if (addedCount > 0) {
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
            console.log("✅ Fichier users.json mis à jour avec succès.");
        } else {
            console.log("Aucune modification nécessaire.");
        }

    } catch (error) {
        console.error("Erreur:", error);
    }
};

addUsers();
