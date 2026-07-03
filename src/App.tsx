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
  leave: { icon: '📝', iconClass: 'red', name: '请假条', desc: '生成标准请假条' },
  schedule: { icon: '📋', iconClass: 'blue', name: '我的课表', desc: '查看个人课表' },
  salary: { icon: '💰', iconClass: 'green', name: '工资统计', desc: '收入记录与图表' },
  duty: { icon: '📅', iconClass: 'yellow', name: '值班统计', desc: '值班记录与统计' },
  substitute: { icon: '📊', iconClass: 'purple', name: '代课统计', desc: '给别人代课统计' },
  payment: { icon: '💳', iconClass: 'orange', name: '支付截图', desc: '截图处理工具' },
  settings: { icon: '⚙️', iconClass: 'gray', name: '个人设置', desc: '课表、学校信息' },
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
  const schoolName = settings?.schoolName || '丰都县第三中学校';
  const semesterText = getSemesterText(settings?.semesterName);
  const schedule = settings?.schedule;
  const periodNames = settings?.periodNames || getDefaultPeriodNames();
  const moduleOrder = settings?.moduleOrder || DEFAULT_MODULE_ORDER;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-title">📱 教师个人助手</div>
        <div className="header-sub">教师工作小工具</div>
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
        <button className={`nav-item ${page === 'home' ? 'active' : ''}`} onClick={() => setPage('home')}><span className="nav-icon">🏠</span><span>首页</span></button>
        <button className={`nav-item ${page === 'schedule' ? 'active' : ''}`} onClick={() => setPage('schedule')}><span className="nav-icon">📋</span><span>课表</span></button>
        <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}><span className="nav-icon">👤</span><span>我的</span></button>
      </nav>
      <div ref={toastRef} className="toast" />
    </div>
  );
}

/* ============ 首页 ============ */
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

/* ============ 请假条 ============ */
function LeavePage({ settings, schoolName, semesterText, periodNames, toast, refresh }: any) {
  const [name, setName] = useState(settings?.name || '');
  const [reason, setReason] = useState('');
  const [type, setType] = useState('公假');
  const [sd, setSd] = useState(() => new Date().toISOString().slice(0, 10));
  const [ed, setEd] = useState(() => new Date().toISOString().slice(0, 10));
  const [sp, setSp] = useState('上午');
  const [ep, setEp] = useState('下午');
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
    if (!name || !reason || !sd || !ed) { toast('请填写完整信息'); return; }
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
      toast('生成成功！');
    } catch (e: any) {
      console.error(e);
      toast('生成失败：' + (e.message || '未知错误'));
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header"><span className="header-icon">📝</span><span>请假条助手</span></div>
        <div className="card-body">
          <div className="form-group">
            <label>请假人 <span className="required">*</span></label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="请输入姓名" />
          </div>
          <div className="form-group">
            <label>请假类型</label>
            <div className="type-grid">
              {LEAVE_TYPES.map(t => <div key={t} className={`type-btn ${type === t ? 'selected' : ''}`} onClick={() => setType(t)}>{t}</div>)}
            </div>
          </div>
          <div className="form-group">
            <label>请假原因 <span className="required">*</span></label>
            <select className="form-select" onChange={e => { if (e.target.value) setReason(e.target.value); }}>
              <option value="">-- 选择常见原因 --</option>
              {['参加教研活动','参加教师培训','参加教学研讨会','外出学习交流','参加学校会议','参加班主任培训','因病就诊','家中急事','处理个人事务'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="输入具体原因" style={{ marginTop: 8 }} />
            <div className="quick-tags">
              {['教研活动','教师培训','因病就诊','学习交流','学校会议','家中急事'].map(tag => (
                <button key={tag} className="quick-tag" onClick={() => { const map: Record<string, string> = { '教研活动': '参加教研活动', '教师培训': '参加教师培训', '因病就诊': '因病就诊', '学习交流': '外出学习交流', '学校会议': '参加学校会议', '家中急事': '家中急事' }; setReason(map[tag] || tag); }}>{tag}</button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group flex1">
              <label>开始日期</label>
              <input type="date" className="form-input" value={sd} onChange={e => { setSd(e.target.value); updateSubsFromDates(e.target.value, ed, sp, ep); }} />
            </div>
            <div className="form-group flex1">
              <label>开始时段</label>
              <div className="period-seg">
                {['上午','下午','全天'].map(p => (
                  <div key={p} className={`period-seg-item ${sp === p ? 'selected' : ''}`} onClick={() => { setSp(p); updateSubsFromDates(sd, ed, p, ep); }}>{p}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group flex1">
              <label>结束日期</label>
              <input type="date" className="form-input" value={ed} onChange={e => { setEd(e.target.value); updateSubsFromDates(sd, e.target.value, sp, ep); }} />
            </div>
            <div className="form-group flex1">
              <label>结束时段</label>
              <div className="period-seg">
                {['上午','下午','全天'].map(p => (
                  <div key={p} className={`period-seg-item ${ep === p ? 'selected' : ''}`} onClick={() => { setEp(p); updateSubsFromDates(sd, ed, sp, p); }}>{p}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="info-box">
            <div>📅 请假 <strong>{days % 1 === 0 ? days : days.toFixed(1)}</strong> 天</div>
            <div>第 {sw} 周 星期{wday(new Date(sd))} 至 第 {ew} 周 星期{wday(new Date(ed))}</div>
            <div>{subs.length > 0 ? `📚 ${subs.length} 节课需安排代课` : '📚 该时间段无课程安排'}</div>
          </div>
          {subs.length > 0 && (
            <div className="sub-section">
              <div className="sub-header"><span>🔄 代课人员安排</span></div>
              {subs.map((s, i) => (
                <div key={i} className="sub-card">
                  <div className="sub-card-header">
                    <div className="sub-day-row">
                      <select className="sub-select-day" value={s.day} onChange={e => { const dayMap: Record<string, {short: string, num: number}> = { '星期一':{short:'一',num:1},'星期二':{short:'二',num:2},'星期三':{short:'三',num:3},'星期四':{short:'四',num:4},'星期五':{short:'五',num:5},'星期六':{short:'六',num:6},'星期日':{short:'日',num:0} }; const info = dayMap[e.target.value] || {short:'一',num:1}; setSubs(prev => { const n = [...prev]; n[i] = { ...n[i], day: e.target.value, dayShort: info.short, dayNum: info.num }; return n; })}}>
                        {['星期一','星期二','星期三','星期四','星期五','星期六','星期日'].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <span className="sub-week-label">周次</span>
                      <input className="sub-week-input" type="number" value={s.week} onChange={e => setSubs(prev => { const n = [...prev]; n[i] = { ...n[i], week: Number(e.target.value) || 1 }; return n; })} />
                    </div>
                    <span className="sub-delete" onClick={() => setSubs(prev => prev.filter((_, idx) => idx !== i))}>×</span>
                  </div>
                  <div className="sub-card-body">
                    <div className="sub-field">
                      <label>节次</label>
                      <select className="sub-select" value={s.period} onChange={e => setSubs(prev => { const n = [...prev]; n[i] = { ...n[i], period: e.target.value }; return n; })}>
                        {periodNames.map((p: string) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="sub-field">
                      <label>班级科目</label>
                      <select className="sub-select" value={s.classSubject} onChange={e => setSubs(prev => { const n = [...prev]; n[i] = { ...n[i], classSubject: e.target.value }; return n; })}>
                        <option value="">--选择--</option>
                        {classSubjectOptions.map((o: string) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="sub-field">
                      <label>代课教师</label>
                      <input className="sub-input" value={s.teacher} onChange={e => setSubs(prev => { const n = [...prev]; n[i] = { ...n[i], teacher: e.target.value }; return n; })} placeholder="填写" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="add-row" onClick={() => setSubs(prev => [...prev, { week: Number(sw) || 1, day: '星期一', dayShort: '一', dayNum: 1, period: '第1节', classSubject: '', teacher: '' }])}><span>+</span> 手动添加代课安排</div>
          <button className="btn btn-primary btn-block" onClick={generate} style={{ marginTop: 16 }}>✨ 生成请假条</button>
        </div>
      </div>
      {showPreview && (
        <div id="previewSection" className="card" style={{ marginTop: 12 }}>
          <div className="card-body">
            <div className="preview-header">
              <span>🖼️ 请假条预览（点击放大）</span>
              <div className="view-tabs"><span style={{ fontSize: 13, color: '#666' }}>📄 A4打印版</span></div>
            </div>
            <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }} onClick={() => setShowModal(true)} />
            <div className="btn-row" style={{ justifyContent: 'center' }}>
              <button className="btn" style={{ background: 'linear-gradient(135deg,#c62828 0%,#b71c1c 100%)', color: '#fff', fontSize: 16, padding: '12px 40px', flex: 'none', minWidth: 200 }} onClick={() => { const c = canvasRef.current; if (!c) return; const win = window.open('', '_blank'); if (!win) return; win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>请假条</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;font-family:sans-serif;}img{max-width:95%;box-shadow:0 4px 20px rgba(0,0,0,0.15);}.back-btn{position:fixed;top:20px;left:20px;padding:10px 20px;background:#c62828;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.2);}@media print{body{background:white;}img{box-shadow:none;}.back-btn{display:none!important;}}</style></head><body><button class="back-btn" onclick="window.close()">← 返回</button><img src="${c.toDataURL('image/png')}" /></body></html>`); win.document.close(); toast('已打开，按Ctrl+P打印或另存为PDF'); }}>🖨️ 导出PDF</button>
            </div>
            <p className="hint" style={{ textAlign: 'center' }}>点击图片可放大查看，长按图片可保存到相册</p>
          </div>
        </div>
      )}
      {showModal && (
        <div className="modal-overlay-light" onClick={() => setShowModal(false)}>
          <button className="modal-close" style={{ background: 'rgba(0,0,0,0.5)', color: 'white' }} onClick={() => setShowModal(false)}>×</button>
          <div className="modal-content-light" onClick={e => e.stopPropagation()}>
            <canvas ref={modalCanvasRef} style={{ maxWidth: '95vw', maxHeight: '75vh', width: 'auto', height: 'auto', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
          </div>
          <button className="btn" style={{ marginTop: 12, background: 'linear-gradient(135deg,#c62828 0%,#b71c1c 100%)', color: '#fff', fontSize: 16, padding: '10px 32px' }} onClick={() => { const c = modalCanvasRef.current || canvasRef.current; if (!c) return; const win = window.open('', '_blank'); if (!win) return; win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>请假条</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;font-family:sans-serif;}img{max-width:95%;box-shadow:0 4px 20px rgba(0,0,0,0.15);}.back-btn{position:fixed;top:20px;left:20px;padding:10px 20px;background:#c62828;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.2);}@media print{body{background:white;}img{box-shadow:none;}.back-btn{display:none!important;}}</style></head><body><button class="back-btn" onclick="window.close()">← 返回</button><img src="${c.toDataURL('image/png')}" /></body></html>`); win.document.close(); toast('已打开，按Ctrl+P打印或另存为PDF'); }}>🖨️ 导出PDF</button>
          <div style={{ color: '#999', fontSize: 12, marginTop: 8 }}>👆 点击空白处关闭</div>
        </div>
      )}
    </div>
  );
}