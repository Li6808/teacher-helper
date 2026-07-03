export interface Course {
  period: string;
  classSubject: string;
}

export interface Schedule {
  courses: Record<number, Course[]>;
}

export interface Settings {
  name: string;
  schoolName: string;
  semesterName: string;
  startSchoolDate: string;
  schedule: Schedule;
  periodNames: string[];
  timeTable: TimeSlot[];
  moduleOrder: string[];
  salaryCategories: string[];
}

export interface TimeSlot {
  name: string;
  startTime: string;
  endTime: string;
}

export interface SubRow {
  week: number;
  day: string;
  dayShort: string;
  dayNum: number;
  period: string;
  classSubject: string;
  teacher: string;
}

export interface LeaveRecord {
  name: string;
  reason: string;
  type: string;
  days: number;
  sd: string;
  ed: string;
  sp: string;
  ep: string;
  sw: number;
  ew: number;
  subs: SubRow[];
  time: string;
}

export interface SalaryRecord {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
}

export interface DutyRecord {
  id: string;
  date: string;
  type: '值班' | '代课' | '其他';
  description: string;
  substituteFor?: string;
  period?: string;
  classSubject?: string;
  amount?: number;
}

export interface AppData {
  settings: Settings | null;
  history: LeaveRecord[];
  salaries: SalaryRecord[];
  duties: DutyRecord[];
}
