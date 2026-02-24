const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://10.4.28.11:5000/api';
const USERNAME = 'admin';
const PASSWORD = 'admin123';

async function verify() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: USERNAME,
            password: PASSWORD
        });
        const token = loginRes.data.token;
        console.log('Login successful. Token received.');

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Create Patient
        const patientData = {
            nom: 'TestKeywords',
            prenom: 'Verification',
            diagnostics: [{ date: '2023-10-27', description: 'Test diag' }],
            keywords: ['Key1', 'Key2', 'Key3'], // Frontend sends 'keywords'
            neLe: '01/01/1980',
            age: '43',
            adresse: 'Test Address',
            sexe: 'M',
            telephone: '123456789',
            telephone2: '',
            nDossier: 'TEST001',
            hopital: 'Test Hospital',
            chirurgien: 'Dr. Test',
            cin: 'AB123456',
            dateConsultation: '27/10/2023'
        };

        console.log('Creating patient with keywords:', patientData.keywords);
        await axios.post(`${API_URL}/patients/create`, patientData, { headers });
        console.log('Patient created.');

        // 3. Verify File Content
        // We need to know where the patients folder is. 
        // Based on server.js, it's in process.env.DESKTOP_PATH/Patients
        // We can't easily access that env var here without reading .env, 
        // but we can assume the server created the file.
        // Let's try to read it if we can find the path, or just trust the server response?
        // No, we must verify the file content.

        // Let's read .env to find the path
        require('dotenv').config();
        const patientsFolder = path.join(process.env.DESKTOP_PATH, 'Patients');
        const patientFolder = path.join(patientsFolder, 'Verification_TestKeywords');
        const infoFile = path.join(patientFolder, 'infos_patient.txt');

        if (fs.existsSync(infoFile)) {
            const content = fs.readFileSync(infoFile, 'utf8');
            console.log('File content found.');
            if (content.includes('Key1, Key2, Key3')) {
                console.log('SUCCESS: Keywords found in file after creation.');
            } else {
                console.error('FAILURE: Keywords NOT found in file after creation.');
                console.log('Content:', content);
            }
        } else {
            console.error('FAILURE: Info file not found at', infoFile);
        }

        // 4. Update Patient
        const updateData = {
            ...patientData,
            originalPatientName: 'Verification_TestKeywords',
            keywords: ['Key1', 'Key2', 'Key3', 'Key4_Updated']
        };

        console.log('Updating patient with new keywords:', updateData.keywords);
        await axios.put(`${API_URL}/patients/update`, updateData, { headers });
        console.log('Patient updated.');

        // 5. Verify File Content Again
        if (fs.existsSync(infoFile)) {
            const content = fs.readFileSync(infoFile, 'utf8');
            if (content.includes('Key1, Key2, Key3, Key4_Updated')) {
                console.log('SUCCESS: Keywords found in file after update.');
            } else {
                console.error('FAILURE: Keywords NOT found in file after update.');
                console.log('Content:', content);
            }
        }

        // 6. Cleanup
        console.log('Cleaning up...');
        // We can use the delete endpoint
        await axios.delete(`${API_URL}/patients/Verification_TestKeywords`, { headers });
        console.log('Test patient deleted.');

    } catch (error) {
        console.error('Error during verification:', error.response ? error.response.data : error.message);
    }
}

verify();
