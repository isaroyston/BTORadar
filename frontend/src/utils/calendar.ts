// A calendar file (.ics) with all-day events on the first of each month, since BTO dates are
// only known to the month.
export type CalendarEvent = { date: Date; title: string; description: string };

const pad = (value: number) => String(value).padStart(2, "0");
const day = (date: Date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
const escape = (text: string) => text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export function buildCalendar(events: CalendarEvent[], stamp = new Date()) {
  const now = `${day(stamp)}T${pad(stamp.getUTCHours())}${pad(stamp.getUTCMinutes())}00Z`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BTO Radar//Plan//EN", "CALSCALE:GREGORIAN"];
  events.forEach((event, index) => {
    const start = new Date(event.date.getFullYear(), event.date.getMonth(), 1);
    const end = new Date(start.getFullYear(), start.getMonth(), 2);
    lines.push(
      "BEGIN:VEVENT",
      `UID:bto-radar-${day(start)}-${index}@bto-radar`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${day(start)}`,
      `DTEND;VALUE=DATE:${day(end)}`,
      `SUMMARY:${escape(event.title)}`,
      `DESCRIPTION:${escape(event.description)}`,
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

/** Saves text as a file through a temporary link; nothing leaves the browser. */
export function saveFile(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
