// Leitner Box Review Intervals (in days)
const BOX_INTERVALS = {
  1: 1,
  2: 2,
  3: 4,
  4: 8,
  5: 16,
};

/**
 * Calculates next box and due date for a card review.
 * @param {number} currentBox - Current Leitner box (1 to 5)
 * @param {boolean} isKnown - Whether card was answered correctly
 * @param {Date} [baseDate] - Reference date (defaults to today)
 * @returns {{ nextBox: number, dueDate: string }}
 */
function calculateNextReview(currentBox = 1, isKnown, baseDate = new Date()) {
  let nextBox;
  if (isKnown) {
    nextBox = Math.min((currentBox || 1) + 1, 5);
  } else {
    nextBox = 1; // Missed cards drop back to Box 1
  }

  const intervalDays = BOX_INTERVALS[nextBox] || 1;
  const dueDate = new Date(baseDate);
  dueDate.setDate(dueDate.getDate() + intervalDays);

  // Return formatted YYYY-MM-DD
  const yyyy = dueDate.getFullYear();
  const mm = String(dueDate.getMonth() + 1).padStart(2, '0');
  const dd = String(dueDate.getDate()).padStart(2, '0');

  return {
    nextBox,
    dueDate: `${yyyy}-${mm}-${dd}`,
  };
}

module.exports = {
  BOX_INTERVALS,
  calculateNextReview,
};
