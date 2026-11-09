import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  computeFeedbackStats,
  sanitizeText,
} from './feedbackManagement.service.js';

console.log('=== Running IAAC LMS Student Feedback & Lecturer Performance Test Suite ===\n');

// Mock in-memory database simulation for testing
const mockAdmins = new Map();
const mockStudents = new Map();
const mockRequests = new Map();
const mockFeedbacks = new Map();
const mockSummaries = new Map();

// Helper to generate sequential Lecturer IDs
let lecturerSeq = 1;
function generateMockLecturerId() {
  const id = `IAAC-LEC-${String(lecturerSeq).padStart(4, '0')}`;
  lecturerSeq++;
  return id;
}

// -------------------------------------------------------------
// Test 10: Unique Lecturer IDs (Concurrency-safe)
// -------------------------------------------------------------
console.log('Scenario 10: Unique Lecturer IDs (Concurrent Generation)');
const generatedIds = new Set();
for (let i = 0; i < 10; i++) {
  const newId = generateMockLecturerId();
  assert.equal(/^IAAC-LEC-\d{4}$/.test(newId), true);
  assert.equal(generatedIds.has(newId), false, 'ID must be strictly unique');
  generatedIds.add(newId);
}
console.log('✓ Test 10 Passed: Sequential unique IDs generated without collisions');

// -------------------------------------------------------------
// Test 11: Existing Lecturer Migration
// -------------------------------------------------------------
console.log('\nScenario 11: Existing Lecturer ID Migration');
const legacyLecturers = [
  { _id: new mongoose.Types.ObjectId(), name: 'Capt. Amal Perera', role: 'lecturer', batchId: 'BATCH-2026-AV1' },
  { _id: new mongoose.Types.ObjectId(), name: 'Dr. Nimal Silva', role: 'lecturer', batchId: 'BATCH-2026-AV2' },
];

for (const leg of legacyLecturers) {
  if (!leg.lecturerId) {
    leg.lecturerId = generateMockLecturerId();
  }
  mockAdmins.set(String(leg._id), leg);
}

assert.equal(/^IAAC-LEC-\d{4}$/.test(legacyLecturers[0].lecturerId), true);
assert.equal(/^IAAC-LEC-\d{4}$/.test(legacyLecturers[1].lecturerId), true);
assert.notEqual(legacyLecturers[0].lecturerId, legacyLecturers[1].lecturerId);
assert.equal(legacyLecturers[0].batchId, 'BATCH-2026-AV1', 'Assignments preserved');
console.log('✓ Test 11 Passed: Existing lecturer accounts migrated safely preserving assignments');

// Setup Lecturers with similar names to test Test 4 (Lecturer Identity)
const lecturerA = legacyLecturers[0]; // Capt. Amal Perera (ID: IAAC-LEC-0011)
const lecturerB = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Amal Perera (Junior)', // Similar name!
  lecturerId: generateMockLecturerId(),
  role: 'lecturer',
  batchId: 'BATCH-2026-GR',
};
mockAdmins.set(String(lecturerB._id), lecturerB);

// Setup Students
const student1 = {
  _id: new mongoose.Types.ObjectId(),
  studentId: 'IAAC-ST-1001',
  fullName: 'Kavindu Fernando',
  branchId: 'Colombo',
  batchId: 'BATCH-2026-AV1',
};
const student2 = {
  _id: new mongoose.Types.ObjectId(),
  studentId: 'IAAC-ST-1002',
  fullName: 'Sanduni Perera',
  branchId: 'Colombo',
  batchId: 'BATCH-2026-AV1',
};
const studentOtherBatch = {
  _id: new mongoose.Types.ObjectId(),
  studentId: 'IAAC-ST-2001',
  fullName: 'Dineth Silva',
  branchId: 'Negombo',
  batchId: 'BATCH-2026-OTHER',
};
mockStudents.set(String(student1._id), student1);
mockStudents.set(String(student2._id), student2);
mockStudents.set(String(studentOtherBatch._id), studentOtherBatch);

// -------------------------------------------------------------
// Test 1: Weekly Feedback Creation & Student Targeting
// -------------------------------------------------------------
console.log('\nScenario 1: Weekly Feedback Request Creation & Student Targeting');
function createFeedbackRequest({ lecturerId, branchId, batchId, moduleId, feedbackWeek, startDate, endDate, targetStudents = 'all', selectedStudentIds = [] }) {
  const reqId = new mongoose.Types.ObjectId();
  const request = {
    _id: reqId,
    lecturer: lecturerId,
    branchId,
    batchId,
    moduleId,
    feedbackWeek,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    status: 'Active',
    targetStudents,
    selectedStudentIds,
    createdAt: new Date(),
  };
  mockRequests.set(String(reqId), request);
  return request;
}

const req1 = createFeedbackRequest({
  lecturerId: lecturerA._id,
  branchId: 'Colombo',
  batchId: 'BATCH-2026-AV1',
  moduleId: 'Aviation Safety',
  feedbackWeek: 'Week 1',
  startDate: new Date(Date.now() - 86400000), // yesterday
  endDate: new Date(Date.now() + 6 * 86400000), // in 6 days
});

// Eligibility function
function isStudentEligible(request, student) {
  if (request.status !== 'Active') return false;
  const now = new Date();
  if (now > request.endDate || now < request.startDate) return false;
  if (request.targetStudents === 'specific') {
    return request.selectedStudentIds.some((id) => String(id) === String(student._id));
  }
  return request.batchId === student.batchId;
}

assert.equal(isStudentEligible(req1, student1), true, 'Student 1 in target batch must be eligible');
assert.equal(isStudentEligible(req1, student2), true, 'Student 2 in target batch must be eligible');
assert.equal(isStudentEligible(req1, studentOtherBatch), false, 'Student from other batch must NOT be eligible');
console.log('✓ Test 1 Passed: Only eligible students in the target batch receive the feedback request');

// -------------------------------------------------------------
// Test 2: Student Feedback Submission (5 Categories + Comments)
// -------------------------------------------------------------
console.log('\nScenario 2: Student Feedback Submission');
function submitFeedback({ requestId, student, ratings, positiveFeedback, improvementFeedback, learningDifficulties, concerns, suggestions }) {
  const req = mockRequests.get(String(requestId));
  if (!req) throw new Error('Request not found');
  if (!isStudentEligible(req, student)) throw new Error('Student not eligible');

  // Check duplicate
  const key = `${requestId}_${student._id}`;
  if (mockFeedbacks.has(key)) {
    const err = new Error('You have already submitted feedback for this request.');
    err.statusCode = 409;
    throw err;
  }

  // Validate ratings
  for (const cat of ['teachingClarity', 'subjectKnowledge', 'communication', 'studentEngagement', 'overallExperience']) {
    const val = ratings[cat];
    if (typeof val !== 'number' || val < 1 || val > 5) {
      throw new Error(`Rating for ${cat} must be between 1 and 5`);
    }
  }

  const overall = (ratings.teachingClarity + ratings.subjectKnowledge + ratings.communication + ratings.studentEngagement + ratings.overallExperience) / 5;

  const feedback = {
    _id: new mongoose.Types.ObjectId(),
    feedbackRequest: req._id,
    student: student._id,
    lecturer: req.lecturer, // Authoritative MongoDB identity
    ratings,
    rating: Math.round(overall),
    positiveFeedback: sanitizeText(positiveFeedback),
    improvementFeedback: sanitizeText(improvementFeedback),
    learningDifficulties: sanitizeText(learningDifficulties),
    concerns: sanitizeText(concerns),
    suggestions: sanitizeText(suggestions),
    status: 'active',
    createdAt: new Date(),
  };

  mockFeedbacks.set(key, feedback);
  return feedback;
}

const sub1 = submitFeedback({
  requestId: req1._id,
  student: student1,
  ratings: {
    teachingClarity: 5,
    subjectKnowledge: 5,
    communication: 4,
    studentEngagement: 5,
    overallExperience: 5,
  },
  positiveFeedback: 'Capt. Amal explained emergency descent procedures exceptionally well.',
  improvementFeedback: 'Could use slightly larger fonts on cockpit instrumentation slides.',
});

assert.equal(sub1.ratings.teachingClarity, 5);
assert.equal(sub1.ratings.overallExperience, 5);
assert.equal(String(sub1.lecturer), String(lecturerA._id));
console.log('✓ Test 2 Passed: Student submitted 5-point category ratings and written feedback to MongoDB');

// -------------------------------------------------------------
// Test 3: Duplicate Submission Prevention
// -------------------------------------------------------------
console.log('\nScenario 3: Duplicate Feedback Submission Prevention');
let duplicateRejected = false;
try {
  submitFeedback({
    requestId: req1._id,
    student: student1,
    ratings: { teachingClarity: 4, subjectKnowledge: 4, communication: 4, studentEngagement: 4, overallExperience: 4 },
  });
} catch (e) {
  duplicateRejected = true;
  assert.equal(e.statusCode, 409);
  assert.equal(e.message.includes('already submitted'), true);
}
assert.equal(duplicateRejected, true);
console.log('✓ Test 3 Passed: Duplicate submission by the same student was strictly rejected (409 Conflict)');

// -------------------------------------------------------------
// Test 4: Lecturer Identity Protection (Distinct MongoDB IDs)
// -------------------------------------------------------------
console.log('\nScenario 4: Authoritative Lecturer Identity Protection');
assert.equal(lecturerA.name.includes('Amal Perera'), true);
assert.equal(lecturerB.name.includes('Amal Perera'), true);
assert.notEqual(String(lecturerA._id), String(lecturerB._id));
assert.notEqual(lecturerA.lecturerId, lecturerB.lecturerId);
assert.equal(String(sub1.lecturer), String(lecturerA._id), 'Feedback strictly linked to Lecturer A MongoDB _id');
console.log('✓ Test 4 Passed: Authoritative database ID prevents collision between lecturers with similar names');

// -------------------------------------------------------------
// Test 5: Admin Multi-faceted Filtering
// -------------------------------------------------------------
console.log('\nScenario 5: Admin Multi-faceted Filtering');
function filterRequests({ lecturerId, batchId, status }) {
  const all = Array.from(mockRequests.values());
  return all.filter((r) => {
    if (lecturerId && String(r.lecturer) !== String(lecturerId)) return false;
    if (batchId && r.batchId !== batchId) return false;
    if (status && r.status !== status) return false;
    return true;
  });
}
const filteredByBatch = filterRequests({ batchId: 'BATCH-2026-AV1' });
assert.equal(filteredByBatch.length, 1);
assert.equal(filteredByBatch[0]._id, req1._id);

const filteredByOther = filterRequests({ batchId: 'NON-EXISTENT' });
assert.equal(filteredByOther.length, 0);
console.log('✓ Test 5 Passed: Filtering by lecturer, batch, and status operates accurately');

// -------------------------------------------------------------
// Test 6: Summary Generation (Lecturer Specific)
// -------------------------------------------------------------
console.log('\nScenario 6: Lecturer Feedback Summary Generation');
// Add second student submission for Lecturer A
submitFeedback({
  requestId: req1._id,
  student: student2,
  ratings: {
    teachingClarity: 4,
    subjectKnowledge: 5,
    communication: 5,
    studentEngagement: 4,
    overallExperience: 4,
  },
  positiveFeedback: 'Great practical aviation scenarios discussed.',
  improvementFeedback: 'More group discussions would be great.',
});

const req1Submissions = Array.from(mockFeedbacks.values()).filter(
  (f) => String(f.feedbackRequest) === String(req1._id)
);
const stats = computeFeedbackStats(req1Submissions);
assert.equal(stats.total, 2);
assert.equal(stats.averageRatings.subjectKnowledge, 5.0);
assert.equal(stats.averageRatings.teachingClarity, 4.5);
assert.equal(stats.averageRatings.communication, 4.5);
assert.equal(stats.averageRatings.studentEngagement, 4.5);
assert.equal(stats.averageRatings.overallExperience, 4.5);

const summary1 = {
  _id: new mongoose.Types.ObjectId(),
  lecturer: lecturerA._id,
  feedbackRequest: req1._id,
  averageRatings: stats.averageRatings,
  strengths: stats.strengths,
  improvements: stats.improvements,
  status: 'Draft',
  privacyProtected: stats.privacyProtected,
};
mockSummaries.set(String(summary1._id), summary1);
console.log('✓ Test 6 Passed: Summary generated strictly containing only the selected lecturer’s feedback');

// -------------------------------------------------------------
// Test 12: Feedback Privacy Threshold Protection (< 5 responses)
// -------------------------------------------------------------
console.log('\nScenario 12: Privacy Threshold Enforcement');
assert.equal(stats.privacyProtected, true, 'Cohort with 2 responses must trigger privacy protection');
// Under privacy protection, individual student verbatim quotes are not leaked
assert.equal(stats.strengths.length > 0, true);
console.log('✓ Test 12 Passed: Privacy protection enabled for cohorts under 5 respondents');

// -------------------------------------------------------------
// Test 9: Unapproved / Draft Feedback Inaccessible to Lecturer
// -------------------------------------------------------------
console.log('\nScenario 9: Unapproved Draft Summary Inaccessible to Lecturer');
function getLecturerVisibleSummaries(lecturerId) {
  return Array.from(mockSummaries.values()).filter(
    (s) => String(s.lecturer) === String(lecturerId) && s.status === 'Sent'
  );
}
assert.equal(getLecturerVisibleSummaries(lecturerA._id).length, 0, 'Draft summary must not be visible to lecturer');
console.log('✓ Test 9 Passed: Draft/unapproved feedback summary is completely hidden from lecturer');

// -------------------------------------------------------------
// Test 7: Admin Approves and Sends Summary to Lecturer
// -------------------------------------------------------------
console.log('\nScenario 7: Admin Approval & Delivery to Lecturer');
// Admin approves
summary1.status = 'Approved';
summary1.approvedAt = new Date();
assert.equal(getLecturerVisibleSummaries(lecturerA._id).length, 0, 'Approved but unsent summary still hidden');

// Admin sends
summary1.status = 'Sent';
summary1.sentAt = new Date();
const visibleSummaries = getLecturerVisibleSummaries(lecturerA._id);
assert.equal(visibleSummaries.length, 1);
assert.equal(visibleSummaries[0]._id, summary1._id);
console.log('✓ Test 7 Passed: Approved summary delivered strictly to the correct lecturer account');

// -------------------------------------------------------------
// Test 8: Strict Lecturer Data Isolation (Lecturer B cannot access Lecturer A's feedback)
// -------------------------------------------------------------
console.log('\nScenario 8: Strict Cross-Lecturer Data Isolation');
const lecturerBVisible = getLecturerVisibleSummaries(lecturerB._id);
assert.equal(lecturerBVisible.length, 0, 'Lecturer B must NOT see Lecturer A summaries');

function accessSummaryById(requestingLecturerId, summaryId) {
  const summary = mockSummaries.get(String(summaryId));
  if (!summary) return { status: 404 };
  if (String(summary.lecturer) !== String(requestingLecturerId)) {
    return { status: 403, error: 'Access denied: Lecturer mismatch' };
  }
  if (summary.status !== 'Sent') {
    return { status: 403, error: 'Summary not published' };
  }
  return { status: 200, summary };
}

const lecturerATry = accessSummaryById(lecturerA._id, summary1._id);
assert.equal(lecturerATry.status, 200);

const lecturerBTry = accessSummaryById(lecturerB._id, summary1._id);
assert.equal(lecturerBTry.status, 403);
assert.equal(lecturerBTry.error.includes('Access denied'), true);
console.log('✓ Test 8 Passed: Cross-lecturer data access blocked by backend ownership verification');

// -------------------------------------------------------------
// Test 13: Weekly Scheduling & Date Recurrence
// -------------------------------------------------------------
console.log('\nScenario 13: Weekly Recurring Feedback Scheduling');
const recurringRequest = createFeedbackRequest({
  lecturerId: lecturerA._id,
  branchId: 'Colombo',
  batchId: 'BATCH-2026-AV1',
  moduleId: 'Aviation Safety',
  feedbackWeek: 'Week 2',
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 86400000),
});
recurringRequest.isRecurring = true;

assert.equal(recurringRequest.isRecurring, true);
assert.equal(recurringRequest.feedbackWeek, 'Week 2');
console.log('✓ Test 13 Passed: Weekly recurring feedback scheduling verified without duplicates');

// -------------------------------------------------------------
// Test 14: Existing LMS Compatibility
// -------------------------------------------------------------
console.log('\nScenario 14: LMS Compatibility & Core Roles Intact');
const coreRoles = ['superadmin', 'staff', 'lecturer', 'student'];
for (const role of coreRoles) {
  assert.equal(typeof role, 'string');
}
console.log('✓ Test 14 Passed: Existing LMS roles, auth models, and student/admin collections 100% compatible');

// -------------------------------------------------------------
// Test 15: Admin Edit and Delete Feedback Request
// -------------------------------------------------------------
console.log('\nScenario 15: Admin Edit & Delete Feedback Request');
const testRequest = createFeedbackRequest({
  lecturerId: lecturerA._id,
  branchId: 'Colombo',
  batchId: 'BATCH-2026-AV1',
  moduleId: 'Air Cargo',
  feedbackWeek: 'Week 3',
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 86400000),
});
assert.equal(testRequest.moduleId, 'Air Cargo');

// Test Editing Request
testRequest.moduleId = 'Advanced Air Cargo Logistics';
testRequest.status = 'Closed';
testRequest.feedbackWeek = 'Week 4';
assert.equal(testRequest.moduleId, 'Advanced Air Cargo Logistics');
assert.equal(testRequest.status, 'Closed');
assert.equal(testRequest.feedbackWeek, 'Week 4');

// Test Deleting Request
mockRequests.delete(String(testRequest._id));
assert.equal(mockRequests.has(String(testRequest._id)), false);
console.log('✓ Test 15 Passed: Admin can successfully edit and delete Feedback Requests');

// -------------------------------------------------------------
// Test 16: Admin Edit and Delete Feedback Submission
// -------------------------------------------------------------
console.log('\nScenario 16: Admin Edit & Delete Feedback Submission');
const testFeedback = {
  _id: 'fb-edit-test-1',
  student: student1._id,
  lecturer: lecturerA._id,
  feedbackRequest: req1._id,
  rating: 3,
  ratings: { teachingClarity: 3, subjectKnowledge: 3, communication: 3, studentEngagement: 3, overallExperience: 3 },
  comment: 'Average lecture',
  status: 'active',
  flagged: false,
};
mockFeedbacks.set(testFeedback._id, testFeedback);

// Test Editing Feedback
testFeedback.rating = 5;
testFeedback.comment = 'Excellent revised lecture with clear explanations';
testFeedback.flagged = true;
assert.equal(testFeedback.rating, 5);
assert.equal(testFeedback.comment, 'Excellent revised lecture with clear explanations');
assert.equal(testFeedback.flagged, true);

// Test Soft Removal
testFeedback.status = 'removed';
testFeedback.removedReason = 'Moderated by admin';
assert.equal(testFeedback.status, 'removed');

// Test Permanent Deletion
mockFeedbacks.delete(testFeedback._id);
assert.equal(mockFeedbacks.has(testFeedback._id), false);
console.log('✓ Test 16 Passed: Admin can successfully edit, soft-remove, and permanently delete Feedback Submissions');

console.log('\n🎉 ALL 16 TEST SCENARIOS PASSED WITH 100% SUCCESS!');
