import React, { useState, useEffect, useRef } from 'react';
import './OrdonnanceModal.css';
import { API_URL } from '../../config';

const OrdonnanceModal = ({ isOpen, onClose }) => {
    const [patientData, setPatientData] = useState({
        nom: '',
        prenom: '',
        date: new Date().toISOString().slice(0, 10)
    });

    const [rows, setRows] = useState([{ id: 1, name: '', dosage: '' }]);
    const [medicamentsData, setMedicamentsData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // State for focused inputs to show suggestions
    const [activeSuggestionRow, setActiveSuggestionRow] = useState(null);
    const suggestionTimeout = useRef(null);

    useEffect(() => {
        if (isOpen) {
            // Reset form data when opening
            setPatientData({
                nom: '',
                prenom: '',
                date: new Date().toISOString().slice(0, 10)
            });
            setRows([{ id: Date.now(), name: '', dosage: '' }]);
            loadMedicaments();
        }
    }, [isOpen]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveSuggestionRow(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const loadMedicaments = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/medicaments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMedicamentsData(data.medicaments);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const addRow = () => {
        setRows([...rows, { id: Date.now(), name: '', dosage: '' }]);
    };

    const removeRow = (id) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id, field, value) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleFocus = (rowId, e) => {
        e.stopPropagation();
        setActiveSuggestionRow(rowId);
    }

    const handleSelectMedicine = (rowId, medName) => {
        updateRow(rowId, 'name', medName);
        setActiveSuggestionRow(null);
    };

    const handleGenerate = async () => {
        if (!patientData.nom || !patientData.prenom) {
            alert("Veuillez remplir le nom et prénom du patient.");
            return;
        }
        const validRows = rows.filter(r => r.name.trim() !== '');
        if (validRows.length === 0) {
            alert("Veuillez ajouter au moins un médicament.");
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/generate-ordonnance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    patientData,
                    medicinesList: validRows
                })
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const fileName = `Ordonnance_${patientData.nom}_${patientData.prenom}.docx`;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                onClose();
            } else {
                const err = await res.json();
                alert('Erreur: ' + err.error);
            }
        } catch (e) {
            console.error(e);
            alert('Erreur réseau');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="ordonnance-modal-overlay" onClick={onClose}>
            <div className="ordonnance-modal-content" onClick={e => e.stopPropagation()}>

                <div className="modal-header">
                    <h2>💊 Créer une Ordonnance</h2>
                </div>

                <div className="patient-section">
                    <div className="form-group">
                        <label>Nom Patient</label>
                        <input
                            className="form-input"
                            value={patientData.nom}
                            onChange={e => setPatientData({ ...patientData, nom: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Prénom Patient</label>
                        <input
                            className="form-input"
                            value={patientData.prenom}
                            onChange={e => setPatientData({ ...patientData, prenom: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ flex: '0 0 150px' }}>
                        <label>Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={patientData.date}
                            onChange={e => setPatientData({ ...patientData, date: e.target.value })}
                        />
                    </div>
                </div>

                <div className="medicines-section">
                    <h3>Liste des Médicaments</h3>

                    {rows.map((row, index) => (
                        <div key={row.id} className="medicine-row">
                            <div className="row-index">{index + 1}</div>

                            <div className="medicine-input-wrapper">
                                <input
                                    className="form-input"
                                    placeholder="Rechercher médicament..."
                                    value={row.name}
                                    onChange={e => updateRow(row.id, 'name', e.target.value)}
                                    onFocus={(e) => handleFocus(row.id, e)}
                                    onClick={(e) => handleFocus(row.id, e)}
                                    autoComplete="off"
                                />
                                {/* Custom Dropdown */}
                                {activeSuggestionRow === row.id && (
                                    <ul className="suggestions-list">
                                        {medicamentsData.map(group => {
                                            const filteredMeds = group.medicines.filter(m =>
                                                m.toLowerCase().includes(row.name.toLowerCase())
                                            );
                                            if (filteredMeds.length === 0) return null;
                                            return (
                                                <React.Fragment key={group.category}>
                                                    <li className="suggestion-category">{group.category}</li>
                                                    {filteredMeds.map(med => (
                                                        <li
                                                            key={med}
                                                            className="suggestion-item"
                                                            onClick={(e) => { e.stopPropagation(); handleSelectMedicine(row.id, med); }}
                                                        >
                                                            {med}
                                                        </li>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>

                            <div style={{ flex: 1.5 }}>
                                <input
                                    className="form-input"
                                    placeholder="Posologie (ex: 1cp x 3/J pdt 5jours)"
                                    value={row.dosage}
                                    onChange={e => updateRow(row.id, 'dosage', e.target.value)}
                                />
                            </div>

                            {rows.length > 1 && (
                                <button
                                    className="delete-btn"
                                    onClick={() => removeRow(row.id)}
                                    title="Supprimer la ligne"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}

                    <button className="add-btn-row" onClick={addRow}>
                        + Ajouter un médicament
                    </button>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Annuler
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleGenerate}
                        disabled={isLoading}
                        style={{ opacity: isLoading ? 0.7 : 1 }}
                    >
                        {isLoading ? 'Génération...' : '🖨️ Générer l\'Ordonnance'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default OrdonnanceModal;
