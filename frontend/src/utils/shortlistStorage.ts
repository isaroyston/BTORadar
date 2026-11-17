const STORAGE_KEY = "bto-radar:shortlist:v1";
const MAX_SAVED = 40;

export function loadShortlist(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string").slice(0, MAX_SAVED)
      : [];
  } catch {
    return [];
  }
}

export function saveShortlist(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_SAVED)));
  } catch {
    // Storage can be blocked or full; the shortlist still works for this visit.
  }
}
