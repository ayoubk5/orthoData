import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { DIAGNOSTICS_LIST } from '../../constants/diagnosticsList';
import './DiagnosticAutocomplete.css';

const DiagnosticAutocomplete = ({ value, onChange, onSelect, clearOnSelect = false, placeholder = "Rechercher ou saisir un diagnostic..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filteredDiagnostics, setFilteredDiagnostics] = useState([]);
    const wrapperRef = useRef(null);

    useEffect(() => {
        // Filtrer la liste en fonction de la valeur actuelle
        if (value) {
            const filtered = DIAGNOSTICS_LIST.filter(diag =>
                diag.toLowerCase().includes(value.toLowerCase()) &&
                diag.toLowerCase() !== value.toLowerCase() // Ne pas montrer si c'est déjà exactement ce qu'on a tapé
            );
            setFilteredDiagnostics(filtered);
        } else {
            setFilteredDiagnostics([]);
        }
    }, [value]);

    useEffect(() => {
        // Fermer le menu si on clique dehors
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        onChange(newValue);
        setIsOpen(true);
    };

    const handleSelect = (diag) => {
        if (onSelect) {
            onSelect(diag);
        }

        if (clearOnSelect) {
            onChange('');
        } else {
            onChange(diag);
        }
        setIsOpen(false);
    };

    const handleFocus = () => {
        // Si le champ est vide, on peut montrer quelques suggestions par défaut ou rien
        // Ici on choisit de montrer les suggestions si on a commencé à taper
        if (value) {
            setIsOpen(true);
        }
    };

    return (
        <div className="diagnostic-autocomplete-wrapper" ref={wrapperRef}>
            <div className="diagnostic-input-container">
                <div className="diagnostic-search-icon">
                    <Search size={18} />
                </div>
                <input
                    type="text"
                    className="diagnostic-input"
                    placeholder={placeholder}
                    value={value}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                />
            </div>

            {isOpen && filteredDiagnostics.length > 0 && (
                <ul className="diagnostic-dropdown">
                    {filteredDiagnostics.map((diag, index) => (
                        <li key={index} onClick={() => handleSelect(diag)}>
                            {diag}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default DiagnosticAutocomplete;
