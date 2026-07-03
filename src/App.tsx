import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getData, saveSettings, saveHistory, clearAll,
  importSalariesFromText, saveSalary, deleteSalary,
  saveDuty, deleteDuty, setData,
  getSalaryCategories, saveSalaryCategories,
  DEFAULT_MODULE_ORDER, DEFAULT_SALARY_CATEGORIES,
} from './storage';
import { drawLeaveCanvasA4 } from './leaveCanvas';
import { calcDays, getWeekByStartDate, getSemesterText, wday, wdayFull, LEAVE_TYPES, getDefaultPeriodNames } from './utils';
import { exportSalaryCSV, exportSalaryHTML, exportDutyCSV, exportDutyHTML, exportSubCSV, exportSubHTML } from './export';
import type { SubRow, SalaryRecord, DutyRecord } from './types';
import './App.css';

type Page = 'home' | 'leave' | 'schedule' | 'settings' | 'salary' | 'duty' | 'substitute' | 'payment';

/* ===== Module Config ===== */
const MODULE_CONFIG: Record<string, { icon: string; iconClass: string; name: string; desc: string }> = {
  leave: { icon: '\ud83d\udcdd', iconClass: 'red', name: '\u8bf7\u5047\u6761', desc: '\u751f\u6210\u6807\u51c6\u8bf7\u5047\u6761' },
  schedule: { icon: '\ud83d\udccb', iconClass: 'blue', name: '\u6211\u7684\u8bfe\u8868', desc: '\u67e5\u770b\u4e2a\u4eba\u8bfe\u8868' },
  salary: { icon: '\ud83d\udcb0', iconClass: 'green', name: '\u5de5\u8d44\u7edf\u8ba1', desc: '\u6536\u5165\u8bb0\u5f55\u4e0e\u56fe\u8868' },
  duty: { icon: '\ud83d\udcc5', iconClass: 'yellow', name: '\u503c\u73ed\u7edf\u8ba1', desc: '\u503c\u73ed\u8bb0\u5f55\u4e0e\u7edf\u8ba1' },
  substitute: { icon: '\ud83d\udcca', iconClass: 'purple', name: '\u4ee3\u8bfe\u7edf\u8ba1', desc: '\u7ed9\u522b\u4eba\u4ee3\u8bfe\u7edf\u8ba1' },
  payment: { icon: '\ud83d\udcb3', iconClass: 'orange', name: '\u652f\u4ed8\u622a\u56fe', desc: '\u622a\u56fe\u5904\u7406\u5de5\u5177' },
  settings: { icon: '\u2699\ufe0f', iconClass: 'gray', name: '\u4e2a\u4eba\u8bbe\u7f6e', desc: '\u8bfe\u8868\u3001\u5b66\u6821\u4fe1\u606f' },
};

function App() {
  const [page, setPage] = useState<Page>('home');
  const [data, setLocalData] = useState(getData());
  const toastRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => setLocalData(getData()), []);

  const toast = useCallback((msg: string) => {
    const el = toastRef.current;
    if (el) { el.textContent = msg; el.style.display = 'block'; setTimeout(() => { if (el) el.style.display = 'none'; }, 2000); }
  }, []);

  const settings = data.settings;
  const schoolName = settings?.schoolName || '\u4e30\u90fd\u53bf\u7b2c\u4e09\u4e2d\u5b66\u6821';
  const semesterText = getSemesterText(settings?.semesterName);
  const schedule = settings?.schedule;
  const periodNames = settings?.periodNames || getDefaultPeriodNames();
  const moduleOrder = settings?.moduleOrder || DEFAULT_MODULE_ORDER;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">\ud83d\udcf1 \u6559\u5e08\u4e2a\u4eba\u52a9\u624b</div>
        <div className="header-sub">\u6559\u5e08\u5de5\u4f5c\u5c0f\u5de5\u5177</div>
      </header>

      <main className="container">
        {page === 'home' && <HomePage setPage={setPage} moduleOrder={moduleOrder} />}
        {page === 'leave' && <LeavePage settings={settings} schoolName={schoolName} semesterText={semesterText} periodNames={periodNames} toast={toast} refresh={refresh} />}
        {page === 'schedule' && <SchedulePage settings={settings} periodNames={periodNames} schedule={schedule} />}
        {page === 'settings' && <SettingsPage settings={settings} toast={toast} refresh={refresh} moduleOrder={moduleOrder} />}
        {page === 'salary' && <SalaryPage toast={toast} />}
        {page === 'duty' && <DutyOnlyPage toast={toast} />}
        {page === 'substitute' && <SubstituteOnlyPage toast={toast} />}
        {page === 'payment' && <PaymentPage toast={toast} />}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-item ${page === 'home' ? 'active' : ''}`} onClick={() => setPage('home')}><span className="nav-icon">\ud83c\udfe0</span><span>\u9996\u9875</span></button>
        <button className={`nav-item ${page === 'schedule' ? 'active' : ''}`} onClick={() => setPage('schedule')}><span className="nav-icon">\ud83d\udccb</span><span>\u8bfe\u8868</span></button>
        <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}><span className="nav-icon">\ud83d\udc64</span><span>\u6211\u7684</span></button>
      </nav>
      <div ref={toastRef} className="toast" />
    </div>
  );
}

/* ============ \u9996\u9875 ============ */
function HomePage({ setPage, moduleOrder }: { setPage: (p: Page) => void; moduleOrder: string[] }) {
  return (
    <div className="home-grid">
      {moduleOrder.map(key => {
        const mod = MODULE_CONFIG[key];
        if (!mod) return null;
        return (
          <div key={key} className="feature-card" onClick={() => setPage(key as Page)}>
            <div className={`feature-icon ${mod.iconClass}`}>{mod.icon}</div>
            <div className="feature-name">{mod.name}</div>
            <div className="feature-desc">{mod.desc}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ============ \u8bf7\u5047\u6761 ============ */
function LeavePage({ settings, schoolName, semesterText, periodNames, toast, refresh }: any) {
  const [name, setName] = useState(settings?.name || '');
  const [reason, setReason] = useState('');
  const [type, setType] = useState('\u516c\u5047');
  const [sd, setSd] = useState(() => new Date().toISOString().slice(0, 10));
  const [ed, setEd] = useState(() => new Date().toISOString().slice(0, 10));
  const [sp, setSp] = useState('\u4e0a\u5348');
  const [ep, setEp] = useState('\u4e0b\u5348');
  const [days, setDays] = useState(0.5);
  const [sw, setSw] = useState(1);
  const [ew, setEw] = useState(1);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (showModal && canvasRef.current && modalCanvasRef.current) {
      const src = canvasRef.current;
      const dst = modalCanvasRef.current;
      dst.width = src.width;
      dst.height = src.height;
      const ctx = dst.getContext('2d');
      if (ctx) ctx.drawImage(src, 0, 0);
    }
  }, [showModal]);

  const classSubjectOptions = (() => {
    const opts = new Set<string>();
    if (settings?.schedule) for (const day in settings.schedule.courses) for (const c of settings.schedule.courses[day]) if (c.classSubject) opts.add(c.classSubject);
    return Array.from(opts).sort();
  })();

  const updateSubsFromDates = (startD: string, endD: string, startP: string, endP: string) => {
    const d = calcDays(startD, endD, startP, endP);
    setDays(d);
    if (startD && endD) {
      const s = new Date(startD); const e = new Date(endD);
      setSw(getWeekByStartDate(s, settings?.startSchoolDate));
      setEw(getWeekByStartDate(e, settings?.startSchoolDate));
      if (settings?.schedule) {
        const rows: SubRow[] = [];
        const cur = new Date(s); const endDt = new Date(e);
        while (cur <= endDt) {
          const dn = cur.getDay();
          if (dn !== 0 && dn !== 6) {
            const cs = settings.schedule.courses[dn] || [];
            for (const c of cs) rows.push({ week: getWeekByStartDate(new Date(cur), settings?.startSchoolDate), day: wdayFull(new Date(cur)), dayShort: wday(new Date(cur)), dayNum: dn, period: c.period, classSubject: c.classSubject, teacher: '' });
          }
          cur.setDate(cur.getDate() + 1);
        }
        setSubs(rows);
      }
    }
  };

  const generate = () => {
    if (!name || !reason || !sd || !ed) { toast('\u8bf7\u586b\u5199\u5b8c\u6574\u4fe1\u606f'); return; }
    try {
      const tempCanvas = document.createElement('canvas');
      const data = { name, reason, type, days, start: new Date(sd), end: new Date(ed), sp, ep, sw, ew, subs, schoolName, semesterText };
      drawLeaveCanvasA4(tempCanvas, data);
      setShowPreview(true);
      requestAnimationFrame(() => {
        const c = canvasRef.current;
        if (c) { c.width = tempCanvas.width; c.height = tempCanvas.height; const ctx = c.getContext('2d'); if (ctx) ctx.drawImage(tempCanvas, 0, 0); }
      });
      saveHistory({ name, reason, type, days, sd, ed, sp, ep, sw, ew, subs, time: new Date().toISOString() });
      refresh();
      toast('\u751f\u6210\u6210\u529f\uff01');
    } catch (e: any) {
      console.error(e);
      toast('\u751f\u6210\u5931\u8d25\uff1a' + (e.message || '\u672a\u77e5\u9519\u8bef'));
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header"><span className="header-icon">\ud83d\udcdd</span><span>\u8bf7\u5047\u6761\u52a9\u624b</span></div>
        <div className="card-body">
          <div className="form-group">
            <label>\u8bf7\u5047\u4eba <span className="required">*</span></label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="\u8bf7\u8f93\u5165\u59d3\u540d" />
          </div>
          <div className="form-group">
            <label>\u8bf7\u5047\u7c7b\u578b</label>
            <div className="type-grid">
              {LEAVE_TYPES.map(t => <div key={t} className={`type-btn ${type === t ? 'selected' : ''}`} onClick={() => setType(t)}>{t}</div>)}
            </div>
          </div>
          <div className="form-group">
            <label>\u8bf7\u5047\u539f\u56e0 <span className="required">*</span></label>
            <select className="form-select" onChange={e => { if (e.target.value) setReason(e.target.value); }}>
              <option value="">-- \u9009\u62e9\u5e38\u89c1\u539f\u56e0 --</option>
              {['\u53c2\u52a0\u6559\u7814\u6d3b\u52a8','\u53c2\u52a0\u6559\u5e08\u57f9\u8bad','\u53c2\u52a0\u6559\u5b66\u7814\u8ba8\u4f1a','\u5916\u51fa\u5b66\u4e60\u4ea4\u6d41','\u53c2\u52a0\u5b66\u6821\u4f1a\u8bae','\u53c2\u52a0\u73ed\u4e3b\u4efb\u57f9\u8bad','\u56e0\u75c5\u5c31\u8bca','\u5bb6\u4e2d\u6025\u4e8b','\u5904\u7406\u4e2a\u4eba\u4e8b\u52a1'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="\u8f93\u5165\u5177\u4f53\u539f\u56e0" style={{ marginTop: 8 }} />
            <div className="quick-tags">
              {['\u6559\u7814\u6d3b\u52a8','\u6559\u5e08\u57f9\u8bad','\u56e0\u75c5\u5c31\u8bca','\u5b66\u4e60\u4ea4\u6d41','\u5b66\u6821\u4f1a\u8bae','\u5bb6\u4e2d\u6025\u4e8b'].map(tag => (
                <button key={tag} className="quick-tag" onClick={() => { const map: Record<string, string> = { '\u6559\u7814\u6d3b\u52a8': '\u53c2\u52a0\u6559\u7814\u6d3b\u52a8', '\u6559\u5e08\u57f9\u8bad': '\u53c2\u52a0\u6559\u5e08\u57f9\u8bad', '\u56e0\u75c5\u5c31\u8bca': '\u56e0\u75c5\u5c31\u8bca', '\u5b66\u4e60\u4ea4\u6d41': '\u5916\u51fa\u5b66\u4e60\u4ea4\u6d41', '\u5b66\u6821\u4f1a\u8bae': '\u53c2\u52a0\u5b66\u6821\u4f1a\u8bae', '\u5bb6\u4e2d\u6025\u4e8b': '\u5bb6\u4e2d\u6025\u4e8b' }; setReason(map[tag] || tag); }}>{tag}</button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group flex1">
              <label>\u5f00\u59cb\u65e5\u671f</label>
              <input type="date" className="form-input" value={sd} onChange={e => { setSd(e.target.value); updateSubsFromDates(e.target.value, ed, sp, ep); }} />
            </div>
            <div className="form-group flex1">
              <label>\u5f00\u59cb\u65f6\u6bb5</label>
              <div className="period-seg">
                {['\u4e0a\u5348','\u4e0b\u5348','\u5168\u5929'].map(p => (
                  <div key={p} className={`period-seg-item ${sp === p ? 'selected' : ''}`} onClick={() => { setSp(p); updateSubsFromDates(sd, ed, p, ep); }}>{p}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group flex1">
              <label>\u7ed3\u675f\u65e5\u671f</label>
              <input type="date" className="form-input" value={ed} onChange={e => { setEd(e.target.value); updateSubsFromDates(sd, e.target.value, sp, ep); }} />
            </div>
            <div className="form-group flex1">
              <label>\u7ed3\u675f\u65f6\u6bb5</label>
              <div className="period-seg">
                {['\u4e0a\u5348','\u4e0b\u5348','\u5168\u5929'].map(p => (
                  <div key={p} className={`period-seg-item ${ep === p ? 'selected' : ''}`} onClick={() => { setEp(p); updateSubsFromDates(sd, ed, sp, p); }}>{p}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="info-box">
            <div>\ud83d\udcc5 \u8bf7\u5047 <strong>{days % 1 === 0 ? days : days.toFixed(1)}</strong> \u5929</div>
            <div>\u7b2c {sw} \u5468 \u661f\u671f{wday(new Date(sd))} \u81f3 \u7b2c {ew} \u5468 \u661f\u671f{wday(new Date(ed))}</div>
            <div>{subs.length > 0 ? `\ud83d\udcda ${subs.length} \u8282\u8bfe\u9700\u5b89\u6392\u4ee3\u8bfe` : '\ud83d\udcda \u8be5\u65f6\u95f4\u6bb5\u65e0\u8bfe\u7a0b\u5b89\u6392'}</div>
          </div>
          {subs.length > 0 && (
            <div className="sub-section">
              <div className="sub-header"><span>\ud83d\udd04 \u4ee3\u8bfe\u4eba\u5458\u5b89\u6392</span></div>
              {subs.map((s, i) => (
                <div key={i} className="sub-card">
                  <div className="sub-card-header">
                    <div className="sub-day-row">
                      <select className="sub-select-day" value={s.day} onChange={e => { const dayMap: Record<string, {short: string, num: number}> = { '\u661f\u671f\u4e00':{short:'\u4e00',num:1},'\u661f\u671f\u4e8c':{short:'\u4e8c',num:2},'\u661f\u671f\u4e09':{short:'\u4e09',num:3},'\u661f\u671f\u56db':{short:'\u56db',num:4},'\u661f\u671f\u4e94':{short:'\u4e94',num:5},'\u661f\u671f\u516d':{short:'\u516d',num:6},'\u661f\u671f\u65e5':{short:'\u65e5',num:0} }; const info = dayMap[e.target.value] || {short:'\u4e00',num:1}; setSubs(prev => { const n = [...prev]; n[i] = { ...n[i], day: e.target.value, dayShort: info.short, dayNum: info.num }; return n; })}}>
                        {['\u661f\u671f\u4e00','\u661f\u671f\u4e8c','\u661f\u671f\u4e09','\u661f\u671f\u56db','\u661f\u671f\u4e94','\u661f\u671f\u516d','\u661f\u671f\u65e5'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <span className="sub-week-label">\u5468\u6b21</span>
                      <input className="sub-week-input" type="number" value={s.week} onChange={e => setSubs(prev => { const n = [...prev]; n[i] = { ...n[i], week: Number(e.target.value) || 1 }; return n; })} />
                    </div>
                    <span className="sub-delete" onClick={() => setSubs(prev => prev.filter((_, idx) => idx !== i))}>\u00d7</span>
                  </div>
                  <div className="sub-card-body">
                    <div className="sub-field">
                      <label>\u8282\u6b21</label>
                      <select className="sub-select" value={s.period} onChange={e => setSubs(prev => { const n = [...prev]; n[i] = { ...n[i], period: e.target.value }; return n; })}>
                        {periodNames.map((p: string) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="sub-field">
                      <label>\u73ed\u7ea7\u79d1\u76ee</label>
                      <select className="sub-select" value={s.classSubject} onChange={e => setSubs(prev => { const n = [...prev]; n[i] = { ...n[i], classSubject: e.target.value }; return n; })}>
                        <option value="">--\u9009\u62e9--</option>
                        {classSubjectOptions.map((o: string) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="sub-field">
                      <label>\u4ee3\u8bfe\u6559\u5e08</label>
                      <input className="sub-input" value={s.teacher} onChange={e => setSubs(prev => { const n = [...prev]; n[i] = { ...n[i], teacher: e.target.value }; return n; })} placeholder="\u586b\u5199" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="add-row" onClick={() => setSubs(prev => [...prev, { week: Number(sw) || 1, day: '\u661f\u671f\u4e00', dayShort: '\u4e00', dayNum: 1, period: '\u7b2c1\u8282', classSubject: '', teacher: '' }])}><span>+</span> \u624b\u52a8\u6dfb\u52a0\u4ee3\u8bfe\u5b89\u6392</div>
          <button className="btn btn-primary btn-block" onClick={generate} style={{ marginTop: 16 }}>\u2728 \u751f\u6210\u8bf7\u5047\u6761</button>
        </div>
      </div>
      {showPreview && (
        <div id="previewSection" className="card" style={{ marginTop: 12 }}>
          <div className="card-body">
            <div className="preview-header">
              <span>\ud83d\uddbc\ufe0f \u8bf7\u5047\u6761\u9884\u89c8\uff08\u70b9\u51fb\u653e\u5927\uff09</span>
              <div className="view-tabs"><span style={{ fontSize: 13, color: '#666' }}>\ud83d\udcc4 A4\u6253\u5370\u7248</span></div>
            </div>
            <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }} onClick={() => setShowModal(true)} />
            <div className="btn-row" style={{ justifyContent: 'center' }}>
              <button className="btn" style={{ background: 'linear-gradient(135deg,#c62828 0%,#b71c1c 100%)', color: '#fff', fontSize: 16, padding: '12px 40px', flex: 'none', minWidth: 200 }} onClick={() => { const c = canvasRef.current; if (!c) return; const win = window.open('', '_blank'); if (!win) return; win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>\u8bf7\u5047\u6761</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;font-family:sans-serif;}img{max-width:95%;box-shadow:0 4px 20px rgba(0,0,0,0.15);}.back-btn{position:fixed;top:20px;left:20px;padding:10px 20px;background:#c62828;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.2);}@media print{body{background:white;}img{box-shadow:none;}.back-btn{display:none!important;}}</style></head><body><button class="back-btn" onclick="window.close()">\u2190 \u8fd4\u56de</button><img src="${c.toDataURL('image/png')}" /></body></html>`); win.document.close(); toast('\u5df2\u6253\u5f00\uff0c\u6309Ctrl+P\u6253\u5370\u6216\u53e6\u5b58\u4e3aPDF'); }}>\ud83d\udda8\ufe0f \u5bfc\u51faPDF</button>
            </div>
            <p className="hint" style={{ textAlign: 'center' }}>\u70b9\u51fb\u56fe\u7247\u53ef\u653e\u5927\u67e5\u770b\uff0c\u957f\u6309\u56fe\u7247\u53ef\u4fdd\u5b58\u5230\u76f8\u518c</p>
          </div>
        </div>
      )}
      {showModal && (
        <div className="modal-overlay-light" onClick={() => setShowModal(false)}>
          <button className="modal-close" style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }} onClick={() => setShowModal(false)}>\u00d7</button>
          <div className="modal-content-light" onClick={e => e.stopPropagation()}>
            <canvas ref={modalCanvasRef} style={{ maxWidth: '95vw', maxHeight: '75vh', width: 'auto', height: 'auto', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
          </div>
          <button className="btn" style={{ marginTop: 12, background: 'linear-gradient(135deg,#c62828 0%,#b71c1c 100%)', color: '#fff', fontSize: 16, padding: '10px 32px' }} onClick={() => { const c = modalCanvasRef.current || canvasRef.current; if (!c) return; const win = window.open('', '_blank'); if (!win) return; win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>\u8bf7\u5047\u6761</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;font-family:sans-serif;}img{max-width:95%;box-shadow:0 4px 20px rgba(0,0,0,0.15);}.back-btn{position:fixed;top:20px;left:20px;padding:10px 20px;background:#c62828;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.2);}@media print{body{background:white;}img{box-shadow:none;}.back-btn{display:none!important;}}</style></head><body><button class="back-btn" onclick="window.close()">\u2190 \u8fd4\u56de</button><img src="${c.toDataURL('image/png')}" /></body></html>`); win.document.close(); toast('\u5df2\u6253\u5f00\uff0c\u6309Ctrl+P\u6253\u5370\u6216\u53e6\u5b58\u4e3aPDF'); }}>\ud83d\udda8\ufe0f \u5bfc\u51faPDF</button>
          <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>\ud83d\udc46 \u70b9\u51fb\u7a7a\u767d\u5904\u5173\u95ed</div>
        </div>
      )}
    </div>
  );
}

/* ============ \u8bfe\u8868\u67e5\u770b\uff08\u652f\u6301\u8868\u683c/\u56fe\u7247\u53cc\u6a21\u5f0f\uff09 ============ */
function SchedulePage({ settings, periodNames, schedule }: any) {
  const [viewMode, setViewMode] = useState<'table' | 'image'>('table');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!schedule) return <div className="page"><div className="card"><div className="card-header"><span className="header-icon">\ud83d\udccb</span><span>\u6211\u7684\u8bfe\u8868</span></div><div className="card-body empty"><div className="empty-icon">\ud83d\udccb</div><p>\u6682\u65e0\u8bfe\u8868\u6570\u636e</p></div></div></div>;

  const timeTable = settings?.timeTable || [];
  const dayNames = ['\u661f\u671f\u4e00','\u661f\u671f\u4e8c','\u661f\u671f\u4e09','\u661f\u671f\u56db','\u661f\u671f\u4e94'];

  // \u7ed8\u5236\u8bfe\u8868\u56fe\u7247
  const drawScheduleImage = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const cw = 900, ch = 640, lm = 40, tm = 50, rh = 36, cw_cell = (cw - lm - 100) / 5;
    c.width = cw; c.height = ch + (timeTable.length > 0 ? 60 : 0);

    // \u80cc\u666f
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);

    // \u6807\u9898
    ctx.fillStyle = '#c41e3a'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText((settings?.schoolName || '\u4e30\u90fd\u53bf\u7b2c\u4e09\u4e2d\u5b66\u6821') + ' \u8bfe\u7a0b\u8868', cw / 2, 32);

    // \u8868\u5934
    ctx.fillStyle = '#fde8eb'; ctx.fillRect(lm, tm, 100, rh);
    ctx.strokeStyle = '#c41e3a'; ctx.lineWidth = 1; ctx.strokeRect(lm, tm, 100, rh);
    ctx.fillStyle = '#c41e3a'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('\u8282\u6b21', lm + 50, tm + rh / 2 + 5);

    dayNames.forEach((d, i) => {
      const x = lm + 100 + i * cw_cell;
      ctx.fillStyle = '#fde8eb'; ctx.fillRect(x, tm, cw_cell, rh);
      ctx.strokeStyle = '#c41e3a'; ctx.strokeRect(x, tm, cw_cell, rh);
      ctx.fillStyle = '#c41e3a'; ctx.fillText(d, x + cw_cell / 2, tm + rh / 2 + 5);
    });

    // \u6570\u636e\u884c
    periodNames.forEach((period: string, pi: number) => {
      const y = tm + rh + pi * rh;
      // \u65f6\u95f4\u5217
      const timeSlot = timeTable.find((t: any) => t.name === period);
      ctx.fillStyle = '#fafafa'; ctx.fillRect(lm, y, 100, rh);
      ctx.strokeStyle = '#e0e0e0'; ctx.strokeRect(lm, y, 100, rh);
      ctx.fillStyle = '#333'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(period, lm + 50, y + rh / 2 + 4);
      if (timeSlot) { ctx.fillStyle = '#999'; ctx.font = '10px sans-serif'; ctx.fillText(timeSlot.startTime + '-' + timeSlot.endTime, lm + 50, y + rh / 2 + 16); }

      dayNames.forEach((_day: string, di: number) => {
        const x = lm + 100 + di * cw_cell;
        const courses = schedule.courses[di + 1] || [];
        const found = courses.find((c: any) => c.period === period);
        ctx.fillStyle = found ? '#e8f4ff' : '#fff'; ctx.fillRect(x, y, cw_cell, rh);
        ctx.strokeStyle = '#e0e0e0'; ctx.strokeRect(x, y, cw_cell, rh);
        if (found) {
          ctx.fillStyle = '#0066cc'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(found.classSubject, x + cw_cell / 2, y + rh / 2 + 4);
        }
      });
    });

    // \u5e95\u90e8\u65f6\u95f4
    if (timeTable.length > 0) {
      const ty = tm + rh + periodNames.length * rh + 20;
      ctx.fillStyle = '#666'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('\u23f0 \u4f5c\u606f\u65f6\u95f4\u8868\uff1a' + timeTable.map((t: any) => t.name + ' ' + t.startTime + '-' + t.endTime).join(' | '), lm, ty);
    }
  };

  // \u81ea\u52a8\u7ed8\u5236\u56fe\u7247\u6a21\u5f0f
  useState(() => { if (viewMode === 'image') setTimeout(drawScheduleImage, 100); });

  return (
    <div className="page">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="header-icon">\ud83d\udccb</span><span>\u6211\u7684\u8bfe\u8868</span></div>
          <div className="view-tabs">
            <button className={`view-tab ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>\ud83d\udcca \u8868\u683c</button>
            <button className={`view-tab ${viewMode === 'image' ? 'active' : ''}`} onClick={() => { setViewMode('image'); setTimeout(drawScheduleImage, 100); }}>\ud83d\uddbc\ufe0f \u56fe\u7247</button>
          </div>
        </div>
        <div className="card-body">
          {/* \u8868\u683c\u6a21\u5f0f */}
          {viewMode === 'table' && (
            <>
              {timeTable.length > 0 && (
                <div className="time-table" style={{ marginBottom: 16 }}>
                  <div className="section-title">\u23f0 \u5b66\u6821\u4f5c\u606f\u65f6\u95f4\u8868</div>
                  <div className="time-table-grid">{timeTable.map((t: any, i: number) => <div key={i} className="time-slot"><span className="time-name">{t.name}</span><span className="time-range">{t.startTime} - {t.endTime}</span></div>)}</div>
                </div>
              )}
              <div className="schedule-scroll">
                <table className="schedule-table">
                  <thead><tr><th>\u8282\u6b21<br/><span style={{fontSize:10,fontWeight:400,color:'#999'}}>\u65f6\u95f4</span></th>{dayNames.map(d => <th key={d}>{d}</th>)}</tr></thead>
                  <tbody>
                    {periodNames.map((period: string) => (
                      <tr key={period}>
                        <td className="period-cell">
                          {period}
                          {(() => { const tt = timeTable.find((t: any) => t.name === period); return tt ? <div style={{fontSize:10,color:'#999',fontWeight:400}}>{tt.startTime}-{tt.endTime}</div> : null; })()}
                        </td>
                        {dayNames.map((day, di) => { const courses = schedule.courses[di + 1] || []; const found = courses.find((c: any) => c.period === period); return <td key={day} className={found ? 'has-course' : 'empty'}>{found ? <span className="course-tag">{found.classSubject}</span> : '-'}</td>; })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* \u56fe\u7247\u6a21\u5f0f */}
          {viewMode === 'image' && (
            <div>
              <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 8, border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} />
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button className="btn btn-success" onClick={() => { const c = canvasRef.current; if (!c) return; const a = document.createElement('a'); a.download = '\u6211\u7684\u8bfe\u8868.png'; a.href = c.toDataURL('image/png'); a.click(); }}>\ud83d\udce5 \u4fdd\u5b58\u8bfe\u8868\u56fe\u7247</button>
                <button className="btn btn-outline" onClick={drawScheduleImage}>\ud83d\udd04 \u91cd\u65b0\u751f\u6210</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ \u8bbe\u7f6e\uff08\u542b\u6a21\u5757\u6392\u5e8f\uff09 ============ */
function SettingsPage({ settings, toast, refresh, moduleOrder }: any) {
  // \u5b66\u6821\u540d\u79f0\u9ed8\u8ba4"\u4e30\u90fd\u53bf\u7b2c\u4e09\u4e2d\u5b66\u6821"
  const defaultSchoolName = '\u4e30\u90fd\u53bf\u7b2c\u4e09\u4e2d\u5b66\u6821';
  // \u5b66\u671f\u81ea\u52a8\u8ba1\u7b97
  const defaultSemester = getSemesterText('');
  const [name, setName] = useState(settings?.name || '');
  const [schoolName, setSchoolName] = useState(settings?.schoolName || defaultSchoolName);
  const [semesterName, setSemesterName] = useState(settings?.semesterName || defaultSemester);
  const [startSchoolDate, setStartSchoolDate] = useState(settings?.startSchoolDate || '');
  const [scheduleText, setScheduleText] = useState('');
  const [periodNames, setPeriodNames] = useState(settings?.periodNames?.join('\n') || getDefaultPeriodNames().join('\n'));
  const [timeTableText, setTimeTableText] = useState(() => { const tt = settings?.timeTable || []; return tt.map((t: any) => `${t.name} ${t.startTime}-${t.endTime}`).join('\n'); });
  const [expanded, setExpanded] = useState<string>('basic');
  const [localOrder, setLocalOrder] = useState<string[]>(moduleOrder);

  const save = () => {
    if (!name) { toast('\u8bf7\u8f93\u5165\u6559\u5e08\u59d3\u540d'); return; }
    const schedule = parseSchedule(scheduleText || '');
    const pn = periodNames.split('\n').map((s: string) => s.trim()).filter(Boolean);
    const tt: any[] = [];
    for (const line of timeTableText.split('\n')) { const parts = line.trim().split(/\s+/); if (parts.length >= 2) { const timePart = parts[parts.length - 1]; const times = timePart.split(/[-~]/); if (times.length === 2) tt.push({ name: parts.slice(0, -1).join(' '), startTime: times[0], endTime: times[1] }); } }
    saveSettings({
      name,
      schoolName: schoolName || defaultSchoolName,
      semesterName: semesterName || defaultSemester,
      startSchoolDate,
      schedule: scheduleText ? schedule : (settings?.schedule || { courses: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] } }),
      periodNames: pn.length > 0 ? pn : getDefaultPeriodNames(),
      timeTable: tt,
      moduleOrder: localOrder,
      salaryCategories: settings?.salaryCategories || DEFAULT_SALARY_CATEGORIES,
    });
    refresh(); toast('\u2705 \u8bbe\u7f6e\u5df2\u4fdd\u5b58\uff01');
  };

  const moveModule = (index: number, direction: -1 | 1) => {
    const newOrder = [...localOrder];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newOrder.length) return;
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setLocalOrder(newOrder);
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header"><span className="header-icon">\u2699\ufe0f</span><span>\u4e2a\u4eba\u8bbe\u7f6e</span></div>
        <div className="card-body">
          {/* PWA\u5b89\u88c5\u5f15\u5bfc */}
          <div className="settings-section">
            <div className={`section-header pwa-header ${expanded === 'pwa' ? '' : 'collapsed'}`} onClick={() => setExpanded(expanded === 'pwa' ? '' : 'pwa')}>
              <span>\ud83d\udcf1 \u6dfb\u52a0\u5230\u684c\u9762</span><span>{expanded === 'pwa' ? '\u25bc' : '\u25b6'}</span>
            </div>
            {expanded === 'pwa' && (
              <div className="section-body pwa-guide">
                <p className="pwa-intro">\u628a\u300c\u6559\u5e08\u52a9\u624b\u300d\u6dfb\u52a0\u5230\u624b\u673a\u684c\u9762\uff0c\u50cf\u539f\u751fApp\u4e00\u6837\u4f7f\u7528\uff0c\u65e0\u9700\u6bcf\u6b21\u6253\u5f00\u6d4f\u89c8\u5668\uff01</p>
                <div className="pwa-step">
                  <div className="pwa-device">\ud83c\udf4e iPhone (Safari)</div>
                  <ol>
                    <li>\u7528 Safari \u6253\u5f00\u672c\u7f51\u9875</li>
                    <li>\u70b9\u51fb\u5e95\u90e8\u4e2d\u95f4\u7684 <strong>\u5206\u4eab\u6309\u94ae</strong>\uff08\u2b06\ufe0f \u65b9\u6846\u5e26\u7bad\u5934\uff09</li>
                    <li>\u4e0a\u6ed1\u627e\u5230 <strong>\u300c\u6dfb\u52a0\u5230\u4e3b\u5c4f\u5e55\u300d</strong></li>
                    <li>\u70b9\u51fb\u300c\u6dfb\u52a0\u300d\u5373\u53ef</li>
                  </ol>
                </div>
                <div className="pwa-step">
                  <div className="pwa-device">\ud83e\udd16 \u5b89\u5353 (Chrome/\u5fae\u4fe1\u6d4f\u89c8\u5668)</div>
                  <ol>
                    <li>\u7528 Chrome \u6216\u6d4f\u89c8\u5668\u6253\u5f00\u672c\u7f51\u9875</li>
                    <li>\u70b9\u51fb\u53f3\u4e0a\u89d2 <strong>\u83dc\u5355\uff08\u22ee\uff09</strong></li>
                    <li>\u9009\u62e9 <strong>\u300c\u6dfb\u52a0\u5230\u4e3b\u5c4f\u5e55\u300d</strong> \u6216 <strong>\u300c\u5b89\u88c5\u5e94\u7528\u300d</strong></li>
                    <li>\u786e\u8ba4\u6dfb\u52a0\u5373\u53ef</li>
                  </ol>
                </div>
                <div className="pwa-note">
                  \ud83d\udca1 \u6dfb\u52a0\u540e\uff0c\u624b\u673a\u684c\u9762\u4f1a\u51fa\u73b0\u300c\u6559\u5e08\u52a9\u624b\u300d\u56fe\u6807\uff0c\u70b9\u51fb\u5373\u53ef\u5168\u5c4f\u6253\u5f00\uff0c<strong>\u65e0\u9700\u8054\u7f51\u4e5f\u80fd\u67e5\u770b</strong>\uff08\u79bb\u7ebf\u7f13\u5b58\uff09\uff01
                </div>
              </div>
            )}
          </div>

          <div className="settings-section">
            <div className={`section-header ${expanded === 'basic' ? '' : 'collapsed'}`} onClick={() => setExpanded(expanded === 'basic' ? '' : 'basic')}>
              <span>\ud83d\udc64 \u57fa\u672c\u4fe1\u606f</span><span>{expanded === 'basic' ? '\u25bc' : '\u25b6'}</span>
            </div>
            {expanded === 'basic' && (
              <div className="section-body">
                <div className="form-group"><label>\u6559\u5e08\u59d3\u540d <span className="required">*</span></label><input className="form-input" value={name} onChange={e => setName(e.target.value)} /></div>
                <div className="form-group"><label>\u5b66\u6821\u540d\u79f0</label><input className="form-input" value={schoolName} onChange={e => setSchoolName(e.target.value)} /></div>
                <div className="form-group"><label>\u5b66\u671f</label><input className="form-input" value={semesterName} onChange={e => setSemesterName(e.target.value)} placeholder="\u7559\u7a7a\u81ea\u52a8\u8ba1\u7b97" /><p className="hint">\u7559\u7a7a\u5219\u6839\u636e\u5f53\u524d\u65e5\u671f\u81ea\u52a8\u8ba1\u7b97</p></div>
                <div className="form-group"><label>\u5f00\u5b66\u65e5\u671f</label><input type="date" className="form-input" value={startSchoolDate} onChange={e => setStartSchoolDate(e.target.value)} /><p className="hint">\u7528\u4e8e\u8ba1\u7b97\u5468\u6b21</p>
                {startSchoolDate && (
                  <div className="week-display">
                    \ud83d\udcc5 \u4eca\u5929\u662f\u7b2c <strong>{getWeekByStartDate(new Date(), startSchoolDate)}</strong> \u5468
                    <span className="week-check">\uff08\u8bf7\u6838\u5bf9\u662f\u5426\u6b63\u786e\uff09</span>
                  </div>
                )}</div>
              </div>
            )}
          </div>
          <div className="settings-section">
            <div className={`section-header ${expanded === 'schedule' ? '' : 'collapsed'}`} onClick={() => setExpanded(expanded === 'schedule' ? '' : 'schedule')}>
              <span>\ud83d\udccb \u8bfe\u8868\u8bbe\u7f6e</span><span>{expanded === 'schedule' ? '\u25bc' : '\u25b6'}</span>
            </div>
            {expanded === 'schedule' && (
              <div className="section-body">
                <div className="form-group">
                  <label>\ud83d\udce4 \u7b2c1\u6b65\uff1a\u4e0a\u4f20\u8bfe\u8868\u622a\u56fe\u7ed9\u8c46\u5305\u8bc6\u522b</label>
                  <div className="copy-box" onClick={() => {
                    const text = `\u8bf7\u8bc6\u522b\u8fd9\u5f20\u8bfe\u7a0b\u8868\u56fe\u7247\uff0c\u4e25\u683c\u6309\u4ee5\u4e0b\u683c\u5f0f\u9010\u884c\u8f93\u51fa\u6bcf\u8282\u8bfe\uff1a\n\n\u3010\u8f93\u51fa\u683c\u5f0f\u3011\uff08\u6bcf\u8282\u8bfe\u4e00\u884c\uff09\n\u661f\u671f\u51e0 \u8282\u6b21\u540d\u79f0 \u73ed\u7ea7\u79d1\u76ee\n\n\u3010\u793a\u4f8b\u3011\n\u661f\u671f\u4e00 \u6668\u8bfb \u521d\u4e00(1)\u8bed\u6587\n\u661f\u671f\u4e00 \u7b2c1\u8282 \u521d\u4e00(1)\u8bed\u6587\n\u661f\u671f\u4e00 \u7b2c3\u8282 \u521d\u4e8c(2)\u8bed\u6587\n\u661f\u671f\u4e8c \u6668\u8bfb \u521d\u4e8c(2)\u8bed\u6587\n\n\u3010\u8981\u6c42\u301d\n1. \u6bcf\u884c\u683c\u5f0f\uff1a\u661f\u671f + \u4e00\u4e2a\u7a7a\u683c + \u8282\u6b21\u540d\u79f0 + \u4e00\u4e2a\u7a7a\u683c + \u73ed\u7ea7\u79d1\u76ee\n2. \u661f\u671f\u5199\uff1a\u661f\u671f\u4e00 \u661f\u671f\u4e8c \u661f\u671f\u4e09 \u661f\u671f\u56db \u661f\u671f\u4e94\n3. \u8282\u6b21\u5199\u56fe\u7247\u4e0a\u5de6\u4fa7\u680f\u7684\u539f\u6837\u540d\u79f0\uff1a\u6668\u8bfb \u7b2c1\u8282 \u7b2c2\u8282 \u7b2c3\u8282 \u7b2c4\u8282 \u7b2c5\u8282 \u7b2c6\u8282 \u7b2c7\u8282 \u7b2c8\u8282 \u81ea\u4e3b1 \u81ea\u4e3b2 \u81ea\u4e3b3 \u665a1 \u665a2 \u665a3 \u665a4 \u7b49\n4. \u73ed\u7ea7\u79d1\u76ee\u4fdd\u7559\u5b8c\u6574\u540d\u79f0\u548c\u62ec\u53f7\uff1a\u5982 \u521d\u4e00(1)\u8bed\u6587 \u521d\u4e8c(2)\u6570\u5b66\n5. \u7a7a\u767d\u8282\u6b21\u4e0d\u8f93\u51fa\uff0c\u53ea\u8f93\u51fa\u6709\u8bfe\u7684\n6. \u53ea\u8f93\u51fa\u8bfe\u7a0b\u6570\u636e\uff0c\u4e0d\u8981\u4efb\u4f55\u89e3\u91ca\u3001\u4e0d\u8981\u8868\u683c\u3001\u4e0d\u8981"\u597d\u7684"\u4e4b\u7c7b\u7684\u5e9f\u8bdd`;
                    navigator.clipboard?.writeText(text).then(() => toast('\u2705 \u63d0\u793a\u8bcd\u5df2\u590d\u5236\uff01')).catch(() => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('\u2705 \u5df2\u590d\u5236'); });
                  }}>
                    <div className="copy-badge">\u70b9\u51fb\u590d\u5236</div>
                    <pre>{`\u8bf7\u8bc6\u522b\u8fd9\u5f20\u8bfe\u7a0b\u8868\u56fe\u7247\uff0c\u4e25\u683c\u6309\u4ee5\u4e0b\u683c\u5f0f\u9010\u884c\u8f93\u51fa\u6bcf\u8282\u8bfe...

\u3010\u793a\u4f8b\u3011
\u661f\u671f\u4e00 \u6668\u8bfb \u521d\u4e00(1)\u8bed\u6587
\u661f\u671f\u4e00 \u7b2c1\u8282 \u521d\u4e00(1)\u8bed\u6587

\u3010\u8981\u6c42\u301d6\u6761\u89c4\u5219...`}</pre>
                  </div>
                  <p className="hint">\ud83d\udc46 \u70b9\u51fb\u590d\u5236\u63d0\u793a\u8bcd \u2192 \u53d1\u7ed9\u8c46\u5305 \u2192 \u4e0a\u4f20\u8bfe\u8868\u622a\u56fe \u2192 \u8c46\u5305\u8fd4\u56de\u6587\u5b57</p>
                </div>
                <div className="form-group"><label>\ud83d\udccb \u7b2c2\u6b65\uff1a\u7c98\u8d34\u8c46\u5305\u8fd4\u56de\u7684\u8bfe\u8868\u6587\u5b57</label><textarea className="form-textarea" value={scheduleText} onChange={e => setScheduleText(e.target.value)} rows={6} placeholder="\u661f\u671f\u4e00 \u6668\u8bfb \u521d\u4e00(1)\u8bed\u6587&#10;\u661f\u671f\u4e00 \u7b2c1\u8282 \u521d\u4e8c(4)\u8bed\u6587" /></div>
                <div className="form-group"><label>\u8282\u6b21\u540d\u79f0\uff08\u6bcf\u884c\u4e00\u4e2a\uff09</label><textarea className="form-textarea" value={periodNames} onChange={e => setPeriodNames(e.target.value)} rows={4} /></div>
                <div className="form-group"><label>\u5b66\u6821\u4f5c\u606f\u65f6\u95f4\u8868\uff08\u53ef\u9009\uff09</label><textarea className="form-textarea" value={timeTableText} onChange={e => setTimeTableText(e.target.value)} rows={4} placeholder="\u6668\u8bfb 07:20-07:50" /></div>
              </div>
            )}
          </div>
          <div className="settings-section">
            <div className={`section-header ${expanded === 'modules' ? '' : 'collapsed'}`} onClick={() => setExpanded(expanded === 'modules' ? '' : 'modules')}>
              <span>\ud83e\udde9 \u9996\u9875\u6a21\u5757\u6392\u5e8f</span><span>{expanded === 'modules' ? '\u25bc' : '\u25b6'}</span>
            </div>
            {expanded === 'modules' && (
              <div className="section-body">
                <p className="hint" style={{ marginBottom: 10 }}>\u70b9\u51fb \u2191 \u2193 \u8c03\u6574\u6a21\u5757\u5728\u9996\u9875\u7684\u663e\u793a\u987a\u5e8f</p>
                {localOrder.map((key, i) => {
                  const mod = MODULE_CONFIG[key]; if (!mod) return null;
                  return (
                    <div key={key} className="module-sort-item">
                      <span>{mod.icon} {mod.name}</span>
                      <div className="module-sort-btns">
                        <button className="btn btn-small btn-secondary" disabled={i === 0} onClick={() => moveModule(i, -1)}>\u2191</button>
                        <button className="btn btn-small btn-secondary" disabled={i === localOrder.length - 1} onClick={() => moveModule(i, 1)}>\u2193</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={save}>\ud83d\udcbe \u4fdd\u5b58\u8bbe\u7f6e</button>
            <button className="btn btn-secondary" onClick={() => { setName('\u674e\u6210'); setSchoolName('\u4e30\u90fd\u53bf\u7b2c\u4e09\u4e2d\u5b66\u6821'); setSemesterName(''); setStartSchoolDate('2026-03-04'); setScheduleText(`\u661f\u671f\u4e00 \u6668\u8bfb \u521d\u4e00(1)\u8bed\u65e9\n\u661f\u671f\u4e00 \u7b2c2\u8282 \u521d\u4e8c(4)\u8bed\u6587\n\u661f\u671f\u4e00 \u7b2c4\u8282 \u521d\u4e00(1)\u8bed\u6587\n\u661f\u671f\u4e00 \u7b2c5\u8282 \u521d\u4e00(1)\u8bed\u6587\n\u661f\u671f\u4e8c \u6668\u8bfb \u521d\u4e00(1)\u8bed\u65e9\n\u661f\u671f\u4e8c \u7b2c1\u8282 \u521d\u4e8c(4)\u8bed\u6587\n\u661f\u671f\u4e8c \u7b2c2\u8282 \u521d\u4e8c(4)\u8bed\u6587\n\u661f\u671f\u4e09 \u6668\u8bfb \u521d\u4e8c(4)\u8bed\u65e9\n\u661f\u671f\u4e09 \u7b2c1\u8282 \u521d\u4e00(1)\u8bed\u6587\n\u661f\u671f\u4e09 \u7b2c2\u8282 \u521d\u4e8c(4)\u8bed\u6587\n\u661f\u671f\u4e09 \u7b2c3\u8282 \u521d\u4e00(1)\u8bed\u6587\n\u661f\u671f\u56db \u7b2c2\u8282 \u521d\u4e00(1)\u8bed\u6587\n\u661f\u671f\u56db \u7b2c3\u8282 \u521d\u4e00(1)\u8bed\u6587\n\u661f\u671f\u56db \u7b2c4\u8282 \u521d\u4e8c(4)\u8bed\u6587\n\u661f\u671f\u4e94 \u7b2c1\u8282 \u521d\u4e00(1)\u8bed\u6587\n\u661f\u671f\u4e94 \u7b2c2\u8282 \u521d\u4e00(1)\u8bed\u6587\n\u661f\u671f\u4e94 \u7b2c5\u8282 \u521d\u4e8c(4)\u8bed\u6587`); setPeriodNames(getDefaultPeriodNames().join('\n')); }}>\ud83d\udcd6 \u52a0\u8f7d\u793a\u4f8b</button>
          </div>
          <button className="btn btn-danger btn-block" style={{ marginTop: 8 }} onClick={() => { if (confirm('\u786e\u5b9a\u6e05\u7a7a\u6240\u6709\u8bbe\u7f6e\uff1f')) { clearAll(); refresh(); toast('\u5df2\u6e05\u7a7a'); } }}>\ud83d\uddd1\ufe0f \u6e05\u7a7a\u6240\u6709\u8bbe\u7f6e</button>
        </div>
      </div>
    </div>
  );
}

/* ============ \u5de5\u8d44\u7edf\u8ba1\uff08\u589e\u5f3a\u7248\uff09 ============ */
function SalaryPage({ toast }: { toast: (msg: string) => void }) {
  const [records, setRecords] = useState<SalaryRecord[]>(() => getData().salaries);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [timeView, setTimeView] = useState<'year' | 'quarter' | 'month'>('month');
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [categories, setCategories] = useState<string[]>(getSalaryCategories);
  const refresh = () => setRecords(getData().salaries);

  const addCategory = () => {
    if (!newCat.trim()) { toast('\u8bf7\u8f93\u5165\u7c7b\u522b\u540d\u79f0'); return; }
    if (categories.includes(newCat.trim())) { toast('\u8be5\u7c7b\u522b\u5df2\u5b58\u5728'); return; }
    const newCats = [...categories, newCat.trim()];
    setCategories(newCats);
    saveSalaryCategories(newCats);
    setNewCat('');
    toast('\u2705 \u7c7b\u522b\u5df2\u6dfb\u52a0');
  };
  const removeCategory = (cat: string) => {
    const newCats = categories.filter(c => c !== cat);
    setCategories(newCats);
    saveSalaryCategories(newCats);
    toast('\u5df2\u5220\u9664');
  };

  const save = () => { if (!date || !amount) { toast('\u8bf7\u586b\u5199\u5b8c\u6574'); return; } saveSalary({ id: editId || 'sal_' + Date.now(), date, description, category: category || '\u5176\u4ed6', amount: parseFloat(amount) }); refresh(); setShowForm(false); setEditId(''); setDate(''); setDescription(''); setCategory(''); setAmount(''); toast('\u2705 \u5df2\u4fdd\u5b58'); };
  const doImport = () => { const newRecords = importSalariesFromText(importText); if (newRecords.length === 0) { toast('\u672a\u8bc6\u522b\u5230\u6709\u6548\u6570\u636e'); return; } const d = getData(); d.salaries = [...newRecords, ...d.salaries]; setData(d); refresh(); setShowImport(false); setImportText(''); toast(`\u2705 \u5bfc\u5165 ${newRecords.length} \u6761`); };

  const totalIncome = records.reduce((s, r) => s + r.amount, 0);

  // \u6309\u7c7b\u522b\u7edf\u8ba1
  const byCategory: Record<string, number> = {};
  for (const r of records) byCategory[r.category] = (byCategory[r.category] || 0) + r.amount;

  // \u6309\u65f6\u95f4\u7ef4\u5ea6\u7edf\u8ba1
  const byTime: Record<string, number> = {};
  for (const r of records) {
    let key: string;
    if (timeView === 'year') key = r.date.slice(0, 4) + '\u5e74';
    else if (timeView === 'quarter') { const m = parseInt(r.date.slice(5, 7)); const q = Math.ceil(m / 3); key = r.date.slice(0, 4) + '\u5e74Q' + q; }
    else key = r.date.slice(0, 7);
    byTime[key] = (byTime[key] || 0) + r.amount;
  }
  const timeKeys = Object.keys(byTime).sort();
  const maxTimeVal = Math.max(...Object.values(byTime), 0);

  return (
    <div className="page">
      <div className="card">
        <div className="card-header"><span className="header-icon">\ud83d\udcb0</span><span>\u5de5\u8d44\u7edf\u8ba1</span></div>
        <div className="card-body">
          <div className="salary-stats">
            <div className="stat-card"><div className="stat-label">\u603b\u6536\u5165</div><div className="stat-value">\u00a5{totalIncome.toFixed(2)}</div></div>
            <div className="stat-card"><div className="stat-label">\u8bb0\u5f55\u6570</div><div className="stat-value">{records.length}</div></div>
          </div>

          {/* \u6309\u7c7b\u522b */}
          {Object.keys(byCategory).length > 0 && (
            <div className="chart-section">
              <div className="section-title">\u6309\u7c7b\u522b\u7edf\u8ba1</div>
              {Object.entries(byCategory).map(([cat, val]) => {
                const pct = totalIncome > 0 ? (val / totalIncome * 100).toFixed(1) : '0';
                return <div key={cat} className="chart-bar"><div className="chart-label">{cat}</div><div className="chart-track"><div className="chart-fill" style={{ width: pct + '%' }} /></div><div className="chart-value">\u00a5{val.toFixed(2)} ({pct}%)</div></div>;
              })}
            </div>
          )}

          {/* \u6309\u65f6\u95f4\u7ef4\u5ea6 */}
          {timeKeys.length > 0 && (
            <div className="chart-section">
              <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>\u6309\u65f6\u95f4\u7edf\u8ba1</span>
                <div className="view-tabs">
                  {([['year', '\u5e74\u5ea6'], ['quarter', '\u5b63\u5ea6'], ['month', '\u6708\u5ea6']] as const).map(([v, label]) => (
                    <button key={v} className={`view-tab ${timeView === v ? 'active' : ''}`} onClick={() => setTimeView(v)}>{label}</button>
                  ))}
                </div>
              </div>
              {timeKeys.map(key => {
                const pct = maxTimeVal > 0 ? (byTime[key] / maxTimeVal * 100).toFixed(1) : '0';
                return <div key={key} className="chart-bar"><div className="chart-label">{key}</div><div className="chart-track"><div className="chart-fill" style={{ width: pct + '%' }} /></div><div className="chart-value">\u00a5{byTime[key].toFixed(2)}</div></div>;
              })}
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>\u2795 \u6dfb\u52a0</button>
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}>\ud83d\udce5 \u5bfc\u5165</button>
            {records.length > 0 && <button className="btn btn-outline" onClick={() => exportSalaryCSV(records)}>\ud83d\udcca \u5bfc\u51faExcel</button>}
            {records.length > 0 && <button className="btn btn-outline" onClick={() => exportSalaryHTML(records)}>\ud83d\udcc4 \u5bfc\u51faPDF</button>}
          </div>

          {showImport && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>\u7c98\u8d34\u5de5\u8d44\u6570\u636e\uff08\u6bcf\u884c\u4e00\u6761\uff09</label>
              <textarea className="form-textarea" value={importText} onChange={e => setImportText(e.target.value)} rows={6} placeholder="2025-01-15 \u57fa\u672c\u5de5\u8d44 \u5de5\u8d44 4500.50" />
              <p className="hint">\u683c\u5f0f\uff1a\u65e5\u671f \u63cf\u8ff0 \u7c7b\u522b \u91d1\u989d</p>
              <div className="btn-row"><button className="btn btn-primary" onClick={doImport}>\u5bfc\u5165</button><button className="btn btn-secondary" onClick={() => setShowImport(false)}>\u53d6\u6d88</button></div>
            </div>
          )}

          {/* \u7c7b\u522b\u7ba1\u7406\u5f39\u7a97 */}
          {showCatMgr && (
            <div className="card" style={{ marginTop: 12, background: '#fafafa' }}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600 }}>\ud83c\udff7\ufe0f \u7c7b\u522b\u7ba1\u7406</span>
                  <button className="btn btn-small btn-secondary" onClick={() => setShowCatMgr(false)}>\u5173\u95ed</button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input className="form-input" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="\u65b0\u7c7b\u522b\u540d\u79f0" style={{ flex: 1 }} />
                  <button className="btn btn-primary" onClick={addCategory}>\u6dfb\u52a0</button>
                </div>
                <div className="cat-list">
                  {categories.map(c => (
                    <div key={c} className="cat-item">
                      <span>{c}</span>
                      <button className="btn btn-small btn-danger" onClick={() => removeCategory(c)}>\u5220\u9664</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showForm && (
            <div className="form-stack" style={{ marginTop: 12 }}>
              <div className="form-group"><label>\u65e5\u671f</label><input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div className="form-group"><label>\u63cf\u8ff0</label><input className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="\u5982\uff1a\u57fa\u672c\u5de5\u8d44" /></div>
              <div className="form-group">
                <label>\u7c7b\u522b</label>
                <div className="category-select-row">
                  <input className="form-input" value={category} onChange={e => setCategory(e.target.value)} placeholder="\u8f93\u5165\u7c7b\u522b\u6216\u9009\u62e9" style={{ flex: 1 }} />
                  <select className="form-select" value="" onChange={e => { if (e.target.value) setCategory(e.target.value); }} style={{ width: '42%', flexShrink: 0 }}>
                    <option value="">\u9009\u5e38\u89c1</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="cat-chips" style={{ marginTop: 6 }}>
                  {categories.map(c => (
                    <button key={c} className={`cat-chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
                  ))}
                  <button className="cat-chip cat-chip-add" onClick={() => setShowCatMgr(true)}>+ \u7ba1\u7406</button>
                </div>
              </div>
              <div className="form-group"><label>\u91d1\u989d\uff08\u5143\uff09</label><input type="number" className="form-input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
              <div className="btn-row"><button className="btn btn-primary" onClick={save}>\u4fdd\u5b58</button><button className="btn btn-secondary" onClick={() => setShowForm(false)}>\u53d6\u6d88</button></div>
            </div>
          )}

          {/* \u6570\u636e\u8868\u683c */}
          {records.length > 0 && (
            <div style={{ marginTop: 16, overflowX: 'auto' }}>
              <div className="section-title">\ud83d\udccb \u8bb0\u5f55\u660e\u7ec6</div>
              <table className="data-table">
                <thead><tr><th>\u65e5\u671f</th><th>\u63cf\u8ff0</th><th>\u7c7b\u522b</th><th>\u91d1\u989d</th><th>\u64cd\u4f5c</th></tr></thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td>{r.description || '-'}</td>
                      <td><span className="tag">{r.category}</span></td>
                      <td style={{ color: '#07c160', fontWeight: 600 }}>+\u00a5{r.amount.toFixed(2)}</td>
                      <td><button className="btn btn-small btn-secondary" onClick={() => { deleteSalary(r.id); refresh(); toast('\u5df2\u5220\u9664'); }}>\u5220\u9664</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {records.length === 0 && <div className="empty"><div className="empty-icon">\ud83d\udcb0</div><p>\u6682\u65e0\u8bb0\u5f55</p></div>}
        </div>
      </div>
    </div>
  );
}

/* ============ \u503c\u73ed\u7edf\u8ba1\uff08\u72ec\u7acb\uff09 ============ */
function DutyOnlyPage({ toast }: { toast: (msg: string) => void }) {
  const [records, setRecords] = useState<DutyRecord[]>(() => getData().duties.filter((d: DutyRecord) => d.type === '\u503c\u73ed'));
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const refresh = () => setRecords(getData().duties.filter((d: DutyRecord) => d.type === '\u503c\u73ed'));

  const save = () => { if (!date) { toast('\u8bf7\u586b\u5199\u65e5\u671f'); return; } saveDuty({ id: 'duty_' + Date.now(), date, type: '\u503c\u73ed', description }); refresh(); setShowForm(false); setDate(''); setDescription(''); toast('\u2705 \u5df2\u4fdd\u5b58'); };

  const total = records.length;
  const byMonth: Record<string, number> = {};
  for (const r of records) { const m = r.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + 1; }
  const monthKeys = Object.keys(byMonth).sort();
  const maxMonth = Math.max(...Object.values(byMonth), 0);

  return (
    <div className="page">
      <div className="card">
        <div className="card-header"><span className="header-icon">\ud83d\udcc5</span><span>\u503c\u73ed\u7edf\u8ba1</span></div>
        <div className="card-body">
          <div className="salary-stats">
            <div className="stat-card"><div className="stat-label">\u503c\u73ed\u603b\u6b21\u6570</div><div className="stat-value">{total}</div></div>
            <div className="stat-card"><div className="stat-label">\u6d89\u53ca\u6708\u4efd</div><div className="stat-value">{monthKeys.length}</div></div>
          </div>

          {monthKeys.length > 0 && (
            <div className="chart-section">
              <div className="section-title">\u6309\u6708\u7edf\u8ba1</div>
              {monthKeys.map(m => <div key={m} className="chart-bar"><div className="chart-label">{m}</div><div className="chart-track"><div className="chart-fill" style={{ width: maxMonth > 0 ? (byMonth[m] / maxMonth * 100) + '%' : '0%' }} /></div><div className="chart-value">{byMonth[m]} \u6b21</div></div>)}
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>\u2795 \u6dfb\u52a0</button>
            {records.length > 0 && <button className="btn btn-outline" onClick={() => exportDutyCSV(records)}>\ud83d\udcca \u5bfc\u51faExcel</button>}
            {records.length > 0 && <button className="btn btn-outline" onClick={() => exportDutyHTML(records)}>\ud83d\udcc4 \u5bfc\u51faPDF</button>}
          </div>
          {showForm && (
            <div className="form-stack" style={{ marginTop: 12 }}>
              <div className="form-group"><label>\u65e5\u671f</label><input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div className="form-group"><label>\u5907\u6ce8</label><input className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="\u5982\uff1a\u884c\u653f\u503c\u73ed" /></div>
              <div className="btn-row"><button className="btn btn-primary" onClick={save}>\u4fdd\u5b58</button><button className="btn btn-secondary" onClick={() => setShowForm(false)}>\u53d6\u6d88</button></div>
            </div>
          )}

          {/* \u7edf\u8ba1\u8868\u683c */}
          {records.length > 0 && (
            <div style={{ marginTop: 16, overflowX: 'auto' }}>
              <div className="section-title">\ud83d\udccb \u503c\u73ed\u8bb0\u5f55\u8868</div>
              <table className="data-table">
                <thead><tr><th>\u5e8f\u53f7</th><th>\u65e5\u671f</th><th>\u5907\u6ce8</th><th>\u64cd\u4f5c</th></tr></thead>
                <tbody>
                  {records.map((r, idx) => (
                    <tr key={r.id}>
                      <td>{idx + 1}</td>
                      <td>{r.date}</td>
                      <td>{r.description || '-'}</td>
                      <td><button className="btn btn-small btn-secondary" onClick={() => { deleteDuty(r.id); refresh(); toast('\u5df2\u5220\u9664'); }}>\u5220\u9664</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {records.length === 0 && <div className="empty"><div className="empty-icon">\ud83d\udcc5</div><p>\u6682\u65e0\u503c\u73ed\u8bb0\u5f55</p></div>}
        </div>
      </div>
    </div>
  );
}

/* ============ \u4ee3\u8bfe\u7edf\u8ba1\uff08\u72ec\u7acb\uff09 ============ */
function SubstituteOnlyPage({ toast }: { toast: (msg: string) => void }) {
  const [records, setRecords] = useState<DutyRecord[]>(() => getData().duties.filter((d: DutyRecord) => d.type === '\u4ee3\u8bfe'));
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState('');
  const [substituteFor, setSubstituteFor] = useState('');
  const [period, setPeriod] = useState('');
  const [classSubject, setClassSubject] = useState('');
  const [description, setDescription] = useState('');
  const refresh = () => setRecords(getData().duties.filter((d: DutyRecord) => d.type === '\u4ee3\u8bfe'));

  const save = () => { if (!date) { toast('\u8bf7\u586b\u5199\u65e5\u671f'); return; } saveDuty({ id: 'duty_' + Date.now(), date, type: '\u4ee3\u8bfe', description, substituteFor, period, classSubject }); refresh(); setShowForm(false); setDate(''); setSubstituteFor(''); setPeriod(''); setClassSubject(''); setDescription(''); toast('\u2705 \u5df2\u4fdd\u5b58'); };

  const total = records.length;
  const byMonth: Record<string, number> = {};
  const byPerson: Record<string, { count: number; details: Array<{ date: string; period: string; classSubject: string }> }> = {};
  for (const r of records) {
    const m = r.date.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + 1;
    if (r.substituteFor) { if (!byPerson[r.substituteFor]) byPerson[r.substituteFor] = { count: 0, details: [] }; byPerson[r.substituteFor].count++; byPerson[r.substituteFor].details.push({ date: r.date, period: r.period || '', classSubject: r.classSubject || '' }); }
  }
  const monthKeys = Object.keys(byMonth).sort();
  const maxMonth = Math.max(...Object.values(byMonth), 0);

  return (
    <div className="page">
      <div className="card">
        <div className="card-header"><span className="header-icon">\ud83d\udcca</span><span>\u4ee3\u8bfe\u7edf\u8ba1</span></div>
        <div className="card-body">
          <div className="salary-stats">
            <div className="stat-card"><div className="stat-label">\u4ee3\u8bfe\u603b\u6b21\u6570</div><div className="stat-value">{total}</div></div>
            <div className="stat-card"><div className="stat-label">\u6d89\u53ca\u6559\u5e08</div><div className="stat-value">{Object.keys(byPerson).length}</div></div>
          </div>

          {monthKeys.length > 0 && (
            <div className="chart-section">
              <div className="section-title">\u6309\u6708\u7edf\u8ba1</div>
              {monthKeys.map(m => <div key={m} className="chart-bar"><div className="chart-label">{m}</div><div className="chart-track"><div className="chart-fill" style={{ width: maxMonth > 0 ? (byMonth[m] / maxMonth * 100) + '%' : '0%' }} /></div><div className="chart-value">{byMonth[m]} \u6b21</div></div>)}
            </div>
          )}

          {Object.keys(byPerson).length > 0 && (
            <div className="chart-section">
              <div className="section-title">\u6309\u6559\u5e08\u7edf\u8ba1</div>
              {Object.entries(byPerson).sort((a, b) => b[1].count - a[1].count).map(([person, data]) => (
                <div key={person} className="person-card">
                  <div className="person-header"><span className="person-name">{person}</span><span className="person-count">{data.count} \u6b21</span></div>
                  <div className="person-details">{data.details.map((d, i) => <div key={i} className="person-detail">{d.date} {d.period} {d.classSubject}</div>)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>\u2795 \u6dfb\u52a0</button>
            {records.length > 0 && <button className="btn btn-outline" onClick={() => exportSubCSV(records)}>\ud83d\udcca \u5bfc\u51faExcel</button>}
            {records.length > 0 && <button className="btn btn-outline" onClick={() => exportSubHTML(records)}>\ud83d\udcc4 \u5bfc\u51faPDF</button>}
          </div>
          {showForm && (
            <div className="form-stack" style={{ marginTop: 12 }}>
              <div className="form-group"><label>\u65e5\u671f</label><input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div className="form-group"><label>\u66ff\u8c01\u4ee3\u8bfe</label><input className="form-input" value={substituteFor} onChange={e => setSubstituteFor(e.target.value)} placeholder="\u6559\u5e08\u59d3\u540d" /></div>
              <div className="form-group"><label>\u8282\u6b21</label><input className="form-input" value={period} onChange={e => setPeriod(e.target.value)} placeholder="\u5982\uff1a\u7b2c1\u8282" /></div>
              <div className="form-group"><label>\u73ed\u7ea7\u79d1\u76ee</label><input className="form-input" value={classSubject} onChange={e => setClassSubject(e.target.value)} placeholder="\u5982\uff1a\u521d\u4e00(1)\u8bed\u6587" /></div>
              <div className="form-group"><label>\u5907\u6ce8</label><input className="form-input" value={description} onChange={e => setDescription(e.target.value)} /></div>
              <div className="btn-row"><button className="btn btn-primary" onClick={save}>\u4fdd\u5b58</button><button className="btn btn-secondary" onClick={() => setShowForm(false)}>\u53d6\u6d88</button></div>
            </div>
          )}

          {/* \u7edf\u8ba1\u8868\u683c */}
          {records.length > 0 && (
            <div style={{ marginTop: 16, overflowX: 'auto' }}>
              <div className="section-title">\ud83d\udccb \u4ee3\u8bfe\u8bb0\u5f55\u8868</div>
              <table className="data-table">
                <thead><tr><th>\u5e8f\u53f7</th><th>\u65e5\u671f</th><th>\u66ff\u8c01</th><th>\u8282\u6b21</th><th>\u73ed\u7ea7\u79d1\u76ee</th><th>\u64cd\u4f5c</th></tr></thead>
                <tbody>
                  {records.map((r, idx) => (
                    <tr key={r.id}>
                      <td>{idx + 1}</td>
                      <td>{r.date}</td>
                      <td>{r.substituteFor || '-'}</td>
                      <td>{r.period || '-'}</td>
                      <td>{r.classSubject || '-'}</td>
                      <td><button className="btn btn-small btn-secondary" onClick={() => { deleteDuty(r.id); refresh(); toast('\u5df2\u5220\u9664'); }}>\u5220\u9664</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {records.length === 0 && <div className="empty"><div className="empty-icon">\ud83d\udcca</div><p>\u6682\u65e0\u4ee3\u8bfe\u8bb0\u5f55</p></div>}
        </div>
      </div>
    </div>
  );
}

/* ============ \u652f\u4ed8\u622a\u56fe\u5904\u7406\uff08\u5dee\u65c5\u62a5\u9500\u52a9\u624b\uff09- \u5e26\u88c1\u526a+\u7eaf\u56fe\u6392\u7248 ============ */
interface PaymentEntry {
  id: string;
  date: string;
  timeSlot: '\u65e9\u4e0a' | '\u4e2d\u5348' | '\u665a\u4e0a';
  finalTime: string;
  editedSrc: string;
  croppedSrc: string;
}

function PaymentPage({ toast }: { toast: (msg: string) => void }) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [entries, setEntries] = useState<PaymentEntry[]>([]);
  const [colsPerRow, setColsPerRow] = useState(3);
  const [rowsPerPage, setRowsPerPage] = useState(3);
  const [a4Images, setA4Images] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState('');
  const [tripStart, setTripStart] = useState('');
  const [tripEnd, setTripEnd] = useState('');
  const [cropPercent, setCropPercent] = useState(15);
  const [promptText, setPromptText] = useState('');

  const generateEntriesFromRange = () => {
    if (!tripStart || !tripEnd) { toast('\u8bf7\u9009\u62e9\u51fa\u5dee\u5f00\u59cb\u548c\u7ed3\u675f\u65e5\u671f'); return; }
    const start = new Date(tripStart); const end = new Date(tripEnd);
    if (end < start) { toast('\u7ed3\u675f\u65e5\u671f\u4e0d\u80fd\u65e9\u4e8e\u5f00\u59cb\u65e5\u671f'); return; }
    const newEntries: PaymentEntry[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const dateStr = cur.toISOString().slice(0, 10);
      for (const slot of [['\u65e9\u4e0a', 7], ['\u4e2d\u5348', 12], ['\u665a\u4e0a', 17]] as const) {
        const h = slot[1] + Math.floor(Math.random() * 2);
        const m = Math.floor(Math.random() * 60).toString().padStart(2, '0');
        const s = Math.floor(Math.random() * 60).toString().padStart(2, '0');
        newEntries.push({ id: 'ent_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), date: dateStr, timeSlot: slot[0] as '\u65e9\u4e0a'|'\u4e2d\u5348'|'\u665a\u4e0a', finalTime: `${h}:${m}:${s}`, editedSrc: '', croppedSrc: '' });
      }
      cur.setDate(cur.getDate() + 1);
    }
    setEntries(newEntries);
    toast(`\u2705 \u5df2\u751f\u6210 ${newEntries.length} \u4e2a\u65f6\u95f4\u6761\u76ee\uff08${newEntries.length / 3} \u5929\uff09`);
  };

  const randomizeTimes = () => {
    setEntries(prev => prev.map(e => {
      const h = e.timeSlot === '\u65e9\u4e0a' ? 7 + Math.floor(Math.random() * 2) : e.timeSlot === '\u4e2d\u5348' ? 12 + Math.floor(Math.random() * 2) : 17 + Math.floor(Math.random() * 2);
      return { ...e, finalTime: `${h}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}` };
    }));
    toast('\u2705 \u65f6\u95f4\u5df2\u91cd\u65b0\u968f\u673a\u751f\u6210');
  };

  const updateEntry = (id: string, field: keyof PaymentEntry, value: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeEntry = (id: string) => setEntries(prev => prev.filter(e => e.id !== id));

  const toggleTimeSlot = (id: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e;
      const slots: Array<'\u65e9\u4e0a' | '\u4e2d\u5348' | '\u665a\u4e0a'> = ['\u65e9\u4e0a', '\u4e2d\u5348', '\u665a\u4e0a'];
      const next = slots[(slots.indexOf(e.timeSlot) + 1) % 3];
      const h = next === '\u65e9\u4e0a' ? 7 + Math.floor(Math.random() * 2) : next === '\u4e2d\u5348' ? 12 + Math.floor(Math.random() * 2) : 17 + Math.floor(Math.random() * 2);
      return { ...e, timeSlot: next, finalTime: `${h}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}` };
    }));
  };

  // \u751f\u6210\u5e76\u5c55\u793a\u63d0\u793a\u8bcd
  const generatePrompt = () => {
    if (entries.length === 0) { toast('\u8bf7\u5148\u751f\u6210\u65f6\u95f4\u6761\u76ee'); return; }
    const timeList = entries.map((e, i) => {
      const d = new Date(e.date);
      return `\u7b2c${i + 1}\u5f20\uff1a${d.getFullYear()}\u5e74${d.getMonth() + 1}\u6708${d.getDate()}\u65e5 ${e.finalTime}\uff08${e.timeSlot}\uff09`;
    }).join('\n');

    const prompt = `\u4f60\u662f\u4e00\u4e2a\u4e13\u4e1a\u7684\u56fe\u7247\u7f16\u8f91\u52a9\u624b\u3002\u8bf7\u5e2e\u6211\u4fee\u6539\u4ee5\u4e0b\u5fae\u4fe1\u96f6\u94b1\u660e\u7ec6\u622a\u56fe\u4e2d\u7684\u652f\u4ed8\u65f6\u95f4/\u8f6c\u8d26\u65f6\u95f4\uff0c\u5176\u4ed6\u6240\u6709\u5185\u5bb9\u4fdd\u6301\u4e0d\u53d8\u3002\n\n\u3010\u4fee\u6539\u8981\u6c42\u301d\n1. \u53ea\u4fee\u6539"\u652f\u4ed8\u65f6\u95f4"\u6216"\u8f6c\u8d26\u65f6\u95f4"\u540e\u9762\u7684\u65f6\u95f4\u503c\uff0c\u5176\u4ed6\u6587\u5b57\u3001\u56fe\u6807\u3001\u5e03\u5c40\u5b8c\u5168\u4e0d\u52a8\n2. \u4fee\u6539\u540e\u7684\u5b57\u4f53\u3001\u5927\u5c0f\u3001\u989c\u8272\u3001\u4f4d\u7f6e\u8981\u548c\u539f\u56fe\u5b8c\u5168\u4e00\u81f4\uff0c\u770b\u4e0d\u51fa\u6765\u4fee\u6539\u8fc7\n3. \u65f6\u95f4\u683c\u5f0f\u4fdd\u6301\uff1aXXXX\u5e74X\u6708X\u65e5 XX:XX:XX\n4. \u5982\u679c\u539f\u56fe\u6709"\u8f6c\u8d26\u65f6\u95f4"\u6807\u7b7e\uff0c\u5c31\u4fee\u6539\u8f6c\u8d26\u65f6\u95f4\uff1b\u5982\u679c\u662f"\u652f\u4ed8\u65f6\u95f4"\u6807\u7b7e\uff0c\u5c31\u4fee\u6539\u652f\u4ed8\u65f6\u95f4\n\n\u3010\u6bcf\u5f20\u622a\u56fe\u8981\u4fee\u6539\u7684\u65f6\u95f4\u301d\n${timeList}\n\n\u3010\u8f93\u51fa\u8981\u6c42\u301d\n- \u76f4\u63a5\u8f93\u51fa\u4fee\u6539\u540e\u7684\u56fe\u7247\n- \u4fdd\u6301\u539f\u56fe\u7684\u5206\u8fa8\u7387\u548c\u6e05\u6670\u5ea6\n- \u4e0d\u8981\u6dfb\u52a0\u4efb\u4f55\u6c34\u5370\u3001\u6807\u8bb0\u3001\u8fb9\u6846\u6216\u5176\u4ed6\u88c5\u9970`;

    setPromptText(prompt);
    navigator.clipboard?.writeText(prompt).then(() => toast('\u2705 \u63d0\u793a\u8bcd\u5df2\u590d\u5236')).catch(() => {
      const ta = document.createElement('textarea'); ta.value = prompt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); toast('\u2705 \u5df2\u590d\u5236');
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (uploadTargetId) {
        // \u4e0a\u4f20\u540e\u540c\u65f6\u505a\u88c1\u526a
        setEntries(prev => prev.map(en => {
          if (en.id !== uploadTargetId) return en;
          // \u5f02\u6b65\u88c1\u526a
          import('./payment').then(({ cropImageBottom }) => {
            cropImageBottom(src, cropPercent).then(cropped => {
              setEntries(p => p.map(e => e.id === uploadTargetId ? { ...e, editedSrc: src, croppedSrc: cropped } : e));
            }).catch(() => {
              setEntries(p => p.map(e => e.id === uploadTargetId ? { ...e, editedSrc: src, croppedSrc: src } : e));
            });
          });
          return { ...en, editedSrc: src, croppedSrc: '' };
        }));
      }
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  // \u4f7f\u7528\u88c1\u526a\u540e\u7684\u56fe\u7247\u6392\u5e8f
  const sortedEntries = [...entries].filter(e => e.editedSrc).sort((a, b) => {
    const ta = a.date + ' ' + a.finalTime;
    const tb = b.date + ' ' + b.finalTime;
    return ta.localeCompare(tb);
  });

  const drawA4Preview = async () => {
    const imagesToUse = sortedEntries.map(e => e.croppedSrc || e.editedSrc).filter(Boolean);
    if (imagesToUse.length === 0) { toast('\u8bf7\u5148\u4e0a\u4f20\u56fe\u7247'); return; }
    const { exportA4PureImages } = await import('./payment');
    const pages = await exportA4PureImages(imagesToUse, colsPerRow, rowsPerPage);
    setA4Images(pages);
    toast(`\u2705 \u5df2\u751f\u6210 ${pages.length} \u9875`);
  };

  const exportPDF = () => {
    const imagesToUse = sortedEntries.map(e => e.croppedSrc || e.editedSrc).filter(Boolean);
    if (imagesToUse.length === 0) { toast('\u8bf7\u5148\u4e0a\u4f20\u56fe\u7247'); return; }
    import('./payment').then(({ openPrintWindow }) => {
      openPrintWindow(imagesToUse, colsPerRow, rowsPerPage);
      toast('\u5df2\u6253\u5f00\u6253\u5370\u7a97\u53e3');
    });
  };

  const entriesByDate: Record<string, PaymentEntry[]> = {};
  for (const e of entries) { if (!entriesByDate[e.date]) entriesByDate[e.date] = []; entriesByDate[e.date].push(e); }

  return (
    <div className="page">
      {/* \u9636\u6bb5\u6307\u793a\u5668 */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="phase-indicator">
          {[{n:1,t:'\u9009\u62e9\u65f6\u95f4',i:'\u23f0'},{n:2,t:'\u4e0a\u4f20P\u597d\u7684\u56fe',i:'\ud83d\udce4'},{n:3,t:'\u6392\u7248\u5bfc\u51fa',i:'\ud83d\udcc4'}].map(p => (
            <div key={p.n} className={`phase-step ${phase === p.n ? 'active' : ''} ${phase > p.n ? 'done' : ''}`} onClick={() => setPhase(p.n as 1|2|3)}>
              <div className="phase-num">{phase > p.n ? '\u2713' : p.i}</div>
              <div className="phase-label">{p.t}</div>
            </div>
          ))}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

      {/* ===== \u9636\u6bb51\uff1a\u9009\u62e9\u51fa\u5dee\u65f6\u95f4\u8303\u56f4 ===== */}
      {phase === 1 && (
        <div className="card">
          <div className="card-header"><span className="header-icon">\u23f0</span><span>\u7b2c1\u6b65\uff1a\u9009\u62e9\u51fa\u5dee\u65f6\u95f4\u8303\u56f4</span></div>
          <div className="card-body">
            <div className="info-box" style={{ marginBottom: 16 }}>
              <strong>\u4f7f\u7528\u6d41\u7a0b\uff1a</strong><br />
              1\ufe0f\u20e3 \u9009\u62e9\u51fa\u5dee\u8d77\u6b62\u65e5\u671f \u2192 \u81ea\u52a8\u751f\u6210\u6bcf\u5929\u65e9\u4e2d\u665a\u65f6\u95f4<br />
              2\ufe0f\u20e3 \u68c0\u67e5\u65f6\u95f4 \u2192 \u751f\u6210\u63d0\u793a\u8bcd \u2192 \u590d\u5236\u7ed9\u8c46\u5305<br />
              3\ufe0f\u20e3 \u628a\u5fae\u4fe1\u96f6\u94b1\u660e\u7ec6\u622a\u56fe\u53d1\u7ed9\u8c46\u5305P\u56fe
            </div>

            <div className="form-row">
              <div className="form-group flex1">
                <label>\u51fa\u5dee\u5f00\u59cb\u65e5\u671f</label>
                <input type="date" className="form-input" value={tripStart} onChange={e => setTripStart(e.target.value)} />
              </div>
              <div className="form-group flex1">
                <label>\u51fa\u5dee\u7ed3\u675f\u65e5\u671f</label>
                <input type="date" className="form-input" value={tripEnd} onChange={e => setTripEnd(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-primary btn-block" onClick={generateEntriesFromRange}>\u26a1 \u81ea\u52a8\u751f\u6210\u6bcf\u5929\u65e9\u4e2d\u665a\u65f6\u95f4</button>

            {entries.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 10px' }}>
                  <div className="section-title" style={{ margin: 0 }}>\ud83d\udccb \u5171 {entries.length} \u4e2a\u6761\u76ee\uff08{Object.keys(entriesByDate).length} \u5929\uff09</div>
                  <button className="btn btn-small btn-secondary" onClick={randomizeTimes}>\ud83c\udfb2 \u91cd\u65b0\u968f\u673a</button>
                </div>

                {Object.entries(entriesByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayEntries]) => (
                  <div key={date} style={{ marginBottom: 12, background: '#fafafa', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--primary)' }}>{date}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {dayEntries.map(e => (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', borderRadius: 8, padding: '6px 10px', border: '1.5px solid var(--border)' }}>
                          <div style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, minWidth: 52, textAlign: 'center', padding: '4px 8px', borderRadius: 6, background: e.timeSlot === '\u65e9\u4e0a' ? '#e6f7e6' : e.timeSlot === '\u4e2d\u5348' ? '#fff7e6' : '#e6f4ff', color: e.timeSlot === '\u65e9\u4e0a' ? '#07c160' : e.timeSlot === '\u4e2d\u5348' ? '#faad14' : '#1890ff' }} onClick={() => toggleTimeSlot(e.id)}>
                            {e.timeSlot}
                          </div>
                          <input className="form-input" style={{ flex: 1, padding: '6px 8px', fontSize: 13, marginBottom: 0, minWidth: 0 }} value={e.finalTime} onChange={ev => updateEntry(e.id, 'finalTime', ev.target.value)} />
                          <div style={{ cursor: 'pointer', color: '#c41e3a', fontSize: 18, flexShrink: 0, width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => removeEntry(e.id)}>\u00d7</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={generatePrompt}>\ud83d\udccb \u751f\u6210\u8c46\u5305\u63d0\u793a\u8bcd\u5e76\u590d\u5236</button>
                {promptText && (
                  <div className="prompt-display" style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>\ud83d\udc47 \u63d0\u793a\u8bcd\u9884\u89c8\uff08\u8bf7\u68c0\u67e5\uff09</span>
                      <button className="btn btn-small btn-primary" onClick={() => { navigator.clipboard?.writeText(promptText); toast('\u5df2\u590d\u5236'); }}>\u590d\u5236</button>
                    </div>
                    <pre style={{ background: '#f8f9fa', border: '1px solid var(--border)', borderRadius: 8, padding: 12, fontSize: 12, lineHeight: 1.6, maxHeight: 300, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{promptText}</pre>
                  </div>
                )}
                <button className="btn btn-success btn-block" style={{ marginTop: 8 }} onClick={() => setPhase(2)}>\u4e0b\u4e00\u6b65\uff1a\u4e0a\u4f20\u8c46\u5305P\u597d\u7684\u56fe \u2192</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== \u9636\u6bb52\uff1a\u4e0a\u4f20\u8c46\u5305P\u597d\u7684\u56fe\u7247\uff08\u5e26\u88c1\u526a\uff09 ===== */}
      {phase === 2 && (
        <div className="card">
          <div className="card-header"><span className="header-icon">\ud83d\udce4</span><span>\u7b2c2\u6b65\uff1a\u4e0a\u4f20\u8c46\u5305\u4fee\u6539\u540e\u7684\u622a\u56fe</span></div>
          <div className="card-body">
            <div className="info-box" style={{ marginBottom: 12 }}>
              \u8c46\u5305\u5904\u7406\u540e\u7684\u56fe\u7247\u5e95\u90e8\u53ef\u80fd\u6709\u6c34\u5370\uff0c\u5df2\u81ea\u52a8\u88c1\u526a\u5e95\u90e8 {cropPercent}%\u3002\u5982\u4e0d\u6ee1\u610f\u53ef\u8c03\u6574\u3002
            </div>
            <div className="form-group">
              <label>\u5e95\u90e8\u88c1\u526a\u6bd4\u4f8b\uff08\u53bb\u9664\u8c46\u5305\u6c34\u5370\uff09</label>
              <input type="range" min={0} max={30} value={cropPercent} onChange={e => setCropPercent(parseInt(e.target.value))} style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#999' }}>
                <span>\u4e0d\u88c1\u526a</span><span>\u5f53\u524d: {cropPercent}%</span><span>\u88c1\u526a30%</span>
              </div>
            </div>

            {entries.map((e, i) => (
              <div key={e.id} className="shot-config-card">
                <div className="shot-thumb">
                  {e.editedSrc ? <img src={e.editedSrc} alt={`\u56fe${i + 1}`} /> : <div className="shot-placeholder">\u5f85\u4e0a\u4f20</div>}
                </div>
                <div className="shot-info">
                  <div><strong>{i + 1}</strong> <span className="badge badge-green">{e.date}</span> <span className="badge">{e.timeSlot}</span> <span className="badge">{e.finalTime}</span></div>
                  <div style={{ marginTop: 8 }}>
                    {e.editedSrc ? (
                      <span style={{ color: '#07c160', fontSize: 13 }}>\u2705 \u5df2\u4e0a\u4f20{e.croppedSrc ? '\uff08\u5df2\u88c1\u526a\uff09' : ''}</span>
                    ) : (
                      <button className="btn btn-small btn-primary" onClick={() => { setUploadTargetId(e.id); fileRef.current?.click(); }}>\ud83d\udce4 \u4e0a\u4f20</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-success btn-block" style={{ marginTop: 16 }} onClick={() => setPhase(3)}>\u4e0b\u4e00\u6b65\uff1a\u6392\u7248\u5bfc\u51fa \u2192</button>
          </div>
        </div>
      )}

      {/* ===== \u9636\u6bb53\uff1a\u7eaf\u56fe\u6392\u7248\u5bfc\u51fa ===== */}
      {phase === 3 && (
        <div className="card">
          <div className="card-header"><span className="header-icon">\ud83d\udcc4</span><span>\u7b2c3\u6b65\uff1a\u6392\u7248\u5bfc\u51fa</span></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group flex1">
                <label>\u6bcf\u884c\u5f20\u6570</label>
                <div className="num-btns">
                  {[2, 3, 4].map(n => <div key={n} className={`num-btn ${colsPerRow === n ? 'selected' : ''}`} onClick={() => setColsPerRow(n)}>{n}</div>)}
                </div>
              </div>
              <div className="form-group flex1">
                <label>\u6bcf\u9875\u884c\u6570</label>
                <div className="num-btns">
                  {[2, 3, 4, 5].map(n => <div key={n} className={`num-btn ${rowsPerPage === n ? 'selected' : ''}`} onClick={() => setRowsPerPage(n)}>{n}</div>)}
                </div>
              </div>
            </div>
            <div className="info-box">
              \u5171 {sortedEntries.length} \u5f20 \u00b7 \u6bcf\u9875 {colsPerRow * rowsPerPage} \u5f20 \u00b7 \u9884\u8ba1 {Math.ceil(sortedEntries.length / (colsPerRow * rowsPerPage))} \u9875
            </div>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={drawA4Preview}>\ud83d\udc41\ufe0f \u9884\u89c8</button>
              <button className="btn btn-success" onClick={exportPDF}>\ud83d\udda8\ufe0f \u5bfc\u51faPDF</button>
            </div>
            {a4Images.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {a4Images.map((src, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <img src={src} style={{ width: '100%', border: '1px solid #eee', borderRadius: 4 }} alt={`\u7b2c${i + 1}\u9875`} />
                    <button className="btn btn-outline btn-block" style={{ marginTop: 6 }} onClick={() => { const a = document.createElement('a'); a.download = `\u622a\u56fe_\u7b2c${i + 1}\u9875.png`; a.href = src; a.click(); }}>\ud83d\udce5 \u4e0b\u8f7d\u7b2c{i + 1}\u9875</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Parse Schedule ============ */
function parseSchedule(text: string) {
  const schedule = { courses: { 0: [] as any[], 1: [] as any[], 2: [] as any[], 3: [] as any[], 4: [] as any[], 5: [] as any[], 6: [] as any[] } };
  const dayMap: Record<string, number> = { '\u661f\u671f\u4e00': 1, '\u661f\u671f\u4e8c': 2, '\u661f\u671f\u4e09': 3, '\u661f\u671f\u56db': 4, '\u661f\u671f\u4e94': 5, '\u661f\u671f\u516d': 6, '\u661f\u671f\u65e5': 0, '\u661f\u671f\u5929': 0 };
  for (const line of text.split('\n')) {
    const trimmed = line.trim(); if (!trimmed) continue;
    const parts = trimmed.split(/\s+/); if (parts.length < 3) continue;
    let dayNum: number | null = null;
    for (const key in dayMap) if (parts[0].includes(key)) { dayNum = dayMap[key]; break; }
    if (dayNum === null) continue;
    schedule.courses[dayNum as keyof typeof schedule.courses].push({ period: parts[1], classSubject: parts.slice(2).join(' ') });
  }
  return schedule;
}

export default App;
