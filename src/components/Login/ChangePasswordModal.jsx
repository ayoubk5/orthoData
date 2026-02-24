import React, { useState } from 'react';
import './ChangePasswordModal.css';

const ChangePasswordModal = ({ isOpen, onClose, onSubmit }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        if (newPassword.length < 4) {
            setError("Le mot de passe doit contenir au moins 4 caractères.");
            return;
        }

        onSubmit(newPassword);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Changer votre mot de passe</h2>
                <p>C'est votre première connexion. Veuillez changer votre mot de passe pour continuer.</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nouveau mot de passe</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirmer le mot de passe</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    <button type="submit" className="submit-btn">Enregistrer</button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
