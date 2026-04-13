import React, { useMemo, useState, useEffect } from 'react';
import { API_URL } from '../../config';
import './ProgrammeOperatoire.css';

const PROFS = ['Prof. YACOUBI', 'Prof. NAJIB', 'Prof. TEBBAA EL HASSALI'];

const PROF_COLORS = {
    'Prof. YACOUBI': '#6c5ce7',
    'Prof. NAJIB': '#0984e3',
    'Prof. TEBBAA EL HASSALI': '#00b894',
};

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const getWeekStart = (date) => {
    const value = new Date(date);
    const day = value.getDay();
    const diff = (day + 6) % 7; // Monday start
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() - diff);
    return value;
};

const addDays = (date, days) => {
    const value = new Date(date);
    value.setDate(value.getDate() + days);
    return value;
};

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const EMPTY_ROW = (prof = '') => ({
    date: new Date().toISOString().slice(0, 10),
    nomPrenom: '',
    diagnostic: '',
    gesteOperatoire: '',
    couvertureSanitaire: '',
    observation: '',
    prof,
});

const ProgrammeOperatoire = ({ onBack, user }) => {
    const isAdmin = user?.role === 'admin';
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profFilter, setProfFilter] = useState('');
    const [saving, setSaving] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState(EMPTY_ROW(PROFS[0]));
    const [selectedWeekStart, setSelectedWeekStart] = useState(getWeekStart(new Date()));

    const token = () => localStorage.getItem('token');

    const load = async () => {
        try {
            const res = await fetch(`${API_URL}/api/programme-operatoire`, {
                headers: { Authorization: `Bearer ${token()}` }
            });
            const data = await res.json();
            if (data.success) {
                setRows(data.rows || []);
            }
        } catch (e) {
            console.error('Erreur chargement programme:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        setCurrentDate(new Date(selectedWeekStart.getFullYear(), selectedWeekStart.getMonth(), 1));
    }, [selectedWeekStart]);

    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const openDayModal = (dateStr) => {
        setSelectedDate(dateStr);
        setEditingId(null);
        setFormData({ ...EMPTY_ROW(profFilter || PROFS[0]), date: dateStr });
        setModalOpen(true);
    };

    const handleFormChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: field === 'nomPrenom' ? value.toUpperCase() : value
        }));
    };

    const startCreate = () => {
        setEditingId(null);
        setFormData({ ...EMPTY_ROW(profFilter || PROFS[0]), date: selectedDate });
    };

    const startEdit = (row) => {
        setEditingId(row.id);
        setFormData({
            date: row.date || selectedDate,
            nomPrenom: row.nomPrenom || '',
            diagnostic: row.diagnostic || '',
            gesteOperatoire: row.gesteOperatoire || '',
            couvertureSanitaire: row.couvertureSanitaire || '',
            observation: row.observation || '',
            prof: row.prof || PROFS[0],
        });
    };

    const handleSave = async () => {
        if (!isAdmin) return;
        setSaving(editingId || 'new');
        try {
            const payload = {
                date: selectedDate,
                nomPrenom: formData.nomPrenom,
                diagnostic: formData.diagnostic,
                gesteOperatoire: formData.gesteOperatoire,
                couvertureSanitaire: formData.couvertureSanitaire,
                observation: formData.observation,
                prof: formData.prof,
            };
            if (editingId) {
                const res = await fetch(`${API_URL}/api/programme-operatoire/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    setRows(prev => prev.map(r => (r.id === editingId ? data.row : r)));
                }
            } else {
                const res = await fetch(`${API_URL}/api/programme-operatoire`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    setRows(prev => [data.row, ...prev]);
                }
            }
            startCreate();
        } catch (e) {
            alert('Erreur réseau lors de la sauvegarde.');
        } finally {
            setSaving(null);
        }
    };

    const handleDelete = async (rowId) => {
        if (!isAdmin) return;
        if (!window.confirm('Supprimer cette ligne ?')) return;
        try {
            await fetch(`${API_URL}/api/programme-operatoire/${rowId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token()}` }
            });
            setRows(prev => prev.filter(r => r.id !== rowId));
            if (editingId === rowId) startCreate();
        } catch {
            alert('Erreur réseau lors de la suppression.');
        }
    };

    const filtered = rows.filter(r => !profFilter || r.prof === profFilter);

    const groupedByDate = useMemo(() => {
        return filtered.reduce((acc, row) => {
            const key = row.date;
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {});
    }, [filtered]);

    const selectedDayRows = useMemo(() => groupedByDate[selectedDate] || [], [groupedByDate, selectedDate]);

    const monthYearLabel = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const mondayStartOffset = (firstDay.getDay() + 6) % 7;
    const calendarCells = [];

    for (let i = 0; i < mondayStartOffset; i++) {
        calendarCells.push({ key: `empty-${i}`, empty: true });
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = formatDate(dateObj);
        const isToday = dateStr === formatDate(new Date());
        calendarCells.push({
            key: dateStr,
            dateStr,
            day,
            isToday,
            operations: groupedByDate[dateStr] || [],
        });
    }

    const handlePrintWeek = () => {
        const weekDates = Array.from({ length: 7 }, (_, index) => formatDate(addDays(selectedWeekStart, index)));

        const rowsByDate = weekDates.reduce((acc, date) => {
            acc[date] = rows
                .filter((r) => r.date === date)
                .sort((a, b) => (a.prof || '').localeCompare(b.prof || ''));
            return acc;
        }, {});

        const totalOps = weekDates.reduce((sum, date) => sum + rowsByDate[date].length, 0);
        if (totalOps === 0) {
            alert('Aucune opération trouvée pour cette semaine.');
            return;
        }

        const weekStartText = new Date(weekDates[0] + 'T00:00:00').toLocaleDateString('fr-FR');
        const weekEndText = new Date(weekDates[6] + 'T00:00:00').toLocaleDateString('fr-FR');
        const weekLabel = `${weekStartText} - ${weekEndText}`;

        const daySections = weekDates.map((date, index) => {
            const dayOps = rowsByDate[date];
            const dayLabel = `${DAY_NAMES[index]} ${new Date(date + 'T00:00:00').toLocaleDateString('fr-FR')}`;
            if (dayOps.length === 0) {
                return `
                    <section class="day-block">
                      <h3>${escapeHtml(dayLabel)}</h3>
                      <p class="empty">Aucune opération.</p>
                    </section>
                `;
            }

            const opsHtml = dayOps.map((op, idx) => `
                <div class="op-card">
                  <div class="op-title">
                    <span class="op-index">${idx + 1}</span>
                    <span class="op-name">${escapeHtml(op.nomPrenom || 'Sans nom')}</span>
                    <span class="op-prof">${escapeHtml(op.prof || '—')}</span>
                  </div>
                  <div class="op-grid">
                    <div><b>Diagnostic</b><p>${escapeHtml(op.diagnostic || '—')}</p></div>
                    <div><b>Geste Opératoire</b><p>${escapeHtml(op.gesteOperatoire || '—')}</p></div>
                    <div><b>Couverture Sanitaire</b><p>${escapeHtml(op.couvertureSanitaire || '—')}</p></div>
                    <div><b>Observation</b><p>${escapeHtml(op.observation || '—')}</p></div>
                  </div>
                </div>
            `).join('');

            return `
                <section class="day-block">
                  <h3>${escapeHtml(dayLabel)} <small>(${dayOps.length} opération${dayOps.length > 1 ? 's' : ''})</small></h3>
                  ${opsHtml}
                </section>
            `;
        }).join('');

        const printWindow = window.open('', '_blank', 'width=1024,height=768');
        if (!printWindow) {
            alert('Impossible d’ouvrir la fenêtre d’impression. Vérifiez le bloqueur popup.');
            return;
        }

        printWindow.document.write(`
            <!doctype html>
            <html>
              <head>
                <meta charset="utf-8" />
                <title>Programme opératoire - ${escapeHtml(weekLabel)}</title>
                <style>
                  body { font-family: Segoe UI, Arial, sans-serif; margin: 22px; color: #111827; background: #f8fafc; }
                  .report { max-width: 1100px; margin: 0 auto; }
                  .header { background: linear-gradient(135deg, #6c5ce7, #8b7cf6); color: #fff; border-radius: 14px; padding: 16px 18px; margin-bottom: 16px; }
                  h1 { margin: 0 0 4px; font-size: 24px; }
                  .subtitle { margin: 0; opacity: 0.95; }
                  .days { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                  .day-block { border: 1px solid #dbe1ea; border-radius: 12px; padding: 12px; background: #fff; break-inside: avoid; }
                  .day-block h3 { margin: 0 0 10px; font-size: 16px; color: #4c1d95; }
                  .day-block h3 small { color: #6b7280; font-weight: 500; }
                  .op-card { border-top: 1px dashed #e5e7eb; padding-top: 8px; margin-top: 8px; }
                  .op-card:first-of-type { border-top: none; margin-top: 0; padding-top: 0; }
                  .op-title { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
                  .op-index { background: #ede9fe; color: #5b21b6; font-weight: 700; border-radius: 999px; width: 22px; height: 22px; display: inline-flex; justify-content: center; align-items: center; font-size: 12px; }
                  .op-name { font-weight: 700; flex: 1; }
                  .op-prof { background: #f3f4f6; color: #4b5563; border-radius: 999px; padding: 2px 8px; font-size: 12px; }
                  .op-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                  .op-grid b { display: block; font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.04em; }
                  .op-grid p { margin: 2px 0 0; font-size: 13px; }
                  .empty { color: #6b7280; font-style: italic; margin: 0; }
                  @media print {
                    body { margin: 10px; background: #fff; }
                    .days { grid-template-columns: 1fr; gap: 10px; }
                    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  }
                </style>
              </head>
              <body>
                <div class="report">
                  <div class="header">
                    <h1>Programme Opératoire Hebdomadaire</h1>
                    <p class="subtitle">${escapeHtml(weekLabel)} | Total: ${totalOps} opération${totalOps > 1 ? 's' : ''}</p>
                  </div>
                  <div class="days">
                    ${daySections}
                  </div>
                </div>
              </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const weekStartText = selectedWeekStart.toLocaleDateString('fr-FR');
    const weekEndText = addDays(selectedWeekStart, 6).toLocaleDateString('fr-FR');
    const selectedWeekLabel = `${weekStartText} - ${weekEndText}`;
    const selectedWeekDates = new Set(
        Array.from({ length: 7 }, (_, index) => formatDate(addDays(selectedWeekStart, index)))
    );

    return (
        <div className="po-container">
            <div className="po-header">
                <button className="po-back-btn" onClick={onBack}>← Retour</button>
                <div className="po-title-area">
                    <h2>🗓️ Programme Opératoire</h2>
                    <span className="po-count">{rows.length} enregistrement{rows.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            <div className="po-toolbar">
                <div className="po-filter-wrap">
                    <select className="po-filter" value={profFilter} onChange={e => setProfFilter(e.target.value)}>
                        <option value="">Tous les professeurs</option>
                        {PROFS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className="po-filter-wrap po-week-print-wrap">
                    <span className="po-week-label">Semaine sélectionnée:</span>
                    <strong className="po-week-range">{selectedWeekLabel}</strong>
                    <button type="button" className="calendar-nav-btn" onClick={() => setSelectedWeekStart(prev => addDays(prev, -7))}>
                        ← Semaine précédente
                    </button>
                    <button type="button" className="calendar-nav-btn" onClick={() => setSelectedWeekStart(getWeekStart(new Date()))}>
                        Cette semaine
                    </button>
                    <button type="button" className="calendar-nav-btn" onClick={() => setSelectedWeekStart(prev => addDays(prev, 7))}>
                        Semaine suivante →
                    </button>
                    <button type="button" className="calendar-nav-btn calendar-print-btn" onClick={handlePrintWeek}>
                        🖨️ Imprimer semaine
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="po-loading">Chargement...</div>
            ) : (
                <div className="calendar-shell">
                    <div className="calendar-toolbar">
                        <div className="calendar-nav">
                            <button type="button" className="calendar-nav-btn" onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
                                ‹ Précédent
                            </button>
                            <button type="button" className="calendar-nav-btn calendar-today-btn" onClick={() => setCurrentDate(new Date())}>
                                Aujourd'hui
                            </button>
                            <button type="button" className="calendar-nav-btn" onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
                                Suivant ›
                            </button>
                        </div>
                        <h3 className="calendar-title">{monthYearLabel}</h3>
                    </div>

                    <div className="calendar-grid">
                        {DAY_NAMES.map(day => (
                            <div key={day} className="calendar-day-header">{day}</div>
                        ))}

                        {calendarCells.map(cell => {
                            if (cell.empty) {
                                return <div key={cell.key} className="calendar-day calendar-day-empty" />;
                            }

                            return (
                                <button
                                    type="button"
                                    key={cell.key}
                                    className={`calendar-day ${selectedWeekDates.has(cell.dateStr) ? 'calendar-day-week-selected' : ''} ${cell.isToday ? 'calendar-day-today' : ''}`}
                                    onClick={() => openDayModal(cell.dateStr)}
                                >
                                    <div className="calendar-day-top">
                                        <span className="calendar-day-number">{cell.day}</span>
                                        {cell.operations.length > 0 && <span className="calendar-day-count">{cell.operations.length}</span>}
                                    </div>
                                    <div className="calendar-day-events">
                                        {cell.operations.slice(0, 4).map(op => (
                                            <span key={op.id} className="op-chip" style={{ backgroundColor: PROF_COLORS[op.prof] || '#636e72' }}>
                                                {op.nomPrenom || 'Sans nom'}
                                            </span>
                                        ))}
                                        {cell.operations.length > 4 && (
                                            <span className="op-chip op-chip-more">+{cell.operations.length - 4} autres</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {modalOpen && (
                <div className="po-modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="po-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</h3>
                            <button type="button" className="modal-close" onClick={() => setModalOpen(false)}>✕</button>
                        </div>

                        <div className="modal-body">
                            <div className="modal-section">
                                <h4>Opérations du jour ({selectedDayRows.length})</h4>
                                {selectedDayRows.length === 0 ? (
                                    <p className="modal-empty">Aucune opération planifiée pour cette date.</p>
                                ) : (
                                    <div className="day-op-list">
                                        {selectedDayRows.map(row => (
                                            <div key={row.id} className="day-op-card">
                                                <div className="day-op-head">
                                                    <strong>{row.nomPrenom || 'Sans nom'}</strong>
                                                    <span className="po-prof-badge" style={{ background: PROF_COLORS[row.prof] || '#636e72' }}>{row.prof || '—'}</span>
                                                </div>
                                                <p><b>Diagnostic:</b> {row.diagnostic || '—'}</p>
                                                <p><b>Geste:</b> {row.gesteOperatoire || '—'}</p>
                                                <p><b>Couverture:</b> {row.couvertureSanitaire || '—'}</p>
                                                <p><b>Observation:</b> {row.observation || '—'}</p>
                                                {isAdmin && (
                                                    <div className="day-op-actions">
                                                        <button type="button" className="po-edit-btn" onClick={() => startEdit(row)}>✏️ Modifier</button>
                                                        <button type="button" className="po-delete-btn" onClick={() => handleDelete(row.id)}>🗑️ Supprimer</button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {isAdmin && (
                                <div className="modal-section">
                                    <div className="modal-form-head">
                                        <h4>{editingId ? 'Modifier l’opération' : 'Ajouter une opération'}</h4>
                                        {editingId && (
                                            <button type="button" className="calendar-nav-btn" onClick={startCreate}>
                                                Nouvelle opération
                                            </button>
                                        )}
                                    </div>
                                    <div className="modal-form-grid">
                                        <input className="modal-input" placeholder="Nom & Prénom" value={formData.nomPrenom} onChange={(e) => handleFormChange('nomPrenom', e.target.value)} />
                                        <input className="modal-input" placeholder="Diagnostic" value={formData.diagnostic} onChange={(e) => handleFormChange('diagnostic', e.target.value)} />
                                        <input className="modal-input" placeholder="Geste Opératoire" value={formData.gesteOperatoire} onChange={(e) => handleFormChange('gesteOperatoire', e.target.value)} />
                                        <input className="modal-input" placeholder="Couverture Sanitaire" value={formData.couvertureSanitaire} onChange={(e) => handleFormChange('couvertureSanitaire', e.target.value)} />
                                        <textarea className="po-textarea modal-observation" placeholder="Observation" value={formData.observation} onChange={(e) => handleFormChange('observation', e.target.value)} />
                                        <select className="po-filter" value={formData.prof} onChange={(e) => handleFormChange('prof', e.target.value)}>
                                            {PROFS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div className="modal-form-actions">
                                        <button type="button" className="po-save-btn modal-save" onClick={handleSave} disabled={saving !== null}>
                                            {saving !== null ? 'Enregistrement...' : (editingId ? 'Mettre à jour' : 'Ajouter')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgrammeOperatoire;
