/**
 * Returns current date in Indian Standard Time (IST, UTC+05:30) as YYYY-MM-DD.
 */
function getTodayIST() {
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD format
  return formatter.format(new Date());
}

/**
 * Returns past N dates in IST format YYYY-MM-DD (including today).
 * @param {number} days
 */
function getPastDaysIST(days = 7) {
  const list = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() + 5.5 * 3600000); // Shift to IST
    d.setUTCDate(d.getUTCDate() - i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    list.push(`${yyyy}-${mm}-${dd}`);
  }
  return list;
}

/**
 * Calculates current streak and longest streak from ordered array of active dates (YYYY-MM-DD).
 * @param {string[]} activeDates - dates where user completed study cards or met goal, sorted DESC
 */
function calculateStreak(activeDates = []) {
  if (!activeDates || activeDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const today = getTodayIST();
  const dateSet = new Set(activeDates);

  // Check if today is active, or if yesterday was active (allowing today's streak to continue)
  let checkDate = new Date();
  // IST shift
  let istMs = checkDate.getTime() + 5.5 * 3600000;
  let curr = new Date(istMs);

  function formatDate(d) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  const todayStr = formatDate(curr);
  let streak = 0;

  if (dateSet.has(todayStr)) {
    streak = 1;
    curr.setUTCDate(curr.getUTCDate() - 1);
  } else {
    // Check yesterday
    curr.setUTCDate(curr.getUTCDate() - 1);
    if (!dateSet.has(formatDate(curr))) {
      return { currentStreak: 0, longestStreak: calculateLongestStreak(activeDates) };
    }
  }

  while (dateSet.has(formatDate(curr))) {
    streak++;
    curr.setUTCDate(curr.getUTCDate() - 1);
  }

  const longest = Math.max(streak, calculateLongestStreak(activeDates));
  return { currentStreak: streak, longestStreak: longest };
}

function calculateLongestStreak(activeDates = []) {
  if (activeDates.length === 0) return 0;
  const sorted = [...new Set(activeDates)].sort();
  let maxStreak = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00Z');
    const curr = new Date(sorted[i] + 'T00:00:00Z');
    const diffDays = Math.round((curr - prev) / (1000 * 3600 * 24));

    if (diffDays === 1) {
      current++;
      if (current > maxStreak) maxStreak = current;
    } else {
      current = 1;
    }
  }

  return maxStreak;
}

module.exports = {
  getTodayIST,
  getPastDaysIST,
  calculateStreak,
};
