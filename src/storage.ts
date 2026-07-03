import type { AppData, Settings, LeaveRecord, SalaryRecord, DutyRecord } from './types';

const KEY = 'teacher_assistant_v3';

export function getData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    settings: null,
    history: [],
    salaries: [],
    duties: [],
  };
}

export const DEFAULT_MODULE_ORDER = ['leave', 'schedule', 'salary', 'duty', 'substitute', 'payment', 'settings'];

export const DEFAULT_SALARY_CATEGORIES = ['工资', '绩效', '补贴', '奖金', '其他'];

export function getModuleOrder(): string[] {
  const d = getData();
  return d.settings?.moduleOrder || DEFAULT_MODULE_ORDER;
}

export function saveModuleOrder(order: string[]) {
  const d = getData();
  if (!d.settings) return;
  d.settings.moduleOrder = order;
  setData(d);
}

export function getSalaryCategories(): string[] {
  const d = getData();
  return d.settings?.salaryCategories || DEFAULT_SALARY_CATEGORIES;
}

export function saveSalaryCategories(categories: string[]) {
  const d = getData();
  if (!d.settings) return;
  d.settings.salaryCategories = categories;
  setData(d);
}

export function setData(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function saveSettings(settings: Settings) {
  const d = getData();
  d.settings = settings;
  setData(d);
}

export function saveHistory(record: LeaveRecord) {
  const d = getData();
  d.history.unshift(record);
  if (d.history.length > 100) d.history = d.history.slice(0, 100);
  setData(d);
}

export function deleteHistory(index: number) {
  const d = getData();
  d.history.splice(index, 1);
  setData(d);
}

export function clearHistory() {
  const d = getData();
  d.history = [];
  setData(d);
}

export function clearAll() {
  localStorage.removeItem(KEY);
}

export function saveSalary(record: SalaryRecord) {
  const d = getData();
  const idx = d.salaries.findIndex(s => s.id === record.id);
  if (idx >= 0) d.salaries[idx] = record;
  else d.salaries.unshift(record);
  setData(d);
}

export function deleteSalary(id: string) {
  const d = getData();
  d.salaries = d.salaries.filter(s => s.id !== id);
  setData(d);
}

export function saveDuty(record: DutyRecord) {
  const d = getData();
  const idx = d.duties.findIndex(x => x.id === record.id);
  if (idx >= 0) d.duties[idx] = record;
  else d.duties.unshift(record);
  setData(d);
}

export function deleteDuty(id: string) {
  const d = getData();
  d.duties = d.duties.filter(x => x.id !== id);
  setData(d);
}

export function importSalariesFromText(text: string): SalaryRecord[] {
  const records: SalaryRecord[] = [];
  const lines = text.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const parts = line.split(/[\s,，|]+/).filter(p => p.trim());
    if (parts.length >= 3) {
      const dateStr = parts[0].replace(/年|月/g, '-').replace(/日/g, '').replace(/\//g, '-');
      const amount = parseFloat(parts[parts.length - 1]);
      if (!isNaN(amount) && amount > 0) {
        const category = parts.length >= 4 ? parts[parts.length - 2] : '工资';
        const description = parts.slice(1, parts.length - (parts.length >= 4 ? 2 : 1)).join(' ');
        records.push({
          id: 'sal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          date: dateStr,
          description,
          category,
          amount,
        });
      }
    }
  }
  return records;
}

export { type AppData };
