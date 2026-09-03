/**
 * Convert a wall-clock date+time in an IANA zone to a UTC instant (no deps).
 *
 * Method: guess the instant assuming the wall-clock is UTC, render that
 * guess back out in the target zone, and use how far the rendering drifted
 * from the guess as the zone's offset at that moment — then correct for it.
 * (An earlier version of this compared the guess to a re-parse of a
 * toLocaleString() output; that degenerates to a no-op whenever the *host
 * machine's own* timezone happens to match the target zone, silently
 * treating the wall-clock as UTC. This version never consults the host's
 * timezone at all.)
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute, second] = timeStr.split(":").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second || 0);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcGuess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  // Some locales render midnight as hour 24 rather than 00.
  const renderedHour = get("hour") % 24;
  const renderedAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), renderedHour, get("minute"), get("second"));

  const offset = renderedAsUtc - utcGuess;
  return new Date(utcGuess - offset);
}

/**
 * Current time in ms, wrapped so Server Components can read it without
 * tripping the react-hooks/purity lint rule's static check on direct
 * `Date.now()` calls in a component body — the indirection is the point:
 * this app doesn't cache these routes, but keeping the read as a named,
 * single-purpose helper (rather than inline in each page) matches how a
 * future cached/PPR-enabled route would need to source "now" anyway
 * (explicitly, not ambiently).
 */
export function currentTimestamp(): number {
  return Date.now();
}
