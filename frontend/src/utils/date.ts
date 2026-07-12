const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

export const MIN_SUPPORTED_APPLICATION_MONTH = "2024-10";
export const MAX_SUPPORTED_APPLICATION_MONTH = "2100-12";

export const isSupportedApplicationMonth = (value: string) =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value) &&
  value >= MIN_SUPPORTED_APPLICATION_MONTH &&
  value <= MAX_SUPPORTED_APPLICATION_MONTH;

export const parseMonth = (value: string) => {
  if (!isSupportedApplicationMonth(value)) return null;
  const match = value.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) return null;

  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
};

export const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

export const addWeeks = (date: Date, weeks: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + weeks * 7);

export const formatMonthYear = (date: Date) =>
  date.toLocaleString("en-SG", { month: "short", year: "numeric" });

export const formatDateInputDisplay = (value: string) => {
  if (!isDateInputValue(value)) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    .toLocaleDateString("en-SG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
};

export const parseLaunchMonth = (value: string) => {
  const isoMatch = value.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (isoMatch) {
    return { year: Number(isoMatch[1]), monthIndex: Number(isoMatch[2]) - 1 };
  }

  const yearMatch = value.match(/(?:19|20|21)\d{2}/);
  const monthMatch = value.match(/[A-Za-z]+/);
  const year = yearMatch ? Number(yearMatch[0]) : null;
  const monthIndex = monthMatch
    ? MONTH_INDEX[monthMatch[0].toLowerCase()] ?? null
    : null;

  return year && monthIndex !== null ? { year, monthIndex } : null;
};

export const parseLaunchMonthInput = (value: string) => {
  const parsed = parseLaunchMonth(value);
  if (!parsed) return null;

  return `${String(parsed.year).padStart(4, "0")}-${String(
    parsed.monthIndex + 1
  ).padStart(2, "0")}`;
};

export const parseMonthYearDate = (value: string | undefined | null) => {
  if (!value) return null;

  const parsed = parseLaunchMonth(value);
  if (!parsed) return null;

  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(parsed.year, parsed.monthIndex, 1);
  return date;
};

export const isDateInputValue = (value: string) => {
  const match = value.match(/^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
  if (!match) return false;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === monthIndex &&
    date.getDate() === day
  );
};

export const getLaunchMonthSortValue = (value: string) => {
  const parsed = parseLaunchMonth(value);
  return parsed ? parsed.year * 12 + parsed.monthIndex : 0;
};
