import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

export const STATUS_LABELS: Record<string, string> = {
  active: '\u05E4\u05E2\u05D9\u05DC',
  prospect: '\u05E4\u05D5\u05D8\u05E0\u05E6\u05D9\u05D0\u05DC\u05D9',
  churned: '\u05E2\u05D6\u05D1',
  paused: '\u05DE\u05D5\u05E9\u05D4\u05D4',
  volunteer: '\u05D4\u05EA\u05E0\u05D3\u05D1\u05D5\u05EA',
  planned: '\u05DE\u05EA\u05D5\u05DB\u05E0\u05DF',
  completed: '\u05D4\u05D5\u05E9\u05DC\u05DD',
  cancelled: '\u05D1\u05D5\u05D8\u05DC',
  todo: '\u05DC\u05D1\u05D9\u05E6\u05D5\u05E2',
  in_progress: '\u05D1\u05D1\u05D9\u05E6\u05D5\u05E2',
  done: '\u05D4\u05D5\u05E9\u05DC\u05DD',
  blocked: '\u05D7\u05E1\u05D5\u05DD',
  critical: '\u05E7\u05E8\u05D9\u05D8\u05D9',
  high: '\u05D2\u05D1\u05D5\u05D4',
  medium: '\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9',
  low: '\u05E0\u05DE\u05D5\u05DA',
}

export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  volunteer: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  prospect: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  paused: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  churned: 'bg-red-500/20 text-red-300 border-red-500/30',
  planned: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  todo: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  in_progress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  done: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  blocked: 'bg-red-500/20 text-red-300 border-red-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

export function safeParseJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function getWeekId(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo}`;
}

export function getWeekNumber(date: Date = new Date()): number {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}
