import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import PatientsList from './PatientsList.jsx';
import UsersList from '../UsersList/UsersList.jsx';
import CertificateModal from './CertificateModal.jsx';
import FeuilleSoinModal from './FeuilleSoinModal.jsx';
import MedicamentManager from './MedicamentManager.jsx';
import MedicamentStats from './MedicamentStats.jsx';
import ProgrammeOperatoire from './ProgrammeOperatoire.jsx';
import OrdonnanceModal from './OrdonnanceModal.jsx';
import { API_URL } from '../../config';

const Dashboard = ({ user, onNavigate, onEditPatient }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [patients, setPatients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showFeuilleSoinModal, setShowFeuilleSoinModal] = useState(false);
  const [showOrdonnanceModal, setShowOrdonnanceModal] = useState(false);
  const [stats, setStats] = useState(null);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/patients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (e) {
      console.error(e);
    }
    finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    if (user.role !== 'admin') return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    }
    finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (user.role !== 'admin') return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Erreur chargement stats:", e);
    }
  };

  useEffect(() => {
    if (activeTab === 'patients') loadPatients();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'home' && user.role === 'admin') loadStats();
  }, [activeTab]);

  return (
    <div>
      {activeTab === 'home' && (
        <div className="dashboard-home">
          <h1>Bienvenue, {user.fullName || user.username}</h1>
          <div className="dashboard-actions">
            {['admin', 'user'].includes(user.role) && (
              <button className="card" onClick={() => onNavigate('add-patient')}>
                ➕ Ajouter un patient
              </button>
            )}
            <button className="card" onClick={() => setActiveTab('patients')}>
              📋 Patients
            </button>
            {user.role === 'admin' && (
              <button className="card" onClick={() => setActiveTab('users')}>
                👥 Utilisateurs
              </button>
            )}
            {['admin', 'user'].includes(user.role) && (
              <button
                className="card"
                onClick={() => setShowCertificateModal(true)}
              >
                📄 Certificat Médical
              </button>
            )}
            {['admin', 'user'].includes(user.role) && (
              <>
                <button
                  className="card"
                  onClick={() => setShowFeuilleSoinModal(true)}
                >
                  🏥 Feuille de soin
                </button>
                <button
                  className="card"
                  onClick={() => setShowOrdonnanceModal(true)}
                  style={{ background: '#d63031', color: 'white' }}
                >
                  💊 Ordonnance
                </button>
              </>
            )}

            {user.role === 'admin' && (
              <button
                className="card"
                onClick={() => setActiveTab('medicaments')}
                style={{ background: '#6c5ce7', color: 'white' }}
              >
                💉 Config. Médicaments
              </button>
            )}

            {user.role === 'admin' && (
              <button
                className="card"
                onClick={() => setActiveTab('programme')}
                style={{ background: 'linear-gradient(135deg, #0f3460, #16213e)', color: 'white' }}
              >
                🗓️ Programme Opératoire
              </button>
            )}

            {['admin', 'user'].includes(user.role) && (
              <button
                className="card"
                onClick={() => setActiveTab('medstats')}
                style={{ background: '#00b894', color: 'white' }}
              >
                📊 Stats Médicaments
              </button>
            )}

          </div>

          {/* Section Statistiques Admin */}
          {user.role === 'admin' && stats && (
            <div style={{ marginTop: '50px', textAlign: 'left' }}>
              <h2 style={{ color: '#6c5ce7', marginBottom: '20px' }}>📊 Statistiques Administrateur</h2>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{
                  background: 'white', padding: '20px', borderRadius: '15px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.05)', flex: 1, textAlign: 'center'
                }}>
                  <h3 style={{ margin: 0, color: '#555' }}>Total Patients</h3>
                  <p style={{ fontSize: '40px', fontWeight: 'bold', color: '#6c5ce7', margin: '10px 0 0 0' }}>
                    {stats.patientsCount}
                  </p>
                </div>
                <div style={{
                  background: 'white', padding: '20px', borderRadius: '15px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.05)', flex: 1, textAlign: 'center'
                }}>
                  <h3 style={{ margin: 0, color: '#555' }}>Total Utilisateurs</h3>
                  <p style={{ fontSize: '40px', fontWeight: 'bold', color: '#00b894', margin: '10px 0 0 0' }}>
                    {stats.usersCount}
                  </p>
                </div>
              </div>

              <h3 style={{ color: '#e17055', marginBottom: '15px' }}>🗑️ Historique des Suppressions</h3>
              <div style={{
                background: 'white', borderRadius: '15px', overflow: 'hidden',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)', maxHeight: '250px', overflowY: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: '#f8f9fa' }}>
                    <tr>
                      <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #eee' }}>Date</th>
                      <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #eee' }}>Type</th>
                      <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #eee' }}>Nom / ID</th>
                      <th style={{ padding: '15px', textAlign: 'left', borderBottom: '2px solid #eee' }}>Par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.deletedLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                          Aucune suppression enregistrée.
                        </td>
                      </tr>
                    ) : (
                      stats.deletedLogs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '12px 15px' }}>{log.date}</td>
                          <td style={{ padding: '12px 15px' }}>
                            <span style={{
                              padding: '5px 10px', borderRadius: '20px', fontSize: '12px',
                              background: log.type === 'Patient' ? '#ffeaa7' : log.type === 'Admission' ? '#fab1a0' : '#81ecec',
                              color: '#2d3436'
                            }}>
                              {log.type}
                            </span>
                          </td>
                          <td style={{ padding: '12px 15px', fontWeight: '500' }}>{log.name}</td>
                          <td style={{ padding: '12px 15px', color: '#666' }}>{log.performedBy}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {activeTab === 'patients' && (
        <PatientsList
          patients={patients}
          loading={loading}
          onRefresh={loadPatients}
          onBack={() => setActiveTab('home')}
          user={user}
          onEditPatient={onEditPatient}
        />
      )}

      {activeTab === 'users' && user.role === 'admin' && (
        <UsersList
          users={users}
          loading={loading}
          onRefresh={loadUsers}
          onBack={() => setActiveTab('home')}
        />
      )}

      {activeTab === 'medicaments' && user.role === 'admin' && (
        <MedicamentManager
          onBack={() => setActiveTab('home')}
        />
      )}

      {activeTab === 'medstats' && (
        <MedicamentStats
          onBack={() => setActiveTab('home')}
        />
      )}

      {activeTab === 'programme' && user.role === 'admin' && (
        <ProgrammeOperatoire
          onBack={() => setActiveTab('home')}
        />
      )}

      {/* Modal Certificat */}
      <CertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
      />

      {/* Modal Feuille de Soin */}
      <FeuilleSoinModal
        isOpen={showFeuilleSoinModal}
        onClose={() => setShowFeuilleSoinModal(false)}
      />
      <OrdonnanceModal
        isOpen={showOrdonnanceModal}
        onClose={() => setShowOrdonnanceModal(false)}
      />
    </div>
  );
};

export default Dashboard;