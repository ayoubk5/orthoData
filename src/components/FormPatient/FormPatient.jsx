import React, { useState, useEffect } from 'react';
import Diagnostics from './DiagnosticSection';
import KeywordsSection from '../KeywordsSection/KeywordsSection';
import DossierView from './DossierView';
import AdmissionDossierView from './AdmissionDossierView';
import MultiSelectActes from './MultiSelectActes';
import MultiSelectSurgeons from './MultiSelectSurgeons';
import './FormPatient.css';
import { SURGEONS_LIST } from '../../constants/surgeonsList';
import { API_URL } from '../../config';

const FormPatient = ({ mode = 'create', initialData = null, onBack, user }) => {
    const [formData, setFormData] = useState({
        nom: '',
        prenom: '',
        neLe: '',
        age: '',
        sexe: 'Homme',
        adresse: '',
        telephone: '',
        telephone2: '',
        nDossier: '',
        hopital: 'CHU',
        chirurgien: SURGEONS_LIST[0],
        cin: '',
        diagnostics: [],
        dateConsultation: new Date().toISOString().slice(0, 10),
        motsCles: []
    });

    const [isCreated, setIsCreated] = useState(false);
    const [createdFolder, setCreatedFolder] = useState('');
    const [originalPatientName, setOriginalPatientName] = useState('');
    const [admissionFolders, setAdmissionFolders] = useState([]);
    const [consultationFolders, setConsultationFolders] = useState([]);
    const [selectedAdmissionFolder, setSelectedAdmissionFolder] = useState(null);
    const [initialFormState, setInitialFormState] = useState(null); // Pour la comparaison de modifications
    const [isDirty, setIsDirty] = useState(false); // État de modification

    const [showCRModal, setShowCRModal] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [showFCModal, setShowFCModal] = useState(false);
    const [sejourInput, setSejourInput] = useState('');
    const [crData, setCrData] = useState({
        identitePatient: '',
        couvertureSanitaire: '',
        antecedents: '',
        histoireMaladie: '',
        examenGeneral: '',
        examenLocomoteur: '',
        examenVasculoNerveux: '',
        bilansParacliniques: '',
        reeducation: '',
        nomOperation: '',
        dateOperation: new Date().toISOString().slice(0, 10),
        dureeOperation: '',
        protocoleOperatoire: '',
        dateSortie: '',
        codeActe: [],
        operateurs: [],
        typeAnesthesie: '',
        installation: '',
        natureSortie: 'normale',
        lieuTransfert: '',
        medecin: ''
    });

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            const diagsWithIds = (initialData.diagnostics || []).map((d, index) => ({
                ...d,
                id: d.id || `diag-${Date.now()}-${index}`
            }));

            setFormData({
                ...initialData,
                diagnostics: diagsWithIds,
                motsCles: initialData.motsCles || []
            });
            setIsCreated(true);

            const folderName = `${initialData.prenom}_${initialData.nom}`;
            setCreatedFolder(folderName);
            setOriginalPatientName(`${initialData.nom} ${initialData.prenom}`);

            if (initialData.admissionFolders) {
                setAdmissionFolders(initialData.admissionFolders);
            }

            // Charger les dossiers de consultation depuis le backend
            const loadConsultationFolders = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API_URL}/api/get-consultation-folders?patientFolder=${folderName}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.success) {
                        setConsultationFolders(data.consultationFolders || []);
                    }
                } catch (error) {
                    console.error('Erreur chargement consultations:', error);
                }
            };

            // 🔥 AJOUT : Charger les dossiers d'admission depuis le backend
            const loadAdmissionFolders = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API_URL}/api/get-admission-folders?patientFolder=${folderName}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await res.json();
                    if (data.success) {
                        setAdmissionFolders(data.admissionFolders || []);
                    }
                } catch (error) {
                    console.error('Erreur chargement admissions:', error);
                }
            };

            loadConsultationFolders();
            loadAdmissionFolders();
            setInitialFormState(JSON.stringify(initialData));
        } else if (mode === 'create') {
            // En mode création, l'état initial est le formulaire vide par défaut
            setInitialFormState(JSON.stringify(formData));
        }
    }, [mode, initialData]);

    // Détection des changements non sauvegardés
    useEffect(() => {
        if (initialFormState) {
            const currentFormState = JSON.stringify(formData);
            setIsDirty(currentFormState !== initialFormState);
        }
    }, [formData, initialFormState]);

    // Gestion de la navigation navigateur (Bouton Retour) et Refresh
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Standard browser string
            }
        };

        const handlePopState = (e) => {
            if (isDirty) {
                const confirmLeave = window.confirm("Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?");
                if (!confirmLeave) {
                    // Si l'utilisateur annule, on remet l'état dans l'historique pour rester sur la page
                    window.history.pushState(null, '', window.location.href);
                } else {
                    // Si l'utilisateur confirme, on appelle onBack pour gérer le démontage propre
                    // Note: c'est un peu délicat avec le routing manuel, mais on essaie de revenir
                    onBack?.();
                }
            } else {
                onBack?.();
            }
        };

        if (isDirty) {
            window.addEventListener('beforeunload', handleBeforeUnload);
            // On ajoute une entrée dans l'historique pour pouvoir intercepter le retour
            window.history.pushState(null, '', window.location.href);
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isDirty, onBack]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            // Auto-uppercase nom and prenom
            const finalValue = (name === 'nom' || name === 'prenom') ? value.toUpperCase() : value;
            const newData = { ...prev, [name]: finalValue };
            if (name === 'neLe') {
                const birthDate = new Date(value);
                const today = new Date();
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
                newData.age = age;
            }
            return newData;
        });
    };

    const updateDiagnostics = (newDiagnostics) => {
        setFormData(prev => ({ ...prev, diagnostics: newDiagnostics }));
    };

    const handleKeywordsChange = (newKeywords) => {
        setFormData(prev => ({ ...prev, motsCles: newKeywords }));
    };

    const handleOpenFolder = async () => {
        if (!createdFolder) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/open-folder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ folderName: createdFolder })
            });

            if (response.ok) {
                // Ouvrir le dossier dans l'explorateur web du serveur
                // On utilise l'URL du serveur configurée
                window.open(`${API_URL}/explorer/${createdFolder}`, '_blank');
            } else {
                const data = await response.json();
                alert(`Impossible d'ouvrir le dossier: ${data.message || 'Erreur inconnue'}`);
            }
        } catch (e) {
            console.error("Erreur ouverture dossier:", e);
            alert("Erreur lors de la tentative d'ouverture du dossier. Vérifiez que le serveur est accessible.");
        }
    };

    const handleSubmit = async () => {
        const requiredFields = [
            'nom', 'prenom', 'neLe', 'adresse', 'telephone',
            'telephone2', 'nDossier', 'cin', 'dateConsultation'
        ];

        const missingFields = requiredFields.filter(field => !formData[field]);

        if (missingFields.length > 0) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const endpoint = mode === 'create'
                ? `${API_URL}/api/patients/create`
                : `${API_URL}/api/patients/update`;

            const payload = { ...formData };

            if (mode === 'edit') {
                payload.originalPatientName = createdFolder;
            }

            const res = await fetch(endpoint, {
                method: mode === 'create' ? 'POST' : 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success) {
                if (mode === 'create') {
                    setIsCreated(true);
                    setCreatedFolder(data.dossierName);
                    setOriginalPatientName(`${formData.nom} ${formData.prenom}`);
                    alert('Patient créé avec succès !');
                } else {
                    alert('Patient mis à jour avec succès !');
                    // Mettre à jour l'état initial après sauvegarde réussie pour reset isDirty
                    setInitialFormState(JSON.stringify(payload));
                    onBack?.();
                }
            } else {
                alert('Erreur : ' + (data.error || 'Erreur inconnue'));
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde:', error);
            alert('Erreur réseau lors de la sauvegarde.');
        }
    };

    const handleCreateAdmission = async (admissionData) => {
        if (!createdFolder) return;

        try {
            const token = localStorage.getItem('token');

            const formatDateToDDMMYYYY = (dateString) => {
                const date = new Date(dateString);
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}-${month}-${year}`;
            };

            const formattedDate = formatDateToDDMMYYYY(admissionData.date);
            const admissionFolder = `Admission_${formattedDate}`;

            const res = await fetch(`${API_URL}/api/create-admission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    patientFolder: createdFolder,
                    admissionFolder: admissionFolder,
                    admissionData: {
                        date: admissionData.date,
                        description: admissionData.description
                    }
                })
            });

            const data = await res.json();

            if (data.success) {
                setAdmissionFolders(prev => [...prev, admissionFolder]);
                console.log('Admission créée avec succès:', admissionFolder);
            } else {
                alert('Erreur lors de la création du dossier d\'admission: ' + data.error);
            }
        } catch (error) {
            console.error('Erreur création admission:', error);
            alert('Erreur réseau lors de la création de l\'admission');
        }
    };

    const handleCreateConsultation = async (formattedDate) => {
        if (!createdFolder) return;

        try {
            const token = localStorage.getItem('token');
            const consultationFolder = `Consultation_${formattedDate}`;

            const res = await fetch(`${API_URL}/api/create-consultation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    patientFolder: createdFolder,
                    consultationFolder: consultationFolder
                })
            });

            const data = await res.json();

            if (data.success) {
                setConsultationFolders(prev => [...prev, consultationFolder]);
                console.log('Consultation créée avec succès:', consultationFolder);
            } else {
                alert('Erreur lors de la création du dossier de consultation: ' + data.error);
            }
        } catch (error) {
            console.error('Erreur création consultation:', error);
            alert('Erreur réseau lors de la création de la consultation');
        }
    };

    const handleDeleteAdmission = (folderName) => {
        setAdmissionFolders(prev => prev.filter(f => f !== folderName));
    };

    const handleOpenCRModal = async (admissionFolder = null) => {
        setSelectedAdmissionFolder(admissionFolder);

        try {
            const token = localStorage.getItem('token');
            let url = `${API_URL}/api/get-cr-data?patientFolder=${createdFolder}`;
            if (admissionFolder) {
                url += `&admissionFolder=${admissionFolder}`;
            }

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();

            if (data.success && data.data) {
                const loadedData = data.data;
                if (loadedData.codeActe && typeof loadedData.codeActe === 'string') {
                    loadedData.codeActe = loadedData.codeActe.split('\n');
                }
                setCrData({
                    ...loadedData,
                    medecin: loadedData.medecin || user?.fullName || user?.username || ''
                });
            } else {
                setCrData({
                    identitePatient: `${formData.nom} ${formData.prenom}, ${formData.age} ans, Sexe: ${formData.sexe}`,
                    couvertureSanitaire: '',
                    antecedents: '',
                    histoireMaladie: '',
                    medecin: user?.fullName || user?.username || '',
                    examenGeneral: '',
                    examenLocomoteur: '',
                    examenVasculoNerveux: '',
                    bilansParacliniques: '',
                    reeducation: '',
                    nomOperation: '',
                    dateOperation: new Date().toISOString().slice(0, 10),
                    dureeOperation: '',
                    protocoleOperatoire: '',
                    dateSortie: '',
                    codeActe: [],
                    operateurs: [],
                    typeAnesthesie: '',
                    installation: ''
                });
            }
        } catch (error) {
            console.error("Erreur chargement données CR:", error);
            setCrData(prev => ({
                ...prev,
                identitePatient: prev.identitePatient || `${formData.nom} ${formData.prenom}, ${formData.age} ans, Sexe: ${formData.sexe}`,
                dateOperation: prev.dateOperation || new Date().toISOString().slice(0, 10),
                medecin: prev.medecin || (user?.fullName || user?.username) || ''
            }));
        }

        setShowCRModal(true);
    };

    const handleCRChange = (e) => {
        const { name, value } = e.target;
        setCrData(prev => ({ ...prev, [name]: value }));
    };

    const handleConfirmGenerateCR = async () => {
        try {
            const token = localStorage.getItem('token');
            if (crData.nomOperation) {
                try {
                    const updatePayload = {
                        ...formData,
                        originalPatientName: createdFolder,
                        codeActe: crData.codeActe,
                        nomOperation: crData.nomOperation,
                        medecin: crData.medecin,
                        diagnostics: formData.diagnostics,
                        motsCles: formData.motsCles
                    };

                    await fetch(`${API_URL}/api/patients/update`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(updatePayload)
                    });
                    console.log("✅ Nom de l'opération sauvegardé dans infos_patient.txt");
                } catch (updateErr) {
                    console.error("Erreur lors de la mise à jour du patient:", updateErr);
                }
            }

            const formattedDiagnostics = formData.diagnostics
                .map(d => `- [${d.date}] : ${d.description}`)
                .join('\n');

            const combinedData = {
                ...formData,
                diagnostic: formattedDiagnostics,
                ...crData,
                codeActe: crData.codeActe,
                nomOperation: crData.nomOperation
            };

            const res = await fetch(`${API_URL}/api/generate-document`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    patientData: combinedData,
                    patientFolder: createdFolder,
                    admissionFolder: selectedAdmissionFolder
                })
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const fileName = `CR_${formData.nom}_${formData.prenom}.docx`;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                console.log('✅ CR généré avec succès');
                setShowCRModal(false);
            } else {
                const errData = await res.json();
                alert('Erreur lors de la génération : ' + (errData.error || 'Erreur inconnue'));
            }
        } catch (e) {
            console.error('Erreur génération CR:', e);
            alert('Erreur réseau lors de la génération du document');
        }
    };

    const handleGenerateConsent = (admissionFolder = null) => {
        setSelectedAdmissionFolder(admissionFolder);
        setCrData(prev => ({
            ...prev,
            chirurgien: formData.chirurgien || SURGEONS_LIST[0]
        }));
        setShowConsentModal(true);
    };

    const handleConfirmGenerateConsent = async () => {
        try {
            const token = localStorage.getItem('token');

            const diagnosticString = formData.diagnostics.map(d => d.description).join(' - ');

            const payload = {
                ...formData,
                diagnostic: diagnosticString,
                nomOperation: crData.nomOperation,
                operateurs: crData.operateurs.join(', '),
                chirurgien: crData.chirurgien
            };

            const res = await fetch(`${API_URL}/api/generate-consent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    patientData: payload,
                    patientFolder: createdFolder,
                    admissionFolder: selectedAdmissionFolder
                })
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const fileName = `Consentement_${formData.nom}_${formData.prenom}.docx`;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                console.log('✅ Consentement généré avec succès');
                setShowConsentModal(false);
            } else {
                const errData = await res.json();
                alert('Erreur lors de la génération : ' + (errData.error || 'Erreur inconnue'));
            }
        } catch (e) {
            console.error('Erreur génération Consentement:', e);
            alert('Erreur réseau lors de la génération du document');
        }
    };

    const handleOpenFCModal = (admissionFolder = null) => {
        setSelectedAdmissionFolder(admissionFolder);
        setSejourInput('');
        setShowFCModal(true);
    };

    const handleGenerateFC = async () => {
        try {
            const token = localStorage.getItem('token');

            let crDataLoaded = {};
            try {
                let url = `${API_URL}/api/get-cr-data?patientFolder=${createdFolder}`;
                if (selectedAdmissionFolder) {
                    url += `&admissionFolder=${selectedAdmissionFolder}`;
                }

                const crResponse = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const crResult = await crResponse.json();
                if (crResult.success && crResult.data) {
                    crDataLoaded = crResult.data;
                }
            } catch (err) {
                console.log("⚠️ Aucune donnée CR trouvée");
            }

            const combinedPatientData = {
                ...formData,
                histoireMaladie: crDataLoaded.histoireMaladie || '',
                nomOperation: crDataLoaded.nomOperation || formData.nomOperation || '',
                patientFolder: createdFolder,
                admissionFolder: selectedAdmissionFolder || null
            };

            const res = await fetch(`${API_URL}/api/generate-fiche-confidentielle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    patientData: combinedPatientData,
                    sejour: sejourInput
                })
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const fileName = `Fiche_Confidentielle_${formData.nom}_${formData.prenom}.docx`;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                console.log("✅ Fiche Confidentielle générée avec succès");
                setShowFCModal(false);
            } else {
                const data = await res.json();
                alert('❌ Erreur: ' + (data.error || 'Impossible de générer la fiche'));
            }
        } catch (e) {
            console.error("❌ Erreur génération FC:", e);
            alert('Erreur réseau lors de la génération de la FC');
        }
    };

    const handleCancel = () => {
        if (isDirty) {
            const confirmLeave = window.confirm("Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?");
            if (!confirmLeave) return;
        }

        setFormData({
            nom: '',
            prenom: '',
            neLe: '',
            age: '',
            sexe: 'Homme',
            adresse: '',
            telephone: '',
            telephone2: '',
            nDossier: '',
            hopital: 'CHU',
            chirurgien: SURGEONS_LIST[0],
            cin: '',
            diagnostics: [],
            dateConsultation: '',
            motsCles: []
        });
        setIsDirty(false); // Reset allowed since we are leaving
        setIsCreated(false);
        setCreatedFolder('');
        setOriginalPatientName('');
        setAdmissionFolders([]);
        setConsultationFolders([]);
        onBack?.();
    };

    return (
        <div className="form-layout">
            <div className="form-column">
                <h2 style={{ padding: "10px" }}>{mode === 'edit' ? '✏️ Modifier Patient' : '➕ Formulaire Patient'}</h2>

                <div className="form-row">
                    <div className="form-field">
                        <label>Nom</label>
                        <input name="nom" value={formData.nom} onChange={handleChange} />
                    </div>
                    <div className="form-field">
                        <label>Prénom</label>
                        <input name="prenom" value={formData.prenom} onChange={handleChange} />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-field">
                        <label>Né le</label>
                        <input type="date" name="neLe" value={formData.neLe} onChange={handleChange} />
                    </div>
                    <div className="form-field">
                        <label>Âge</label>
                        <input value={formData.age} readOnly />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-field">
                        <label>CIN</label>
                        <input name="cin" value={formData.cin} onChange={handleChange} />
                    </div>
                    <div className="form-field">
                        <label>Sexe</label>
                        <select name="sexe" value={formData.sexe} onChange={handleChange}>
                            <option>Homme</option>
                            <option>Femme</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-field">
                        <label>N° Dossier</label>
                        <input name="nDossier" value={formData.nDossier} onChange={handleChange} />
                    </div>
                    <div className="form-field">
                        <label>Chirurgien</label>
                        <select name="chirurgien" value={formData.chirurgien} onChange={handleChange}>
                            {SURGEONS_LIST.map((surgeon, index) => (
                                <option key={index} value={surgeon}>{surgeon}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-field">
                        <label>Hôpital</label>
                        <select name="hopital" value={formData.hopital} onChange={handleChange}>
                            <option>CHU</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-field full-width">
                        <label>Adresse</label>
                        <input name="adresse" value={formData.adresse} onChange={handleChange} />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-field">
                        <label>Téléphone 1</label>
                        <input name="telephone" value={formData.telephone} onChange={handleChange} />
                    </div>
                    <div className="form-field">
                        <label>Téléphone 2</label>
                        <input name="telephone2" value={formData.telephone2} onChange={handleChange} />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-field full-width">
                        <label>Date d'admission</label>
                        <input type="date" name="dateConsultation" value={formData.dateConsultation} onChange={handleChange} />
                    </div>
                </div>

                <div className="buttons-row">
                    <button className="button-cancel" onClick={handleCancel}>Annuler</button>
                    <button className="button-create" onClick={handleSubmit}>
                        {mode === 'edit' ? '💾 Enregistrer' : '➕ Créer'}
                    </button>
                </div>
            </div>

            <div className="side-column">
                <Diagnostics
                    diagnostics={formData.diagnostics}
                    onChange={updateDiagnostics}
                    onCreateAdmission={handleCreateAdmission}
                    onCreateConsultation={handleCreateConsultation}
                    isEditMode={mode === 'edit'}
                    onOpenFolder={handleOpenFolder}
                />

                <KeywordsSection
                    selectedKeywords={formData.motsCles}
                    onChange={handleKeywordsChange}
                />
            </div>

            <div className="side-column">
                {isCreated ? (
                    <div className="dossiers-container">
                        <DossierView
                            patientName={`${formData.prenom} ${formData.nom}`}
                            patientFolderName={createdFolder}
                            onGenerateCR={() => handleOpenCRModal()}
                            onGenerateConsent={() => handleGenerateConsent()}
                            onGenerateFC={() => handleOpenFCModal()}
                            consultationFolders={consultationFolders}
                        />

                        {admissionFolders.length > 0 && (
                            <div className="admission-separator">
                                <h3 className="admission-title">📁 Dossiers d'Admission</h3>
                            </div>
                        )}

                        {admissionFolders.map((admissionFolder, index) => (
                            <div
                                key={admissionFolder}
                                className={index < admissionFolders.length - 1 ? "admission-item" : ""}
                            >
                                <AdmissionDossierView
                                    patientFolderName={createdFolder}
                                    admissionFolder={admissionFolder}
                                    onDelete={handleDeleteAdmission}
                                    onGenerateCR={() => handleOpenCRModal(admissionFolder)}
                                    onGenerateConsent={() => handleGenerateConsent(admissionFolder)}
                                    onGenerateFC={() => handleOpenFCModal(admissionFolder)}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="info-card">
                        Créez le patient pour activer la gestion des dossiers
                    </div>
                )}
            </div>

            {/* MODALES (CR, Consentement, FC) - identiques à l'original */}
            {showCRModal && (
                <div className="admission-modal-overlay" onClick={() => setShowCRModal(false)}>
                    <div className="cr-modal" onClick={e => e.stopPropagation()}>
                        <div className="cr-modal-header">
                            <h3>📄 Compléter le Compte Rendu</h3>
                            <button className="close-modal-btn" onClick={() => setShowCRModal(false)}>×</button>
                        </div>

                        <div className="cr-modal-body">
                            <div className="cr-form-grid">
                                <div className="form-row">

                                    <div className="form-field">
                                        <label>Médecin</label>
                                        <input
                                            name="medecin"
                                            value={crData.medecin || ''}
                                            readOnly
                                            className="input-readonly"
                                        />
                                    </div>
                                </div>

                                <div className="cr-section-title">Identité & Résumé</div>
                                <div className="form-field cr-field-full">
                                    <label>Identité du Patient (Résumé)</label>
                                    <input
                                        name="identitePatient"
                                        value={crData.identitePatient}
                                        onChange={handleCRChange}
                                        placeholder="Ex: Mr X, 45 ans, admis pour..."
                                    />
                                </div>
                                <div className="form-field cr-field-full">
                                    <label>Couverture Sanitaire</label>
                                    <select name="couvertureSanitaire" value={crData.couvertureSanitaire} onChange={handleCRChange}>
                                        <option value="">Sélectionner...</option>
                                        <option value="CNOPS">CNOPS</option>
                                        <option value="CNSS">CNSS</option>
                                        <option value="AMO">AMO</option>
                                        <option value="Assurance Privée">Assurance Privée</option>
                                    </select>
                                </div>

                                <div className="cr-section-title">Antécédents & Histoire</div>
                                <div className="form-field cr-field-full">
                                    <label>Antécédents du Patient</label>
                                    <textarea name="antecedents" value={crData.antecedents} onChange={handleCRChange} rows="2" />
                                </div>
                                <div className="form-field cr-field-full">
                                    <label>Histoire de la maladie</label>
                                    <textarea name="histoireMaladie" value={crData.histoireMaladie} onChange={handleCRChange} rows="3" />
                                </div>

                                <div className="cr-section-title">Examen Clinique</div>
                                <div className="form-field cr-field-full">
                                    <label>Examen Général</label>
                                    <input name="examenGeneral" value={crData.examenGeneral} onChange={handleCRChange} />
                                </div>
                                <div className="form-field">
                                    <label>Examen Locomoteur</label>
                                    <input name="examenLocomoteur" value={crData.examenLocomoteur} onChange={handleCRChange} />
                                </div>
                                <div className="form-field">
                                    <label>Examen Vasculo-nerveux</label>
                                    <input name="examenVasculoNerveux" value={crData.examenVasculoNerveux} onChange={handleCRChange} />
                                </div>

                                <div className="cr-section-title">Bilan & Rééducation</div>
                                <div className="form-field cr-field-full">
                                    <label>Bilans Paracliniques</label>
                                    <textarea name="bilansParacliniques" value={crData.bilansParacliniques} onChange={handleCRChange} rows="2" />
                                </div>
                                <div className="form-field">
                                    <label>Nombre de séances de rééducation</label>
                                    <input name="reeducation" value={crData.reeducation} onChange={handleCRChange} placeholder="Ex: 10 séances" />
                                </div>

                                <div className="cr-section-title">Détails Opératoires</div>
                                <div className="form-field">
                                    <label>Nom de l'opération</label>
                                    <input name="nomOperation" value={crData.nomOperation} onChange={handleCRChange} />
                                </div>
                                <div className="form-field">
                                    <label>Date de l'opération</label>
                                    <input type="date" name="dateOperation" value={crData.dateOperation} onChange={handleCRChange} />
                                </div>
                                <div className="form-field cr-field-full">
                                    <label>Code Acte</label>
                                    <MultiSelectActes
                                        selectedActes={Array.isArray(crData.codeActe) ? crData.codeActe : []}
                                        onChange={(selected) => setCrData({ ...crData, codeActe: selected })}
                                    />
                                </div>
                                <div className="form-field cr-field-full">
                                    <label>Opérateurs *</label>
                                    <MultiSelectSurgeons
                                        selectedSurgeons={crData.operateurs}
                                        onChange={(selected) => setCrData({ ...crData, operateurs: selected })}
                                        placeholder="Sélectionner les opérateurs"
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Durée</label>
                                    <input name="dureeOperation" value={crData.dureeOperation} onChange={handleCRChange} />
                                </div>
                                <div className="form-field">
                                    <label>Type d'anesthésie</label>
                                    <input name="typeAnesthesie" value={crData.typeAnesthesie} onChange={handleCRChange} />
                                </div>
                                <div className="form-field">
                                    <label>Installation</label>
                                    <input name="installation" value={crData.installation} onChange={handleCRChange} />
                                </div>

                                <div className="form-field cr-field-full">
                                    <label>Protocole Opératoire</label>
                                    <textarea name="protocoleOperatoire" value={crData.protocoleOperatoire} onChange={handleCRChange} rows="4" />
                                </div>
                                <div className="form-field">
                                    <label>Date de Sortie</label>
                                    <input type="date" name="dateSortie" value={crData.dateSortie} onChange={handleCRChange} />
                                </div>

                                <div className="cr-section-title">Nature de sortie</div>
                                <div className="form-field cr-field-full nature-sortie-container">
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="natureSortie"
                                            value="normale"
                                            checked={crData.natureSortie === 'normale'}
                                            onChange={handleCRChange}
                                        />
                                        <span>Sortie normale</span>
                                    </label>

                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="natureSortie"
                                            value="provisoire"
                                            checked={crData.natureSortie === 'provisoire'}
                                            onChange={handleCRChange}
                                        />
                                        <span>Sortie provisoire</span>
                                    </label>

                                    <div className="transfert-row">
                                        <label className="radio-option">
                                            <input
                                                type="radio"
                                                name="natureSortie"
                                                value="transfert"
                                                checked={crData.natureSortie === 'transfert'}
                                                onChange={handleCRChange}
                                            />
                                            <span>Transfert vers un autre hôpital / service :</span>
                                        </label>

                                        {crData.natureSortie === 'transfert' && (
                                            <input
                                                type="text"
                                                name="lieuTransfert"
                                                value={crData.lieuTransfert}
                                                onChange={handleCRChange}
                                                placeholder="Lequel ?"
                                                className="input-transfert"
                                            />
                                        )}
                                    </div>

                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="natureSortie"
                                            value="scam"
                                            checked={crData.natureSortie === 'scam'}
                                            onChange={handleCRChange}
                                        />
                                        <span>SCAM</span>
                                    </label>

                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name="natureSortie"
                                            value="decede"
                                            checked={crData.natureSortie === 'decede'}
                                            onChange={handleCRChange}
                                        />
                                        <span>Décédé</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="cr-modal-footer">
                            <button className="button-cancel" onClick={() => setShowCRModal(false)}>Annuler</button>
                            <button className="button-generate" onClick={handleConfirmGenerateCR}>✅ Générer le Document</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE CONSENTEMENT - COMPLÈTE */}
            {showConsentModal && (
                <div className="admission-modal-overlay" onClick={() => setShowConsentModal(false)}>
                    <div className="cr-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="cr-modal-header">
                            <h3>📋 Consentement Éclairé</h3>
                            <button className="close-modal-btn" onClick={() => setShowConsentModal(false)}>×</button>
                        </div>
                        <div className="cr-modal-body">
                            <div className="form-field full-width">
                                <label>Nom de l'opération</label>
                                <input name="nomOperation" value={crData.nomOperation} onChange={handleCRChange} />
                            </div>
                            <div className="form-field full-width">
                                <label>Chirurgien</label>
                                <select name="chirurgien" value={crData.chirurgien} onChange={handleCRChange}>
                                    {SURGEONS_LIST.map((surgeon, index) => (
                                        <option key={index} value={surgeon}>{surgeon}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="cr-modal-footer">
                            <button className="button-cancel" onClick={() => setShowConsentModal(false)}>Annuler</button>
                            <button className="button-generate" onClick={handleConfirmGenerateConsent}>✅ Générer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE FICHE CONFIDENTIELLE - COMPLÈTE */}
            {showFCModal && (
                <div className="admission-modal-overlay" onClick={() => setShowFCModal(false)}>
                    <div className="cr-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="cr-modal-header">
                            <h3>📄 Fiche Confidentielle</h3>
                            <button className="close-modal-btn" onClick={() => setShowFCModal(false)}>×</button>
                        </div>
                        <div className="cr-modal-body">
                            <div className="form-field full-width">
                                <label>Séjour (Durée)</label>
                                <input
                                    type="text"
                                    value={sejourInput}
                                    onChange={(e) => setSejourInput(e.target.value)}
                                    placeholder="Ex: 5 jours / Du 12 au 17 Mars..."
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="cr-modal-footer">
                            <button className="button-cancel" onClick={() => setShowFCModal(false)}>Annuler</button>
                            <button className="button-generate" onClick={handleGenerateFC}>✅ Générer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormPatient;