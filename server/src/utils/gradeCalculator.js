/**
 * IAAC Academic Grading System
 *
 * Official Grading Scale for Examination Results Reports:
 * 75 - 100: Grade A (Passed)
 * 65 - 74:  Grade B (Passed)
 * 60 - 64:  Grade C (Passed)
 *  0 - 59:  Grade F (Failed)
 *
 * Minimum passing mark: 60 MARKS.
 * A score of exactly 60 is Passed (Grade C).
 * A score of 59 or below is Failed (Grade F).
 * A score of zero is a valid failed result.
 * Missing / unattempted marks display as Pending (empty grade).
 */

export const PASSING_SCORE = 60;

/**
 * Calculates letter grade (A, B, C, F) for a numeric score.
 * @param {number|string|null|undefined} marks
 * @returns {string} 'A', 'B', 'C', 'F', or ''
 */
export function calculateGrade(marks) {
  if (marks === null || marks === undefined || marks === '') {
    return '';
  }

  const numeric = Number(marks);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
    return '';
  }

  if (numeric >= 75) return 'A';
  if (numeric >= 65) return 'B';
  if (numeric >= 60) return 'C';
  return 'F';
}

/**
 * Determines whether a score meets the minimum 60% passing mark.
 * @param {number|string|null|undefined} marks
 * @returns {boolean}
 */
export function isPassingScore(marks) {
  if (marks === null || marks === undefined || marks === '') {
    return false;
  }
  const numeric = Number(marks);
  return Number.isFinite(numeric) && numeric >= PASSING_SCORE;
}

/**
 * Determines Pass/Fail/Pending status from marks.
 * @param {number|string|null|undefined} marks
 * @param {string} [currentStatus]
 * @returns {'Passed'|'Failed'|'Pending'|'Absent'}
 */
export function calculateResultStatus(marks, currentStatus = '') {
  const norm = String(currentStatus || '').toUpperCase();
  if (norm === 'ABSENT') return 'Absent';

  if (marks === null || marks === undefined || marks === '') {
    return 'Pending';
  }

  const numeric = Number(marks);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
    return 'Pending';
  }

  return numeric >= PASSING_SCORE ? 'Passed' : 'Failed';
}

