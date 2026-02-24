import React, { useState, useEffect } from 'react';
import './MedicamentManager.css';

const MedicamentManager = ({ onBack }) => {
    const [medicaments, setMedicaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inputs, setInputs] = useState({});
    const [editingItem, setEditingItem] = useState(null); // { category, oldName, newName }

    useEffect(() => {
        loadMedicaments();
    }, []);

    const loadMedicaments = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://10.4.28.11:5000/api/medicaments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMedicaments(data.medicaments);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (category, value) => {
        setInputs(prev => ({ ...prev, [category]: value }));
    };

    const submitAdd = async (category) => {
        const name = inputs[category];
        if (!name || !name.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://10.4.28.11:5000/api/medicaments/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ category, name })
            });
            const data = await res.json();
            if (data.success) {
                setMedicaments(data.medicaments);
                setInputs(prev => ({ ...prev, [category]: '' }));
            } else {
                alert(data.error);
            }
        } catch (e) {
            alert('Erreur réseau');
        }
    };

    const handleDelete = async (category, name) => {
        if (!window.confirm(`Supprimer ${name} ?`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://10.4.28.11:5000/api/medicaments/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ category, name })
            });
            const data = await res.json();
            if (data.success) {
                setMedicaments(data.medicaments);
            }
        } catch (e) {
            alert('Erreur réseau');
        }
    };

    const startEdit = (category, name) => {
        setEditingItem({ category, oldName: name, newName: name });
    };

    const cancelEdit = () => {
        setEditingItem(null);
    };

    const saveEdit = async () => {
        if (!editingItem || !editingItem.newName.trim()) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://10.4.28.11:5000/api/medicaments/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    category: editingItem.category,
                    oldName: editingItem.oldName,
                    newName: editingItem.newName
                })
            });
            const data = await res.json();
            if (data.success) {
                setMedicaments(data.medicaments);
                setEditingItem(null);
            } else {
                alert(data.error);
            }
        } catch (e) {
            alert('Erreur réseau');
        }
    };

    if (loading) return <div className="loading-state">Chargement des médicaments...</div>;

    return (
        <div className="medicament-manager-container">
            <div className="medicament-header">
                <button onClick={onBack} className="back-button">
                    ⬅️ Retour Dashboard
                </button>
                <h2>💊 Gestion des Médicaments</h2>
            </div>

            <div className="medicament-grid">
                {medicaments.map((catGroup) => (
                    <div key={catGroup.category} className="medicament-card">
                        <div className="card-header">
                            <h3>{catGroup.category}</h3>
                        </div>

                        <ul className="medicament-list">
                            {catGroup.medicines.length === 0 && (
                                <li style={{ padding: '20px', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                                    Aucun médicament
                                </li>
                            )}
                            {catGroup.medicines.map(med => (
                                <li key={med} className="medicament-item">
                                    {/* Mode Edition */}
                                    {editingItem && editingItem.category === catGroup.category && editingItem.oldName === med ? (
                                        <div className="edit-mode-group">
                                            <input
                                                className="edit-input"
                                                value={editingItem.newName}
                                                onChange={(e) => setEditingItem({ ...editingItem, newName: e.target.value })}
                                                autoFocus
                                            />
                                            <button onClick={saveEdit} className="save-btn">✔</button>
                                            <button onClick={cancelEdit} className="cancel-btn">✖</button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="item-name">{med}</span>
                                            <div className="item-actions">
                                                <button
                                                    onClick={() => startEdit(catGroup.category, med)}
                                                    className="action-btn edit"
                                                    title="Modifier"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(catGroup.category, med)}
                                                    className="action-btn delete"
                                                    title="Supprimer"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>

                        <div className="card-footer">
                            <div className="add-input-group">
                                <input
                                    placeholder="Nouveau médicament..."
                                    value={inputs[catGroup.category] || ''}
                                    onChange={(e) => handleInputChange(catGroup.category, e.target.value)}
                                    // Submit on Enter key
                                    onKeyDown={(e) => e.key === 'Enter' && submitAdd(catGroup.category)}
                                />
                                <button
                                    onClick={() => submitAdd(catGroup.category)}
                                    className="add-btn"
                                    title="Ajouter"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MedicamentManager;
