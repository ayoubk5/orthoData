import React, { useState } from 'react';
import './MultiSelectSurgeons.css';

// Liste des chirurgiens
const SURGEONS_LIST = [
  'Pr. YACOUBI Hicham',
  'Pr. NAJIB AbdelJaouad',
  'Pr. TEBBAA EL HASSALI',
  'Dr. EL HAICHOUR Ilyesse',
  'Dr. LAMZIRA Mohammed',
  'Dr. BEN SALAH Samir',
  'Dr. DARRAZ Sohayb',
  'Dr. BENABDELLAH ayman',
  'Dr. KHATAB zakaria',
  'Dr. ALSOUDI Issa',
  'Dr. BENALIA kamal',
  'Dr. SEFTI anas',
  'Dr. HAWACHE Hicham',
  'Dr. EL FARHAOUI amine',
  'Dr. BATOU Yassin',
  'Dr. BARZOUQ abdellilah',
  'Dr. SALMI hatim',
  'Dr. MBAINANDARA debonheur',
  'Dr. MARGOUM hamza',
  'Dr. RIFAAI Sami',
  'Dr. TARICHT anas',
  'Dr. ELMAZGALDI said',
  'Dr. SEBBAR Abdessabour',
  'Dr. ZERYOUH brahim',
  'Dr. LAABID ahmed',
  'Dr. NASSIRI omar',
  'Dr. BOULAICH noaim',
  'Dr. LAZAAR houssam',
  'Dr. DAOUDI houcine',
  'Dr. HILALI khalid',
  'Dr. HALY Alae-eddine',
  'Dr. BELFADIL reda',
  'Dr. KHERBACH achraf',
  'Dr. ATIA Alae',
  'Dr. CHALHE Ossama'
];

const MultiSelectSurgeons = ({ selectedSurgeons, onChange, placeholder = "Sélectionner les opérateurs" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelect = (surgeon) => {
    if (selectedSurgeons.includes(surgeon)) {
      // Retirer le chirurgien
      onChange(selectedSurgeons.filter(s => s !== surgeon));
    } else {
      // Ajouter le chirurgien
      onChange([...selectedSurgeons, surgeon]);
    }
  };

  const handleRemove = (surgeon, e) => {
    e.stopPropagation();
    onChange(selectedSurgeons.filter(s => s !== surgeon));
  };

  const filteredSurgeons = SURGEONS_LIST.filter(surgeon =>
    surgeon.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="multi-select-wrapper">
      <div className="multi-select-container" onClick={handleToggle}>
        <div className="multi-select-display">
          {selectedSurgeons.length === 0 ? (
            <span className="multi-select-placeholder">{placeholder}</span>
          ) : (
            <div className="selected-items">
              {selectedSurgeons.map((surgeon, idx) => (
                <span key={idx} className="selected-tag">
                  {surgeon}
                  <button
                    type="button"
                    className="remove-tag"
                    onClick={(e) => handleRemove(surgeon, e)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="multi-select-arrow">
          {isOpen ? '▲' : '▼'}
        </div>
      </div>

      {isOpen && (
        <div className="multi-select-dropdown">
          <div className="multi-select-search">
            <input
              type="text"
              placeholder="Rechercher un chirurgien..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="multi-select-options">
            {filteredSurgeons.length === 0 ? (
              <div className="no-results">Aucun résultat</div>
            ) : (
              filteredSurgeons.map((surgeon, idx) => (
                <div
                  key={idx}
                  className={`multi-select-option ${selectedSurgeons.includes(surgeon) ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(surgeon);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSurgeons.includes(surgeon)}
                    readOnly
                  />
                  <span>{surgeon}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectSurgeons;