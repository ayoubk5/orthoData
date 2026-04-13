import React, { useState } from 'react';
import './CertificateModal.css'; // Reuse styles for consistency
import { API_URL } from '../../config';

const FeuilleSoinModal = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGenerate = async (type) => {
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/generate-feuille-soin?type=${type}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Assuming the backend returns the correct MIME type and filename, 
                // but we can enforce a name here too.
                // The template files are PDFs, so we expect a PDF.
                a.download = `Feuille_Soin_${type.toUpperCase()}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                onClose();
            } else {
                const data = await res.json();
                setError(data.error || 'Erreur lors du téléchargement');
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
            <div className="modal-content certificate-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
                <div className="modal-header">
                    <h2>🏥 Feuille de Soin</h2>
                    <button className="close-btn" onClick={onClose}>✖</button>
                </div>

                <div className="certificate-form">
                    {error && <div className="error-message">{error}</div>}

                    <p style={{ marginBottom: '20px', color: '#666' }}>
                        Veuillez sélectionner le type de feuille de soin à imprimer :
                    </p>

                    <div className="modal-actions" style={{ justifyContent: 'center', gap: '15px' }}>
                        <button
                            className="btn-generate"
                            onClick={() => handleGenerate('cnss')}
                            disabled={loading}
                            style={{ background: '#00b894', minWidth: '120px' }}
                        >
                            {loading ? '...' : 'CNSS'}
                        </button>
                        <button
                            className="btn-generate"
                            onClick={() => handleGenerate('cnops')}
                            disabled={loading}
                            style={{ background: '#0984e3', minWidth: '120px' }}
                        >
                            {loading ? '...' : 'CNOPS'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeuilleSoinModal;
