import React, { useState } from 'react';
import { Filter, X, Search } from 'lucide-react';
import './PatientsList.css';
import { MOCK_KEYWORDS } from '../../constants/keywords';
import DiagnosticAutocomplete from '../Shared/DiagnosticAutocomplete';
import { API_URL } from '../../config';

// =======================================================
// Composant interne pour afficher les détails du patient
// =======================================================
const PatientDetailsModal = ({ patient, onClose, onGenerate }) => {
  if (!patient) return null;

  const renderDiagnostics = () => {
    const diagText = patient.diagnostic || 'Aucun diagnostic enregistré.';
    const observation = patient.observationMedicale || 'Aucune observation médicale.';

    return (
      <div className="details-section">
        <h4 className="section-title accent">Historique/Observations</h4>
        <div className="detail-item full-width">
          <label>Observation Médicale</label>
          <p className="detail-value observation-box">{observation}</p>
        </div>
        {diagText !== 'Aucun diagnostic enregistré.' && (
          <div className="detail-item full-width">
            <label>Diagnostic / Historique</label>
            <p className="detail-value observation-box">{diagText}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="patient-details-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header-details">
          <h2>👁️ Dossier Patient: {patient.prenom} {patient.nom}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="details-section">
          <h4 className="section-title primary">Informations Personnelles</h4>
          <div className="details-grid">
            <div className="detail-item"><label>Nom</label><p className="detail-value">{patient.nom}</p></div>
            <div className="detail-item"><label>Prénom</label><p className="detail-value">{patient.prenom}</p></div>
            <div className="detail-item"><label>Né le</label><p className="detail-value">{patient.neLe || '-'}</p></div>
            <div className="detail-item"><label>Âge</label><p className="detail-value">{patient.age || '-'}</p></div>
            <div className="detail-item"><label>CIN</label><p className="detail-value">{patient.cin || '-'}</p></div>
            <div className="detail-item"><label>Sexe</label><p className="detail-value">{patient.sexe || '-'}</p></div>
          </div>
          <div className="details-grid">
            <div className="detail-item full-width"><label>Adresse</label><p className="detail-value">{patient.adresse || '-'}</p></div>
          </div>
          <div className="details-grid">
            <div className="detail-item"><label>Téléphone 1</label><p className="detail-value">{patient.telephone || '-'}</p></div>
            <div className="detail-item"><label>Téléphone 2</label><p className="detail-value">{patient.telephone2 || '-'}</p></div>
            <div className="detail-item"><label>N° Dossier</label><p className="detail-value badge-dossier-large">#{patient.nDossier}</p></div>
          </div>
        </div>

        <div className="details-section">
          <h4 className="section-title accent">Informations Hospitalières</h4>
          <div className="details-grid">
            <div className="detail-item"><label>Hôpital</label><p className="detail-value">{patient.hopital || '-'}</p></div>
            <div className="detail-item"><label>Chirurgien</label><p className="detail-value">{patient.chirurgien || '-'}</p></div>
            <div className="detail-item"><label>Date Consultation</label><p className="detail-value">{patient.dateConsultation || '-'}</p></div>
          </div>
        </div>

        {renderDiagnostics()}

        <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
          <button className="close-button-footer" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

// =======================================================
// Composant Principal
// =======================================================
const PatientsList = ({ patients, loading, onRefresh, onBack, user, onEditPatient }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  // --- PAGINATION ---
  const ITEMS_PER_PAGE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // --- ETAT POUR LA RECHERCHE AVANCÉE ---
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Mots Clés (Multi-select)
  const [keywordInput, setKeywordInput] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [keywordSuggestions, setKeywordSuggestions] = useState([]);

  // Diagnostics (Multi-select)
  const [diagnosticInput, setDiagnosticInput] = useState('');
  const [selectedDiagnostics, setSelectedDiagnostics] = useState([]);

  // --- NOUVEAU : ETAT POUR LA SORTIE PROVISOIRE (SP) ---
  const [showSPModal, setShowSPModal] = useState(false);
  const [selectedSPPatient, setSelectedSPPatient] = useState(null);
  const [spDates, setSpDates] = useState({ sortie: '', retour: '' });
  // -----------------------------------------------------

  // --- GESTION AUTOCOMPLETE MOTS CLÉS ---
  const handleKeywordInputChange = (val) => {
    setKeywordInput(val);
    if (val) {
      const filtered = MOCK_KEYWORDS.filter(k =>
        k.toLowerCase().includes(val.toLowerCase()) &&
        !selectedKeywords.includes(k)
      );
      setKeywordSuggestions(filtered.slice(0, 10));
    } else {
      setKeywordSuggestions([]);
    }
  };

  const addKeyword = (kw) => {
    if (!selectedKeywords.includes(kw)) {
      setSelectedKeywords([...selectedKeywords, kw]);
    }
    setKeywordInput('');
    setKeywordSuggestions([]);
  };

  const removeKeyword = (kw) => {
    setSelectedKeywords(selectedKeywords.filter(k => k !== kw));
  };

  // --- GESTION DIAGNOSTICS (Multi-select via Autocomplete wrapper) ---
  const handleDiagnosticSelect = (val) => {
    if (val && !selectedDiagnostics.includes(val)) {
      setSelectedDiagnostics([...selectedDiagnostics, val]);
    }
    setDiagnosticInput('');
  };

  const removeDiagnostic = (diag) => {
    setSelectedDiagnostics(selectedDiagnostics.filter(d => d !== diag));
  };


  // --- FONCTION 1 : OUVRIR LE DOSSIER WINDOWS ---
  const handleOpenFolder = async (patient) => {
    const folderName = `${patient.prenom}_${patient.nom}`;
    const safeFolderName = encodeURIComponent(folderName);
    const explorerUrl = `${API_URL}/explorer/${safeFolderName}/`;
    try {
      const token = localStorage.getItem('token');
      // On sécurise le nom du dossier comme dans le backend
      const folderName = `${patient.prenom}_${patient.nom}`;
      console.log("📂 Tentative récupération chemin:", folderName);

      const res = await fetch(`${API_URL}/api/open-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ folderName })
      });
      window.open(explorerUrl, '_blank');
      const data = await res.json();

      if (!data.success) {
        alert('Erreur: ' + (data.error || "Dossier introuvable sur le serveur"));
        return;
      }

      // 1. Récupération du chemin (compatible avec les deux versions de server.js)
      const targetPath = data.path || data.networkPath;

      if (!targetPath) {
        alert("Erreur: Le serveur n'a pas renvoyé de chemin réseau valide.");
        return;
      }

      console.log("🌐 Chemin reçu:", targetPath);

      // // 2. Fonction de copie ROBUSTE (Fonctionne en HTTP et HTTPS)
      // const copyToClipboard = async (text) => {
      //   // Méthode moderne (HTTPS ou localhost)
      //   if (navigator.clipboard && window.isSecureContext) {
      //     return navigator.clipboard.writeText(text);
      //   } else {
      //     // Méthode de secours (HTTP / Intranet)
      //     // Crée un élément texte invisible, le sélectionne et copie
      //     let textArea = document.createElement("textarea");
      //     textArea.value = text;
      //     textArea.style.position = "fixed";
      //     textArea.style.left = "-9999px";
      //     textArea.style.top = "0";
      //     document.body.appendChild(textArea);
      //     textArea.focus();
      //     textArea.select();
      //     return new Promise((resolve, reject) => {
      //       document.execCommand('copy') ? resolve() : reject();
      //       textArea.remove();
      //     });
      //   }
      // };

      // // 3. Exécution de la copie et Affichage du message
      // await copyToClipboard(targetPath);

      // const message = `✅ CHEMIN COPIÉ !\n\n` +
      //   `Le chemin réseau suivant est dans votre presse-papier :\n` +
      //   `📂 ${targetPath}\n\n` +
      //   `👉 Instructions pour ouvrir :\n` +
      //   `1. Ouvrez l'Explorateur de fichiers (Win + E)\n` +
      //   `2. Cliquez dans la barre d'adresse en haut\n` +
      //   `3. Collez (Ctrl + V) et faites Entrée`;

      // alert(message);

    } catch (e) {
      console.error("Erreur handleOpenFolder:", e);
      alert("Impossible de contacter le serveur ou de copier le chemin.");
    }
  };

  // --- FONCTION 2 : GÉNÉRER LE DOCUMENT WORD (CR) ---
  const handleGenerateDocument = async (patient) => {
    try {
      const token = localStorage.getItem('token');
      console.log("📄 Demande de génération du document...");

      const res = await fetch(`${API_URL}/api/generate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patientData: patient
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = `CR_${patient.nom}_${patient.prenom}.docx`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log('✅ Document téléchargé avec succès');
      } else {
        const data = await res.json();
        alert('Erreur: ' + (data.error || 'Impossible de générer le document'));
      }
    } catch (e) {
      console.error('Erreur génération document:', e);
      alert('Erreur réseau lors de la génération du document');
    }
  };

  // --- NOUVEAU : FONCTIONS POUR LA SORTIE PROVISOIRE (SP) ---
  const handleOpenSPModal = (patient) => {
    setSelectedSPPatient(patient);
    setSpDates({ sortie: '', retour: '' });
    setShowSPModal(true);
  };

  const handleGenerateSP = async () => {
    if (!selectedSPPatient || !spDates.sortie || !spDates.retour) {
      alert("Veuillez remplir les deux dates.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      console.log("📄 Demande de génération SP pour:", selectedSPPatient.nom);

      const res = await fetch(`${API_URL}/api/generate-sortie-provisoire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patientData: selectedSPPatient,
          dateSortie: spDates.sortie,
          dateRetour: spDates.retour
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = `Sortie_Provisoire_${selectedSPPatient.nom}.docx`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setShowSPModal(false);
        setSelectedSPPatient(null);
      } else {
        const data = await res.json();
        alert('Erreur: ' + (data.error || 'Impossible de générer la sortie provisoire'));
      }
    } catch (e) {
      console.error(e);
      alert('Erreur réseau lors de la génération de la SP');
    }
  };
  // -----------------------------------------------------------

  // --- GESTION DE LA SUPPRESSION ---
  const handleDeleteConfirmed = async () => {
    const patientToDelete = deleteConfirmation;
    setDeleteConfirmation(null);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const folderName = `${patientToDelete.prenom}_${patientToDelete.nom}`;

      const res = await fetch(`${API_URL}/api/patients/${folderName}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        onRefresh();
      } else {
        setError(data.error || 'Erreur lors de la suppression.');
      }
    } catch (e) {
      setError('Erreur réseau lors de la suppression.');
      console.error(e);
    }
  };

  const handleDeleteClick = (patient) => {
    setDeleteConfirmation(patient);
  };

  // --- FILTRAGE DES PATIENTS ---

  const handleDownloadZip = async (patient) => {
    try {
      const folderName = `${patient.prenom}_${patient.nom}`;
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/api/download-folder?folderName=${folderName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${folderName}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Erreur lors du téléchargement du dossier.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau.");
    }
  };


  const handleDownloadLastCR = async (patient) => {
    try {
      const folderName = `${patient.prenom}_${patient.nom}`;
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/api/download-last-cr?folderName=${folderName}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Get filename from header or default
        const contentDisposition = res.headers.get('Content-Disposition');
        let fileName = `CR_${folderName}.docx`;
        if (contentDisposition && contentDisposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(contentDisposition);
          if (matches != null && matches[1]) {
            fileName = matches[1].replace(/['"]/g, '');
          }
        }
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const err = await res.json();
        alert(`Erreur: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau");
    }
  };

  // Reset to page 1 whenever filters change
  React.useEffect(() => { setCurrentPage(1); }, [search, selectedKeywords, selectedDiagnostics]);

  const filtered = patients.filter(p => {
    const s = search.toLowerCase();

    // 1. Recherche Textuelle Globale
    const matchesSearch = (
      (p.prenom || '').toLowerCase().includes(s) ||
      (p.nom || '').toLowerCase().includes(s) ||
      (p.nDossier || '').includes(search) ||
      (p.chirurgien || '').toLowerCase().includes(s)
    );

    // 2. Filtre par Mot Clé (AND logic)
    const pKeywords = p.motsCles || p.keywords || p.motsCle || [];
    const matchesKeywords = selectedKeywords.length === 0 || selectedKeywords.every(k =>
      pKeywords.some(pk => pk.toLowerCase().includes(k.toLowerCase()))
    );

    // 3. Filtre par Diagnostic (AND logic)
    const pDiagnostic = (p.diagnostic || '').toLowerCase();
    const matchesDiagnostics = selectedDiagnostics.length === 0 || selectedDiagnostics.every(d =>
      pDiagnostic.includes(d.toLowerCase())
    );

    return matchesSearch && matchesKeywords && matchesDiagnostics;
  });

  if (loading) {
    return (
      <div className="patients-section">
        <button className="back-button" onClick={onBack}>← Retour</button>
        <div className="empty-state">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="patients-section">
      <button className="back-button" onClick={onBack}>← Retour</button>
      <div className="patients-header">
        <h2>📋 Gestion des Patients</h2>
      </div>

      {error && <div className="error-message danger">{error}</div>}

      <div className="patients-controls-container">
        <div className="patients-controls">
          <div className="search-wrapper">
            <input
              className="search-input"
              placeholder="🔍 Rechercher (Nom, Dossier, Chirurgien)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className={`advanced-search-btn ${showAdvanced ? 'active' : ''}`}
            onClick={() => setShowAdvanced(!showAdvanced)}
            title="Recherche Avancée"
          >
            <Filter size={18} /> Filtres
          </button>
          <button className="refresh-button" onClick={onRefresh}>🔄 Actualiser</button>
        </div>

        {showAdvanced && (
          <div className="advanced-search-panel">
            {/* --- FILTRE MOTS CLÉS --- */}
            <div className="filter-group">
              <label>Mots Clés:</label>
              <div className="autocomplete-wrapper">
                <input
                  type="text"
                  placeholder="Ajouter un mot clé..."
                  value={keywordInput}
                  onChange={(e) => handleKeywordInputChange(e.target.value)}
                  className="filter-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && keywordInput) {
                      addKeyword(keywordInput);
                    }
                  }}
                />
                {keywordSuggestions.length > 0 && (
                  <ul className="suggestions-list">
                    {keywordSuggestions.map((kw, idx) => (
                      <li key={idx} onClick={() => addKeyword(kw)}>{kw}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                className="add-filter-btn"
                onClick={() => {
                  if (keywordInput) {
                    addKeyword(keywordInput);
                  }
                }}
                disabled={!keywordInput}
              >
                + Ajouter
              </button>
              {/* Tags sélectionnés */}
              <div className="selected-tags">
                {selectedKeywords.map((kw, idx) => (
                  <span key={idx} className="filter-tag keyword-tag">
                    {kw}
                    <X size={12} onClick={() => removeKeyword(kw)} className="remove-tag-icon" />
                  </span>
                ))}
              </div>
            </div>

            {/* --- FILTRE DIAGNOSTICS --- */}
            <div className="filter-group">
              <label>Diagnostics:</label>
              <div style={{ width: '250px' }}>
                <DiagnosticAutocomplete
                  value={diagnosticInput}
                  onChange={(val) => {
                    setDiagnosticInput(val);
                  }}
                  onSelect={(val) => {
                    // Logique handled by button "+" pour consistence ou si AutoComplete supporte
                  }}
                  placeholder="Chercher un diagnostic..."
                />
              </div>
              <button
                className="add-filter-btn"
                onClick={() => {
                  if (diagnosticInput) {
                    handleDiagnosticSelect(diagnosticInput);
                  }
                }}
                disabled={!diagnosticInput}
              >
                + Ajouter
              </button>

              {/* Tags sélectionnés */}
              <div className="selected-tags">
                {selectedDiagnostics.map((diag, idx) => (
                  <span key={idx} className="filter-tag diagnostic-tag">
                    {diag}
                    <X size={12} onClick={() => removeDiagnostic(diag)} className="remove-tag-icon" />
                  </span>
                ))}
              </div>
            </div>

            {(selectedKeywords.length > 0 || selectedDiagnostics.length > 0) && (
              <button
                className="clear-filters-btn"
                onClick={() => {
                  setSelectedKeywords([]);
                  setSelectedDiagnostics([]);
                  setKeywordInput('');
                  setDiagnosticInput('');
                }}
              >
                <X size={14} /> Tout Effacer
              </button>
            )}
          </div>
        )}
      </div>

      {/* --- MODAL CONFIRMATION SUPPRESSION --- */}
      {deleteConfirmation && (
        <div className="confirmation-modal">
          <div className="modal-content">
            <p>
              Voulez-vous vraiment supprimer le patient{' '}
              <strong>{deleteConfirmation.prenom} {deleteConfirmation.nom}</strong> ?
            </p>
            <div className="modal-actions">
              <button className="button-cancel" onClick={() => setDeleteConfirmation(null)}>Annuler</button>
              <button className="button-delete" onClick={handleDeleteConfirmed}>Confirmer la suppression</button>
            </div>
          </div>
        </div>
      )}

      {/* --- NOUVEAU : MODAL SORTIE PROVISOIRE (SP) --- */}
      {showSPModal && (
        <div className="modal-overlay" onClick={() => setShowSPModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'left' }}>
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#333' }}>🚪 Sortie Provisoire</h3>
              <small style={{ color: '#666' }}>Pour: <strong>{selectedSPPatient?.prenom} {selectedSPPatient?.nom}</strong></small>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#444' }}>
                Date de Sortie :
              </label>
              <input
                type="date"
                className="search-input"
                value={spDates.sortie}
                onChange={(e) => setSpDates({ ...spDates, sortie: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#444' }}>
                Date de Retour :
              </label>
              <input
                type="date"
                className="search-input"
                value={spDates.retour}
                onChange={(e) => setSpDates({ ...spDates, retour: e.target.value })}
              />
            </div>

            <div className="modal-actions" style={{ justifyContent: 'flex-end', gap: '10px', display: 'flex' }}>
              <button
                className="button-cancel"
                onClick={() => setShowSPModal(false)}
                style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #ddd', background: '#ff0000ff', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateSP}
                style={{
                  padding: '10px 15px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#3498db', // Bleu
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                Générer Word
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ----------------------------------------------------- */}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔭</div>
          <h3>Aucun patient trouvé</h3>
        </div>
      ) : (
        <div className="patients-table-container">
          <table className="patients-table">
            <thead>
              <tr>
                <th>Prénom</th>
                <th>Nom</th>
                <th>N° Dossier</th>
                <th>Chirurgien</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((p, i) => (
                <tr key={i} className="patient-row">
                  <td className="cell-prenom">{p.prenom}</td>
                  <td className="cell-nom">{p.nom}</td>
                  <td className="cell-dossier">
                    <span className="badge-dossier">#{p.nDossier}</span>
                  </td>
                  <td className="cell-chirurgien">{p.chirurgien}</td>
                  <td className="cell-actions">
                    {/* --- ACTIONS SPECIFIQUES PAR ROLE --- */}

                    {/* CAS THÉSARD : SEULEMENT DOWNLOAD ZIP */}
                    {user.role === 'thesard' && (
                      <button
                        className="download-btn"
                        title="Télécharger ZIP"
                        onClick={() => handleDownloadZip(p)}
                      >
                        📥
                      </button>
                    )}

                    {/* CAS SECRÉTAIRE : SEULEMENT DOWNLOAD CR */}
                    {user.role === 'secretaire' && (
                      <button
                        className="download-btn"
                        title="Télécharger dernier CR"
                        onClick={() => handleDownloadLastCR(p)}
                        style={{ backgroundColor: '#8e44ad' }} // Purple for CR
                      >
                        📄
                      </button>
                    )}

                    {/* CAS STANDARD (ADMIN / USER) - TOUS LES BOUTONS */}
                    {['admin', 'user'].includes(user.role) && (
                      <>
                        <button
                          className="view-btn"
                          title="Voir Dossier"
                          onClick={() => setSelected(p)}
                        >
                          👁
                        </button>
                        <button
                          className="edit-btn"
                          title="Modifier"
                          onClick={() => onEditPatient(p)}
                          style={{ marginLeft: '5px' }}
                        >
                          ✏️
                        </button>
                        {user.role === 'admin' && (
                          <button
                            className="delete-btn"
                            title="Supprimer"
                            onClick={() => handleDeleteClick(p)}
                            style={{ marginLeft: '5px' }}
                          >
                            🗑
                          </button>
                        )}
                        {user.role === 'admin' && (
                          <button
                            className="folder-btn"
                            title="Ouvrir Dossier Local"
                            onClick={() => handleOpenFolder(p)}
                            style={{ marginLeft: '5px' }}
                          >
                            📂
                          </button>
                        )}
                        <button
                          className="sp-btn"
                          title="Sortie Provisoire"
                          onClick={() => handleOpenSPModal(p)}
                          style={{ marginLeft: '5px' }}
                        >
                          SP
                        </button>
                        <button
                          className="download-btn"
                          title="Télécharger ZIP"
                          onClick={() => handleDownloadZip(p)}
                          style={{ marginLeft: '5px' }}
                        >
                          📥
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* --- PAGINATION CONTROLS --- */}
          {filtered.length > ITEMS_PER_PAGE && (
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ‹ Précédent
              </button>
              <span className="pagination-info">
                Page {currentPage} / {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                <span className="pagination-total"> — {filtered.length} patient{filtered.length > 1 ? 's' : ''}</span>
              </span>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filtered.length / ITEMS_PER_PAGE), p + 1))}
                disabled={currentPage === Math.ceil(filtered.length / ITEMS_PER_PAGE)}
              >
                Suivant ›
              </button>
            </div>
          )}
        </div>
      )}

      <PatientDetailsModal
        patient={selected}
        onClose={() => setSelected(null)}
        onGenerate={handleGenerateDocument}
      />
    </div>
  );
};

export default PatientsList;