const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const { exec } = require('child_process');
const os = require('os');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_super_securise';
const TEMPLATE_FC_PATH = path.join(__dirname, 'templates', 'Fiche Confidentielle.docx');
const TEMPLATE_SP_PATH = path.join(__dirname, 'templates', 'Sortie provisoire.docx');

// 🛑 Configuration du Chemin Absolu 🛑
let DESKTOP_PATH = process.env.DESKTOP_PATH;

if (!DESKTOP_PATH) {
    console.error("\n=======================================================");
    console.error("ERREUR CRITIQUE: DESKTOP_PATH n'est pas défini dans .env.");
    console.error("Veuillez vérifier que le fichier .env existe et contient DESKTOP_PATH=<votre chemin absolu>");
    console.error("=======================================================\n");
    process.exit(1);
}

// Normaliser le chemin pour s'assurer qu'il est correct (important pour Windows)
DESKTOP_PATH = path.normalize(DESKTOP_PATH);

// Chemin absolu vers le dossier "Patients"
const PATIENTS_FOLDER = path.join(DESKTOP_PATH, 'Patients');

// Chemin vers le template Word
const TEMPLATE_PATH = path.join(__dirname, 'templates', 'CR.docx');
const TEMPLATE_CONSENT_PATH = path.join(__dirname, 'templates', 'consent.docx');

// Fichier pour stocker les utilisateurs
const USERS_FILE = path.join(__dirname, 'users.json');
// Fichier pour stocker les logs de suppression
const DELETED_LOGS_FILE = path.join(__dirname, 'deleted_logs.json');
// Fichier pour les statistiques des médicaments
const MEDICAMENT_STATS_FILE = path.join(__dirname, 'medicament_stats.json');
// Fichier pour le programme opératoire
const PROGRAMME_FILE = path.join(__dirname, 'programme_operatoire.json');
const { generateGalleryHTML } = require('./galleryTemplate');
const serveIndex = require('serve-index'); // Gardé si besoin en fallback ou supprimé si non utilisé

// CONFIGURATION DU "FAUX" EXPLORATEUR WEB
// Cela rend le dossier accessible via http://10.4.28.11:5000/explorer/
app.use('/explorer',
    express.static(PATIENTS_FOLDER), // Permet de télécharger/voir les fichiers
    (req, res, next) => {
        // Middleware personnalisé pour lister les fichiers avec une galerie
        try {
            // Décoder l'URL pour gérer les espaces et accents
            const reqPath = decodeURIComponent(req.path);
            const fullPath = path.join(PATIENTS_FOLDER, reqPath);

            // Sécurité : Empêcher de remonter au-dessus du dossier Patients
            if (!fullPath.startsWith(PATIENTS_FOLDER)) {
                return res.status(403).send("Accès interdit");
            }

            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
                const html = generateGalleryHTML(req.path, fullPath);
                res.send(html);
            } else {
                next(); // Si ce n'est pas un dossier, laisser express gérer (normalement 404 ici si static l'a pas pris)
            }
        } catch (error) {
            console.error("Erreur Explorer:", error);
            res.status(500).send("Erreur lors de l'affichage du dossier");
        }
    }
);
// Middleware
app.use(cors());
app.use(express.json());


/**
 * Formate une date au format DD-MM-YYYY
 * @param {string|Date} dateInput - Date à formater (peut être une string ISO, Date object, ou format DD/MM/YYYY)
 * @returns {string} Date formatée en DD-MM-YYYY
 */
const formatDateDDMMYYYY = (dateInput) => {
    if (!dateInput) return '';

    let date;

    // Si c'est déjà une string au format DD-MM-YYYY ou DD/MM/YYYY
    if (typeof dateInput === 'string') {
        // Format DD-MM-YYYY ou DD/MM/YYYY
        if (dateInput.match(/^\d{2}[-/]\d{2}[-/]\d{4}$/)) {
            return dateInput.replace(/\//g, '-');
        }

        // Format YYYY-MM-DD (ISO)
        if (dateInput.match(/^\d{4}-\d{2}-\d{2}/)) {
            date = new Date(dateInput);
        } else {
            date = new Date(dateInput);
        }
    } else if (dateInput instanceof Date) {
        date = dateInput;
    } else {
        return '';
    }

    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
        return dateInput.toString(); // Retourner la valeur originale si invalide
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
};

/**
 * Enregistre une suppression dans le fichier de logs
 */
const logDeletion = (type, name, performedBy) => {
    try {
        let logs = [];
        if (fs.existsSync(DELETED_LOGS_FILE)) {
            logs = JSON.parse(fs.readFileSync(DELETED_LOGS_FILE, 'utf8'));
        }

        const newLog = {
            id: Date.now(),
            type, // 'Patient', 'Admission', 'User'
            name,
            date: new Date().toLocaleString(),
            performedBy: performedBy || 'Inconnu'
        };

        logs.unshift(newLog); // Ajouter au début
        fs.writeFileSync(DELETED_LOGS_FILE, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error("Erreur lors du logging de la suppression:", error);
    }
};

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: "Token d'accès requis" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: "Token invalide" });
        }
        req.user = user;
        next();
    });
};

// Middleware pour vérifier le rôle admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: "Accès réservé aux administrateurs" });
    }
    next();
};

// --- CONFIGURATION DE MULTER ---
const upload = multer();

// --- FONCTION UTILITAIRE POUR TROUVER LE CHEMIN DU DOSSIER CIBLE ---
const getPatientSubPath = (patientName, targetFolder, targetSubFolder = '') => {
    const basePatientPath = path.join(PATIENTS_FOLDER, patientName);
    let finalPath = path.join(basePatientPath, targetFolder);

    if (targetSubFolder) {
        finalPath = path.join(finalPath, targetSubFolder);
    }

    finalPath = path.normalize(finalPath);

    if (!fs.existsSync(finalPath)) {
        console.error(`Erreur: Dossier cible inexistant pour l'upload: ${finalPath}`);
        return null;
    }

    return finalPath;
};

const deleteOldDocuments = (folderPath, filePrefix) => {
    try {
        if (!fs.existsSync(folderPath)) {
            return { deleted: 0, files: [] };
        }

        const files = fs.readdirSync(folderPath);
        const filesToDelete = files.filter(file =>
            file.startsWith(filePrefix) && file.endsWith('.docx')
        );

        let deletedCount = 0;
        const deletedFiles = [];

        filesToDelete.forEach(file => {
            const filePath = path.join(folderPath, file);
            try {
                fs.unlinkSync(filePath);
                deletedCount++;
                deletedFiles.push(file);
                console.log(`🗑️ Ancien fichier supprimé : ${file}`);
            } catch (err) {
                console.error(`❌ Erreur suppression ${file}:`, err);
            }
        });

        return { deleted: deletedCount, files: deletedFiles };
    } catch (error) {
        console.error('Erreur lors de la suppression des anciens fichiers:', error);
        return { deleted: 0, files: [] };
    }
};

// Initialiser le fichier users s'il n'existe pas
const initializeUsersFile = () => {
    if (!fs.existsSync(USERS_FILE)) {
        const defaultUsers = [
            {
                id: 1,
                username: 'admin',
                password: bcrypt.hashSync('admin123', 10),
                role: 'admin',
                fullName: 'Administrateur Principal'
            },
            {
                id: 2,
                username: 'medecin',
                password: bcrypt.hashSync('medecin123', 10),
                role: 'user',
                fullName: 'Dr. Medecin Test'
            }
        ];
        fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
        console.log('✅ Fichier users.json créé avec les comptes par défaut');
    }
};

app.post('/api/users/create', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { username, password, role, fullName } = req.body;

        if (!username || !password || !role || !fullName) {
            return res.status(400).json({
                success: false,
                error: "Tous les champs sont requis"
            });
        }

        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

        if (users.find(u => u.username === username)) {
            return res.status(400).json({
                success: false,
                error: "Ce nom d'utilisateur existe déjà"
            });
        }

        const newUser = {
            id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
            username,
            password: await bcrypt.hash(password, 10),
            role,
            fullName
        };

        users.push(newUser);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

        res.json({
            success: true,
            message: "Utilisateur créé avec succès",
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
                fullName: newUser.fullName
            }
        });

    } catch (error) {
        console.error("Erreur création utilisateur:", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la création de l'utilisateur"
        });
    }
});

app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
    try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const usersWithoutPasswords = users.map(user => ({
            id: user.id,
            username: user.username,
            role: user.role,
            fullName: user.fullName
        }));

        res.json({ success: true, users: usersWithoutPasswords });
    } catch (error) {
        console.error("Erreur liste utilisateurs:", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la récupération des utilisateurs"
        });
    }
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));

        const initialLength = users.length;
        users = users.filter(u => u.id !== userId);

        if (users.length === initialLength) {
            return res.status(404).json({
                success: false,
                error: "Utilisateur non trouvé."
            });
        }

        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

        // Log la suppression
        logDeletion('Utilisateur', `ID: ${userId}`, req.user.fullName || req.user.username);

        res.json({ success: true, message: "Utilisateur supprimé avec succès." });

    } catch (error) {
        console.error("Erreur suppression utilisateur:", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la suppression de l'utilisateur."
        });
    }
});

// ----------------------------------------------------------------
// ROUTES PATIENTS - MODIFIÉES POUR KEYWORDS
// ----------------------------------------------------------------

app.post('/api/patients/create', authenticateToken, (req, res) => {
    try {
        const { nom, prenom, diagnostics, motsCles = [], ...rest } = req.body;

        const nomPatient = `${prenom}_${nom}`;
        const patientPath = path.join(PATIENTS_FOLDER, nomPatient);

        console.log(`\n--- TENTATIVE DE CRÉATION DE DOSSIER ---`);
        console.log(`Dossier Patient Cible: ${patientPath}`);

        if (!fs.existsSync(PATIENTS_FOLDER)) {
            fs.mkdirSync(PATIENTS_FOLDER, { recursive: true });
        }
        if (!fs.existsSync(patientPath)) {
            fs.mkdirSync(patientPath);
        }

        const dossiersPrincipaux = [
            "Images cliniques",
            "Bilans Paracliniques",
            "Images scopiques",
            "Images per-Op",
            "Radiographie Post-Op",
            "Autres"
        ];

        dossiersPrincipaux.forEach(d => {
            const dPath = path.join(patientPath, d);
            if (!fs.existsSync(dPath)) {
                fs.mkdirSync(dPath);
            }
        });

        const sousDossiersRadio = ["Bilan Biologique", "Radio", "TDM", "IRM"];
        const radiologiePath = path.join(patientPath, "Bilans Paracliniques");

        sousDossiersRadio.forEach(sub => {
            const subPath = path.join(radiologiePath, sub);
            if (!fs.existsSync(subPath)) {
                fs.mkdirSync(subPath);
            }
        });

        const filePath = path.join(patientPath, "infos_patient.txt");

        const diagnosticsContent = diagnostics.map(d =>
            `   - [${d.date}] : ${d.description}`
        ).join('\n');

        // 🔥 AJOUT : Formatage des mots-clés
        const motsClesContent = motsCles.length > 0
            ? motsCles.join(', ')
            : 'Aucun';

        const contenu =
            `Nom: ${nom}\n` +
            `Prénom: ${prenom}\n` +
            `Né le: ${rest.neLe}\n` +
            `Âge: ${rest.age}\n` +
            `Adresse: ${rest.adresse}\n` +
            `Sexe: ${rest.sexe}\n` +
            `Téléphone: ${rest.telephone}\n` +
            `Téléphone2: ${rest.telephone2}\n` +
            `N° Dossier: ${rest.nDossier}\n` +
            `Hôpital: ${rest.hopital}\n` +
            `Chirurgien: ${rest.chirurgien}\n` +
            `Cin: ${rest.cin}\n` +
            `Date de consultation: ${rest.dateConsultation}\n` +
            `Nom Opération: ${rest.nomOperation || ''}\n` + // 🔥 AJOUT ICI
            `--- Historique des Diagnostics ---\n${diagnosticsContent}\n` +
            `--- Mots Clés ---\n${motsClesContent}\n` +
            `Date de création: ${new Date().toLocaleString()}`;

        fs.writeFileSync(filePath, contenu);
        console.log(`Fichier 'infos_patient.txt' créé dans ${patientPath}`);

        res.json({
            success: true,
            message: "Patient et dossiers créés avec succès",
            dossierName: nomPatient
        });
    } catch (error) {
        console.error("Erreur LORS de la création du patient:", error.message);
        res.status(500).json({
            success: false,
            error: `Erreur serveur lors de la création du dossier: ${error.message}`
        });
    }
});

app.put('/api/patients/update', authenticateToken, (req, res) => {
    try {
        const { originalPatientName, nom, prenom, diagnostics, motsCles = [], ...rest } = req.body;

        if (!originalPatientName) {
            return res.status(400).json({
                success: false,
                error: "Nom du patient original requis"
            });
        }

        const oldPatientPath = path.join(PATIENTS_FOLDER, originalPatientName);

        if (!fs.existsSync(oldPatientPath)) {
            return res.status(404).json({
                success: false,
                error: "Dossier patient introuvable"
            });
        }

        const newPatientName = `${prenom}_${nom}`;
        const newPatientPath = path.join(PATIENTS_FOLDER, newPatientName);

        if (originalPatientName !== newPatientName) {
            if (fs.existsSync(newPatientPath)) {
                return res.status(400).json({
                    success: false,
                    error: "Un patient avec ce nom existe déjà"
                });
            }
            fs.renameSync(oldPatientPath, newPatientPath);
            console.log(`Dossier renommé: ${originalPatientName} -> ${newPatientName}`);
        }

        const filePath = path.join(newPatientPath, "infos_patient.txt");

        const diagnosticsContent = diagnostics.map(d =>
            `   - [${d.date}] : ${d.description}`
        ).join('\n');

        // 🔥 AJOUT : Formatage des mots-clés
        const motsClesContent = motsCles.length > 0
            ? motsCles.join(', ')
            : 'Aucun';

        const contenu =
            `Nom: ${nom}\n` +
            `Prénom: ${prenom}\n` +
            `Né le: ${rest.neLe}\n` +
            `Âge: ${rest.age}\n` +
            `Adresse: ${rest.adresse}\n` +
            `Sexe: ${rest.sexe}\n` +
            `Téléphone: ${rest.telephone}\n` +
            `Téléphone2: ${rest.telephone2}\n` +
            `N° Dossier: ${rest.nDossier}\n` +
            `Hôpital: ${rest.hopital}\n` +
            `Chirurgien: ${rest.chirurgien}\n` +
            `Cin: ${rest.cin}\n` +
            `Date de consultation: ${rest.dateConsultation}\n` +
            `Nom Opération: ${rest.nomOperation || ''}\n` + // 🔥 AJOUT ICI
            `--- Historique des Diagnostics ---\n${diagnosticsContent}\n` +
            `--- Mots Clés ---\n${motsClesContent}\n` +
            `Dernière modification: ${new Date().toLocaleString()}`;

        fs.writeFileSync(filePath, contenu);
        console.log(`Fichier 'infos_patient.txt' mis à jour dans ${newPatientPath}`);

        res.json({
            success: true,
            message: "Patient mis à jour avec succès",
            newFolderName: newPatientName
        });

    } catch (error) {
        console.error("Erreur lors de la mise à jour du patient:", error);
        res.status(500).json({
            success: false,
            error: `Erreur serveur: ${error.message}`
        });
    }
});

app.get('/api/patients', authenticateToken, (req, res) => {
    try {
        if (!fs.existsSync(PATIENTS_FOLDER)) {
            return res.json({ success: true, patients: [] });
        }

        const patients = fs.readdirSync(PATIENTS_FOLDER);
        const patientsList = [];

        patients.forEach(patientFolder => {
            const infoPath = path.join(PATIENTS_FOLDER, patientFolder, 'infos_patient.txt');

            if (fs.existsSync(infoPath)) {
                try {
                    const content = fs.readFileSync(infoPath, 'utf8');
                    const lines = content.split('\n');
                    const patientData = {
                        nom: patientFolder.split('_')[1] || '',
                        prenom: patientFolder.split('_')[0] || '',
                        nDossier: '',
                        hopital: '',
                        chirurgien: '',
                        age: '',
                        cin: '',
                        sexe: '',
                        adresse: '',
                        telephone: '',
                        telephone2: '',
                        neLe: '',
                        dateConsultation: '',
                        diagnostic: '',
                        diagnostics: [], // 🔥 AJOUT : Tableau de diagnostics structuré
                        motsCles: []
                    };

                    let isInDiagnosticSection = false;
                    let isInMotsClesSection = false;
                    let diagnosticLines = [];

                    lines.forEach(line => {
                        if (line.includes('--- Historique des Diagnostics ---')) {
                            isInDiagnosticSection = true;
                            isInMotsClesSection = false;
                            return;
                        }

                        if (line.includes('--- Mots Clés ---')) {
                            isInDiagnosticSection = false;
                            isInMotsClesSection = true;
                            return;
                        }

                        // 🔥 PARSER les mots-clés
                        if (isInMotsClesSection) {
                            if (line.trim() && !line.includes('Date de création') && !line.includes('Dernière modification')) {
                                const motsClesStr = line.trim();
                                if (motsClesStr !== 'Aucun') {
                                    patientData.motsCles = motsClesStr.split(',').map(k => k.trim());
                                }
                            }
                            return;
                        }

                        // 🔥 PARSER les diagnostics (format: "   - [DD-MM-YYYY] : Description")
                        if (isInDiagnosticSection) {
                            if (line.trim() &&
                                !line.includes('Date de création') &&
                                !line.includes('Dernière modification') &&
                                !line.includes('--- Mots Clés ---')) {

                                diagnosticLines.push(line);

                                // Extraire la date et la description
                                const match = line.match(/\[([^\]]+)\]\s*:\s*(.+)/);
                                if (match) {
                                    patientData.diagnostics.push({
                                        date: match[1].trim(),
                                        description: match[2].trim()
                                    });
                                }
                            }
                        } else if (!isInMotsClesSection) {
                            // Parser les autres champs
                            if (line.includes('Nom:')) patientData.nom = line.split('Nom:')[1].trim();
                            if (line.includes('Prénom:')) patientData.prenom = line.split('Prénom:')[1].trim();
                            if (line.includes('N° Dossier:')) patientData.nDossier = line.split('N° Dossier:')[1].trim();
                            if (line.includes('Hôpital:')) patientData.hopital = line.split('Hôpital:')[1].trim();
                            if (line.includes('Chirurgien:')) patientData.chirurgien = line.split('Chirurgien:')[1].trim();
                            if (line.includes('Âge:')) patientData.age = line.split('Âge:')[1].trim();
                            if (line.includes('Cin:')) patientData.cin = line.split('Cin:')[1].trim();

                            if (line.toLowerCase().includes('sexe:')) {
                                const parts = line.split(':');
                                if (parts.length > 1) {
                                    patientData.sexe = parts[1].trim();
                                }
                            }

                            if (line.includes('Adresse:')) patientData.adresse = line.split('Adresse:')[1].trim();
                            if (line.includes('Téléphone:') && !line.includes('Téléphone2:')) {
                                patientData.telephone = line.split('Téléphone:')[1].trim();
                            }
                            if (line.includes('Téléphone2:')) patientData.telephone2 = line.split('Téléphone2:')[1].trim();
                            if (line.includes('Né le:')) patientData.neLe = line.split('Né le:')[1].trim();
                            if (line.includes('Date de consultation:')) {
                                patientData.dateConsultation = line.split('Date de consultation:')[1].trim();
                            }
                            // 🔥 AJOUT ICI
                            if (line.includes('Nom Opération:')) {
                                patientData.nomOperation = line.split('Nom Opération:')[1].trim();
                            }
                        }
                    });

                    // 🔥 CORRECTION : Créer le string diagnostic pour l'affichage
                    patientData.diagnostic = diagnosticLines.join('\n');

                    // 🔥 AJOUT : Date de création du dossier (pour le tri)
                    const folderStats = fs.statSync(path.join(PATIENTS_FOLDER, patientFolder));
                    patientData.createdAt = folderStats.birthtime;

                    patientsList.push(patientData);
                } catch (e) {
                    console.error('Erreur parsing patient:', e);
                }
            }
        });

        // 🔥 TRI : Du plus récent au plus ancien
        patientsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ success: true, patients: patientsList });
    } catch (error) {
        console.error('Erreur récupération patients:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/patients/:folderName', authenticateToken, (req, res) => {
    try {
        const folderName = req.params.folderName;
        const patientPath = path.join(PATIENTS_FOLDER, folderName);

        if (!fs.existsSync(patientPath)) {
            return res.status(404).json({
                success: false,
                error: "Dossier patient non trouvé."
            });
        }

        fs.rmSync(patientPath, { recursive: true, force: true });

        console.log(`SUPPRESSION OK: Dossier patient ${folderName} supprimé.`);

        // Log la suppression
        logDeletion('Patient', folderName, req.user.fullName || req.user.username);

        res.json({ success: true, message: "Patient supprimé avec succès." });

    } catch (error) {
        console.error("Erreur suppression patient:", error);
        res.status(500).json({
            success: false,
            error: `Erreur lors de la suppression du patient: ${error.message}`
        });
    }
});

// ----------------------------------------------------------------
// ROUTES UPLOAD ET ADMISSIONS
// ----------------------------------------------------------------

app.post('/api/upload-file', authenticateToken, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "Aucun fichier n'a été uploadé."
            });
        }

        const { patientName, targetFolder, targetSubFolder } = req.body;

        if (!patientName || !targetFolder) {
            return res.status(400).json({
                success: false,
                error: "Informations de dossier manquantes."
            });
        }

        const destinationPath = getPatientSubPath(patientName, targetFolder, targetSubFolder);

        if (!destinationPath) {
            return res.status(404).json({
                success: false,
                error: "Dossier cible introuvable ou non existant. (Upload annulé)"
            });
        }

        const fileName = req.file.originalname;
        const filePath = path.join(destinationPath, fileName);

        fs.writeFileSync(filePath, req.file.buffer);

        console.log(`UPLOAD OK: ${fileName} vers ${destinationPath}`);

        res.json({
            success: true,
            message: `Fichier ${fileName} uploadé avec succès !`,
            filePath: filePath
        });

    } catch (error) {
        console.error("Erreur d'upload:", error);
        res.status(500).json({
            success: false,
            error: `Échec de l'upload: ${error.message}`
        });
    }
});

app.post('/api/upload-admission-file', authenticateToken, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "Aucun fichier n'a été uploadé."
            });
        }

        const { patientFolder, admissionFolder, targetFolder, targetSubFolder } = req.body;

        if (!patientFolder || !admissionFolder || !targetFolder) {
            return res.status(400).json({
                success: false,
                error: "Informations de dossier manquantes."
            });
        }

        const patientPath = path.join(PATIENTS_FOLDER, patientFolder);
        const admissionPath = path.join(patientPath, admissionFolder);
        let destinationPath = path.join(admissionPath, targetFolder);

        if (targetFolder === "Bilans Paracliniques" && targetSubFolder) {
            destinationPath = path.join(destinationPath, targetSubFolder);
        }

        destinationPath = path.normalize(destinationPath);

        if (!fs.existsSync(destinationPath)) {
            return res.status(404).json({
                success: false,
                error: `Dossier cible introuvable: ${destinationPath}`
            });
        }

        const fileName = req.file.originalname;
        const filePath = path.join(destinationPath, fileName);

        fs.writeFileSync(filePath, req.file.buffer);

        console.log(`UPLOAD ADMISSION OK: ${fileName} vers ${destinationPath}`);

        res.json({
            success: true,
            message: `Fichier ${fileName} uploadé avec succès dans l'admission !`,
            filePath: filePath
        });

    } catch (error) {
        console.error("Erreur d'upload admission:", error);
        res.status(500).json({
            success: false,
            error: `Échec de l'upload: ${error.message}`
        });
    }
});

app.delete('/api/delete-admission', authenticateToken, (req, res) => {
    try {
        const { patientFolder, admissionFolder } = req.body;

        if (!patientFolder || !admissionFolder) {
            return res.status(400).json({
                success: false,
                error: "Informations de dossier manquantes"
            });
        }

        const admissionPath = path.join(PATIENTS_FOLDER, patientFolder, admissionFolder);

        if (!fs.existsSync(admissionPath)) {
            return res.status(404).json({
                success: false,
                error: "Dossier admission introuvable"
            });
        }

        fs.rmSync(admissionPath, { recursive: true, force: true });

        console.log(`SUPPRESSION ADMISSION: ${admissionPath}`);

        // Log la suppression
        logDeletion('Admission', `${patientFolder} / ${admissionFolder}`, req.user.fullName || req.user.username);

        res.json({
            success: true,
            message: "Admission supprimée avec succès"
        });

    } catch (error) {
        console.error("Erreur suppression admission:", error);
        res.status(500).json({
            success: false,
            error: `Erreur serveur: ${error.message}`
        });
    }
});

app.post('/api/create-admission', authenticateToken, (req, res) => {
    try {
        const { patientFolder, admissionFolder, admissionData } = req.body;

        if (!patientFolder || !admissionFolder) {
            return res.status(400).json({
                success: false,
                error: "Informations de dossier manquantes"
            });
        }

        const patientPath = path.join(PATIENTS_FOLDER, patientFolder);
        const admissionPath = path.join(patientPath, admissionFolder);

        if (!fs.existsSync(patientPath)) {
            return res.status(404).json({
                success: false,
                error: "Dossier patient introuvable"
            });
        }

        if (!fs.existsSync(admissionPath)) {
            fs.mkdirSync(admissionPath, { recursive: true });
        }

        const dossiersPrincipaux = [
            "Images cliniques",
            "Bilans Paracliniques",
            "Images scopiques",
            "Images per-Op",
            "Radiographie Post-Op",
            "Autres"
        ];

        dossiersPrincipaux.forEach(d => {
            const dPath = path.join(admissionPath, d);
            if (!fs.existsSync(dPath)) {
                fs.mkdirSync(dPath);
            }
        });

        const sousDossiersRadio = ["Bilan Biologique", "Radio", "TDM", "IRM"];
        const radiologiePath = path.join(admissionPath, "Bilans Paracliniques");

        sousDossiersRadio.forEach(sub => {
            const subPath = path.join(radiologiePath, sub);
            if (!fs.existsSync(subPath)) {
                fs.mkdirSync(subPath);
            }
        });

        const admissionInfoPath = path.join(admissionPath, "info_admission.txt");
        const admissionContent =
            `Admission: ${admissionFolder}\n` +
            `Date: ${admissionData.date}\n` +
            `Diagnostic: ${admissionData.description}\n` +
            `Créé le: ${new Date().toLocaleString()}`;

        fs.writeFileSync(admissionInfoPath, admissionContent);

        res.json({
            success: true,
            message: "Admission créée avec succès",
            admissionFolder: admissionFolder
        });

    } catch (error) {
        console.error("Erreur création admission:", error);
        res.status(500).json({
            success: false,
            error: `Erreur serveur: ${error.message}`
        });
    }
});

app.get('/api/get-admission-folders', authenticateToken, (req, res) => {
    try {
        const { patientFolder } = req.query;

        if (!patientFolder) {
            return res.status(400).json({
                success: false,
                error: "Nom du dossier patient requis"
            });
        }

        const patientPath = path.join(PATIENTS_FOLDER, patientFolder);

        if (!fs.existsSync(patientPath)) {
            return res.json({ success: true, admissionFolders: [] });
        }

        const items = fs.readdirSync(patientPath);
        const admissionFolders = items.filter(item => {
            const itemPath = path.join(patientPath, item);
            return fs.statSync(itemPath).isDirectory() && item.startsWith('Admission_');
        });

        const sortedAdmissionFolders = admissionFolders.sort((a, b) => {
            const getDateFromFolder = (folderName) => {
                try {
                    const dateStr = folderName.replace('Admission_', '');
                    const [day, month, year] = dateStr.split('-');
                    return new Date(`${year}-${month}-${day}`);
                } catch (error) {
                    return new Date(0);
                }
            };

            return getDateFromFolder(b) - getDateFromFolder(a);
        });

        res.json({
            success: true,
            admissionFolders: sortedAdmissionFolders
        });

    } catch (error) {
        console.error("Erreur récupération admissions:", error);
        res.status(500).json({
            success: false,
            error: `Erreur serveur: ${error.message}`
        });
    }
});

// ----------------------------------------------------------------
// GÉNÉRATION DE DOCUMENTS WORD (Avec Sauvegarde automatique)
// ----------------------------------------------------------------

app.post('/api/generate-document', authenticateToken, async (req, res) => {
    try {
        const { patientData, patientFolder, admissionFolder } = req.body;

        if (!patientData) {
            return res.status(400).json({ success: false, error: "Données patient manquantes" });
        }

        if (!fs.existsSync(TEMPLATE_PATH)) {
            return res.status(404).json({ success: false, error: "Template Word introuvable." });
        }

        const content = fs.readFileSync(TEMPLATE_PATH, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ""
        });

        // 🔥 CORRECTION : Formater le diagnostic correctement
        let formattedDiagnostic = '';

        if (patientData.diagnostics && Array.isArray(patientData.diagnostics)) {
            // Si on a un tableau de diagnostics structuré
            formattedDiagnostic = patientData.diagnostics
                .map(d => `${d.description}`)
                .join('-');
        } else if (patientData.diagnostic) {
            // Si on a déjà un string diagnostic formaté
            formattedDiagnostic = patientData.diagnostic;
        }
        const ns = patientData.natureSortie || '';

        const templateData = {
            nom: patientData.nom || '',
            prenom: patientData.prenom || '',
            ip: patientData.nDossier || '',
            date_naissance: formatDateDDMMYYYY(patientData.neLe),
            age: patientData.age || '',
            sexe: patientData.sexe || '',
            cin: patientData.cin || '',
            adresse: patientData.adresse || '',
            telephone: patientData.telephone || '',

            date_entree: formatDateDDMMYYYY(patientData.dateConsultation),
            date_sortie: formatDateDDMMYYYY(patientData.dateSortie),
            medecin: patientData.medecin || patientData.chirurgien || 'Non spécifié',
            hopital: patientData.hopital || '',
            diagnostic: formattedDiagnostic, // 🔥 UTILISER le diagnostic formaté

            identite_patient: patientData.identitePatient || '',
            couverture_sanitaire: patientData.couvertureSanitaire || '',
            antecedents: patientData.antecedents || '',
            histoire_maladie: patientData.histoireMaladie || '',
            examen_general: patientData.examenGeneral || '',
            examen_locomoteur: patientData.examenLocomoteur || '',
            examen_vasculo: patientData.examenVasculoNerveux || '',
            bilans_paracliniques: patientData.bilansParacliniques || '',
            reeducation: patientData.reeducation || '',
            nomOperation: patientData.nomOperation || '',

            nom_operation: patientData.codeActe || patientData.nomOperation || '',
            date_operation: formatDateDDMMYYYY(patientData.dateOperation),
            duree_operation: patientData.dureeOperation || '',
            operateurs: Array.isArray(patientData.operateurs)
                ? patientData.operateurs.join(' - ')
                : (patientData.operateurs || '').toString().replace(/,/g, ' - '),
            type_anesthesie: patientData.typeAnesthesie || '',
            installation: patientData.installation || '',
            protocole_operatoire: patientData.protocoleOperatoire || '',

            diagnostic_sortie: patientData.diagnosticSortie || '',
            // 🔥 AJOUTER LA LOGIQUE DES CASES À COCHER ICI :
            check_normale: ns === 'normale' ? 'X' : '',       // Mettra un X si normale
            check_provisoire: ns === 'provisoire' ? 'X' : '', // Mettra un X si provisoire
            check_transfert: ns === 'transfert' ? 'X' : '',   // Mettra un X si transfert
            lieu_transfert: ns === 'transfert' ? (patientData.lieuTransfert || '') : '', // Le nom de l'hôpital
            check_scam: ns === 'scam' ? 'X' : '',             // Mettra un X si SCAM
            check_decede: ns === 'decede' ? 'X' : '',         // Mettra un X si Décédé
            code_acte: (() => {
                const rawCode = patientData.codeActe || '';
                if (!rawCode) return '';
                if (typeof rawCode === 'string') {
                    return rawCode.split('\n')
                        .map(line => line.split(':')[0].trim())
                        .join(' - ');
                }
                if (Array.isArray(rawCode)) {
                    return rawCode
                        .map(item => item.split(':')[0].trim())
                        .join(' - ');
                }
                return rawCode;
            })()

        };

        doc.setData(templateData);

        try {
            doc.render();
        } catch (error) {
            console.error("Erreur docxtemplater:", error);
            return res.status(500).json({ success: false, error: "Erreur lors de la création du Word" });
        }

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: "DEFLATE"
        });

        const safeName = `${patientData.nom}_${patientData.prenom}`.replace(/[^a-z0-9]/gi, '_');
        const fileName = `CR_${safeName}_${Date.now()}.docx`;

        let targetFolderPath;
        if (admissionFolder && patientFolder) {
            targetFolderPath = path.join(PATIENTS_FOLDER, patientFolder, admissionFolder);
        } else if (patientFolder) {
            targetFolderPath = path.join(PATIENTS_FOLDER, patientFolder);
        } else {
            const patientFolderName = `${patientData.prenom}_${patientData.nom}`;
            targetFolderPath = path.join(PATIENTS_FOLDER, patientFolderName);
        }

        if (fs.existsSync(targetFolderPath)) {
            const deleteResult = deleteOldDocuments(targetFolderPath, `CR_${safeName}`);

            if (deleteResult.deleted > 0) {
                console.log(`🗑️ ${deleteResult.deleted} ancien(s) CR supprimé(s)`);
            }

            const savePath = path.join(targetFolderPath, fileName);
            try {
                fs.writeFileSync(savePath, buf);
                console.log(`✅ CR archivé sur le serveur : ${savePath}`);
            } catch (err) {
                console.error("❌ Erreur lors de l'archivage local (CR) :", err);
            }

            const dataSavePath = path.join(targetFolderPath, 'cr_data.json');
            try {
                const dataToSave = {
                    identitePatient: patientData.identitePatient,
                    couvertureSanitaire: patientData.couvertureSanitaire,
                    antecedents: patientData.antecedents,
                    dateSortie: patientData.dateSortie,
                    histoireMaladie: patientData.histoireMaladie,
                    examenGeneral: patientData.examenGeneral,
                    examenLocomoteur: patientData.examenLocomoteur,
                    examenVasculoNerveux: patientData.examenVasculoNerveux,
                    bilansParacliniques: patientData.bilansParacliniques,
                    reeducation: patientData.reeducation,
                    nomOperation: patientData.nomOperation,
                    dateOperation: patientData.dateOperation,
                    dureeOperation: patientData.dureeOperation,
                    operateurs: patientData.operateurs,
                    typeAnesthesie: patientData.typeAnesthesie,
                    installation: patientData.installation,
                    protocoleOperatoire: patientData.protocoleOperatoire,
                    diagnosticSortie: patientData.diagnosticSortie,
                    intervention: patientData.intervention,
                    codeActe: patientData.codeActe,
                    natureSortie: patientData.natureSortie,
                    lieuTransfert: patientData.lieuTransfert,
                    lastUpdated: new Date().toISOString()
                };

                fs.writeFileSync(dataSavePath, JSON.stringify(dataToSave, null, 2));
                console.log(`✅ Données CR sauvegardées : ${dataSavePath}`);
            } catch (err) {
                console.error("❌ Erreur lors de la sauvegarde des données CR :", err);
            }

        } else {
            console.warn(`⚠️ Dossier cible introuvable (${targetFolderPath}), fichier non archivé.`);
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buf);

        console.log(`🚀 Document envoyé au client : ${fileName}`);

    } catch (error) {
        console.error("Erreur génération document:", error);
        res.status(500).json({
            success: false,
            error: `Erreur serveur: ${error.message}`
        });
    }
});

app.get('/api/get-cr-data', authenticateToken, (req, res) => {
    try {
        const { patientFolder, admissionFolder } = req.query;

        if (!patientFolder) {
            return res.status(400).json({ success: false, error: "Dossier patient requis" });
        }

        let targetFolderPath;
        if (admissionFolder) {
            targetFolderPath = path.join(PATIENTS_FOLDER, patientFolder, admissionFolder);
        } else {
            targetFolderPath = path.join(PATIENTS_FOLDER, patientFolder);
        }

        const dataFilePath = path.join(targetFolderPath, 'cr_data.json');

        if (fs.existsSync(dataFilePath)) {
            const fileContent = fs.readFileSync(dataFilePath, 'utf8');
            const data = JSON.parse(fileContent);
            res.json({ success: true, data });
        } else {
            res.json({ success: true, data: null });
        }

    } catch (error) {
        console.error("Erreur récupération données CR:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/generate-consent', authenticateToken, async (req, res) => {
    try {
        const { patientData, patientFolder, admissionFolder } = req.body;

        if (!patientData) {
            return res.status(400).json({ success: false, error: "Données patient manquantes" });
        }

        if (!fs.existsSync(TEMPLATE_CONSENT_PATH)) {
            return res.status(404).json({ success: false, error: "Template Consentement introuvable." });
        }

        const content = fs.readFileSync(TEMPLATE_CONSENT_PATH, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ""
        });

        const templateData = {
            nom: patientData.nom || '',
            prenom: patientData.prenom || '',
            ip: patientData.nDossier || '',
            date_naissance: formatDateDDMMYYYY(patientData.neLe),
            age: patientData.age || '',
            sexe: patientData.sexe || '',
            cin: patientData.cin || '',
            adresse: patientData.adresse || '',
            telephone: patientData.telephone || '',
            nomOperation: patientData.nomOperation || '',
            date_entree: formatDateDDMMYYYY(patientData.dateConsultation || new Date()),
            chirurgien: patientData.chirurgien || 'Non spécifié',

            date_jour: formatDateDDMMYYYY(new Date()),
            medecin: patientData.chirurgien || 'Non spécifié',
            hopital: patientData.hopital || '',

            nom_operation: patientData.nom_operation || '',
            diagnostic: patientData.diagnostic || ''
        };

        doc.setData(templateData);

        try {
            doc.render();
        } catch (error) {
            console.error("Erreur docxtemplater (Consentement):", error);
            return res.status(500).json({ success: false, error: "Erreur lors de la création du Consentement" });
        }

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: "DEFLATE"
        });

        const safeName = `${patientData.nom}_${patientData.prenom}`.replace(/[^a-z0-9]/gi, '_');
        const fileName = `Consentement_${safeName}_${Date.now()}.docx`;

        let targetFolderPath;
        if (admissionFolder && patientFolder) {
            targetFolderPath = path.join(PATIENTS_FOLDER, patientFolder, admissionFolder);
        } else if (patientFolder) {
            targetFolderPath = path.join(PATIENTS_FOLDER, patientFolder);
        } else {
            const patientFolderName = `${patientData.prenom}_${patientData.nom}`;
            targetFolderPath = path.join(PATIENTS_FOLDER, patientFolderName);
        }

        if (fs.existsSync(targetFolderPath)) {
            // 🔥 NOUVEAU : Supprimer les anciens Consentements avant de sauvegarder le nouveau
            const deleteResult = deleteOldDocuments(targetFolderPath, `Consentement_${safeName}`);

            if (deleteResult.deleted > 0) {
                console.log(`🗑️ ${deleteResult.deleted} ancien(s) Consentement(s) supprimé(s)`);
            }

            // Sauvegarder le nouveau fichier
            const savePath = path.join(targetFolderPath, fileName);
            try {
                fs.writeFileSync(savePath, buf);
                console.log(`✅ Consentement archivé sur le serveur : ${savePath}`);
            } catch (err) {
                console.error("❌ Erreur lors de l'archivage local (Consentement) :", err);
            }
        } else {
            console.warn(`⚠️ Dossier cible introuvable (${targetFolderPath}), fichier non archivé.`);
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buf);

        console.log(`🚀 Consentement envoyé au client : ${fileName}`);

    } catch (error) {
        console.error("Erreur génération Consentement:", error);
        res.status(500).json({
            success: false,
            error: `Erreur serveur: ${error.message}`
        });
    }
});

app.post('/api/open-folder', authenticateToken, (req, res) => {
    try {
        const { folderName } = req.body;

        if (!folderName) {
            return res.status(400).json({ success: false, error: "Nom du dossier manquant" });
        }

        // Configuration de l'IP du serveur (À modifier si votre IP change)
        // C'est ce chemin que les PC distants utiliseront
        const serverIP = '10.4.28.11';
        const networkSharePath = `\\\\${serverIP}\\Patients`;

        // Construction des chemins
        const folderNetworkPath = `${networkSharePath}\\${folderName}`;
        const folderLocalPath = path.join(PATIENTS_FOLDER, folderName);

        // Vérification que le dossier existe réellement sur le serveur
        if (!fs.existsSync(folderLocalPath)) {
            return res.status(404).json({ success: false, error: "Dossier introuvable sur le serveur" });
        }

        console.log(`📂 Chemin demandé : ${folderNetworkPath}`);

        // On renvoie le chemin au client (React/Frontend)
        res.json({
            success: true,
            message: "Chemin récupéré",
            path: folderNetworkPath // C'est ce chemin que le client devra utiliser
        });

    } catch (error) {
        console.error("❌ Erreur open-folder:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// Ajoutez cette route dans server.js après la route /api/create-admission

app.post('/api/create-consultation', authenticateToken, (req, res) => {
    try {
        const { patientFolder, consultationFolder } = req.body;

        if (!patientFolder || !consultationFolder) {
            return res.status(400).json({
                success: false,
                error: "Informations de dossier manquantes"
            });
        }

        const patientPath = path.join(PATIENTS_FOLDER, patientFolder);
        const consultationPath = path.join(patientPath, consultationFolder);

        if (!fs.existsSync(patientPath)) {
            return res.status(404).json({
                success: false,
                error: "Dossier patient introuvable"
            });
        }

        // Créer le dossier de consultation s'il n'existe pas
        if (!fs.existsSync(consultationPath)) {
            fs.mkdirSync(consultationPath, { recursive: true });
        }

        // Créer les sous-dossiers requis
        const subFolders = ["Image Clinique", "Images Radiologiques", "Autres"];
        subFolders.forEach(sub => {
            const subPath = path.join(consultationPath, sub);
            if (!fs.existsSync(subPath)) {
                fs.mkdirSync(subPath);
            }
        });

        // Créer un fichier info pour la consultation
        const consultationInfoPath = path.join(consultationPath, "info_consultation.txt");
        const consultationContent =
            `Consultation: ${consultationFolder}\n` +
            `Créé le: ${new Date().toLocaleString()}`;

        fs.writeFileSync(consultationInfoPath, consultationContent);

        res.json({
            success: true,
            message: "Dossier de consultation créé avec succès",
            consultationFolder: consultationFolder
        });

    } catch (error) {
        console.error("Erreur création consultation:", error);
        res.status(500).json({
            success: false,
            error: `Erreur serveur: ${error.message}`
        });
    }
});

// Ajoutez également cette route pour récupérer les dossiers de consultation
app.get('/api/get-consultation-folders', authenticateToken, (req, res) => {
    try {
        const { patientFolder } = req.query;

        if (!patientFolder) {
            return res.status(400).json({
                success: false,
                error: "Nom du dossier patient requis"
            });
        }

        const patientPath = path.join(PATIENTS_FOLDER, patientFolder);

        if (!fs.existsSync(patientPath)) {
            return res.json({ success: true, consultationFolders: [] });
        }

        const items = fs.readdirSync(patientPath);
        const consultationFolders = items.filter(item => {
            const itemPath = path.join(patientPath, item);
            return fs.statSync(itemPath).isDirectory() && item.startsWith('Consultation_');
        });

        // Trier par date (plus récent en premier)
        const sortedConsultationFolders = consultationFolders.sort((a, b) => {
            const getDateFromFolder = (folderName) => {
                try {
                    const dateStr = folderName.replace('Consultation_', '');
                    const [day, month, year] = dateStr.split('-');
                    return new Date(`${year}-${month}-${day}`);
                } catch (error) {
                    return new Date(0);
                }
            };

            return getDateFromFolder(b) - getDateFromFolder(a);
        });

        res.json({
            success: true,
            consultationFolders: sortedConsultationFolders
        });

    } catch (error) {
        console.error("Erreur récupération consultations:", error);
        res.status(500).json({
            success: false,
            error: `Erreur serveur: ${error.message}`
        });
    }
});

app.post('/api/generate-certificate', authenticateToken, async (req, res) => {
    try {
        const { certificateData } = req.body;

        if (!certificateData) {
            return res.status(400).json({ success: false, error: "Données du certificat manquantes" });
        }

        const TEMPLATE_CERTIFICATE_PATH = path.join(__dirname, 'templates', 'Certificat.docx');

        if (!fs.existsSync(TEMPLATE_CERTIFICATE_PATH)) {
            return res.status(404).json({ success: false, error: "Template Certificat introuvable." });
        }

        const content = fs.readFileSync(TEMPLATE_CERTIFICATE_PATH, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ""
        });

        const templateData = {
            date: formatDateDDMMYYYY(certificateData.date || new Date()),
            chirurgien: certificateData.chirurgien || '',
            nom_complet: certificateData.nom_complet || '',
            cin: certificateData.cin || '',
            diagnostic: certificateData.diagnostic || '',
            traitement: certificateData.traitement || '',
            nombre: certificateData.nombre || ''
        };

        doc.setData(templateData);

        try {
            doc.render();
        } catch (error) {
            console.error("Erreur docxtemplater (Certificat):", error);
            return res.status(500).json({ success: false, error: "Erreur lors de la création du Certificat" });
        }

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: "DEFLATE"
        });

        const safeName = certificateData.nom_complet.replace(/[^a-z0-9]/gi, '_');
        const fileName = `Certificat_Medical_${safeName}_${Date.now()}.docx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buf);

        console.log(`🚀 Certificat envoyé au client : ${fileName}`);

    } catch (error) {
        console.error("Erreur génération Certificat:", error);
        res.status(500).json({
            success: false,
            error: `Erreur serveur: ${error.message}`
        });
    }
});

app.post('/api/generate-fiche-confidentielle', authenticateToken, async (req, res) => {
    try {
        const { patientData, sejour } = req.body;

        if (!patientData) {
            return res.status(400).json({ success: false, error: "Données patient manquantes" });
        }

        if (!fs.existsSync(TEMPLATE_FC_PATH)) {
            return res.status(404).json({ success: false, error: "Template 'Fiche Confidentielle.docx' introuvable." });
        }

        const content = fs.readFileSync(TEMPLATE_FC_PATH, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ""
        });

        // 🔥 FORMAT DIAGNOSTIC: Extract only descriptions without dates
        let diagnosticOnly = '';
        if (patientData.diagnostics && Array.isArray(patientData.diagnostics)) {
            diagnosticOnly = patientData.diagnostics
                .map(d => d.description)
                .join(' - ');
        } else if (patientData.diagnostic) {
            // Parse existing diagnostic string to remove dates
            diagnosticOnly = patientData.diagnostic
                .split('\n')
                .map(line => {
                    // Remove date pattern [DD-MM-YYYY] : and leading dashes
                    const cleaned = line.replace(/\[.*?\]\s*:\s*/g, '').trim();
                    return cleaned.replace(/^-\s*/, ''); // Remove leading dash
                })
                .filter(line => line && !line.includes('---'))
                .join(' - ');
        }

        // Mapping des données pour le template
        const templateData = {
            nom: patientData.nom || '',
            prenom: patientData.prenom || '',
            ip: patientData.nDossier || '',
            date_entree: formatDateDDMMYYYY(patientData.dateConsultation),
            date_now: formatDateDDMMYYYY(new Date()), // 🔥 Current date
            histoire_maladie: patientData.histoireMaladie || '', // 🔥 From CR form
            diagnostic: diagnosticOnly, // 🔥 Without dates
            nomOperation: patientData.nomOperation || '',
            medecin: (req.user && req.user.fullName) ? req.user.fullName : (patientData.chirurgien || ''),
            sejour: sejour || ''
        };

        doc.setData(templateData);

        try {
            doc.render();
        } catch (error) {
            console.error("Erreur docxtemplater (FC):", error);
            return res.status(500).json({ success: false, error: "Erreur lors de la compilation du Word" });
        }

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: "DEFLATE"
        });

        const safeName = `${patientData.nom}_${patientData.prenom}`.replace(/[^a-z0-9]/gi, '_');
        const fileName = `Fiche_Confidentielle_${safeName}_${Date.now()}.docx`;

        // Sauvegarde automatique sur le serveur
        let targetFolderPath;
        if (patientData.patientFolder && patientData.admissionFolder) {
            targetFolderPath = path.join(PATIENTS_FOLDER, patientData.patientFolder, patientData.admissionFolder);
        } else if (patientData.patientFolder) {
            targetFolderPath = path.join(PATIENTS_FOLDER, patientData.patientFolder);
        } else {
            targetFolderPath = path.join(PATIENTS_FOLDER, `${patientData.prenom}_${patientData.nom}`);
        }

        if (fs.existsSync(targetFolderPath)) {
            // 🔥 Delete old Fiche Confidentielle files
            const deleteResult = deleteOldDocuments(targetFolderPath, `Fiche_Confidentielle_${safeName}`);
            if (deleteResult.deleted > 0) {
                console.log(`🗑️ ${deleteResult.deleted} ancienne(s) Fiche(s) Confidentielle(s) supprimée(s)`);
            }

            const savePath = path.join(targetFolderPath, fileName);
            fs.writeFileSync(savePath, buf);
            console.log(`✅ Fiche Confidentielle archivée : ${savePath}`);
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buf);

        console.log(`🚀 Fiche Confidentielle envoyée : ${fileName}`);

    } catch (error) {
        console.error("Erreur génération FC:", error);
        res.status(500).json({
            success: false,
            error: `Erreur serveur: ${error.message}`
        });
    }
});


app.get('/api/generate-feuille-soin', authenticateToken, (req, res) => {
    try {
        const { type } = req.query;
        if (!type || (type !== 'cnss' && type !== 'cnops')) {
            return res.status(400).json({ success: false, error: "Type invalide (cnss ou cnops attendu)" });
        }

        const fileName = `${type}.pdf`;
        const filePath = path.join(__dirname, 'templates', fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: `Template ${fileName} introuvable` });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Feuille_Soin_${type.toUpperCase()}.pdf"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error("Erreur génération feuille soin:", error);
        res.status(500).json({ success: false, error: "Erreur serveur" });
    }
});

app.post('/api/generate-sortie-provisoire', authenticateToken, async (req, res) => {
    try {
        const { patientData, dateSortie, dateRetour } = req.body;

        if (!patientData) {
            return res.status(400).json({ success: false, error: "Données patient manquantes" });
        }

        if (!fs.existsSync(TEMPLATE_SP_PATH)) {
            return res.status(404).json({ success: false, error: "Template 'Sortie provisoire.docx' introuvable." });
        }

        const content = fs.readFileSync(TEMPLATE_SP_PATH, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ""
        });

        const templateData = {
            nom: patientData.nom || '',
            prenom: patientData.prenom || '',
            IP: patientData.nDossier || '', // Note: Template uses {IP}
            medecin: patientData.chirurgien || '',
            date_sortie: formatDateDDMMYYYY(dateSortie),
            date_retour: formatDateDDMMYYYY(dateRetour),
            date_now: formatDateDDMMYYYY(new Date())
        };

        doc.setData(templateData);

        try {
            doc.render();
        } catch (error) {
            console.error("Erreur docxtemplater (SP):", error);
            return res.status(500).json({ success: false, error: "Erreur lors de la compilation du Word" });
        }

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: "DEFLATE"
        });

        const safeName = `${patientData.nom}_${patientData.prenom}`.replace(/[^a-z0-9]/gi, '_');
        const fileName = `Sortie_Provisoire_${safeName}_${Date.now()}.docx`;

        // Sauvegarde automatique sur le serveur (Optionnel, mais cohérent avec les autres)
        let targetFolderPath;
        if (patientData.patientFolder && patientData.admissionFolder) {
            targetFolderPath = path.join(PATIENTS_FOLDER, patientData.patientFolder, patientData.admissionFolder);
        } else if (patientData.patientFolder) {
            targetFolderPath = path.join(PATIENTS_FOLDER, patientData.patientFolder);
        } else {
            targetFolderPath = path.join(PATIENTS_FOLDER, `${patientData.prenom}_${patientData.nom}`);
        }

        if (fs.existsSync(targetFolderPath)) {
            const deleteResult = deleteOldDocuments(targetFolderPath, `Sortie_Provisoire_${safeName}`);
            if (deleteResult.deleted > 0) {
                console.log(`🗑️ ${deleteResult.deleted} ancienne(s) Sortie(s) Provisoire(s) supprimée(s)`);
            }
            const savePath = path.join(targetFolderPath, fileName);
            fs.writeFileSync(savePath, buf);
            console.log(`✅ Sortie Provisoire archivée : ${savePath}`);
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buf);

        console.log(`🚀 Sortie Provisoire envoyée : ${fileName}`);

    } catch (error) {
        console.error("Erreur génération SP:", error);
        res.status(500).json({ success: false, error: `Erreur serveur: ${error.message}` });
    }
});

app.get('/api/get-doctors', authenticateToken, (req, res) => {
    try {
        if (!fs.existsSync(PATIENTS_FOLDER)) {
            return res.json({ success: true, doctors: [] });
        }

        const patients = fs.readdirSync(PATIENTS_FOLDER);
        const doctorsSet = new Set();

        patients.forEach(patientFolder => {
            const infoPath = path.join(PATIENTS_FOLDER, patientFolder, 'infos_patient.txt');
            if (fs.existsSync(infoPath)) {
                const content = fs.readFileSync(infoPath, 'utf8');
                const lines = content.split('\n');

                lines.forEach(line => {
                    if (line.includes('Chirurgien:')) {
                        const chirurgien = line.split('Chirurgien:')[1].trim();
                        if (chirurgien && chirurgien !== '') {
                            doctorsSet.add(chirurgien);
                        }
                    }
                });
            }
        });

        const doctors = Array.from(doctorsSet).sort();
        res.json({ success: true, doctors });

    } catch (error) {
        console.error('Erreur récupération chirurgiens:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/stats', authenticateToken, requireAdmin, (req, res) => {
    try {
        // 1. Compter les patients
        let patientsCount = 0;
        if (fs.existsSync(PATIENTS_FOLDER)) {
            const items = fs.readdirSync(PATIENTS_FOLDER);
            patientsCount = items.filter(item => {
                const itemPath = path.join(PATIENTS_FOLDER, item);
                return fs.statSync(itemPath).isDirectory();
            }).length;
        }

        // 2. Compter les utilisateurs
        let usersCount = 0;
        if (fs.existsSync(USERS_FILE)) {
            const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            usersCount = users.length;
        }

        // 3. Récupérer les logs de suppression
        let deletedLogs = [];
        if (fs.existsSync(DELETED_LOGS_FILE)) {
            deletedLogs = JSON.parse(fs.readFileSync(DELETED_LOGS_FILE, 'utf8'));

            // Filtrer pour ne garder que les 2 dernières semaines
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            deletedLogs = deletedLogs.filter(log => log.id > twoWeeksAgo);
        }

        res.json({
            success: true,
            stats: {
                patientsCount,
                usersCount,
                deletedLogs
            }
        });

    } catch (error) {
        console.error("Erreur récupération statistiques:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ----------------------------------------------------------------
// ROUTE DOWNLOAD ZIP
// ----------------------------------------------------------------

app.get('/api/download-folder', authenticateToken, (req, res) => {
    try {
        const { folderName } = req.query;

        if (!folderName) {
            return res.status(400).json({ success: false, error: "Nom de dossier requis" });
        }

        const folderPath = path.join(PATIENTS_FOLDER, folderName);

        if (!fs.existsSync(folderPath)) {
            return res.status(404).json({ success: false, error: "Dossier introuvable" });
        }

        const zip = new PizZip();

        // Fonction récursive pour ajouter les fichiers au ZIP
        const addFolderToZip = (dirPath, zipFolder) => {
            const items = fs.readdirSync(dirPath);

            items.forEach(item => {
                const itemPath = path.join(dirPath, item);
                const stats = fs.statSync(itemPath);

                if (stats.isDirectory()) {
                    const newZipFolder = zipFolder.folder(item);
                    addFolderToZip(itemPath, newZipFolder);
                } else {
                    const content = fs.readFileSync(itemPath);
                    zipFolder.file(item, content);
                }
            });
        };

        // Ajouter tout le contenu du dossier patient à la racine du ZIP
        addFolderToZip(folderPath, zip);

        const content = zip.generate({ type: 'nodebuffer' });

        const safeName = folderName.replace(/[^a-z0-9]/gi, '_');
        const fileName = `${safeName}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(content);

        console.log(`📦 Dossier zippé et envoyé : ${fileName}`);

    } catch (error) {
        console.error("Erreur download ZIP:", error);
        res.status(500).json({ success: false, error: "Erreur lors de la génération du ZIP" });
    }
});

// ----------------------------------------------------------------
// ROUTE DOWNLOAD LAST CR (SECRETAIRE)
// ----------------------------------------------------------------

app.get('/api/download-last-cr', authenticateToken, (req, res) => {
    try {
        const { folderName } = req.query;

        if (!folderName) {
            return res.status(400).json({ success: false, error: "Nom de dossier requis" });
        }

        const patientPath = path.join(PATIENTS_FOLDER, folderName);

        if (!fs.existsSync(patientPath)) {
            return res.status(404).json({ success: false, error: "Dossier patient introuvable" });
        }

        // Fonction récursive pour trouver tous les fichiers CR
        const findCRFiles = (dir) => {
            let results = [];
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(findCRFiles(filePath));
                } else {
                    // Chercher les fichiers qui commencent par CR_ et finissent par .docx
                    if (file.startsWith('CR_') && file.endsWith('.docx')) {
                        results.push({
                            path: filePath,
                            name: file,
                            mtime: stat.mtime
                        });
                    }
                }
            });
            return results;
        };

        const crFiles = findCRFiles(patientPath);

        if (crFiles.length === 0) {
            return res.status(404).json({ success: false, error: "Aucun Compte Rendu trouvé pour ce patient" });
        }

        // Trier par date de modification décroissante
        crFiles.sort((a, b) => b.mtime - a.mtime);

        const latestCR = crFiles[0];

        res.download(latestCR.path, latestCR.name, (err) => {
            if (err) {
                console.error("Erreur téléchargement CR:", err);
                if (!res.headersSent) {
                    res.status(500).json({ success: false, error: "Erreur lors du téléchargement" });
                }
            }
        });

    } catch (error) {
        console.error("Erreur download last CR:", error);
        res.status(500).json({ success: false, error: "Erreur serveur" });
    }
});

// ----------------------------------------------------------------
// ROUTES AUTHENTIFICATION
// ----------------------------------------------------------------

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, error: "Nom d'utilisateur et mot de passe requis" });
        }

        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(401).json({ success: false, error: "Nom d'utilisateur ou mot de passe incorrect" });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: "Nom d'utilisateur ou mot de passe incorrect" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                forcePasswordChange: user.forcePasswordChange || false
            }
        });

    } catch (error) {
        console.error("Erreur login:", error);
        res.status(500).json({ success: false, error: "Erreur serveur lors de la connexion" });
    }
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { newPassword } = req.body;
        const userId = req.user.id;

        if (!newPassword) {
            return res.status(400).json({ success: false, error: "Nouveau mot de passe requis" });
        }

        let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const userIndex = users.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return res.status(404).json({ success: false, error: "Utilisateur non trouvé" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        users[userIndex].password = hashedPassword;
        users[userIndex].realPassword = newPassword; // 🔥 Update real password
        users[userIndex].forcePasswordChange = false;

        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

        res.json({ success: true, message: "Mot de passe modifié avec succès" });

    } catch (error) {
        console.error("Erreur changement mot de passe:", error);
        res.status(500).json({ success: false, error: "Erreur serveur lors du changement de mot de passe" });
    }
});

// ----------------------------------------------------------------
// GESTION DES MEDICAMENTS ET ORDONNANCE
// ----------------------------------------------------------------

const MEDICAMENTS_FILE = path.join(__dirname, 'medicaments.json');
const TEMPLATE_ORDONNANCE_PATH = path.join(__dirname, 'templates', 'Ordonnance.docx');

// Initialiser le fichier si inexistant
if (!fs.existsSync(MEDICAMENTS_FILE)) {
    const defaultMedicaments = [
        { "category": "Anticoagulant", "medicines": [] },
        { "category": "Anti-inflammatoires non stéroïdiens", "medicines": [] },
        { "category": "Antalgiques", "medicines": [] },
        { "category": "Antibiotiques", "medicines": [] },
        { "category": "IPP", "medicines": [] },
        { "category": "Crème cicatrisante", "medicines": [] },
        { "category": "Gel anti douleur", "medicines": [] },
        { "category": "Anti-arthrosiques", "medicines": [] },
        { "category": "Fer", "medicines": [] },
        { "category": "Thérapie froide", "medicines": [] }
    ];
    fs.writeFileSync(MEDICAMENTS_FILE, JSON.stringify(defaultMedicaments, null, 2));
}

app.get('/api/medicaments', authenticateToken, (req, res) => {
    try {
        const data = fs.readFileSync(MEDICAMENTS_FILE, 'utf8');
        res.json({ success: true, medicaments: JSON.parse(data) });
    } catch (error) {
        console.error("Erreur lecture medicaments:", error);
        res.status(500).json({ success: false, error: "Erreur serveur" });
    }
});

app.post('/api/medicaments/add', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { category, name } = req.body;
        if (!category || !name) return res.status(400).json({ success: false, error: "Données manquantes" });

        const medicaments = JSON.parse(fs.readFileSync(MEDICAMENTS_FILE, 'utf8'));
        const catIndex = medicaments.findIndex(m => m.category === category);

        if (catIndex > -1) {
            if (!medicaments[catIndex].medicines.includes(name)) {
                medicaments[catIndex].medicines.push(name);
                fs.writeFileSync(MEDICAMENTS_FILE, JSON.stringify(medicaments, null, 2));
                return res.json({ success: true, medicaments });
            } else {
                return res.status(400).json({ success: false, error: "Le médicament existe déjà dans cette catégorie" });
            }
        }
        res.json({ success: true, medicaments });
    } catch (error) {
        console.error("Erreur ajout medicament:", error);
        res.status(500).json({ success: false, error: "Erreur serveur" });
    }
});

app.delete('/api/medicaments/delete', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { category, name } = req.body;
        const medicaments = JSON.parse(fs.readFileSync(MEDICAMENTS_FILE, 'utf8'));
        const catIndex = medicaments.findIndex(m => m.category === category);

        if (catIndex > -1) {
            medicaments[catIndex].medicines = medicaments[catIndex].medicines.filter(m => m !== name);
            fs.writeFileSync(MEDICAMENTS_FILE, JSON.stringify(medicaments, null, 2));
        }
        res.json({ success: true, medicaments });
    } catch (error) {
        console.error("Erreur suppression medicament:", error);
        res.status(500).json({ success: false, error: "Erreur serveur" });
    }
});

app.post('/api/medicaments/update', authenticateToken, requireAdmin, (req, res) => {
    try {
        const { category, oldName, newName } = req.body;
        const medicaments = JSON.parse(fs.readFileSync(MEDICAMENTS_FILE, 'utf8'));
        const catIndex = medicaments.findIndex(m => m.category === category);

        if (catIndex > -1) {
            const medIndex = medicaments[catIndex].medicines.indexOf(oldName);
            if (medIndex > -1) {
                medicaments[catIndex].medicines[medIndex] = newName;
                fs.writeFileSync(MEDICAMENTS_FILE, JSON.stringify(medicaments, null, 2));
            }
        }
        res.json({ success: true, medicaments });
    } catch (error) {
        console.error("Erreur update medicament:", error);
        res.status(500).json({ success: false, error: "Erreur serveur" });
    }
});

app.post('/api/generate-ordonnance', authenticateToken, async (req, res) => {
    try {
        const { patientData, medicinesList } = req.body;

        if (!fs.existsSync(TEMPLATE_ORDONNANCE_PATH)) {
            return res.status(404).json({ success: false, error: "Template Ordonnance introuvable" });
        }

        const content = fs.readFileSync(TEMPLATE_ORDONNANCE_PATH, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            nullGetter: () => ""
        });

        const templateData = {
            nom: patientData.nom || '',
            prenom: patientData.prenom || '',
            date: patientData.date ? formatDateDDMMYYYY(new Date(patientData.date)) : formatDateDDMMYYYY(new Date()),
            age: patientData.age || '',
            medecin: (req.user && req.user.fullName) ? req.user.fullName : '',
            medicaments: medicinesList.map((m, index) => ({
                numero: index + 1,  // 🔥 Commence à 1
                nom: m.name,
                dosage: m.dosage || ''
            }))
        };

        doc.setData(templateData);

        try {
            doc.render();
        } catch (error) {
            console.error("Erreur docxtemplater (Ordonnance):", error);
            return res.status(500).json({ success: false, error: "Erreur lors de la génération" });
        }

        const buf = doc.getZip().generate({
            type: 'nodebuffer',
            compression: "DEFLATE"
        });

        const safeName = `${patientData.nom || 'Patient'}_${patientData.prenom || ''}`.trim().replace(/[^a-z0-9]/gi, '_');
        const fileName = `Ordonnance_${safeName}_${Date.now()}.docx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buf);

        // 📊 Tracking usage des médicaments
        try {
            let stats = {};
            if (fs.existsSync(MEDICAMENT_STATS_FILE)) {
                stats = JSON.parse(fs.readFileSync(MEDICAMENT_STATS_FILE, 'utf8'));
            }
            medicinesList.forEach(m => {
                const name = (m.name || '').trim().toUpperCase();
                if (name) stats[name] = (stats[name] || 0) + 1;
            });
            fs.writeFileSync(MEDICAMENT_STATS_FILE, JSON.stringify(stats, null, 2));
        } catch (statsErr) {
            console.error('Erreur tracking médicaments:', statsErr);
        }

    } catch (error) {
        console.error("Erreur génération Ordonnance:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ----------------------------------------------------------------
// ROUTE STATISTIQUES MÉDICAMENTS
// ----------------------------------------------------------------

app.get('/api/medicaments/stats', authenticateToken, (req, res) => {
    try {
        if (!fs.existsSync(MEDICAMENT_STATS_FILE)) {
            return res.json({ success: true, stats: [] });
        }
        const raw = JSON.parse(fs.readFileSync(MEDICAMENT_STATS_FILE, 'utf8'));
        const stats = Object.entries(raw)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Erreur stats médicaments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ----------------------------------------------------------------
// ROUTES PROGRAMME OPÉRATOIRE
// ----------------------------------------------------------------

const readProgramme = () => {
    if (!fs.existsSync(PROGRAMME_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(PROGRAMME_FILE, 'utf8')); } catch { return []; }
};
const writeProgramme = (rows) => fs.writeFileSync(PROGRAMME_FILE, JSON.stringify(rows, null, 2));

app.get('/api/programme-operatoire', authenticateToken, requireAdmin, (req, res) => {
    try {
        res.json({ success: true, rows: readProgramme() });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/programme-operatoire', authenticateToken, requireAdmin, (req, res) => {
    try {
        const rows = readProgramme();
        const newRow = {
            id: Date.now(),
            date: req.body.date || new Date().toISOString().slice(0, 10),
            nomPrenom: (req.body.nomPrenom || '').toUpperCase(),
            diagnostic: req.body.diagnostic || '',
            gesteOperatoire: req.body.gesteOperatoire || '',
            couvertureSanitaire: req.body.couvertureSanitaire || '',
            observation: req.body.observation || '',
            prof: req.body.prof || '',
            createdAt: new Date().toISOString()
        };
        rows.unshift(newRow);
        writeProgramme(rows);
        res.json({ success: true, row: newRow });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.put('/api/programme-operatoire/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const rows = readProgramme();
        const idx = rows.findIndex(r => r.id === id);
        if (idx === -1) return res.status(404).json({ success: false, error: 'Entrée introuvable' });
        const updated = {
            ...rows[idx],
            date: req.body.date || rows[idx].date,
            nomPrenom: (req.body.nomPrenom || rows[idx].nomPrenom).toUpperCase(),
            diagnostic: req.body.diagnostic ?? rows[idx].diagnostic,
            gesteOperatoire: req.body.gesteOperatoire ?? rows[idx].gesteOperatoire,
            couvertureSanitaire: req.body.couvertureSanitaire ?? rows[idx].couvertureSanitaire,
            observation: req.body.observation ?? rows[idx].observation,
            prof: req.body.prof ?? rows[idx].prof,
            updatedAt: new Date().toISOString()
        };
        rows[idx] = updated;
        writeProgramme(rows);
        res.json({ success: true, row: updated });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.delete('/api/programme-operatoire/:id', authenticateToken, requireAdmin, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const rows = readProgramme().filter(r => r.id !== id);
        writeProgramme(rows);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    initializeUsersFile();
    console.log(`\n========================================================`);
    console.log(`🚀 Serveur démarré sur http://10.4.28.11:${PORT}`);
    console.log(`🔐 Système d'authentification activé`);
    console.log(`📁 Dossier racine Patients: ${PATIENTS_FOLDER}`);
    console.log(`📄 Template Word: ${TEMPLATE_PATH}`);
    console.log(`========================================================\n`);
});
