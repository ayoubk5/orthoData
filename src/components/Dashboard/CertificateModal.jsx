import React, { useState } from 'react';
import './CertificateModal.css';

// Liste des chirurgiens
const SURGEONS_LIST = [
  'Pr. YACOUBI Hicham',
  'Pr. NAJIB AbdelJaouad',
  'Pr. TEBBAA EL HASSALI',
  'Dr. EL HAICHOUR Ilyesse',
  'Dr. LAMZIRA Mohammed',
  'Dr. BEN SALAH Samir',
  'Dr. DARRAZ Sohayb',
  'Dr. BENABDELLAH ayman',
  'Dr. KHATAB zakaria',
  'Dr. ALSOUDI Issa',
  'Dr. BENALIA kamal',
  'Dr. SEFTI anas',
  'Dr. HAWACHE Hicham',
  'Dr. EL FARHAOUI amine',
  'Dr. BATOU Yassin',
  'Dr. BARZOUQ abdellilah',
  'Dr. SALMI hatim',
  'Dr. MBAINANDARA debonheur',
  'Dr. MARGOUM hamza',
  'Dr. RIFAAI Sami',
  'Dr. TARICHT anas',
  'Dr. ELMAZGALDI said',
  'Dr. SEBBAR Abdessabour',
  'Dr. ZERYOUH brahim',
  'Dr. LAABID ahmed',
  'Dr. NASSIRI omar',
  'Dr. BOULAICH noaim',
  'Dr. LAZAAR houssam',
  'Dr. DAOUDI houcine',
  'Dr. HILALI khalid',
  'Dr. HALY Alae-eddine',
  'Dr. BELFADIL reda',
  'Dr. KHERBACH achraf',
  'Dr. ATIA Alae',
  'Dr. CHALHE Ossama'
];

const CertificateModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    chirurgien: '',
    nom_complet: '',
    cin: '',
    diagnostic: '',
    traitement: '',
    nombre: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.chirurgien || !formData.nom_complet || !formData.cin || 
        !formData.diagnostic || !formData.traitement || !formData.nombre) {
      setError('Tous les champs sont obligatoires');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://10.4.28.11:5000/api/generate-certificate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ certificateData: formData })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificat_Medical_${formData.nom_complet.replace(/[^a-z0-9]/gi, '_')}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Reset form and close
        setFormData({
          date: new Date().toISOString().split('T')[0],
          chirurgien: '',
          nom_complet: '',
          cin: '',
          diagnostic: '',
          traitement: '',
          nombre: ''
        });
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la génération du certificat');
      }
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content certificate-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📄 Générer un Certificat Médical</h2>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>

        <form onSubmit={handleSubmit} className="certificate-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Chirurgien *</label>
              <select
                name="chirurgien"
                value={formData.chirurgien}
                onChange={handleChange}
                required
              >
                <option value="">Sélectionner un chirurgien</option>
                {SURGEONS_LIST.map((surgeon, idx) => (
                  <option key={idx} value={surgeon}>{surgeon}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nom Complet du Patient *</label>
              <input
                type="text"
                name="nom_complet"
                value={formData.nom_complet}
                onChange={handleChange}
                placeholder="Ex: M. Ahmed Benali"
                required
              />
            </div>

            <div className="form-group">
              <label>CIN *</label>
              <input
                type="text"
                name="cin"
                value={formData.cin}
                onChange={handleChange}
                placeholder="Ex: AB123456"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Diagnostic *</label>
            <textarea
              name="diagnostic"
              value={formData.diagnostic}
              onChange={handleChange}
              placeholder="Ex: Fracture du fémur droit..."
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label>Traitement *</label>
            <textarea
              name="traitement"
              value={formData.traitement}
              onChange={handleChange}
              placeholder="Ex: Réduction et immobilisation plâtrée..."
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label>Durée de Repos (jours) *</label>
            <input
              type="number"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ex: 30"
              min="1"
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn-generate" disabled={loading}>
              {loading ? 'Génération...' : '📥 Générer le Certificat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CertificateModal;