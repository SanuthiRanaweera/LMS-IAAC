import assert from 'node:assert';
import {
  calculateGrade,
  isPassingScore,
  calculateResultStatus,
  calculateFinalExamResult,
  isRepeatEligible,
  PASSING_SCORE,
} from './gradeCalculator.js';

console.log('--- Testing Grade Calculator & Repeat Exam Calculations ---');

// 1. Pass threshold
assert.strictEqual(PASSING_SCORE, 60, 'PASSING_SCORE must be 60');

// 2. Grade A: 75-100
assert.strictEqual(calculateGrade(100), 'A');
assert.strictEqual(calculateGrade(85), 'A');
assert.strictEqual(calculateGrade(75), 'A');

// 3. Grade B: 65-74
assert.strictEqual(calculateGrade(74), 'B');
assert.strictEqual(calculateGrade(70), 'B');
assert.strictEqual(calculateGrade(65), 'B');

// 4. Grade C: 60-64 (Passing)
assert.strictEqual(calculateGrade(64), 'C');
assert.strictEqual(calculateGrade(60), 'C');
assert.strictEqual(isPassingScore(60), true);
assert.strictEqual(calculateResultStatus(60), 'Passed');

// 5. Grade F: 0-59 (Failing)
assert.strictEqual(calculateGrade(59), 'F');
assert.strictEqual(calculateGrade(58), 'F');
assert.strictEqual(calculateGrade(0), 'F');
assert.strictEqual(isPassingScore(59), false);
assert.strictEqual(calculateResultStatus(59), 'Failed');

// 6. Repeat Exam Eligibility
assert.strictEqual(isRepeatEligible(45), true, 'Score 45 must be eligible for repeat');
assert.strictEqual(isRepeatEligible(59), true, 'Score 59 must be eligible for repeat');
assert.strictEqual(isRepeatEligible(0), true, 'Score 0 must be eligible for repeat');
assert.strictEqual(isRepeatEligible(60), false, 'Score 60 must NOT be eligible for repeat');
assert.strictEqual(isRepeatEligible(85), false, 'Score 85 must NOT be eligible for repeat');
assert.strictEqual(isRepeatEligible(null), false, 'Pending score must NOT be eligible for repeat');
assert.strictEqual(isRepeatEligible(undefined), false);

// 7. Final Exam Result Calculation
// Scenario 1: Original examination passed (e.g., 75, no repeat) -> Passed
assert.strictEqual(calculateFinalExamResult(75, null), 'Passed');
assert.strictEqual(calculateFinalExamResult(85, undefined), 'Passed');
assert.strictEqual(calculateFinalExamResult(60, null), 'Passed');

// Scenario 2: Original failed (< 60), no repeat marks -> Failed
assert.strictEqual(calculateFinalExamResult(45, null), 'Failed');
assert.strictEqual(calculateFinalExamResult(55, undefined), 'Failed');
assert.strictEqual(calculateFinalExamResult(0, null), 'Failed');

// Scenario 3: Original failed (< 60), repeat passed (>= 60) -> Passed (Repeat)
assert.strictEqual(calculateFinalExamResult(45, 70), 'Passed (Repeat)');
assert.strictEqual(calculateFinalExamResult(35, 60), 'Passed (Repeat)');
assert.strictEqual(calculateFinalExamResult(58, 85), 'Passed (Repeat)');

// Scenario 4: Original failed (< 60), repeat failed (< 60) -> Failed (Repeat)
assert.strictEqual(calculateFinalExamResult(45, 50), 'Failed (Repeat)');
assert.strictEqual(calculateFinalExamResult(35, 59), 'Failed (Repeat)');
assert.strictEqual(calculateFinalExamResult(0, 40), 'Failed (Repeat)');

// Scenario 5: Missing / pending original score -> Pending
assert.strictEqual(calculateFinalExamResult(null, null), 'Pending');
assert.strictEqual(calculateFinalExamResult('', null), 'Pending');

console.log('🎉 ALL REPEAT EXAMINATION TESTS PASSED (100% Verified)');
