import mongoose from 'mongoose';

import { Result } from '../models/Result.js';
import { Student } from '../models/Student.js';
import { logAdminAction } from '../middleware/adminAuth.js';
import {
  calculateGrade,
  calculateFinalExamResult,
  isRepeatEligible,
} from '../utils/gradeCalculator.js';

/* =========================================================
   HELPERS
========================================================= */

function safeTrim(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function canonicalCourse(value) {
  const v = String(value || '').trim().toLowerCase();

  if (!v) return '';

  if (
    v === 'cabin crew' ||
    v === 'cabin' ||
    v === 'crew'
  ) {
    return 'Cabin Crew';
  }

  if (
    v === 'ground operations' ||
    v === 'ground ops' ||
    v === 'ground operation' ||
    v === 'ground'
  ) {
    return 'Ground Operations';
  }

  if (
    v === 'ticketing & reservations' ||
    v === 'ticketing and reservations' ||
    v === 'ticketing' ||
    v === 'reservations'
  ) {
    return 'Ticketing & Reservations';
  }

  if (
    v === 'air cargo' ||
    v === 'cargo'
  ) {
    return 'Air Cargo';
  }

  return String(value || '').trim();
}

function isAllowedCourse(value) {
  return [
    'Cabin Crew',
    'Ground Operations',
    'Ticketing & Reservations',
    'Air Cargo',
  ].includes(canonicalCourse(value));
}

function normalizeStatus(value) {
  const status = String(value || '')
    .trim()
    .toUpperCase();

  const allowed = [
    'PASS',
    'FAIL',
    'ABSENT',
    'PENDING',
  ];

  return allowed.includes(status)
    ? status
    : 'PENDING';
}

function parseMarks(value) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const marks = Number(value);

  return Number.isFinite(marks)
    ? marks
    : null;
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(
    String(value || '')
  );
}

function toResultListItem(result) {
  return {
    id: String(result._id),
    resultTitle: result.resultTitle,
    resultDate: result.resultDate,
    branchId: result.branchId,
    intakeId: result.intakeId || '',
    batchId: result.batchId,
    course: result.course,
    isPublished: Boolean(result.isPublished),
    publishedAt: result.publishedAt || null,

    studentCount: Array.isArray(result.results)
      ? result.results.length
      : 0,

    createdBy: result.createdBy
      ? String(result.createdBy)
      : null,

    createdByRole: result.createdByRole || '',
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}

/* =========================================================
   CREATE RESULT
========================================================= */

export async function createResult(
  req,
  res,
  next
) {
  try {
    const {
      resultTitle,
      resultDate,
      branchId,
      intakeId,
      batchId,
      course,
      results,
      isPublished,
    } = req.body || {};

    const safeResultTitle = safeTrim(resultTitle);
    const safeBranchId = safeTrim(branchId);
    const safeIntakeId = safeTrim(intakeId);
    const safeBatchId = safeTrim(batchId);
    const normalizedCourse = canonicalCourse(course);

    if (!safeResultTitle) {
      return res.status(400).json({
        message: 'Result title is required',
      });
    }

    if (!safeBranchId) {
      return res.status(400).json({
        message: 'Branch is required',
      });
    }

    if (!safeBatchId) {
      return res.status(400).json({
        message: 'Batch is required',
      });
    }

    if (!normalizedCourse) {
      return res.status(400).json({
        message: 'Diploma / course is required',
      });
    }

    if (!isAllowedCourse(normalizedCourse)) {
      return res.status(400).json({
        message: 'Invalid diploma / course',
      });
    }

    if (
      !Array.isArray(results) ||
      results.length === 0
    ) {
      return res.status(400).json({
        message: 'At least one student result is required',
      });
    }

    let parsedResultDate = new Date();

    if (resultDate) {
      parsedResultDate = new Date(resultDate);

      if (
        Number.isNaN(
          parsedResultDate.getTime()
        )
      ) {
        return res.status(400).json({
          message: 'Invalid result date',
        });
      }
    }

    const existingResult = await Result.findOne({
      branchId: safeBranchId,
      batchId: safeBatchId,
      course: normalizedCourse,
      resultTitle: safeResultTitle,
    }).lean();

    if (existingResult) {
      return res.status(409).json({
        message:
          'A result with this title already exists for this branch, batch and course',
      });
    }

    const studentIds = results.map((item) =>
      String(
        item?.student ||
          item?.studentIdMongo ||
          item?.id ||
          ''
      ).trim()
    );

    const invalidStudentId = studentIds.find(
      (id) =>
        !id ||
        !isValidObjectId(id)
    );

    if (invalidStudentId) {
      return res.status(400).json({
        message: 'One or more student IDs are invalid',
      });
    }

    const uniqueStudentIds = [
      ...new Set(studentIds),
    ];

    if (
      uniqueStudentIds.length !==
      studentIds.length
    ) {
      return res.status(400).json({
        message:
          'The same student cannot appear more than once in one result sheet',
      });
    }

    const students = await Student.find({
      _id: {
        $in: uniqueStudentIds,
      },

      branchId: safeBranchId,
      batchId: safeBatchId,
      course: normalizedCourse,

      ...(safeIntakeId
        ? {
            intakeId: safeIntakeId,
          }
        : {}),
    })
      .select(
        '_id studentId fullName branchId intakeId batchId course'
      )
      .lean();

    if (
      students.length !==
      uniqueStudentIds.length
    ) {
      return res.status(400).json({
        message:
          'One or more students do not belong to the selected branch, intake, batch and course',
      });
    }

    const studentMap = new Map(
      students.map((student) => [
        String(student._id),
        student,
      ])
    );

    const normalizedResults = [];

    for (const row of results) {
      const mongoStudentId = String(
        row?.student ||
          row?.studentIdMongo ||
          row?.id ||
          ''
      ).trim();

      const student = studentMap.get(
        mongoStudentId
      );

      if (!student) {
        return res.status(400).json({
          message:
            'One or more students are invalid for this result group',
        });
      }

      const marks = parseMarks(row?.marks);

      if (
        marks !== null &&
        (marks < 0 || marks > 100)
      ) {
        return res.status(400).json({
          message:
            `Marks for ${student.studentId} must be between 0 and 100`,
        });
      }

      const repeatMarksVal = parseMarks(row?.repeatMarks ?? row?.repeatScore);
      const repeatGradeVal =
        repeatMarksVal !== null
          ? calculateGrade(repeatMarksVal)
          : row?.repeatGrade
            ? safeTrim(row.repeatGrade)
            : null;
      const isResitVal = Boolean(row?.isResit || repeatMarksVal !== null);
      const finalResultVal = calculateFinalExamResult(marks, repeatMarksVal, row?.status);

      normalizedResults.push({
        student: student._id,
        studentId: student.studentId,
        studentName: student.fullName,
        marks,
        grade: safeTrim(row?.grade) || calculateGrade(marks),
        status: normalizeStatus(row?.status),
        remarks: safeTrim(row?.remarks),
        repeatMarks: repeatMarksVal,
        repeatScore: repeatMarksVal,
        repeatGrade: repeatGradeVal,
        repeatDate: row?.repeatDate ? new Date(row.repeatDate) : null,
        isResit: isResitVal,
        finalResult: finalResultVal,
      });
    }

    const publishNow =
      isPublished === true;

    const created = await Result.create({
      resultTitle: safeResultTitle,
      resultDate: parsedResultDate,
      branchId: safeBranchId,
      intakeId: safeIntakeId,
      batchId: safeBatchId,
      course: normalizedCourse,
      results: normalizedResults,

      isPublished: publishNow,

      publishedAt: publishNow
        ? new Date()
        : null,

      createdBy:
        req.adminAuth?.id || null,

      createdByRole:
        req.adminAuth?.role === 'superadmin'
          ? 'superadmin'
          : 'staff',
    });

    await logAdminAction(
      req.adminAuth?.id,
      'CREATE_RESULT',
      {
        resultId: created._id,
        resultTitle: created.resultTitle,
        branchId: created.branchId,
        intakeId: created.intakeId,
        batchId: created.batchId,
        course: created.course,
        studentCount: created.results.length,
        isPublished: created.isPublished,
      }
    );

    return res.status(201).json({
      message: publishNow
        ? 'Result created and published successfully'
        : 'Result created successfully',

      result: toResultListItem(created),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message:
          'A result with this title already exists for the selected branch, batch and course',
      });
    }

    next(err);
  }
}

/* =========================================================
   LIST RESULTS - ADMIN
========================================================= */

export async function listResults(
  req,
  res,
  next
) {
  try {
    const branchId = safeTrim(req.query.branchId);
    const intakeId = safeTrim(req.query.intakeId);
    const batchId = safeTrim(req.query.batchId);
    const courseValue = safeTrim(req.query.course);
    const resultTitle = safeTrim(req.query.resultTitle);
    const published = safeTrim(req.query.published);

    const filter = {
      ...(branchId ? { branchId } : {}),
      ...(intakeId ? { intakeId } : {}),
      ...(batchId ? { batchId } : {}),

      ...(courseValue
        ? {
            course: canonicalCourse(courseValue),
          }
        : {}),

      ...(resultTitle
        ? {
            resultTitle: {
              $regex: resultTitle,
              $options: 'i',
            },
          }
        : {}),
    };

    if (published === 'true') {
      filter.isPublished = true;
    }

    if (published === 'false') {
      filter.isPublished = false;
    }

    const items = await Result.find(filter)
      .sort({
        resultDate: -1,
        createdAt: -1,
      })
      .lean();

    return res.json({
      count: items.length,
      results: items.map(toResultListItem),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   GET ONE RESULT - ADMIN
========================================================= */

export async function getResultById(
  req,
  res,
  next
) {
  try {
    const id = String(
      req.params?.id || ''
    ).trim();

    if (
      !id ||
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        message: 'Valid result ID is required',
      });
    }

    const result =
      await Result.findById(id).lean();

    if (!result) {
      return res.status(404).json({
        message: 'Result not found',
      });
    }

    return res.json({
      result: {
        id: String(result._id),
        resultTitle: result.resultTitle,
        resultDate: result.resultDate,
        branchId: result.branchId,
        intakeId: result.intakeId || '',
        batchId: result.batchId,
        course: result.course,
        isPublished: Boolean(result.isPublished),
        publishedAt: result.publishedAt || null,

        results: Array.isArray(result.results)
          ? result.results.map((item) => {
              const repMarks = item.repeatMarks ?? item.repeatScore ?? null;
              return {
                student: String(item.student),
                studentId: item.studentId,
                studentName: item.studentName,
                marks: item.marks,
                grade: item.grade || calculateGrade(item.marks),
                status: item.status || 'PENDING',
                remarks: item.remarks || '',
                repeatMarks: repMarks,
                repeatScore: repMarks,
                repeatGrade:
                  item.repeatGrade || (repMarks !== null ? calculateGrade(repMarks) : null),
                repeatDate: item.repeatDate || null,
                isResit: Boolean(item.isResit || repMarks !== null),
                finalResult:
                  item.finalResult ||
                  calculateFinalExamResult(item.marks, repMarks, item.status),
              };
            })
          : [],

        createdBy: result.createdBy
          ? String(result.createdBy)
          : null,

        createdByRole: result.createdByRole || '',
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   UPDATE RESULT
========================================================= */

export async function updateResult(
  req,
  res,
  next
) {
  try {
    const id = String(
      req.params?.id || ''
    ).trim();

    if (
      !id ||
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        message: 'Valid result ID is required',
      });
    }

    const result =
      await Result.findById(id);

    if (!result) {
      return res.status(404).json({
        message: 'Result not found',
      });
    }

    const {
      resultTitle,
      resultDate,
      results,
    } = req.body || {};

    if (resultTitle !== undefined) {
      const title = safeTrim(resultTitle);

      if (!title) {
        return res.status(400).json({
          message: 'Result title cannot be empty',
        });
      }

      const duplicate = await Result.findOne({
        _id: {
          $ne: result._id,
        },

        branchId: result.branchId,
        batchId: result.batchId,
        course: result.course,
        resultTitle: title,
      }).lean();

      if (duplicate) {
        return res.status(409).json({
          message:
            'A result with this title already exists for this branch, batch and course',
        });
      }

      result.resultTitle = title;
    }

    if (resultDate !== undefined) {
      const parsedDate =
        new Date(resultDate);

      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        return res.status(400).json({
          message: 'Invalid result date',
        });
      }

      result.resultDate = parsedDate;
    }

    if (results !== undefined) {
      if (
        !Array.isArray(results) ||
        results.length === 0
      ) {
        return res.status(400).json({
          message:
            'Student results must contain at least one student',
        });
      }

      const studentIds = results.map((item) =>
        String(
          item?.student ||
            item?.studentIdMongo ||
            item?.id ||
            ''
        ).trim()
      );

      const invalidStudentId =
        studentIds.find(
          (studentId) =>
            !isValidObjectId(studentId)
        );

      if (invalidStudentId) {
        return res.status(400).json({
          message: 'One or more student IDs are invalid',
        });
      }

      const uniqueIds = [
        ...new Set(studentIds),
      ];

      if (
        uniqueIds.length !==
        studentIds.length
      ) {
        return res.status(400).json({
          message:
            'The same student cannot appear more than once in one result sheet',
        });
      }

      const students =
        await Student.find({
          _id: {
            $in: uniqueIds,
          },

          branchId: result.branchId,
          batchId: result.batchId,
          course: result.course,

          ...(result.intakeId
            ? {
                intakeId: result.intakeId,
              }
            : {}),
        })
          .select(
            '_id studentId fullName'
          )
          .lean();

      if (
        students.length !==
        uniqueIds.length
      ) {
        return res.status(400).json({
          message:
            'One or more students do not belong to this result group',
        });
      }

      const studentMap = new Map(
        students.map((student) => [
          String(student._id),
          student,
        ])
      );

      const normalizedResults = [];

      for (const row of results) {
        const studentId = String(
          row?.student ||
            row?.studentIdMongo ||
            row?.id ||
            ''
        ).trim();

        const student =
          studentMap.get(studentId);

        const marks =
          parseMarks(row?.marks);

        if (
          marks !== null &&
          (marks < 0 || marks > 100)
        ) {
          return res.status(400).json({
            message:
              `Marks for ${student.studentId} must be between 0 and 100`,
          });
        }

        const repeatMarksVal = parseMarks(row?.repeatMarks ?? row?.repeatScore);
        const repeatGradeVal =
          repeatMarksVal !== null
            ? calculateGrade(repeatMarksVal)
            : row?.repeatGrade
              ? safeTrim(row.repeatGrade)
              : null;
        const isResitVal = Boolean(row?.isResit || repeatMarksVal !== null);
        const finalResultVal = calculateFinalExamResult(marks, repeatMarksVal, row?.status);

        normalizedResults.push({
          student: student._id,
          studentId: student.studentId,
          studentName: student.fullName,
          marks,
          grade: safeTrim(row?.grade) || calculateGrade(marks),
          status: normalizeStatus(row?.status),
          remarks: safeTrim(row?.remarks),
          repeatMarks: repeatMarksVal,
          repeatScore: repeatMarksVal,
          repeatGrade: repeatGradeVal,
          repeatDate: row?.repeatDate ? new Date(row.repeatDate) : null,
          isResit: isResitVal,
          finalResult: finalResultVal,
        });
      }

      result.results =
        normalizedResults;
    }

    await result.save();

    await logAdminAction(
      req.adminAuth?.id,
      'UPDATE_RESULT',
      {
        resultId: result._id,
        resultTitle: result.resultTitle,
        branchId: result.branchId,
        batchId: result.batchId,
        course: result.course,
        studentCount: result.results.length,
      }
    );

    return res.json({
      message: 'Result updated successfully',
      result: toResultListItem(result),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        message:
          'A result with this title already exists for this branch, batch and course',
      });
    }

    next(err);
  }
}

/* =========================================================
   PUBLISH RESULT
========================================================= */

export async function publishResult(
  req,
  res,
  next
) {
  try {
    const id = String(
      req.params?.id || ''
    ).trim();

    if (
      !id ||
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        message: 'Valid result ID is required',
      });
    }

    const result =
      await Result.findById(id);

    if (!result) {
      return res.status(404).json({
        message: 'Result not found',
      });
    }

    result.isPublished = true;
    result.publishedAt = new Date();

    await result.save();

    await logAdminAction(
      req.adminAuth?.id,
      'PUBLISH_RESULT',
      {
        resultId: result._id,
        resultTitle: result.resultTitle,
        branchId: result.branchId,
        batchId: result.batchId,
        course: result.course,
      }
    );

    return res.json({
      message: 'Result published successfully',
      result: toResultListItem(result),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   UNPUBLISH RESULT
========================================================= */

export async function unpublishResult(
  req,
  res,
  next
) {
  try {
    const id = String(
      req.params?.id || ''
    ).trim();

    if (
      !id ||
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        message: 'Valid result ID is required',
      });
    }

    const result =
      await Result.findById(id);

    if (!result) {
      return res.status(404).json({
        message: 'Result not found',
      });
    }

    result.isPublished = false;
    result.publishedAt = null;

    await result.save();

    await logAdminAction(
      req.adminAuth?.id,
      'UNPUBLISH_RESULT',
      {
        resultId: result._id,
        resultTitle: result.resultTitle,
      }
    );

    return res.json({
      message: 'Result unpublished successfully',
      result: toResultListItem(result),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   DELETE RESULT
========================================================= */

export async function deleteResult(
  req,
  res,
  next
) {
  try {
    const id = String(
      req.params?.id || ''
    ).trim();

    if (
      !id ||
      !isValidObjectId(id)
    ) {
      return res.status(400).json({
        message: 'Valid result ID is required',
      });
    }

    const result =
      await Result.findById(id).lean();

    if (!result) {
      return res.status(404).json({
        message: 'Result not found',
      });
    }

    await Result.findByIdAndDelete(id);

    await logAdminAction(
      req.adminAuth?.id,
      'DELETE_RESULT',
      {
        resultId: id,
        resultTitle: result.resultTitle,
        branchId: result.branchId,
        batchId: result.batchId,
        course: result.course,
      }
    );

    return res.json({
      message: 'Result deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   ADMIN: GET PUBLISHED RESULTS FOR ONE STUDENT
========================================================= */

export async function getStudentPublishedResults(
  req,
  res,
  next
) {
  try {
    const studentId = String(
      req.params?.studentId || ''
    ).trim();

    if (!studentId) {
      return res.status(400).json({
        message: 'Student ID is required',
      });
    }

    let student;

    if (isValidObjectId(studentId)) {
      student = await Student.findById(studentId)
        .select(
          '_id studentId fullName branchId intakeId batchId course'
        )
        .lean();
    } else {
      student = await Student.findOne({
        studentId,
      })
        .select(
          '_id studentId fullName branchId intakeId batchId course'
        )
        .lean();
    }

    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
      });
    }

    const documents = await Result.find({
      isPublished: true,
      'results.student': student._id,
    })
      .sort({
        resultDate: -1,
        createdAt: -1,
      })
      .lean();

    const studentResults = documents
      .map((result) => {
        const row = Array.isArray(result.results)
          ? result.results.find(
              (item) =>
                String(item.student) ===
                String(student._id)
            )
          : null;

        if (!row) {
          return null;
        }

        return {
          resultId: String(result._id),
          resultTitle: result.resultTitle,
          resultDate: result.resultDate,
          branchId: result.branchId,
          intakeId: result.intakeId || '',
          batchId: result.batchId,
          course: result.course,
          marks: row.marks,
          grade: row.grade || '',
          status: row.status || 'PENDING',
          remarks: row.remarks || '',
          publishedAt: result.publishedAt,
        };
      })
      .filter(Boolean);

    return res.json({
      student: {
        id: String(student._id),
        studentId: student.studentId,
        fullName: student.fullName,
        branchId: student.branchId || '',
        intakeId: student.intakeId || '',
        batchId: student.batchId || '',
        course: student.course || '',
      },

      count: studentResults.length,
      results: studentResults,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   STUDENT: GET MY OWN PUBLISHED RESULTS
========================================================= */

export async function getMyResults(
  req,
  res,
  next
) {
  try {
    /*
      requireAuth decodes the JWT and sets:

      req.auth = decodedToken

      Student login creates the token as:

      {
        sub: student MongoDB ObjectId,
        role: 'student'
      }

      Therefore the authenticated student ID is req.auth.sub.
    */

    const authenticatedStudentId =
      req.auth?.sub;

    if (!authenticatedStudentId) {
      return res.status(401).json({
        message: 'Student authentication is required',
      });
    }

    if (
      req.auth?.role !== 'student'
    ) {
      return res.status(403).json({
        message: 'Student access required',
      });
    }

    if (
      !isValidObjectId(
        authenticatedStudentId
      )
    ) {
      return res.status(401).json({
        message: 'Invalid student authentication',
      });
    }

    const student = await Student.findById(
      authenticatedStudentId
    )
      .select(
        '_id studentId fullName email branchId intakeId batchId course'
      )
      .lean();

    if (!student) {
      return res.status(404).json({
        message: 'Student account not found',
      });
    }

    const documents = await Result.find({
      isPublished: true,
      'results.student': student._id,
    })
      .sort({
        resultDate: -1,
        createdAt: -1,
      })
      .lean();

    const results = documents
      .map((document) => {
        const row = Array.isArray(document.results)
          ? document.results.find(
              (item) =>
                String(item.student) ===
                String(student._id)
            )
          : null;

        if (!row) {
          return null;
        }

        return {
          id: String(document._id),
          resultTitle: document.resultTitle,
          resultDate: document.resultDate,
          course: document.course,

          marks: row.marks,

          grade:
            row.grade || '',

          status:
            row.status || 'PENDING',

          remarks:
            row.remarks || '',

          publishedAt:
            document.publishedAt || null,
        };
      })
      .filter(Boolean);

    return res.json({
      student: {
        id: String(student._id),
        studentId: student.studentId,
        fullName: student.fullName,
        email: student.email || '',

        branchId:
          student.branchId || '',

        intakeId:
          student.intakeId || '',

        batchId:
          student.batchId || '',

        course:
          student.course || '',
      },

      count: results.length,
      results,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   SAVE REPEAT EXAMINATION MARKS
========================================================= */

/**
 * POST /api/results/:id/repeat-marks
 * PUT /api/results/:id/repeat-marks
 * Saves repeat examination marks for an eligible failed student.
 */
export async function saveRepeatMarks(req, res, next) {
  try {
    const id = String(req.params?.id || '').trim();
    const { studentId, repeatMarks, repeatDate } = req.body || {};

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: 'Valid result ID is required' });
    }

    const result = await Result.findById(id);
    if (!result) {
      return res.status(404).json({ message: 'Result sheet not found' });
    }

    if (!Array.isArray(result.results)) {
      return res.status(404).json({ message: 'No student results found in this sheet' });
    }

    const cleanStudentId = String(studentId || '').trim();
    if (!cleanStudentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    // Match student entry by MongoDB _id or studentId registration string
    const studentEntry = result.results.find(
      (r) =>
        String(r.student) === cleanStudentId ||
        String(r.studentId).toLowerCase() === cleanStudentId.toLowerCase()
    );

    if (!studentEntry) {
      return res.status(404).json({ message: 'Student not found in this result sheet' });
    }

    // 1. Eligibility check
    if (studentEntry.status === 'ABSENT') {
      return res.status(400).json({
        message: 'Student was marked Absent. Repeat marks are only for students who attempted and failed the original examination.',
      });
    }

    if (
      studentEntry.marks === null ||
      studentEntry.marks === undefined ||
      studentEntry.marks === ''
    ) {
      return res.status(400).json({
        message: 'Original examination marks must be entered before recording repeat marks.',
      });
    }

    const origMarks = Number(studentEntry.marks);
    if (!Number.isFinite(origMarks)) {
      return res.status(400).json({ message: 'Invalid original examination marks.' });
    }

    if (origMarks >= 60) {
      return res.status(400).json({
        message: `Student scored ${origMarks} (Passed). Only students who scored below 60 in the original examination are eligible for a repeat examination.`,
      });
    }

    // 2. Validate repeatMarks
    const repNum = Number(repeatMarks);
    if (
      repeatMarks === null ||
      repeatMarks === undefined ||
      repeatMarks === '' ||
      !Number.isFinite(repNum) ||
      repNum < 0 ||
      repNum > 100
    ) {
      return res.status(400).json({
        message: 'Repeat examination marks must be a valid number between 0 and 100.',
      });
    }

    // 3. Compute repeat grade and final result
    const repeatGrade = calculateGrade(repNum);
    const finalResult = calculateFinalExamResult(origMarks, repNum, studentEntry.status);

    studentEntry.repeatMarks = repNum;
    studentEntry.repeatScore = repNum;
    studentEntry.repeatGrade = repeatGrade;
    studentEntry.repeatDate = repeatDate ? new Date(repeatDate) : new Date();
    studentEntry.isResit = true;
    studentEntry.finalResult = finalResult;

    if (repNum >= 60) {
      studentEntry.status = 'PASS';
    }

    await result.save();

    await logAdminAction(req.adminAuth?.id, 'SAVE_REPEAT_MARKS', {
      resultId: result._id,
      studentId: studentEntry.studentId,
      originalMarks: origMarks,
      repeatMarks: repNum,
      repeatGrade,
      finalResult,
    });

    return res.json({
      success: true,
      message: 'Repeat examination marks saved successfully.',
      student: {
        student: String(studentEntry.student),
        studentId: studentEntry.studentId,
        studentName: studentEntry.studentName,
        marks: studentEntry.marks,
        grade: studentEntry.grade,
        repeatMarks: studentEntry.repeatMarks,
        repeatScore: studentEntry.repeatScore,
        repeatGrade: studentEntry.repeatGrade,
        repeatDate: studentEntry.repeatDate,
        isResit: studentEntry.isResit,
        finalResult: studentEntry.finalResult,
        status: studentEntry.status,
      },
      resultId: String(result._id),
    });
  } catch (err) {
    next(err);
  }
}