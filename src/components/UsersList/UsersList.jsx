import React, { useState } from 'react';
import './UsersList.css';
import { API_URL } from '../../config';

const UsersList = ({ users, loading, onRefresh, onBack }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', role: 'user' });
  const [error, setError] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { id: 1, username: 'admin' }

  // Gère les changements du formulaire d'ajout d'utilisateur
  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // Soumission du formulaire d'ajout
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (data.success) {
        setForm({ username: '', password: '', fullName: '', role: 'user' });
        setShowAdd(false);
        onRefresh();
      } else {
        setError(data.error || "Erreur lors de la création de l'utilisateur.");
      }
    } catch (e) {
      setError('Erreur réseau. Impossible de contacter le serveur.');
    }
  };

  // Gestion de la suppression (avec remplacement du `confirm()` par l'état `deleteConfirmation`)
  const handleDelete = async (id, username) => {
    setDeleteConfirmation(null); // Réinitialiser la confirmation
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        onRefresh();
      } else {
        setError(data.error || "Erreur lors de la suppression de l'utilisateur.");
      }
    } catch (e) {
      setError('Erreur réseau lors de la suppression.');
    }
  };

  if (loading) return <div className="empty-state">Chargement...</div>;

  return (
    <div className="users-section">
      <button className="back-button" onClick={onBack}>← Retour</button>

      <div className="section-header">
        <h2>👥 Gestion des utilisateurs</h2>
        <div className="section-actions">
          <button className="refresh-button" onClick={onRefresh} title="Actualiser la liste">🔄</button>
          <button className="add-user-button" onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Annuler' : '➕ Ajouter'}</button>
        </div>
      </div>

      {error && <div className="error-message danger">{error}</div>}

      {/* Formulaire d'ajout d'utilisateur */}
      {showAdd && (
        <form className="add-user-form" onSubmit={handleSubmit}>
          <input name="fullName" placeholder="Nom complet" value={form.fullName} onChange={handleChange} required />
          <input name="username" placeholder="Nom d'utilisateur" value={form.username} onChange={handleChange} required />
          <input name="password" placeholder="Mot de passe" type="password" value={form.password} onChange={handleChange} required />
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="user">Médecin</option>
            <option value="admin">Administrateur</option>
          </select>
          <button type="submit">Créer</button>
        </form>
      )}

      {/* Modale de Confirmation de Suppression (remplace confirm()) */}
      {deleteConfirmation && (
        <div className="confirmation-modal">
          <div className="modal-content">
            <p>Voulez-vous vraiment supprimer l'utilisateur <strong>{deleteConfirmation.username}</strong> ?</p>
            <div className="modal-actions">
              <button className="button-cancel" onClick={() => setDeleteConfirmation(null)}>Annuler</button>
              <button
                className="button-delete"
                onClick={() => handleDelete(deleteConfirmation.id, deleteConfirmation.username)}
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grille d'affichage des utilisateurs */}
      <div className="users-grid">
        {users.length === 0 ? (
          <div className="empty-state-list">Aucun utilisateur trouvé.</div>
        ) : (
          users.map(u => (
            <div key={u.id} className="user-card">
              <div className="user-avatar">{u.role === 'admin' ? '👑' : '👤'}</div>
              <div className="user-info">
                <h3>{u.fullName}</h3>
                <p>@{u.username}</p>
              </div>
              <div className="user-actions">
                {/* On déclenche la modale de confirmation ici */}
                <button
                  className="action-btn delete-btn"
                  title={`Supprimer ${u.username}`}
                  onClick={() => setDeleteConfirmation({ id: u.id, username: u.username })}
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UsersList;