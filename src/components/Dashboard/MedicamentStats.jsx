import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import './MedicamentStats.css';

const MedicamentStats = ({ onBack }) => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/api/medicaments/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) setStats(data.stats || []);
            } catch (e) {
                console.error('Erreur chargement stats:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filtered = stats.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    const maxCount = stats.length > 0 ? stats[0].count : 1;

    return (
        <div className="medstats-container">
            <div className="medstats-header">
                <button className="medstats-back-btn" onClick={onBack}>← Retour</button>
                <div className="medstats-title-area">
                    <h2>📊 Statistiques des Médicaments</h2>
                    <p className="medstats-subtitle">
                        {stats.length} médicament{stats.length !== 1 ? 's' : ''} utilisé{stats.length !== 1 ? 's' : ''} dans les ordonnances
                    </p>
                </div>
            </div>

            <div className="medstats-search-bar">
                <span className="medstats-search-icon">🔍</span>
                <input
                    type="text"
                    placeholder="Rechercher un médicament..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="medstats-search-input"
                />
                {search && (
                    <button className="medstats-search-clear" onClick={() => setSearch('')}>✕</button>
                )}
            </div>

            {loading ? (
                <div className="medstats-loading">Chargement...</div>
            ) : filtered.length === 0 ? (
                <div className="medstats-empty">
                    {search
                        ? `Aucun médicament trouvé pour "${search}"`
                        : 'Aucune ordonnance générée pour le moment.'}
                </div>
            ) : (
                <div className="medstats-list">
                    {filtered.map((item, idx) => {
                        const pct = Math.round((item.count / maxCount) * 100);
                        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';
                        return (
                            <div key={item.name} className="medstats-item">
                                <div className="medstats-rank">
                                    {medal || <span className="medstats-rank-num">{idx + 1}</span>}
                                </div>
                                <div className="medstats-info">
                                    <div className="medstats-name-row">
                                        <span className="medstats-name">{item.name}</span>
                                        <span className="medstats-count">{item.count} fois</span>
                                    </div>
                                    <div className="medstats-bar-bg">
                                        <div
                                            className="medstats-bar-fill"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MedicamentStats;
