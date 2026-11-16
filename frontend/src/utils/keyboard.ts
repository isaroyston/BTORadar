import type { KeyboardEvent } from "react";

const STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

// Arrow keys, Home and End move between the options of a radio group or tab list.
// Returns the index to select, or null when the key is not a navigation key.
export function arrowNavigate(
  event: KeyboardEvent<HTMLElement>,
  currentIndex: number,
  count: number,
  itemSelector: string
): number | null {
  let next: number | null = null;
  if (event.key in STEPS) next = (currentIndex + STEPS[event.key] + count) % count;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = count - 1;
  if (next === null) return null;

  event.preventDefault();
  const items = event.currentTarget.querySelectorAll<HTMLElement>(itemSelector);
  items[next]?.focus();
  return next;
}
