import React, { useState } from 'react';
import './Login.css';
import ChangePasswordModal from './ChangePasswordModal';
import { API_URL } from '../../config';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [tempUser, setTempUser] = useState(null);

  const submit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Règle importante: Remplacer alert() par un affichage UI
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        if (data.user.forcePasswordChange) {
          setTempToken(data.token);
          setTempUser(data.user);
          setShowChangePassword(true);
        } else {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          onLogin(data.user);
        }
      } else {
        // Afficher l'erreur dans l'UI
        setError(data.error || 'Erreur de connexion : Vérifiez vos identifiants.');
      }
    } catch (err) {
      // Afficher l'erreur réseau dans l'UI
      setError('Erreur réseau. Le serveur est peut-être inaccessible.');
    } finally { setLoading(false); }
  };

  const handleChangePassword = async (newPassword) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();

      if (data.success) {
        // Update user object to remove flag
        const updatedUser = { ...tempUser, forcePasswordChange: false };

        localStorage.setItem('token', tempToken);
        localStorage.setItem('user', JSON.stringify(updatedUser));

        setShowChangePassword(false);
        onLogin(updatedUser);
      } else {
        alert(data.error || "Erreur lors du changement de mot de passe");
      }
    } catch (err) {
      alert("Erreur réseau lors du changement de mot de passe");
    }
  };

  // Icône Médicale SVG
  const MedicalIcon = () => (
    <img
      src="/orthodata/public/logo.png"
      alt="Logo"
      width="350"
      height="350"
    />
  );

  // Icône Utilisateur SVG
  const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  );

  // Icône Verrou SVG
  const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
  );

  return (
    <div className="login-page">
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSubmit={handleChangePassword}
      />

      <form className="login-card" onSubmit={submit}>

        <MedicalIcon />


        {error && <div className="error-message">{error}</div>}

        <div className="input-group">
          <UserIcon />
          <input
            placeholder="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            aria-label="Nom d'utilisateur"
          />
        </div>

        <div className="input-group">
          <LockIcon />
          <input
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label="Mot de passe"
          />
        </div>

        <div className="login-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;