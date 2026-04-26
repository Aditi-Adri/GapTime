import { useState, useRef } from "react";

const PERSON_COLORS = [
  { bg: '#E24B4A', light: 'rgba(226,75,74,0.12)', border: 'rgba(226,75,74,0.35)', dark: '#993C1D' },
  { bg: '#1D9E75', light: 'rgba(29,158,117,0.12)', border: 'rgba(29,158,117,0.35)', dark: '#0F6E56' },
  { bg: '#378ADD', light: 'rgba(55,138,221,0.12)', border: 'rgba(55,138,221,0.35)', dark: '#185FA5' },
  { bg: '#7F77DD', light: 'rgba(127,119,221,0.12)', border: 'rgba(127,119,221,0.35)', dark: '#534AB7' },
  { bg: '#BA7517', light: 'rgba(186,117,23,0.12)', border: 'rgba(186,117,23,0.35)', dark: '#854F0B' },
  { bg: '#D4537E', light: 'rgba(212,83,126,0.12)', border: 'rgba(212,83,126,0.35)', dark: '#993556' },
  { bg: '#639922', light: 'rgba(99,153,34,0.12)', border: 'rgba(99,153,34,0.35)', dark: '#3B6D11' },
  { bg: '#E24B4A', light: 'rgba(226,75,74,0.12)', border: 'rgba(226,75,74,0.35)', dark: '#993C1D' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const period = h >= 12 ? 'PM' : 'AM';
    const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const dm = String(m).padStart(2, '0');
    TIME_OPTIONS.push({ value, label: `${dh}:${dm} ${period}` });
  }
}

function timeToMins(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function minsToTime(n) { return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`; }
function fmt(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const p = h >= 12 ? 'PM' : 'AM';
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m || 0).padStart(2,'0')} ${p}`;
}
function fmtDur(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
function initials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }
function uid() { return Math.random().toString(36).slice(2, 9); }
function mergeIntervals(ivs) {
  if (!ivs.length) return [];
  const s = [...ivs].sort((a, b) => a.s - b.s);
  const r = [{ ...s[0] }];
  for (let i = 1; i < s.length; i++) {
    const l = r[r.length - 1];
    if (s[i].s <= l.e) l.e = Math.max(l.e, s[i].e);
    else r.push({ ...s[i] });
  }
  return r;
}

function computeFreeSlots(people, cfg) {
  const { startTime, endTime, selectedDays, excludedSlots } = cfg;
  const out = {};
  for (const day of selectedDays) {
    const ss = timeToMins(startTime), se = timeToMins(endTime);
    const busy = [];
    for (const p of people) {
      for (const sl of p.schedule) {
        if (sl.day === day) busy.push({ s: timeToMins(sl.startTime), e: timeToMins(sl.endTime), color: p.color.bg });
      }
    }
    for (const ex of excludedSlots) {
      if (ex.day === day || ex.day === 'All Days') busy.push({ s: timeToMins(ex.startTime), e: timeToMins(ex.endTime), excl: true });
    }
    const clipped = busy.map(b => ({ ...b, s: Math.max(b.s, ss), e: Math.min(b.e, se) })).filter(b => b.s < b.e);
    const merged = mergeIntervals(clipped);
    const free = [];
    let cur = ss;
    for (const bk of merged) {
      if (bk.s > cur) free.push({ s: cur, e: bk.s });
      cur = Math.max(cur, bk.e);
    }
    if (cur < se) free.push({ s: cur, e: se });
    out[day] = { free, busy: merged };
  }
  return out;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700&family=DM+Sans:ital,wght@0,400;0,500;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif}
.app{min-height:100vh;background:var(--color-background-tertiary)}
.hdr{background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.logo{font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:var(--color-text-primary);letter-spacing:-0.5px}
.logo em{color:#1D9E75;font-style:normal}
.tabs{display:flex;background:var(--color-background-primary);border-bottom:0.5px solid var(--color-border-tertiary);padding:0 20px;overflow-x:auto}
.tab{padding:11px 18px;font-size:13px;font-weight:500;border:none;background:transparent;color:var(--color-text-secondary);border-bottom:2px solid transparent;margin-bottom:-0.5px;cursor:pointer;white-space:nowrap;font-family:'DM Sans',sans-serif;transition:color 0.15s}
.tab.on{color:var(--color-text-primary);border-bottom-color:#1D9E75}
.tab:hover:not(.on){color:var(--color-text-primary)}
.body{padding:16px 20px;max-width:860px;margin:0 auto}
.card{background:var(--color-background-primary);border-radius:var(--border-radius-lg);border:0.5px solid var(--color-border-tertiary);padding:16px 18px}
.sec{font-family:'Syne',sans-serif;font-size:15px;font-weight:600;color:var(--color-text-primary);margin-bottom:12px}
.lbl{font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:4px}
input,select{padding:8px 11px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);color:var(--color-text-primary);font-size:13px;font-family:'DM Sans',sans-serif;width:100%;outline:none}
input:focus,select:focus{border-color:#1D9E75;box-shadow:0 0 0 3px rgba(29,158,117,0.12)}
.btn{padding:7px 14px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);color:var(--color-text-primary);font-size:13px;font-family:'DM Sans',sans-serif;cursor:pointer;font-weight:500;transition:all 0.15s;display:inline-flex;align-items:center;gap:6px}
.btn:hover{background:var(--color-background-secondary)}
.btn.pri{background:#1D9E75;color:#fff;border-color:#1D9E75}
.btn.pri:hover{background:#0F6E56;border-color:#0F6E56}
.btn.pri:disabled{opacity:0.5;cursor:not-allowed}
.btn.red{color:#E24B4A}
.btn.red:hover{background:rgba(226,75,74,0.08);border-color:rgba(226,75,74,0.3)}
.slot{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:var(--border-radius-md);background:var(--color-background-secondary);margin-bottom:5px;font-size:13px}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.ov{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:1000}
.modal{background:var(--color-background-primary);border-radius:var(--border-radius-xl);border:0.5px solid var(--color-border-secondary);padding:20px;width:500px;max-width:95vw;max-height:90vh;overflow-y:auto}
.pill{padding:5px 13px;border-radius:100px;font-size:12px;font-weight:500;border:0.5px solid var(--color-border-secondary);cursor:pointer;transition:all 0.15s;background:transparent;color:var(--color-text-secondary);font-family:'DM Sans',sans-serif}
.pill.on{background:#1D9E75;color:#fff;border-color:#1D9E75}
.drop{border:1.5px dashed var(--color-border-secondary);border-radius:var(--border-radius-lg);padding:28px;text-align:center;cursor:pointer;transition:all 0.15s}
.drop:hover{border-color:#1D9E75;background:rgba(29,158,117,0.04)}
.psi{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-tertiary);margin-bottom:7px;cursor:pointer;transition:all 0.15s}
.psi.on{border-color:#1D9E75;background:rgba(29,158,117,0.06)}
.chk{width:17px;height:17px;border-radius:4px;border:0.5px solid var(--color-border-secondary);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.chk.on{background:#1D9E75;border-color:#1D9E75}
.stat{background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:13px 15px}
.stat-lbl{font-size:11px;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
.stat-val{font-size:21px;font-weight:500;font-family:'Syne',sans-serif}
.badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:100px;font-size:12px;font-weight:500}
.free-chip{padding:5px 12px;border-radius:var(--border-radius-md);font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:5px;background:rgba(29,158,117,0.1);border:0.5px solid rgba(29,158,117,0.3);color:#0F6E56}
.mode-btn{flex:1;padding:8px;border-radius:var(--border-radius-md);border:0.5px solid var(--color-border-secondary);background:transparent;color:var(--color-text-secondary);font-size:13px;font-family:'DM Sans',sans-serif;cursor:pointer;font-weight:500;transition:all 0.15s}
.mode-btn.on{background:#1D9E75;color:#fff;border-color:#1D9E75}
.pbar{height:20px;background:var(--color-background-secondary);border-radius:100px;overflow:hidden;position:relative;margin-bottom:5px}
.warn{padding:10px 13px;border-radius:var(--border-radius-md);background:rgba(226,75,74,0.09);color:#993C1D;font-size:13px;margin-top:10px;border:0.5px solid rgba(226,75,74,0.2)}
.spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
`;

export default function ScheduleSync() {
  const [tab, setTab] = useState('people');
  const [people, setPeople] = useState([]);
  const [cfg, setCfg] = useState({
    startTime: '08:00', endTime: '20:00',
    selectedDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    excludedSlots: []
  });
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  // Modals
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [addClassFor, setAddClassFor] = useState(null);
  const [classMode, setClassMode] = useState('manual');
  const [newCls, setNewCls] = useState({ day: 'Sunday', startTime: '09:00', endTime: '11:00', label: '' });
  const [imgLoading, setImgLoading] = useState(false);
  const [imgError, setImgError] = useState('');
  const [parsed, setParsed] = useState([]);
  const [selParsed, setSelParsed] = useState({});
  const [newExcl, setNewExcl] = useState({ day: 'All Days', startTime: '12:30', endTime: '13:30' });
  const fileRef = useRef();

  function addPerson() {
    if (!newName.trim()) return;
    const color = PERSON_COLORS[people.length % PERSON_COLORS.length];
    setPeople(p => [...p, { id: uid(), name: newName.trim(), color, schedule: [] }]);
    setNewName(''); setAddPersonOpen(false);
  }

  function removePerson(id) { setPeople(p => p.filter(x => x.id !== id)); }

  function removeSlot(pid, idx) {
    setPeople(p => p.map(x => x.id === pid ? { ...x, schedule: x.schedule.filter((_, i) => i !== idx) } : x));
  }

  function saveManualClass() {
    if (!newCls.day || !newCls.startTime || !newCls.endTime) return;
    if (timeToMins(newCls.startTime) >= timeToMins(newCls.endTime)) return;
    setPeople(p => p.map(x => x.id === addClassFor ? { ...x, schedule: [...x.schedule, { ...newCls, id: uid() }] } : x));
    closeClassModal();
  }

  function saveParsedSlots() {
    const toAdd = parsed.filter((_, i) => selParsed[i] !== false).map(s => ({ ...s, id: uid() }));
    setPeople(p => p.map(x => x.id === addClassFor ? { ...x, schedule: [...x.schedule, ...toAdd] } : x));
    closeClassModal();
  }

  function closeClassModal() {
    setAddClassFor(null); setParsed([]); setSelParsed({}); setImgError(''); setImgLoading(false);
  }

  async function handleImage(e) {
    const file = e.target.files[0]; if (!file) return;
    setImgLoading(true); setImgError(''); setParsed([]);
    try {
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file);
      });
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 1000,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: b64 } },
            { type: 'text', text: 'Extract all class/course schedule entries from this image. Return ONLY a valid JSON array. Each entry: {"day":"Monday","startTime":"09:00","endTime":"11:00","label":"Course Name"}. Use 24-hour HH:MM format. Days must be one of: Sunday Monday Tuesday Wednesday Thursday Friday Saturday. Return ONLY the JSON array, no markdown, no explanation.' }
          ]}]
        })
      });
      const data = await resp.json();
      const txt = data.content?.find(b => b.type === 'text')?.text || '';
      const clean = txt.replace(/```json|```/g, '').trim();
      const slots = JSON.parse(clean);
      if (!Array.isArray(slots) || !slots.length) throw new Error('empty');
      setParsed(slots);
      setSelParsed(Object.fromEntries(slots.map((_, i) => [i, true])));
    } catch {
      setImgError('Could not read schedule from this image. Please try a clearer photo or use manual entry.');
    } finally { setImgLoading(false); }
  }

  function runSearch() {
    if (!people.length || !cfg.selectedDays.length) return;
    setSearching(true);
    setTimeout(() => { setResults(computeFreeSlots(people, cfg)); setSearching(false); setTab('results'); }, 350);
  }

  const totalSearchMins = timeToMins(cfg.endTime) - timeToMins(cfg.startTime);
  const totalFreeMins = results ? Object.values(results).reduce((s, { free }) => s + free.reduce((a, f) => a + f.e - f.s, 0), 0) : 0;
  const daysWithFree = results ? Object.values(results).filter(({ free }) => free.length > 0).length : 0;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">

        {/* Header */}
        <div className="hdr">
          <div>
            <div className="logo">Schedule<em>Sync</em></div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              Find common free time across multiple class schedules
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {people.length > 0 && (
              <div style={{ display: 'flex' }}>
                {people.map((p, i) => (
                  <div key={p.id} title={p.name} style={{ width: '30px', height: '30px', borderRadius: '50%', background: p.color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff', border: '2px solid var(--color-background-primary)', marginLeft: i > 0 ? '-8px' : 0, zIndex: people.length - i }}>
                    {initials(p.name)}
                  </div>
                ))}
              </div>
            )}
            <button className="btn pri" onClick={runSearch} disabled={searching || !people.length || !cfg.selectedDays.length} style={{ fontSize: '13px' }}>
              {searching ? <><span className="spin" /> Searching…</> : '⚡ Find Free Time'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { id: 'people', label: `People ${people.length > 0 ? `(${people.length})` : ''}` },
            { id: 'config', label: 'Search Settings' },
            { id: 'results', label: results ? `Results — ${daysWithFree} day${daysWithFree !== 1 ? 's' : ''} free` : 'Results' }
          ].map(t => <button key={t.id} className={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>

        <div className="body">

          {/* ====== PEOPLE TAB ====== */}
          {tab === 'people' && <>
            {people.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="1.2" style={{ marginBottom: '14px' }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No one here yet</div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px', maxWidth: '320px', margin: '0 auto 20px' }}>
                  Add everyone whose schedule you want to compare. Upload an image of their routine or enter manually.
                </div>
                <button className="btn pri" onClick={() => setAddPersonOpen(true)}>+ Add first person</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gap: '10px', marginBottom: '10px' }}>
                  {people.map(person => (
                    <PersonCard key={person.id} person={person}
                      onRemove={() => removePerson(person.id)}
                      onRemoveSlot={i => removeSlot(person.id, i)}
                      onAddClass={mode => { setAddClassFor(person.id); setClassMode(mode); setParsed([]); setImgError(''); setNewCls({ day: 'Sunday', startTime: '09:00', endTime: '11:00', label: '' }); }} />
                  ))}
                </div>
                <button className="btn" style={{ width: '100%', padding: '11px', justifyContent: 'center' }} onClick={() => setAddPersonOpen(true)}>+ Add another person</button>
              </>
            )}
          </>}

          {/* ====== CONFIG TAB ====== */}
          {tab === 'config' && (
            <ConfigTab cfg={cfg} setCfg={setCfg} newExcl={newExcl} setNewExcl={setNewExcl} />
          )}

          {/* ====== RESULTS TAB ====== */}
          {tab === 'results' && (
            <ResultsTab
              people={people} cfg={cfg} results={results} searching={searching}
              onSearch={runSearch} totalFreeMins={totalFreeMins}
              totalSearchMins={totalSearchMins} daysWithFree={daysWithFree}
            />
          )}
        </div>

        {/* === Add Person Modal === */}
        {addPersonOpen && (
          <div className="ov" onClick={() => setAddPersonOpen(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div className="sec" style={{ margin: 0 }}>Add person</div>
                <button className="btn" style={{ padding: '3px 8px' }} onClick={() => setAddPersonOpen(false)}>✕</button>
              </div>
              <label className="lbl">Name</label>
              <input className="ss-input" style={{ marginBottom: '14px' }} placeholder="e.g. Tasnia, Adri, Rafi…" value={newName}
                onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPerson()} autoFocus />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setAddPersonOpen(false)}>Cancel</button>
                <button className="btn pri" onClick={addPerson} disabled={!newName.trim()}>Add person</button>
              </div>
            </div>
          </div>
        )}

        {/* === Add Class Modal === */}
        {addClassFor && (
          <div className="ov" onClick={closeClassModal}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div className="sec" style={{ margin: 0 }}>Add class · <span style={{ color: people.find(p => p.id === addClassFor)?.color.bg }}>{people.find(p => p.id === addClassFor)?.name}</span></div>
                <button className="btn" style={{ padding: '3px 8px' }} onClick={closeClassModal}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button className={`mode-btn${classMode === 'manual' ? ' on' : ''}`} onClick={() => { setClassMode('manual'); setParsed([]); setImgError(''); }}>✏️ Enter manually</button>
                <button className={`mode-btn${classMode === 'image' ? ' on' : ''}`} onClick={() => { setClassMode('image'); setParsed([]); setImgError(''); }}>🖼️ Upload image</button>
              </div>

              {classMode === 'manual' && <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label className="lbl">Day</label>
                    <select value={newCls.day} onChange={e => setNewCls(p => ({ ...p, day: e.target.value }))}>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="lbl">Start</label>
                    <select value={newCls.startTime} onChange={e => setNewCls(p => ({ ...p, startTime: e.target.value }))}>
                      {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="lbl">End</label>
                    <select value={newCls.endTime} onChange={e => setNewCls(p => ({ ...p, endTime: e.target.value }))}>
                      {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label className="lbl">Course name (optional)</label>
                  <input placeholder="e.g. Data Structures, CSE-301…" value={newCls.label} onChange={e => setNewCls(p => ({ ...p, label: e.target.value }))} />
                </div>
                {timeToMins(newCls.startTime) >= timeToMins(newCls.endTime) && (
                  <div className="warn" style={{ marginBottom: '12px' }}>End time must be after start time</div>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={closeClassModal}>Cancel</button>
                  <button className="btn pri" onClick={saveManualClass} disabled={timeToMins(newCls.startTime) >= timeToMins(newCls.endTime)}>Add class</button>
                </div>
              </>}

              {classMode === 'image' && <>
                {!imgLoading && !parsed.length && <>
                  <div className="drop" onClick={() => fileRef.current?.click()}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.4" style={{ marginBottom: '10px' }}>
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                    </svg>
                    <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px' }}>Upload your routine image</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>JPG, PNG, screenshots — AI will extract the schedule</div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
                  {imgError && <div className="warn">{imgError}</div>}
                </>}

                {imgLoading && (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <div style={{ marginBottom: '10px' }}><span className="spin" style={{ width: '24px', height: '24px', borderColor: 'rgba(29,158,117,0.3)', borderTopColor: '#1D9E75' }} /></div>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>AI is reading your schedule…</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>This takes a few seconds</div>
                  </div>
                )}

                {parsed.length > 0 && <>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '10px' }}>
                    Found <strong>{parsed.length}</strong> class{parsed.length !== 1 ? 'es' : ''} — deselect any you want to skip
                  </div>
                  <div style={{ maxHeight: '260px', overflowY: 'auto', marginBottom: '14px' }}>
                    {parsed.map((sl, i) => (
                      <div key={i} className={`psi${selParsed[i] !== false ? ' on' : ''}`}
                        onClick={() => setSelParsed(p => ({ ...p, [i]: p[i] === false }))}>
                        <div className={`chk${selParsed[i] !== false ? ' on' : ''}`}>
                          {selParsed[i] !== false && <svg width="10" height="10" fill="#fff" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sl.label || 'Class'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{sl.day} · {fmt(sl.startTime)} – {fmt(sl.endTime)}</div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{fmtDur(timeToMins(sl.endTime) - timeToMins(sl.startTime))}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button className="btn" onClick={() => { setParsed([]); fileRef.current.value = ''; }}>Try another image</button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn" onClick={closeClassModal}>Cancel</button>
                      <button className="btn pri" onClick={saveParsedSlots}>
                        Add {Object.values(selParsed).filter(v => v !== false).length} classes
                      </button>
                    </div>
                  </div>
                </>}
              </>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PersonCard({ person, onRemove, onRemoveSlot, onAddClass }) {
  const byDay = DAYS.reduce((acc, d) => {
    const s = person.schedule.filter(x => x.day === d);
    if (s.length) acc[d] = s;
    return acc;
  }, {});

  return (
    <div className="card" style={{ borderLeft: `4px solid ${person.color.bg}`, paddingLeft: '15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: person.schedule.length ? '12px' : '0' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: person.color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
          {initials(person.name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: '600', fontSize: '15px' }}>{person.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {person.schedule.length === 0 ? 'No classes — add some below' : `${person.schedule.length} class${person.schedule.length !== 1 ? 'es' : ''} across ${Object.keys(byDay).length} day${Object.keys(byDay).length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn" style={{ fontSize: '12px', padding: '5px 10px' }} onClick={() => onAddClass('manual')}>+ Manual</button>
          <button className="btn" style={{ fontSize: '12px', padding: '5px 10px' }} onClick={() => onAddClass('image')}>
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>
            Image
          </button>
          <button className="btn red" style={{ fontSize: '12px', padding: '5px 8px' }} onClick={onRemove} title="Remove person">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>
          </button>
        </div>
      </div>

      {Object.entries(byDay).map(([day, slots]) => (
        <div key={day} style={{ marginBottom: '8px' }}>
          <div className="lbl" style={{ marginBottom: '5px' }}>{day}</div>
          {slots.map((sl, i) => {
            const realIdx = person.schedule.indexOf(sl);
            return (
              <div key={i} className="slot">
                <div className="dot" style={{ background: person.color.bg }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: '500' }}>{fmt(sl.startTime)}</span>
                  <span style={{ color: 'var(--color-text-secondary)', margin: '0 5px' }}>–</span>
                  <span style={{ fontWeight: '500' }}>{fmt(sl.endTime)}</span>
                  {sl.label && <span style={{ color: 'var(--color-text-secondary)', marginLeft: '8px', fontSize: '12px' }}>· {sl.label}</span>}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{fmtDur(timeToMins(sl.endTime) - timeToMins(sl.startTime))}</span>
                <button onClick={() => onRemoveSlot(realIdx)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-tertiary)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}>×</button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ConfigTab({ cfg, setCfg, newExcl, setNewExcl }) {
  function toggleDay(d) {
    setCfg(p => ({
      ...p,
      selectedDays: p.selectedDays.includes(d) ? p.selectedDays.filter(x => x !== d) : [...p.selectedDays, d]
    }));
  }
  function addExcl() {
    if (timeToMins(newExcl.startTime) >= timeToMins(newExcl.endTime)) return;
    setCfg(p => ({ ...p, excludedSlots: [...p.excludedSlots, { ...newExcl, id: uid() }] }));
  }
  function remExcl(id) { setCfg(p => ({ ...p, excludedSlots: p.excludedSlots.filter(e => e.id !== id) })); }

  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      <div className="card">
        <div className="sec">Search time window</div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label className="lbl">From</label>
            <select value={cfg.startTime} onChange={e => setCfg(p => ({ ...p, startTime: e.target.value }))}>
              {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ paddingTop: '18px', color: 'var(--color-text-secondary)', fontSize: '18px' }}>→</div>
          <div style={{ flex: 1 }}>
            <label className="lbl">To</label>
            <select value={cfg.endTime} onChange={e => setCfg(p => ({ ...p, endTime: e.target.value }))}>
              {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="sec">Days to include</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {DAYS.map(d => (
            <button key={d} className={`pill${cfg.selectedDays.includes(d) ? ' on' : ''}`} onClick={() => toggleDay(d)}>
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
        {cfg.selectedDays.length === 0 && (
          <div style={{ fontSize: '12px', color: '#E24B4A', marginTop: '8px' }}>Select at least one day</div>
        )}
      </div>

      <div className="card">
        <div className="sec">Excluded time slots</div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
          Block specific times from appearing as free — e.g. Friday prayer, lunch break, or travel time.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '12px' }}>
          <div>
            <label className="lbl">Day</label>
            <select value={newExcl.day} onChange={e => setNewExcl(p => ({ ...p, day: e.target.value }))}>
              <option value="All Days">All Days</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">From</label>
            <select value={newExcl.startTime} onChange={e => setNewExcl(p => ({ ...p, startTime: e.target.value }))}>
              {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl">To</label>
            <select value={newExcl.endTime} onChange={e => setNewExcl(p => ({ ...p, endTime: e.target.value }))}>
              {TIME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <button className="btn pri" onClick={addExcl} style={{ padding: '8px 13px', whiteSpace: 'nowrap' }}>+ Block</button>
        </div>
        {cfg.excludedSlots.length === 0
          ? <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>No blocked times yet</div>
          : cfg.excludedSlots.map(ex => (
            <div key={ex.id} className="slot" style={{ background: 'rgba(226,75,74,0.07)' }}>
              <div className="dot" style={{ background: '#E24B4A' }} />
              <div style={{ flex: 1, fontSize: '13px' }}>
                <strong>{ex.day}</strong> <span style={{ color: 'var(--color-text-secondary)' }}>·</span> {fmt(ex.startTime)} – {fmt(ex.endTime)}
              </div>
              <button onClick={() => remExcl(ex.id)} style={{ border: 'none', background: 'transparent', color: '#E24B4A', cursor: 'pointer', fontSize: '17px', lineHeight: 1 }}>×</button>
            </div>
          ))
        }
      </div>
    </div>
  );
}

function ResultsTab({ people, cfg, results, searching, onSearch, totalFreeMins, totalSearchMins, daysWithFree }) {
  const totalSearchTime = totalSearchMins * cfg.selectedDays.length;
  return (
    <div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: '600', fontSize: '14px' }}>Run free time search</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            {cfg.selectedDays.length} day{cfg.selectedDays.length !== 1 ? 's' : ''} · {fmt(cfg.startTime)}–{fmt(cfg.endTime)} · {people.length} {people.length === 1 ? 'person' : 'people'}
            {cfg.excludedSlots.length > 0 && ` · ${cfg.excludedSlots.length} exclusion${cfg.excludedSlots.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <button className="btn pri" onClick={onSearch} disabled={searching || !people.length || !cfg.selectedDays.length} style={{ padding: '9px 18px' }}>
          {searching ? <><span className="spin" /> Searching…</> : '⚡ Find Free Time'}
        </button>
      </div>

      {results && !searching && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
            <div className="stat"><div className="stat-lbl">Total free time</div><div className="stat-val">{fmtDur(totalFreeMins)}</div></div>
            <div className="stat"><div className="stat-lbl">Days with free slots</div><div className="stat-val">{daysWithFree}/{cfg.selectedDays.length}</div></div>
            <div className="stat"><div className="stat-lbl">Avg free / day</div><div className="stat-val">{daysWithFree > 0 ? fmtDur(Math.round(totalFreeMins / daysWithFree)) : '—'}</div></div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {cfg.selectedDays.map(day => {
              const r = results[day]; if (!r) return null;
              const { free, busy } = r;
              const freeMins = free.reduce((s, f) => s + f.e - f.s, 0);
              const pct = Math.round((freeMins / totalSearchMins) * 100);
              const ss = timeToMins(cfg.startTime), se = timeToMins(cfg.endTime), span = se - ss;

              return (
                <div key={day} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: '600', fontSize: '15px' }}>{day}</span>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{free.length === 0 ? 'No free slots' : `${fmtDur(freeMins)} free`}</span>
                    </div>
                    {free.length > 0
                      ? <span className="badge" style={{ background: 'rgba(29,158,117,0.1)', color: '#0F6E56' }}>{pct}% free</span>
                      : <span className="badge" style={{ background: 'rgba(226,75,74,0.08)', color: '#993C1D' }}>Fully busy</span>
                    }
                  </div>

                  {/* Per-person mini-bars */}
                  <div style={{ marginBottom: '8px' }}>
                    {people.map(person => {
                      const personSlots = person.schedule.filter(sl => sl.day === day);
                      return (
                        <div key={person.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: person.color.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                            {initials(person.name)}
                          </div>
                          <div style={{ flex: 1, height: '10px', background: 'var(--color-background-secondary)', borderRadius: '100px', overflow: 'hidden', position: 'relative' }}>
                            {personSlots.map((sl, i) => {
                              const left = ((timeToMins(sl.startTime) - ss) / span) * 100;
                              const width = ((timeToMins(sl.endTime) - timeToMins(sl.startTime)) / span) * 100;
                              return (
                                <div key={i} style={{ position: 'absolute', left: `${Math.max(0, left)}%`, width: `${Math.min(100 - Math.max(0, left), width)}%`, top: 0, bottom: 0, background: person.color.bg, opacity: 0.8 }}
                                  title={`${person.name}: ${fmt(sl.startTime)}–${fmt(sl.endTime)}`} />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Combined free/busy bar */}
                  <div className="pbar">
                    {free.map((f, i) => (
                      <div key={i} style={{ position: 'absolute', left: `${((f.s - ss) / span) * 100}%`, width: `${((f.e - f.s) / span) * 100}%`, top: 0, bottom: 0, background: '#1D9E75', opacity: 0.85 }}
                        title={`Free: ${fmt(minsToTime(f.s))}–${fmt(minsToTime(f.e))}`} />
                    ))}
                    {busy.map((b, i) => (
                      <div key={i} style={{ position: 'absolute', left: `${((b.s - ss) / span) * 100}%`, width: `${((b.e - b.s) / span) * 100}%`, top: 0, bottom: 0, background: 'rgba(226,75,74,0.3)' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: '3px', marginBottom: '10px' }}>
                    <span>{fmt(cfg.startTime)}</span><span>{fmt(cfg.endTime)}</span>
                  </div>

                  {/* Free slot chips */}
                  {free.length > 0 && (
                    <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                      {free.map((f, i) => (
                        <div key={i} className="free-chip">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="#1D9E75"><circle cx="4" cy="4" r="4"/></svg>
                          {fmt(minsToTime(f.s))} – {fmt(minsToTime(f.e))}
                          <span style={{ color: '#1D9E75', opacity: 0.7, fontSize: '11px' }}>({fmtDur(f.e - f.s)})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '12px', padding: '10px 14px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#1D9E75' }} /> Everyone free</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'rgba(226,75,74,0.3)' }} /> Someone has class</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)' }} /> Outside search window</div>
          </div>
        </>
      )}

      {!results && !searching && (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--color-text-secondary)' }}>
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" style={{ marginBottom: '12px', opacity: 0.4 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <div style={{ fontSize: '15px', fontFamily: 'Syne, sans-serif', fontWeight: '600', marginBottom: '6px' }}>No results yet</div>
          <div style={{ fontSize: '13px' }}>Add people, configure your search window, then hit "Find Free Time"</div>
        </div>
      )}
    </div>
  );
}
