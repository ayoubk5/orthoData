import React from 'react';
import './DossierView.css';

const AdmissionDossierView = ({ patientFolderName, admissionFolder, onDelete, onGenerateCR, onGenerateConsent, onGenerateFC }) => {
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
      form.append('patientFolder', patientFolderName);
      form.append('admissionFolder', admissionFolder);
      form.append('targetFolder', folder);
      if (sub) form.append('targetSubFolder', sub);

      try {
        const res = await fetch('http://10.4.28.11:5000/api/upload-admission-file', {
          method: 'POST',
          body: form,
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
          console.log(`[Upload Admission] Fichier ${file.name} téléversé avec succès.`);
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
      alert(`✅ ${successCount} fichier(s) uploadé(s) avec succès dans ${admissionFolder} !`);
    } else if (successCount > 0 && errorCount > 0) {
      alert(`⚠️ ${successCount} fichier(s) uploadé(s), ${errorCount} échec(s).`);
    } else {
      alert(`❌ Erreur: Aucun fichier n'a pu être uploadé.`);
    }

    e.target.value = null;
  };

  const handleDelete = async () => {
    if (!window.confirm(`Voulez-vous vraiment supprimer l'admission "${admissionFolder}" ? Cette action est irréversible.`)) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://10.4.28.11:5000/api/delete-admission', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          patientFolder: patientFolderName,
          admissionFolder: admissionFolder
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('Admission supprimée avec succès');
        if (onDelete) onDelete(admissionFolder);
      } else {
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (e) {
      console.error(e);
      alert('Erreur réseau lors de la suppression');
    }
  };

  return (
    <div style={{
      marginTop: '20px',
      borderTop: '2px solid #667eea',
      paddingTop: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      padding: '20px',
      position: 'relative'
    }}>
      <h4 style={{ color: '#667eea', margin: 0 }}>
        📁 {admissionFolder}
      </h4>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onGenerateCR && onGenerateCR(admissionFolder)}
            style={{
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📄 Générer CR
          </button>
          <button
            onClick={() => onGenerateConsent && onGenerateConsent()}
            style={{
              backgroundColor: '#8e44ad',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: '12px'
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
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📄 FC
          </button>
          <button
            onClick={handleDelete}
            style={{
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🗑️ Supprimer
          </button>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
        Uploadez des fichiers dans cette admission
      </p>

      {folders.map((f, idx) => (
        <div key={idx} className="dossier-item" style={{ marginBottom: '15px' }}>
          <div className="dossier-head">
            <strong style={{ fontSize: '16px' }}>{f.name}</strong>

            {/* Afficher le bouton Uploader pour tous les dossiers sauf Bilans Paracliniques */}
            {f.name !== "Bilans Paracliniques" && (
              <label className="upload-btn">
                📤 Uploader
                <input
                  type="file"
                  multiple
                  className="hidden-file-input"
                  onChange={(e) => handleFile(e, f.name)}
                />
              </label>
            )}
          </div>

          {/* Afficher les sous-dossiers pour Bilans Paracliniques */}
          {f.subs && (
            <div className="sub-list centered-sub-list" style={{ marginTop: '10px' }}>
              {f.subs.map((s, i) => (
                <label key={i} className="upload-btn small">
                  {s}
                  <input
                    type="file"
                    multiple
                    className="hidden-file-input"
                    onChange={(e) => handleFile(e, f.name, s)}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdmissionDossierView;