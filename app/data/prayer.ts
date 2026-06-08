export interface PrayerNote {
  id: string;
  text: string;
  createdAt: string; // ISO
}

export interface PrayerItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;   // ISO
  answered: boolean;
  answeredAt?: string; // ISO
  answeredNote?: string;
  notes: PrayerNote[];
}

const PRAYER_KEY = "verbum_prayers";

export function loadPrayers(): PrayerItem[] {
  try {
    const raw = localStorage.getItem(PRAYER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePrayers(items: PrayerItem[]) {
  localStorage.setItem(PRAYER_KEY, JSON.stringify(items));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
