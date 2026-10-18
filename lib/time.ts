export const DEFAULT_TIMEZONE = "Asia/Manila";

function partsAt(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function dateKey(instant: string | Date, timeZone = DEFAULT_TIMEZONE) {
  const values = partsAt(new Date(instant), timeZone);
  return `${values.year}-${values.month}-${values.day}`;
}

export function toDateTimeLocal(instant?: string | null, timeZone = DEFAULT_TIMEZONE) {
  if (!instant) return "";
  const values = partsAt(new Date(instant), timeZone);
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function isValidLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
    && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function localDateTimeToIso(value: string, timeZone = DEFAULT_TIMEZONE) {
  if (!isValidLocalDateTime(value)) throw new Error("Enter a valid local date and time.");
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const p = partsAt(new Date(candidate), timeZone);
    const rendered = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
    candidate += desired - rendered;
  }
  return new Date(candidate).toISOString();
}

export function formatTime(instant: string, timeZone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat("en-PH", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(instant));
}

export function formatDate(instant: string | Date, timeZone = DEFAULT_TIMEZONE, options?: Intl.DateTimeFormatOptions) {
  const value = typeof instant === "string" && /^\d{4}-\d{2}-\d{2}$/.test(instant) ? `${instant}T12:00:00.000Z` : instant;
  return new Intl.DateTimeFormat("en-PH", { timeZone, month: "short", day: "numeric", year: "numeric", ...options }).format(new Date(value));
}

export function dateLabel(key: string, options?: Intl.DateTimeFormatOptions) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric", ...options }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function dateKeyToUtc(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function shiftDateKey(key: string, days: number) {
  const value = dateKeyToUtc(key);
  value.setUTCDate(value.getUTCDate() + days);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

export function monthTitle(key: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" }).format(dateKeyToUtc(key));
}
