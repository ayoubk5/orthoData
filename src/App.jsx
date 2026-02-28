import React, { useState, useEffect } from "react";
import Header from "./components/Header/Header.jsx";
import Login from "./components/Login/Login.jsx";
import Dashboard from "./components/Dashboard/Dashboard.jsx";
import FormPatient from "./components/FormPatient/FormPatient.jsx";
import './styles/global.css';
import { API_URL } from './config';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Ajout de l'état pour stocker le patient en cours d'édition
  const [patientToEdit, setPatientToEdit] = useState(null);
  // 'dashboard' | 'add-patient' | 'edit-patient'
  const [route, setRoute] = useState('dashboard');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');

    // 1. Optimistic Login (restaurer la session immédiatement)
    if (token && saved) {
      try {
        const parsedUser = JSON.parse(saved);
        setUser(parsedUser);
      } catch (e) {
        console.error("Erreur parsing user stocké:", e);
        localStorage.removeItem('user');
      }
    }

    // 2. Vérification serveur en arrière-plan
    if (token) {
      fetch(`${API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            // Token valide : on met à jour les infos user
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          } else {
            // Token invalide (expiré ou révoqué)
            console.warn("Session expirée, déconnexion...");
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        })
        .catch((err) => {
          console.warn("Impossible de vérifier la session (serveur injoignable ?). On garde la session locale.", err);
          // On ne fait RIEN ici (on garde l'utilisateur connecté optimiste)
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setRoute('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setRoute('dashboard');
  };

  // Nouvelle fonction pour gérer la navigation vers l'édition
  const navigateToEdit = (patient) => {
    setPatientToEdit(patient);
    setRoute('edit-patient');
  };

  // Fonction de retour qui efface l'état d'édition
  const handleBack = () => {
    setPatientToEdit(null);
    setRoute('dashboard');
  }

  if (loading) {
    return <div className="loading-screen">Chargement…</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Déterminer la route à passer au FormPatient
  const currentRoute = route === 'edit-patient' ? 'edit' : 'create';

  return (
    <div className="app-shell">
      <Header user={user} onLogout={handleLogout} onNavigate={setRoute} />
      <main className="app-main">
        {/* On passe navigateToEdit au Dashboard */}
        {route === 'dashboard' && <Dashboard user={user} onNavigate={setRoute} onEditPatient={navigateToEdit} />}

        {/* Le FormPatient gère à la fois la création et l'édition */}
        {(route === 'add-patient' || route === 'edit-patient') &&
          <FormPatient
            onBack={handleBack}
            mode={currentRoute}
            initialData={patientToEdit}
            user={user}
          />
        }
      </main>
    </div>
  );
}