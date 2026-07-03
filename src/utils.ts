export function wday(d: Date): string {
  return ['日','一','二','三','四','五','六'][d.getDay()];
}

export function wdayFull(d: Date): string {
  return ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][d.getDay()];
}

export function getSemesterInfo(date?: Date) {
  const d = date || new Date();
  const y = d.getFullYear(), m = d.getMonth() + 1;
  let sy: number, ey: number, sn: number;
  if (m >= 9 && m <= 12) { sy = y; ey = y + 1; sn = 1; }
  else if (m >= 2 && m <= 7) { sy = y - 1; ey = y; sn = 2; }
  else if (m === 1) { sy = y - 1; ey = y; sn = 1; }
  else { sy = y - 1; ey = y; sn = 2; }
  return { sy, ey, sn };
}

export function getSemesterText(customSemester?: string) {
  if (customSemester) return customSemester;
  const { sy, ey, sn } = getSemesterInfo();
  return `${sy}-${ey}学年第${sn === 1 ? '一' : '二'}学期`;
}

export function getWeekByStartDate(date: Date, startSchoolDate?: string): number {
  if (!startSchoolDate) {
    const si = getSemesterInfo(date);
    const start = si.sn === 1 ? new Date(si.sy, 8, 1) : new Date(si.sy, 1, 20);
    const diff = date.getTime() - start.getTime();
    return Math.max(1, Math.floor(diff / 604800000) + 1);
  }
  const start = new Date(startSchoolDate);
  const diff = date.getTime() - start.getTime();
  const days = Math.floor(diff / 86400000);
  return Math.max(1, Math.floor(days / 7) + 1);
}

export function calcDays(sd: string, ed: string, sp: string, ep: string): number {
  if (!sd || !ed) return 0;
  const start = new Date(sd);
  const end = new Date(ed);
  if (end < start) return 0;
  const fullDays = Math.floor((end.getTime() - start.getTime()) / 86400000);
  if (fullDays === 0) {
    if (sp === '上午' && ep === '下午') return 0.5;
    if (sp === '上午' && ep === '上午') return 0.5;
    if (sp === '下午' && ep === '下午') return 0.5;
    return 1;
  }
  let days = fullDays - 1;
  if (sp === '上午') days += 1;
  else if (sp === '下午') days += 0.5;
  else if (sp === '全天') days += 1;
  if (ep === '下午') days += 1;
  else if (ep === '上午') days += 0.5;
  else if (ep === '全天') days += 1;
  return days;
}

export function getDefaultPeriodNames(): string[] {
  return ['晨读','第1节','第2节','第3节','第4节','第5节','第6节','第7节','第8节','自主1','自主2','自主3','晚1','晚2','晚3','晚4'];
}

export const LEAVE_TYPES = ['公假','事假','病假','婚假','丧假','产假','护理假'];

export const DAY_OPTIONS = ['星期一','星期二','星期三','星期四','星期五','星期六','星期日'];

export const PERIOD_OPTIONS = getDefaultPeriodNames();
