import React, { useState, useRef, useEffect } from 'react';
import './MultiSelectActes.css';
import { ACTES_LIST } from '../../constants/actesList';

const MultiSelectActes = ({ selectedActes = [], onChange, placeholder = "Sélectionner les codes actes" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const handleSelect = (acte) => {
        if (selectedActes.includes(acte)) {
            onChange(selectedActes.filter(a => a !== acte));
        } else {
            onChange([...selectedActes, acte]);
        }
    };

    const handleRemove = (acte, e) => {
        e.stopPropagation();
        onChange(selectedActes.filter(a => a !== acte));
    };

    // Filter logic
    const filteredCategories = ACTES_LIST.map(category => {
        const filteredItems = category.items.filter(item =>
            item.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return {
            ...category,
            items: filteredItems
        };
    }).filter(category => category.items.length > 0);

    return (
        <div className="multi-select-actes-wrapper" ref={dropdownRef}>
            <div className="multi-select-actes-container" onClick={handleToggle}>
                <div className="multi-select-actes-display">
                    {selectedActes.length === 0 ? (
                        <span className="multi-select-actes-placeholder">{placeholder}</span>
                    ) : (
                        <div className="selected-items">
                            {selectedActes.map((acte, idx) => {
                                // Extract code for shorter display tag if possible (e.g., "A103 : ...")
                                const code = acte.split(':')[0].trim();
                                const display = code.length < 10 ? code : acte.substring(0, 15) + '...';

                                return (
                                    <span key={idx} className="selected-acte-tag" title={acte}>
                                        {display}
                                        <button
                                            type="button"
                                            className="remove-acte-tag"
                                            onClick={(e) => handleRemove(acte, e)}
                                        >
                                            ✕
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="multi-select-actes-arrow">
                    {isOpen ? '▲' : '▼'}
                </div>
            </div>

            {isOpen && (
                <div className="multi-select-actes-dropdown">
                    <div className="multi-select-actes-search">
                        <input
                            type="text"
                            placeholder="Rechercher un code ou une description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    <div className="multi-select-actes-options">
                        {filteredCategories.length === 0 ? (
                            <div className="no-results">Aucun résultat</div>
                        ) : (
                            filteredCategories.map((category, catIdx) => (
                                <div key={catIdx} className="actes-category-group">
                                    <div className="actes-category-header">{category.category}</div>
                                    {category.items.map((acte, itemIdx) => (
                                        <div
                                            key={`${catIdx}-${itemIdx}`}
                                            className={`multi-select-actes-option ${selectedActes.includes(acte) ? 'selected' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSelect(acte);
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedActes.includes(acte)}
                                                readOnly
                                            />
                                            <span className="acte-text">{acte}</span>
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectActes;
