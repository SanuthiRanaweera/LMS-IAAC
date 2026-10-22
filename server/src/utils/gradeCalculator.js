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

/**
 * Determines whether a student is eligible for a repeat examination.
 * Rule: Must have attempted the exam (not null) and scored below 60.
 * @param {number|string|null|undefined} originalMarks
 * @param {string} [currentStatus]
 * @returns {boolean}
 */
export function isRepeatEligible(originalMarks, currentStatus = '') {
  if (String(currentStatus).toUpperCase() === 'ABSENT') return false;
  if (originalMarks === null || originalMarks === undefined || originalMarks === '') {
    return false;
  }
  const numeric = Number(originalMarks);
  return Number.isFinite(numeric) && numeric >= 0 && numeric < PASSING_SCORE;
}

/**
 * Calculates the final examination result combining original and repeat marks.
 *
 * Scenarios:
 * 1. Original passed (>= 60) -> 'Passed'
 * 2. Original failed (< 60), no repeat marks -> 'Failed'
 * 3. Original failed (< 60), repeat passed (>= 60) -> 'Passed (Repeat)'
 * 4. Original failed (< 60), repeat failed (< 60) -> 'Failed (Repeat)'
 * 5. Original missing / pending -> 'Pending'
 *
 * @param {number|string|null|undefined} originalMarks
 * @param {number|string|null|undefined} repeatMarks
 * @param {string} [currentStatus]
 * @returns {'Passed'|'Failed'|'Passed (Repeat)'|'Failed (Repeat)'|'Pending'|'Absent'}
 */
export function calculateFinalExamResult(originalMarks, repeatMarks = null, currentStatus = '') {
  if (String(currentStatus).toUpperCase() === 'ABSENT') return 'Absent';

  if (originalMarks === null || originalMarks === undefined || originalMarks === '') {
    return 'Pending';
  }

  const origNum = Number(originalMarks);
  if (!Number.isFinite(origNum) || origNum < 0 || origNum > 100) {
    return 'Pending';
  }

  // Original exam passed
  if (origNum >= PASSING_SCORE) {
    return 'Passed';
  }

  // Original exam failed (< 60)
  if (repeatMarks !== null && repeatMarks !== undefined && repeatMarks !== '') {
    const repNum = Number(repeatMarks);
    if (Number.isFinite(repNum) && repNum >= 0 && repNum <= 100) {
      return repNum >= PASSING_SCORE ? 'Passed (Repeat)' : 'Failed (Repeat)';
    }
  }

  return 'Failed';
}


