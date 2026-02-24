import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus } from 'lucide-react';
import './KeywordsSection.css';
import { MOCK_KEYWORDS } from '../../constants/keywords';

const KeywordsSection = ({ selectedKeywords = [], onChange, value }) => {
	const [searchTerm, setSearchTerm] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const [availableKeywords, setAvailableKeywords] = useState(MOCK_KEYWORDS);
	const wrapperRef = useRef(null);
	const effectiveSelectedKeywords = value !== undefined ? value : selectedKeywords;

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

	const filteredKeywords = availableKeywords.filter(kw =>
		kw.toLowerCase().includes(searchTerm.toLowerCase()) &&
		!effectiveSelectedKeywords.includes(kw)
	);

	const handleSelect = (keyword) => {
		const newKeywords = [...effectiveSelectedKeywords, keyword];
		onChange(newKeywords);
		setSearchTerm('');
		// On garde le menu ouvert pour en sélectionner d'autres
	};

	const handleRemove = (keywordToRemove) => {
		const newKeywords = effectiveSelectedKeywords.filter(kw => kw !== keywordToRemove);
		onChange(newKeywords);
	};

	const handleAddNew = () => {
		if (searchTerm && !availableKeywords.includes(searchTerm) && !effectiveSelectedKeywords.includes(searchTerm)) {
			const newKeywords = [...effectiveSelectedKeywords, searchTerm];
			onChange(newKeywords);
			setSearchTerm('');
		}
	};

	return (
		<div className="keywords-section" ref={wrapperRef}>
			<h3 className="keywords-title">🏷️ Mots Clés</h3>

			<div className="keywords-input-wrapper">
				<div className="search-icon">
					<Search size={18} />
				</div>
				<input
					type="text"
					className="keywords-search-input"
					placeholder="Rechercher ou ajouter un mot clé..."
					value={searchTerm}
					onChange={(e) => {
						setSearchTerm(e.target.value);
						setIsOpen(true);
					}}
					onFocus={() => setIsOpen(true)}
				/>
				{searchTerm && !filteredKeywords.length && !effectiveSelectedKeywords.includes(searchTerm) && (
					<button className="add-new-btn" onClick={handleAddNew}>
						<Plus size={16} /> Ajouter "{searchTerm}"
					</button>
				)}
			</div>

			{isOpen && filteredKeywords.length > 0 && (
				<ul className="keywords-dropdown">
					{filteredKeywords.map((kw, index) => (
						<li key={index} onClick={() => handleSelect(kw)}>
							{kw}
						</li>
					))}
				</ul>
			)}

			<div className="selected-keywords-container">
				{effectiveSelectedKeywords.map((kw, index) => (
					<span key={index} className="keyword-tag">
						{kw}
						<button onClick={() => handleRemove(kw)} className="remove-tag-btn">
							<X size={14} />
						</button>
					</span>
				))}
			</div>
		</div>
	);
};

export default KeywordsSection;
