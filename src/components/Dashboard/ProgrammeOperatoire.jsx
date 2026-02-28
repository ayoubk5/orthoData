import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../config';
import './ProgrammeOperatoire.css';

const PROFS = ['Prof. YACOUBI', 'Prof. NAJIB', 'Prof. TEBAA'];

// Days of the week highlighted in red for each prof (0=Sun,1=Mon,...,6=Sat)
const PROF_DAYS = {
    'Prof. YACOUBI': [1, 3],  // Monday, Wednesday
    'Prof. NAJIB': [2, 4],  // Tuesday, Thursday
    'Prof. TEBAA': [5],     // Friday
};

const PROF_COLORS = {
    'Prof. YACOUBI': '#6c5ce7',
    'Prof. NAJIB': '#0984e3',
    'Prof. TEBAA': '#00b894',
};

const DAY_NAMES = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// ─── Custom Calendar (position:fixed to escape table overflow:hidden) ──────────
const ProfCalendar = ({ value, onChange, prof }) => {
    const today = new Date();
    const initDate = value ? new Date(value + 'T00:00:00') : today;
    const [viewYear, setViewYear] = useState(initDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(initDate.getMonth());
    const [open, setOpen] = useState(false);
    const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);
    const popupRef = useRef(null);

    const profDays = PROF_DAYS[prof] || [];

    const openCalendar = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPopupPos({ top: rect.bottom + 6, left: rect.left });
        }
        setOpen(o => !o);
    };

    useEffect(() => {
        const handleOutside = (e) => {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target) &&
                popupRef.current && !popupRef.current.contains(e.target)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const toStr = (d) => {
        const m = String(viewMonth + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${viewYear}-${m}-${dd}`;
    };

    const displayVal = value
        ? new Date(value + 'T00:00:00').toLocaleDateString('fr-FR')
        : 'Choisir une date';

    return (
        <>
            <button ref={triggerRef} type="button" className="cal-trigger" onClick={openCalendar}>
                📅 {displayVal}
            </button>
            {open && (
                <div
                    ref={popupRef}
                    className="cal-popup"
                    style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, zIndex: 9999 }}
                >
                    <div className="cal-nav">
                        <button onClick={prevMonth}>‹</button>
                        <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
                        <button onClick={nextMonth}>›</button>
                    </div>
                    <div className="cal-grid">
                        {DAY_NAMES.map((n, i) => (
                            <div key={n} className={`cal-header-cell ${profDays.includes(i) ? 'cal-prof-day-header' : ''}`}>
                                {n}
                            </div>
                        ))}
                        {cells.map((d, idx) => {
                            if (!d) return <div key={`e-${idx}`} />;
                            const dayOfWeek = new Date(viewYear, viewMonth, d).getDay();
                            const isProfDay = profDays.includes(dayOfWeek);
                            const isSelected = toStr(d) === value;
                            const isToday = toStr(d) === today.toISOString().slice(0, 10);
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => { onChange(toStr(d)); setOpen(false); }}
                                    className={['cal-day', isProfDay && 'cal-day-prof', isSelected && 'cal-day-selected', isToday && 'cal-day-today'].filter(Boolean).join(' ')}
                                >
                                    {d}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
};


// ─── Auto-growing textarea ──────────────────────────────────────────────────────
const AutoTextarea = ({ value, onChange, placeholder, readOnly }) => {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) {
            ref.current.style.height = 'auto';
            ref.current.style.height = ref.current.scrollHeight + 'px';
        }
    }, [value]);
    return (
        <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            rows={1}
            className={`po-textarea ${readOnly ? 'po-textarea-locked' : ''}`}
            style={{ overflow: 'hidden', resize: 'none' }}
        />
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────────
const EMPTY_ROW = (prof = '') => ({
    date: new Date().toISOString().slice(0, 10),
    nomPrenom: '',
    diagnostic: '',
    gesteOperatoire: '',
    couvertureSanitaire: '',
    observation: '',
    prof,
});

const ProgrammeOperatoire = ({ onBack }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [profFilter, setProfFilter] = useState('');
    const [saving, setSaving] = useState(null); // row id being saved

    const token = () => localStorage.getItem('token');

    const load = async () => {
        try {
            const res = await fetch(`${API_URL}/api/programme-operatoire`, {
                headers: { Authorization: `Bearer ${token()}` }
            });
            const data = await res.json();
            if (data.success) {
                // Existing rows are locked by default
                setRows((data.rows || []).map(r => ({ ...r, _editing: false })));
            }
        } catch (e) {
            console.error('Erreur chargement programme:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleAddRow = (prof) => {
        const newRow = { ...EMPTY_ROW(prof), _isNew: true, _editing: true, _id: Date.now() };
        setRows(prev => [newRow, ...prev]);
    };

    const handleChange = (rowId, field, value) => {
        setRows(prev => prev.map(r => {
            if ((r.id ?? r._id) === rowId) {
                const finalVal = field === 'nomPrenom' ? value.toUpperCase() : value;
                return { ...r, [field]: finalVal };
            }
            return r;
        }));
    };

    const handleEdit = (rowId) => {
        setRows(prev => prev.map(r =>
            (r.id ?? r._id) === rowId ? { ...r, _editing: true } : r
        ));
    };

    const handleSave = async (row) => {
        const rowId = row.id ?? row._id;
        setSaving(rowId);
        try {
            const payload = {
                date: row.date,
                nomPrenom: row.nomPrenom,
                diagnostic: row.diagnostic,
                gesteOperatoire: row.gesteOperatoire,
                couvertureSanitaire: row.couvertureSanitaire,
                observation: row.observation,
                prof: row.prof,
            };

            if (row._isNew) {
                const res = await fetch(`${API_URL}/api/programme-operatoire`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    setRows(prev => prev.map(r =>
                        r._id === rowId ? { ...data.row, _editing: false } : r
                    ));
                }
            } else {
                const res = await fetch(`${API_URL}/api/programme-operatoire/${row.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    setRows(prev => prev.map(r =>
                        r.id === row.id ? { ...data.row, _editing: false } : r
                    ));
                }
            }
        } catch (e) {
            alert('Erreur réseau lors de la sauvegarde.');
        } finally {
            setSaving(null);
        }
    };

    const handleDelete = async (row) => {
        if (!window.confirm('Supprimer cette ligne ?')) return;
        const rowId = row.id ?? row._id;
        if (row._isNew) {
            setRows(prev => prev.filter(r => (r.id ?? r._id) !== rowId));
            return;
        }
        try {
            await fetch(`${API_URL}/api/programme-operatoire/${row.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token()}` }
            });
            setRows(prev => prev.filter(r => r.id !== row.id));
        } catch {
            alert('Erreur réseau lors de la suppression.');
        }
    };

    const filtered = rows.filter(r => {
        const q = search.toLowerCase();
        const matchSearch = !q || [r.nomPrenom, r.diagnostic, r.gesteOperatoire, r.couvertureSanitaire, r.observation, r.prof]
            .some(v => (v || '').toLowerCase().includes(q));
        const matchProf = !profFilter || r.prof === profFilter;
        return matchSearch && matchProf;
    });

    return (
        <div className="po-container">
            {/* Header */}
            <div className="po-header">
                <button className="po-back-btn" onClick={onBack}>← Retour</button>
                <div className="po-title-area">
                    <h2>🗓️ Programme Opératoire</h2>
                    <span className="po-count">{rows.length} enregistrement{rows.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Prof Buttons */}
            <div className="po-prof-btns">
                {PROFS.map(prof => (
                    <button
                        key={prof}
                        className="po-prof-btn"
                        style={{ background: PROF_COLORS[prof] }}
                        onClick={() => handleAddRow(prof)}
                    >
                        ➕ {prof}
                    </button>
                ))}
            </div>

            {/* Search + Filter */}
            <div className="po-toolbar">
                <div className="po-search-wrap">
                    <span>🔍</span>
                    <input
                        className="po-search"
                        type="text"
                        placeholder="Rechercher..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && <button className="po-clear-btn" onClick={() => setSearch('')}>✕</button>}
                </div>
                <div className="po-filter-wrap">
                    <select className="po-filter" value={profFilter} onChange={e => setProfFilter(e.target.value)}>
                        <option value="">Tous les professeurs</option>
                        {PROFS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="po-loading">Chargement...</div>
            ) : (
                <div className="po-table-wrap">
                    <table className="po-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Nom & Prénom</th>
                                <th>Diagnostic</th>
                                <th>Geste Opératoire</th>
                                <th>Couverture Sanitaire</th>
                                <th>Observation</th>
                                <th>Professeur</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="po-empty-row">
                                        {search || profFilter
                                            ? 'Aucun résultat trouvé.'
                                            : 'Aucune entrée. Cliquez sur un professeur pour commencer.'}
                                    </td>
                                </tr>
                            ) : filtered.map(row => {
                                const rowId = row.id ?? row._id;
                                const locked = !row._editing;
                                const isSaving = saving === rowId;
                                return (
                                    <tr key={rowId} className={row._isNew ? 'po-row-new' : locked ? 'po-row-locked' : ''}>
                                        {/* Date */}
                                        <td className="po-cell-date">
                                            {locked ? (
                                                <span className="po-locked-date">
                                                    {row.date
                                                        ? new Date(row.date + 'T00:00:00').toLocaleDateString('fr-FR')
                                                        : '—'}
                                                </span>
                                            ) : (
                                                <ProfCalendar
                                                    value={row.date}
                                                    onChange={val => handleChange(rowId, 'date', val)}
                                                    prof={row.prof}
                                                />
                                            )}
                                        </td>
                                        {/* Text cells */}
                                        {['nomPrenom', 'diagnostic', 'gesteOperatoire', 'couvertureSanitaire', 'observation'].map(field => (
                                            <td key={field}>
                                                <AutoTextarea
                                                    value={row[field] || ''}
                                                    onChange={e => handleChange(rowId, field, e.target.value)}
                                                    placeholder={field === 'nomPrenom' ? 'Nom et Prénom' : field}
                                                    readOnly={locked}
                                                />
                                            </td>
                                        ))}
                                        {/* Prof badge */}
                                        <td className="po-cell-prof">
                                            <span
                                                className="po-prof-badge"
                                                style={{ background: PROF_COLORS[row.prof] || '#636e72' }}
                                            >
                                                {row.prof || '—'}
                                            </span>
                                        </td>
                                        {/* Actions */}
                                        <td className="po-cell-actions">
                                            {locked ? (
                                                <button
                                                    className="po-edit-btn"
                                                    onClick={() => handleEdit(rowId)}
                                                    title="Modifier"
                                                >
                                                    ✏️
                                                </button>
                                            ) : (
                                                <button
                                                    className="po-save-btn"
                                                    onClick={() => handleSave(row)}
                                                    disabled={isSaving}
                                                    title="Enregistrer"
                                                >
                                                    {isSaving ? '⏳' : '💾'}
                                                </button>
                                            )}
                                            <button
                                                className="po-delete-btn"
                                                onClick={() => handleDelete(row)}
                                                title="Supprimer"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ProgrammeOperatoire;
