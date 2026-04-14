/**
 * Returns today's date as YYYY-MM-DD in the browser's local timezone.
 * Avoids the UTC pitfall of `new Date().toISOString().slice(0, 10)` which
 * gives the previous day before 5:30 AM IST.
 */
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
