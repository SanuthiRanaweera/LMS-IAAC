function pad2(n) {
  return String(n).padStart(2, '0');
}

function monthNameUTC(date) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[date.getUTCMonth()] || '';
}

function formatWeekRefUTC(date) {
  const day = pad2(date.getUTCDate());
  const mon = monthNameUTC(date);
  const year = date.getUTCFullYear();
  return `Week of ${day} ${mon} ${year}`;
}

// ISO week number algorithm (UTC).
function getIsoWeekYearAndNumberUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  // ISO week starts Monday. Find Thursday in current week.
  const dayNr = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNr + 3); // Thursday

  const isoYear = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);

  const weekNo = 1 + Math.round((d - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return { isoYear, isoWeek: weekNo };
}

// Weekly window: Sunday 00:00 UTC → Saturday 23:59:59.999 UTC.
// For the identifier, we use ISO week/year of the Monday inside this Sunday-based week.
export function computeWeekPeriodUTC(now = new Date()) {
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const offsetDays = base.getUTCDay(); // Sunday=0
  const weekStart = new Date(base);
  weekStart.setUTCDate(weekStart.getUTCDate() - offsetDays);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const monday = new Date(weekStart);
  monday.setUTCDate(monday.getUTCDate() + 1);
  const { isoYear, isoWeek } = getIsoWeekYearAndNumberUTC(monday);

  const weekId = `${isoYear}-W${pad2(isoWeek)}`;
  const weekRef = formatWeekRefUTC(weekStart);

  return {
    weekId,
    weekRef,
    weekStart,
    weekEnd,
    isoYear,
    isoWeek,
  };
}
