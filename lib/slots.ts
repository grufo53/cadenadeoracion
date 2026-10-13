// Utilidades de fechas y turnos. Sin dependencias de servidor: se usa también en el navegador.

export const INTERVALS = [15, 30, 60] as const;
export const MAX_DAYS = 92;

export type SlotShape = {
  start_date: string;
  end_date: string;
  day_start_min: number;
  day_end_min: number;
  interval_min: number;
};

export type Now = { date: string; min: number };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toUTC(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  return new Date(toUTC(date)).toISOString().slice(0, 10) === date;
}

export function daysBetween(start: string, end: string): number {
  return Math.round((toUTC(end) - toUTC(start)) / 86400000) + 1;
}

export function listDates(start: string, end: string): string[] {
  const out: string[] = [];
  for (let t = toUTC(start); t <= toUTC(end); t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function listMinutes(c: SlotShape): number[] {
  const out: number[] = [];
  for (let m = c.day_start_min; m + c.interval_min <= c.day_end_min; m += c.interval_min) out.push(m);
  return out;
}

export function isValidSlot(c: SlotShape, date: string, min: number): boolean {
  if (!isValidDate(date) || date < c.start_date || date > c.end_date) return false;
  if (!Number.isInteger(min) || min < c.day_start_min || min + c.interval_min > c.day_end_min) return false;
  return (min - c.day_start_min) % c.interval_min === 0;
}

export function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function fmtDate(date: string, style: 'short' | 'long' = 'long'): string {
  return new Intl.DateTimeFormat('es', {
    timeZone: 'UTC',
    weekday: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    month: style === 'long' ? 'long' : 'numeric',
  }).format(new Date(toUTC(date)));
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Fecha y hora actuales en la zona horaria de la cadena. */
export function nowInTz(tz: string): Now {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    min: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** Un turno es pasado cuando ya terminó. */
export function isPast(now: Now, date: string, min: number, intervalMin: number): boolean {
  if (date !== now.date) return date < now.date;
  return min + intervalMin <= now.min;
}
