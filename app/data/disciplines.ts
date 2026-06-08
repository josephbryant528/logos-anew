export interface ReadingEntry {
  id: string;
  book: string;
  chapters: number[];
  notes?: string;
}

export interface DayLog {
  date: string;       // "YYYY-MM-DD"
  reading: boolean;
  prayer: boolean;
  readingEntries: ReadingEntry[];
  notes?: string;
}

export interface DisciplinesData {
  logs: DayLog[];
}

const DISC_KEY = "verbum_disciplines";

export function loadDisciplines(): DisciplinesData {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(DISC_KEY) : null;
    if (!raw) return { logs: [] };
    const parsed = JSON.parse(raw) as DisciplinesData;
    // Migrate old logs that may lack readingEntries
    parsed.logs = parsed.logs.map(l => ({ ...l, readingEntries: l.readingEntries ?? [] }));
    return parsed;
  } catch { return { logs: [] }; }
}

export function saveDisciplines(data: DisciplinesData) {
  localStorage.setItem(DISC_KEY, JSON.stringify(data));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Return or create a DayLog for the given date within the data set (mutates logs array). */
export function getOrCreateLog(data: DisciplinesData, date: string): DayLog {
  const existing = data.logs.find(l => l.date === date);
  if (existing) return existing;
  const log: DayLog = { date, reading: false, prayer: false, readingEntries: [] };
  data.logs.push(log);
  return log;
}
