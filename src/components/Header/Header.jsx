import React from 'react';
import './Header.css';

const Header = ({ user, onLogout, onNavigate }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand" onClick={() => onNavigate('dashboard')}>🏥 Ortho-DATA</div>
      </div>
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">{user.fullName || user.username}</span>
          <button className="btn-logout" onClick={onLogout}>Déconnexion</button>
        </div>
      </div>
    </header>
  );
};

export default Header;
