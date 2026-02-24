import React, { useState } from 'react';
import DiagnosticAutocomplete from '../Shared/DiagnosticAutocomplete';
import './DiagnosticSection.css';

export default function Diagnostics({ diagnostics, onChange, onCreateAdmission, isEditMode, onOpenFolder, onCreateConsultation }) {
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [admissionData, setAdmissionData] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: ''
  });
  const [consultationDate, setConsultationDate] = useState(new Date().toISOString().slice(0, 10));

  // State for the "Add Diagnostic" section
  const [newDiagDate, setNewDiagDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState('');

  const handleAddDiagnostic = (diagDescription) => {
    const newDiag = {
      id: Date.now(),
      date: newDiagDate,
      description: diagDescription
    };
    // Add to top of list
    onChange([newDiag, ...diagnostics]);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      onChange(diagnostics.filter(d => d.id !== itemToDelete));
      setItemToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const requestDelete = (id) => {
    setItemToDelete(id);
    setShowDeleteModal(true);
  };

  const handleAdmissionSubmit = () => {
    if (!admissionData.date || !admissionData.description.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    // Formater la date en JJ-MM-YYYY
    const formatDateToDDMMYYYY = (dateString) => {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const formattedDate = formatDateToDDMMYYYY(admissionData.date);

    // Créer un diagnostic spécial pour l'admission
    const admissionDiagnostic = {
      id: Date.now(),
      date: admissionData.date,
      description: admissionData.description,
      isAdmission: true,
      admissionFolder: `Admission_${formattedDate}`
    };

    // Ajouter le diagnostic à la liste
    onChange([admissionDiagnostic, ...diagnostics]);

    // Appeler la fonction de création d'admission
    if (onCreateAdmission) {
      onCreateAdmission(admissionData);
    }

    // Réinitialiser et fermer
    setAdmissionData({
      date: new Date().toISOString().slice(0, 10),
      description: ''
    });
    setShowAdmissionModal(false);
  };



  const handleConsultationSubmit = () => {
    if (!consultationDate) {
      alert('Veuillez sélectionner une date');
      return;
    }

    // Formater la date en JJ-MM-YYYY
    const formatDateToDDMMYYYY = (dateString) => {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const formattedDate = formatDateToDDMMYYYY(consultationDate);

    // Appeler la fonction de création de consultation
    if (onCreateConsultation) {
      onCreateConsultation(formattedDate);
    }

    // Réinitialiser et fermer
    setConsultationDate(new Date().toISOString().slice(0, 10));
    setShowConsultationModal(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px' }}>
        <h2 style={{ margin: 0 }}>Historique des Diagnostics</h2>
        {isEditMode && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onOpenFolder}
              style={{
                backgroundColor: '#6c5ce7',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Ouvrir le dossier patient"
            >
              📂 Dossier
            </button>
            <button
              onClick={() => setShowConsultationModal(true)}
              style={{
                backgroundColor: '#00b894',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Créer un dossier de consultation"
            >
              📅 Consultation
            </button>
          </div>
        )}
      </div>

      {/* Add Section */}
      <div className="add-diagnostic-section" style={{ padding: '15px 17px', background: '#f8f9fa', borderBottom: '1px solid #e0e0e0', marginBottom: '15px' }}>
        <div style={{ marginBottom: '5px', fontSize: '0.9em', color: '#666', fontWeight: '600' }}>Ajouter un diagnostic :</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="date"
            value={newDiagDate}
            onChange={e => setNewDiagDate(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ flex: 1 }}>
            <DiagnosticAutocomplete
              value={searchTerm}
              onChange={setSearchTerm}
              onSelect={handleAddDiagnostic}
              clearOnSelect={true}
              placeholder="Rechercher et ajouter..."
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '0 17px', maxHeight: '400px', overflowY: 'auto' }}>
        {diagnostics.length === 0 && (
          <div style={{ color: '#888', fontStyle: 'italic', padding: '10px', textAlign: 'center' }}>
            Aucun diagnostic enregistré.
          </div>
        )}

        {diagnostics.map((d) => (
          <div key={d.id} className="diag-entry" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
            padding: '10px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #eee',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              fontWeight: '600',
              color: '#555',
              minWidth: '90px',
              fontSize: '0.9em',
              background: '#f1f2f6',
              padding: '4px 8px',
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              {d.date}
            </div>

            <div style={{ flex: 1, fontSize: '0.95em', color: '#2c3e50' }}>
              {d.description}
              {d.isAdmission && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '0.75em',
                  background: '#e1f5fe',
                  color: '#0288d1',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  Admission
                </span>
              )}
            </div>

            <button
              onClick={() => requestDelete(d.id)}
              className="delete-btn"
              title="Supprimer"
              style={{
                background: 'none',
                border: 'none',
                color: '#e74c3c',
                cursor: 'pointer',
                fontSize: '20px',
                padding: '0 5px',
                lineHeight: '1'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 15, paddingBottom: '10px' }}>
        {isEditMode && (
          <button
            className="admission-btn"
            onClick={() => setShowAdmissionModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#764ba2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 2px 5px rgba(118, 75, 162, 0.3)'
            }}
          >
            🏥 Nouvelle Admission
          </button>
        )}
      </div>

      {/* Modal d'admission */}
      {showAdmissionModal && (
        <div className="admission-modal-overlay" onClick={() => setShowAdmissionModal(false)}>
          <div className="admission-modal" onClick={e => e.stopPropagation()}>
            <div className="admission-modal-header">
              <h3>🏥 Nouvelle Admission</h3>
              <button
                className="close-modal-btn"
                onClick={() => setShowAdmissionModal(false)}
              >
                ×
              </button>
            </div>

            <div className="admission-modal-body">
              <div className="admission-field">
                <label>Date d'admission</label>
                <input
                  type="date"
                  value={admissionData.date}
                  onChange={e => setAdmissionData({ ...admissionData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    marginTop: '5px'
                  }}
                />
              </div>

              <div className="admission-field" style={{ marginTop: '15px' }}>
                <label>Diagnostic</label>
                <DiagnosticAutocomplete
                  value={admissionData.description}
                  onChange={val => setAdmissionData({ ...admissionData, description: val })}
                  placeholder="Description du diagnostic..."
                />
              </div>
            </div>

            <div className="admission-modal-footer">
              <button
                className="button-cancel"
                onClick={() => setShowAdmissionModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                className="button-generate"
                onClick={handleAdmissionSubmit}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginLeft: '10px'
                }}
              >
                ✅ Générer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de consultation */}
      {showConsultationModal && (
        <div className="admission-modal-overlay" onClick={() => setShowConsultationModal(false)}>
          <div className="admission-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="admission-modal-header">
              <h3>📅 Nouvelle Consultation</h3>
              <button
                className="close-modal-btn"
                onClick={() => setShowConsultationModal(false)}
              >
                ×
              </button>
            </div>

            <div className="admission-modal-body">
              <div className="admission-field">
                <label>Date de consultation</label>
                <input
                  type="date"
                  value={consultationDate}
                  onChange={e => setConsultationDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    marginTop: '5px'
                  }}
                />
              </div>
            </div>

            <div className="admission-modal-footer">
              <button
                className="button-cancel"
                onClick={() => setShowConsultationModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                className="button-generate"
                onClick={handleConsultationSubmit}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#00b894',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginLeft: '10px'
                }}
              >
                ✅ Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {showDeleteModal && (
        <div className="admission-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="admission-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="admission-modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 style={{ color: '#e74c3c' }}>⚠️ Confirmation</h3>
            </div>
            <div className="admission-modal-body" style={{ textAlign: 'center', padding: '20px' }}>
              <p>Êtes-vous sûr de vouloir supprimer ce diagnostic ?</p>
              <p style={{ fontSize: '0.9em', color: '#666' }}>Cette action est irréversible.</p>
            </div>
            <div className="admission-modal-footer" style={{ justifyContent: 'center' }}>
              <button
                className="button-cancel"
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                className="button-generate"
                onClick={confirmDelete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginLeft: '10px'
                }}
              >
                🗑️ Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}