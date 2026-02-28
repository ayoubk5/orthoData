import React from 'react';
import './DossierView.css';
import { API_URL } from '../../config';

const DossierView = ({ patientName, patientFolderName, onGenerateCR, onGenerateConsent, onGenerateFC, consultationFolders = [] }) => {
  // Définition des dossiers
  const folders = [
    { name: "Images cliniques" },
    { name: "Bilans Paracliniques", subs: ["Bilan Biologique", "Radio", "TDM", "IRM"] },
    { name: "Images scopiques" },
    { name: "Images per-Op" },
    { name: "Radiographie Post-Op" },
    { name: "Autres" }
  ];

  const handleFile = async (e, folder, sub = '') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const token = localStorage.getItem('token');
    let successCount = 0;
    let errorCount = 0;

    // Upload each file sequentially
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      form.append('patientName', patientFolderName);
      form.append('targetFolder', folder);
      if (sub) form.append('targetSubFolder', sub);

      try {
        const res = await fetch(`${API_URL}/api/upload-file`, {
          method: 'POST',
          body: form,
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        if (data.success) {
          console.log(`[Upload] Fichier ${file.name} téléversé avec succès.`);
          successCount++;
        } else {
          console.error(`[Upload Erreur] ${file.name}: ${data.error || 'Erreur inconnue'}`);
          errorCount++;
        }
      } catch (err) {
        console.error(`[Upload Erreur] ${file.name}:`, err);
        errorCount++;
      }
    }

    // Show summary message
    if (successCount > 0 && errorCount === 0) {
      alert(`✅ ${successCount} fichier(s) uploadé(s) avec succès !`);
    } else if (successCount > 0 && errorCount > 0) {
      alert(`⚠️ ${successCount} fichier(s) uploadé(s), ${errorCount} échec(s).`);
    } else {
      alert(`❌ Erreur: Aucun fichier n'a pu être uploadé.`);
    }

    e.target.value = null;
  };

  const handleConsultationFile = async (e, consultationFolder, sub = '') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const token = localStorage.getItem('token');
    let successCount = 0;
    let errorCount = 0;

    // Upload each file sequentially
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      form.append('patientName', patientFolderName);
      form.append('targetFolder', consultationFolder);
      if (sub) form.append('targetSubFolder', sub);

      try {
        const res = await fetch(`${API_URL}/api/upload-file`, {
          method: 'POST',
          body: form,
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();

        if (data.success) {
          console.log(`[Upload Consultation] Fichier ${file.name} téléversé avec succès.`);
          successCount++;
        } else {
          console.error(`[Upload Erreur] ${file.name}: ${data.error || 'Erreur inconnue'}`);
          errorCount++;
        }
      } catch (err) {
        console.error(`[Upload Erreur] ${file.name}:`, err);
        errorCount++;
      }
    }

    // Show summary message
    if (successCount > 0 && errorCount === 0) {
      alert(`✅ ${successCount} fichier(s) uploadé(s) dans ${consultationFolder}/${sub} !`);
    } else if (successCount > 0 && errorCount > 0) {
      alert(`⚠️ ${successCount} fichier(s) uploadé(s), ${errorCount} échec(s).`);
    } else {
      alert(`❌ Erreur: Aucun fichier n'a pu être uploadé.`);
    }

    e.target.value = null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Gestion des Dossiers</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onGenerateCR && onGenerateCR()}
            style={{
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            📄 CR
          </button>
          <button
            onClick={() => onGenerateConsent && onGenerateConsent()}
            style={{
              backgroundColor: '#8e44ad',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            📝 CONSENTEMENT
          </button>
          <button
            onClick={() => onGenerateFC && onGenerateFC()}
            style={{
              backgroundColor: '#1abc9c',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            📄 FC
          </button>
        </div>
      </div>
      <p>Dossier actif: <strong>{patientFolderName || patientName}</strong></p>

      {/* Dossiers de consultation */}
      {consultationFolders && consultationFolders.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{
            fontSize: '14px',
            color: '#00b894',
            marginBottom: '10px',
            padding: '8px',
            backgroundColor: '#f0fff4',
            borderRadius: '5px',
            borderLeft: '4px solid #00b894'
          }}>
            📅 Dossiers de Consultation
          </h4>
          {consultationFolders.map((consultationFolder, index) => (
            <div key={index} className="dossier-item" style={{
              backgroundColor: '#f8fff9',
              border: '1px solid #d1f2e8',
              marginBottom: '8px'
            }}>
              <div className="dossier-head" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px'
              }}>
                <strong style={{ color: '#00b894' }}>{consultationFolder}</strong>
              </div>
              <div className="sub-list centered-sub-list" style={{ padding: '0 10px 10px 10px' }}>
                {["Image Clinique", "Images Radiologiques", "Autres"].map((sub, i) => (
                  <label key={i} className="upload-btn small" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9' }}>
                    {sub}
                    <input
                      type="file"
                      multiple
                      className="hidden-file-input"
                      onChange={(e) => handleConsultationFile(e, consultationFolder, sub)}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dossiers principaux */}
      {folders.map((f, idx) => (
        <div key={idx} className="dossier-item">
          <div className="dossier-head">
            <strong>{f.name}</strong>

            {f.name !== "Bilans Paracliniques" && (
              <label className="upload-btn">
                Uploader
                <input type="file" multiple className="hidden-file-input" onChange={(e) => handleFile(e, f.name)} />
              </label>
            )}
          </div>
          {f.subs && (
            <div className="sub-list centered-sub-list">
              {f.subs.map((s, i) => (
                <label key={i} className="upload-btn small">
                  {s}
                  <input type="file" multiple className="hidden-file-input" onChange={(e) => handleFile(e, f.name, s)} />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DossierView;