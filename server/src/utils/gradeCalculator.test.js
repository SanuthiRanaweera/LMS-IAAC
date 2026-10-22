import assert from 'node:assert';
import {
  calculateGrade,
  isPassingScore,
  calculateResultStatus,
  PASSING_SCORE,
} from './gradeCalculator.js';

console.log('--- Testing Grade Calculator & 60% Passing Mark ---');

// 1. Pass threshold
assert.strictEqual(PASSING_SCORE, 60, 'PASSING_SCORE must be 60');

// 2. Grade A: 75-100
assert.strictEqual(calculateGrade(100), 'A');
assert.strictEqual(calculateGrade(85), 'A');
assert.strictEqual(calculateGrade(75), 'A');
assert.strictEqual(calculateGrade('75'), 'A');

// 3. Grade B: 65-74
assert.strictEqual(calculateGrade(74), 'B');
assert.strictEqual(calculateGrade(70), 'B');
assert.strictEqual(calculateGrade(65), 'B');

// 4. Grade C: 60-64 (Passing)
assert.strictEqual(calculateGrade(64), 'C');
assert.strictEqual(calculateGrade(62), 'C');
assert.strictEqual(calculateGrade(60), 'C');
assert.strictEqual(isPassingScore(60), true, 'Score 60 must be Passing');
assert.strictEqual(calculateResultStatus(60), 'Passed');

// 5. Grade F: 0-59 (Failing)
assert.strictEqual(calculateGrade(59), 'F');
assert.strictEqual(calculateGrade(58), 'F');
assert.strictEqual(calculateGrade(40), 'F');
assert.strictEqual(calculateGrade(0), 'F');
assert.strictEqual(calculateGrade('0'), 'F');
assert.strictEqual(isPassingScore(59), false, 'Score 59 must be Failing');
assert.strictEqual(isPassingScore(0), false, 'Score 0 must be Failing');
assert.strictEqual(calculateResultStatus(59), 'Failed');
assert.strictEqual(calculateResultStatus(58), 'Failed');
assert.strictEqual(calculateResultStatus(0), 'Failed');

// 6. Missing / Pending values
assert.strictEqual(calculateGrade(null), '');
assert.strictEqual(calculateGrade(undefined), '');
assert.strictEqual(calculateGrade(''), '');
assert.strictEqual(isPassingScore(null), false);
assert.strictEqual(calculateResultStatus(null), 'Pending');
assert.strictEqual(calculateResultStatus(undefined), 'Pending');
assert.strictEqual(calculateResultStatus(''), 'Pending');

// 7. Absent status
assert.strictEqual(calculateResultStatus(null, 'ABSENT'), 'Absent');

console.log('🎉 ALL GRADE CALCULATOR TESTS PASSED (100% Verified)');
