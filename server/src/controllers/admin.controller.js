import bcrypt from 'bcryptjs';

import { AppData } from '../models/AppData.js';
import { Material } from '../models/Material.js';
import { Student } from '../models/Student.js';
import { Admin } from '../models/Admin.js';

import {
  logAdminAction,
} from '../middleware/adminAuth.js';

import {
  DEFAULT_LMS_DATA,
} from '../data/defaultLmsData.js';

import {
  getOrCreateAppDataPayload,
} from '../services/appData.service.js';

/* =========================================================
   HELPERS
========================================================= */

function safeTrim(value) {
  return typeof value === 'string'
    ? value.trim()
    : '';
}

function normalizeId(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function canonicalCourse(value) {
  const v = String(value || '')
    .trim()
    .toLowerCase();

  if (!v) {
    return '';
  }

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
  ].includes(
    canonicalCourse(value)
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function isSafeKey(key) {
  return (
    typeof key === 'string' &&
    /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(
      key
    )
  );
}

/* =========================================================
   RESOLVE STUDENT ENROLLMENT
========================================================= */

async function resolveStudentEnrollment(
  branchId,
  intakeId,
  batchId
) {
  const safeBranchId =
    safeTrim(branchId);

  const safeIntakeId =
    safeTrim(intakeId);

  const safeBatchId =
    safeTrim(batchId);

  if (
    !safeBranchId &&
    !safeIntakeId &&
    !safeBatchId
  ) {
    return {
      branchId: '',
      intakeId: '',
      batchId: '',
    };
  }

  if (
    !safeBranchId ||
    !safeIntakeId
  ) {
    return {
      error:
        'Branch and intake are required for student enrollment',
    };
  }

  const payload =
    await getOrCreateAppDataPayload(
      'academics',
      {
        branches:
          DEFAULT_LMS_DATA
            ?.academics
            ?.branches || [],
      }
    );

  const branches =
    Array.isArray(
      payload?.branches
    )
      ? payload.branches
      : [];

  const branch =
    branches.find(
      (item) =>
        normalizeId(
          item?.id ||
            item?._id ||
            item?.key ||
            item?.code ||
            item?.name
        ) ===
        normalizeId(
          safeBranchId
        )
    );

  if (!branch) {
    return {
      error:
        'Invalid branch selection',
    };
  }

  const intakes =
    Array.isArray(
      branch?.intakes
    )
      ? branch.intakes
      : [];

  const intake =
    intakes.find(
      (item) =>
        normalizeId(
          item?.id ||
            item?._id ||
            item?.key ||
            item?.code ||
            item?.name
        ) ===
        normalizeId(
          safeIntakeId
        )
    );

  if (!intake) {
    return {
      error:
        'Invalid intake selection',
    };
  }

  if (safeBatchId) {
    const batches =
      Array.isArray(
        intake?.batches
      )
        ? intake.batches
        : [];

    if (
      batches.length > 0
    ) {
      const batch =
        batches.find(
          (item) =>
            normalizeId(
              item?.id ||
                item?._id ||
                item?.key ||
                item?.code ||
                item?.name
            ) ===
            normalizeId(
              safeBatchId
            )
        );

      if (!batch) {
        return {
          error:
            'Invalid batch selection',
        };
      }
    }
  }

  return {
    branchId:
      safeBranchId,

    intakeId:
      safeIntakeId,

    batchId:
      safeBatchId,
  };
}

/* =========================================================
   LIST ITEM HELPERS
========================================================= */

function toStudentListItem(
  student
) {
  return {
    id:
      String(
        student._id
      ),

    fullName:
      student.fullName || '',

    email:
      student.email || '',

    studentId:
      student.studentId || '',

    course:
      student.course || '',

    phoneNumber:
      student.phoneNumber || '',

    whatsappNumber:
      student.whatsappNumber || '',

    branchId:
      student.branchId || '',

    intakeId:
      student.intakeId || '',

    batchId:
      student.batchId || '',

    createdBy:
      student.createdBy || '',

    createdAt:
      student.createdAt,
  };
}

function toAdminListItem(
  admin
) {
  const role =
    admin?.role
      ? String(
          admin.role
        )
      : 'staff';

  return {
    id:
      String(
        admin._id
      ),

    name:
      admin.name,

    email:
      admin.email,

    role,

    createdAt:
      admin.createdAt,
  };
}

/* =========================================================
   BUILD BRANCH STUDENT COUNTS
========================================================= */

async function getBranchStudentCounts() {
  const [
    academicsPayload,
    groupedStudents,
  ] =
    await Promise.all([
      getOrCreateAppDataPayload(
        'academics',
        {
          branches:
            DEFAULT_LMS_DATA
              ?.academics
              ?.branches ||
            [],
        }
      ),

      Student.aggregate([
        {
          $group: {
            _id: {
              $ifNull: [
                '$branchId',
                '',
              ],
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),
    ]);

  const countMap =
    new Map();

  for (
    const item of
    groupedStudents
  ) {
    const branchId =
      normalizeId(
        item?._id
      );

    countMap.set(
      branchId,
      Number(
        item?.count || 0
      )
    );
  }

  const branches =
    Array.isArray(
      academicsPayload
        ?.branches
    )
      ? academicsPayload
          .branches
      : [];

  const result = [];

  const usedIds =
    new Set();

  for (
    const branch of
    branches
  ) {
    const branchId =
      normalizeId(
        branch?.id ||
          branch?._id ||
          branch?.key ||
          branch?.code ||
          branch?.name
      );

    if (
      !branchId ||
      usedIds.has(
        branchId
      )
    ) {
      continue;
    }

    usedIds.add(
      branchId
    );

    result.push({
      branchId,

      branchName:
        safeTrim(
          branch?.name
        ) || branchId,

      studentCount:
        countMap.get(
          branchId
        ) || 0,
    });
  }

  for (
    const [
      branchId,
      studentCount,
    ] of countMap
  ) {
    if (
      !branchId ||
      usedIds.has(
        branchId
      )
    ) {
      continue;
    }

    result.push({
      branchId,

      branchName:
        branchId,

      studentCount,
    });
  }

  return {
    branches:
      result,

    unassigned:
      countMap.get('') ||
      0,
  };
}

/* =========================================================
   ADMIN DASHBOARD METRICS
========================================================= */

export async function getAdminMetrics(
  req,
  res,
  next
) {
  try {
    const [
      students,
      admins,
      materials,
      recentMaterials,
      branchCounts,
    ] =
      await Promise.all([
        Student.countDocuments(),

        Admin.countDocuments(),

        Material.countDocuments({
          isActive: true,
        }),

        Material.find({
          isActive: true,
        })
          .sort({
            createdAt: -1,
          })
          .limit(5)
          .select(
            'title course weekNumber branchId batchId uploadedByName createdAt'
          )
          .lean(),

        getBranchStudentCounts(),
      ]);

    const programmesDoc =
      await AppData.findOne({
        key:
          'programmes',
      }).lean();

    const programmes =
      Array.isArray(
        programmesDoc
          ?.payload
          ?.programmes
      )
        ? programmesDoc
            .payload
            .programmes
            .length
        : 0;

    return res.json({
      students,

      users:
        admins,

      materials,

      branchStudentCounts:
        branchCounts.branches,

      unassignedStudents:
        branchCounts.unassigned,

      recentMaterials:
        recentMaterials.map(
          (item) => ({
            id:
              String(
                item._id
              ),

            title:
              item.title,

            course:
              item.course ||
              '',

            weekNumber:
              item.weekNumber ||
              null,

            branchId:
              item.branchId ||
              '',

            batchId:
              item.batchId ||
              '',

            uploadedByName:
              item.uploadedByName ||
              'Admin',

            uploadedAt:
              item.createdAt,
          })
        ),

      faculties: 0,

      programmes,

      totalIncome: 0,

      awaitingPayments: 0,

      pendingApproval: 0,

      rejectedPayments: 0,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   ADMIN USERS
========================================================= */

export async function listAdminUsers(
  req,
  res,
  next
) {
  try {
    const items =
      await Admin.find({})
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.json({
      users:
        items.map(
          toAdminListItem
        ),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   CREATE STAFF USER
========================================================= */

export async function createStaffUser(
  req,
  res,
  next
) {
  try {
    const {
      name,
      email,
      password,
      role,
      branchId,
      intakeId,
      batchId,
      mustChangePassword,
    } = req.body || {};

    const normalizedEmail =
      normalizeEmail(
        email
      );

    const requestedRole =
      String(
        role ||
          'staff'
      )
        .trim()
        .toLowerCase();

    const allowedRoles =
      new Set([
        'staff',
        'lecturer',
      ]);

    if (
      !allowedRoles.has(
        requestedRole
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Invalid role',
        });
    }

    if (
      !safeTrim(name)
    ) {
      return res
        .status(400)
        .json({
          message:
            'Name is required',
        });
    }

    if (
      !isValidEmail(
        normalizedEmail
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Valid email is required',
        });
    }

    if (
      typeof password !==
        'string' ||
      password
        .trim()
        .length < 8
    ) {
      return res
        .status(400)
        .json({
          message:
            'Password must be at least 8 characters',
        });
    }

    const existing =
      await Admin.findOne({
        email:
          normalizedEmail,
      }).lean();

    if (existing) {
      return res
        .status(409)
        .json({
          message:
            'Email already exists',
        });
    }

    const passwordHash =
      await bcrypt.hash(
        password.trim(),
        12
      );

    const created =
      await Admin.create({
        name:
          safeTrim(name),

        email:
          normalizedEmail,

        passwordHash,

        role:
          requestedRole,

        branchId:
          safeTrim(
            branchId
          ),

        intakeId:
          safeTrim(
            intakeId
          ),

        batchId:
          safeTrim(
            batchId
          ),

        mustChangePassword:
          mustChangePassword ===
          true,
      });

    await logAdminAction(
      req.adminAuth?.id,
      'CREATE_STAFF_ADMIN',
      {
        staffAdminId:
          created._id,

        staffAdminEmail:
          normalizedEmail,

        staffAdminName:
          safeTrim(name),

        role:
          requestedRole,
      }
    );

    return res
      .status(201)
      .json({
        user:
          toAdminListItem(
            created
          ),
      });
  } catch (err) {
    if (
      err?.code ===
      11000
    ) {
      return res
        .status(409)
        .json({
          message:
            'Email already exists',
        });
    }

    next(err);
  }
}

/* =========================================================
   LIST STUDENTS

   IMPORTANT FIX:
   Old maximum was 200.

   New maximum is 5000 so all 230 students can be returned.

   This endpoint also returns:
   - total
   - returnedCount
   - branchStudentCounts
   - unassignedStudents
========================================================= */

export async function listStudents(
  req,
  res,
  next
) {
  try {
    const requestedLimit =
      Number(
        req.query.limit ||
          1000
      );

    const limit =
      Math.min(
        5000,
        Math.max(
          1,
          Number.isFinite(
            requestedLimit
          )
            ? requestedLimit
            : 1000
        )
      );

    const q =
      safeTrim(
        req.query.q
      );

    const source =
      safeTrim(
        req.query.source
      );

    const exportType =
      String(
        req.query.export ||
          ''
      ).toLowerCase();

    const branchId =
      safeTrim(
        req.query.branchId
      );

    const intakeId =
      safeTrim(
        req.query.intakeId
      );

    const batchId =
      safeTrim(
        req.query.batchId
      );

    const rawCourse =
      safeTrim(
        req.query.course
      );

    const course =
      rawCourse
        ? canonicalCourse(
            rawCourse
          )
        : '';

    const filter = {
      ...(q
        ? {
            $or: [
              {
                fullName: {
                  $regex:
                    q,

                  $options:
                    'i',
                },
              },

              {
                email: {
                  $regex:
                    q,

                  $options:
                    'i',
                },
              },

              {
                studentId: {
                  $regex:
                    q,

                  $options:
                    'i',
                },
              },
            ],
          }
        : {}),

      ...(branchId
        ? {
            branchId,
          }
        : {}),

      ...(intakeId
        ? {
            intakeId,
          }
        : {}),

      ...(batchId
        ? {
            batchId,
          }
        : {}),

      ...(course
        ? {
            course,
          }
        : {}),

      ...(source
        ? {
            createdBy:
              source,
          }
        : {}),
    };

    const [
      items,
      total,
      branchCounts,
    ] =
      await Promise.all([
        Student.find(
          filter
        )
          .sort({
            studentId: 1,
            createdAt: 1,
          })
          .collation({
            locale:
              'en',

            numericOrdering:
              true,

            strength: 2,
          })
          .limit(
            limit
          )
          .lean(),

        Student.countDocuments(
          filter
        ),

        getBranchStudentCounts(),
      ]);

    /* =====================================================
       CSV EXPORT
    ===================================================== */

    if (
      exportType ===
      'csv'
    ) {
      const cols = [
        'id',
        'fullName',
        'email',
        'studentId',
        'course',
        'phoneNumber',
        'whatsappNumber',
        'branchId',
        'intakeId',
        'batchId',
        'createdAt',
        'createdBy',
      ];

      const header =
        cols.join(',') +
        '\n';

      const rows =
        items.map(
          (student) => {
            const studentData = {
              ...student,

              id:
                String(
                  student._id
                ),
            };

            return cols
              .map(
                (
                  column
                ) => {
                  const rawValue =
                    studentData[
                      column
                    ];

                  const value =
                    rawValue ===
                      undefined ||
                    rawValue ===
                      null
                      ? ''
                      : String(
                          rawValue
                        );

                  if (
                    value.includes(
                      ','
                    ) ||
                    value.includes(
                      '"'
                    ) ||
                    value.includes(
                      '\n'
                    )
                  ) {
                    return (
                      '"' +
                      value.replace(
                        /"/g,
                        '""'
                      ) +
                      '"'
                    );
                  }

                  return value;
                }
              )
              .join(',');
          }
        );

      const csv =
        header +
        rows.join('\n');

      const filename =
        `students-${new Date()
          .toISOString()
          .slice(
            0,
            10
          )}.csv`;

      res.setHeader(
        'Content-Type',
        'text/csv; charset=utf-8'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );

      return res.send(
        csv
      );
    }

    return res.json({
      total,

      returnedCount:
        items.length,

      limit,

      students:
        items.map(
          toStudentListItem
        ),

      branchStudentCounts:
        branchCounts.branches,

      unassignedStudents:
        branchCounts.unassigned,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   STUDENTS FOR RESULTS
========================================================= */

export async function listStudentsForResults(
  req,
  res,
  next
) {
  try {
    const branchId =
      safeTrim(
        req.query.branchId
      );

    const batchId =
      safeTrim(
        req.query.batchId
      );

    const intakeId =
      safeTrim(
        req.query.intakeId
      );

    const rawCourse =
      safeTrim(
        req.query.course
      );

    if (!branchId) {
      return res
        .status(400)
        .json({
          message:
            'Branch is required',
        });
    }

    if (!batchId) {
      return res
        .status(400)
        .json({
          message:
            'Batch is required',
        });
    }

    if (!rawCourse) {
      return res
        .status(400)
        .json({
          message:
            'Diploma / course is required',
        });
    }

    const course =
      canonicalCourse(
        rawCourse
      );

    if (
      !isAllowedCourse(
        course
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Invalid diploma / course',
        });
    }

    const filter = {
      branchId,

      batchId,

      course,

      ...(intakeId
        ? {
            intakeId,
          }
        : {}),
    };

    const students =
      await Student.find(
        filter
      )
        .select(
          '_id studentId fullName course branchId intakeId batchId'
        )
        .sort({
          studentId: 1,
          fullName: 1,
        })
        .collation({
          locale:
            'en',

          numericOrdering:
            true,

          strength: 2,
        })
        .lean();

    return res.json({
      branchId,

      batchId,

      intakeId,

      course,

      count:
        students.length,

      students:
        students.map(
          (
            student
          ) => ({
            id:
              String(
                student._id
              ),

            studentId:
              student.studentId,

            fullName:
              student.fullName,

            course:
              student.course,

            branchId:
              student.branchId ||
              '',

            intakeId:
              student.intakeId ||
              '',

            batchId:
              student.batchId ||
              '',
          })
        ),
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   GET STUDENT BY ID
========================================================= */

export async function getStudentById(
  req,
  res,
  next
) {
  try {
    const id =
      String(
        req.params?.id ||
          ''
      ).trim();

    if (!id) {
      return res
        .status(400)
        .json({
          message:
            'Student id is required',
        });
    }

    const student =
      await Student.findById(
        id
      ).lean();

    if (!student) {
      return res
        .status(404)
        .json({
          message:
            'Student not found',
        });
    }

    return res.json({
      student: {
        id:
          String(
            student._id
          ),

        fullName:
          student.fullName ||
          '',

        email:
          student.email ||
          '',

        studentId:
          student.studentId ||
          '',

        dob:
          student.dob ||
          null,

        gender:
          student.gender ||
          '',

        nic:
          student.nic ||
          '',

        course:
          student.course ||
          '',

        whatsappNumber:
          student.whatsappNumber ||
          '',

        phoneNumber:
          student.phoneNumber ||
          '',

        address:
          student.address ||
          '',

        school:
          student.school ||
          '',

        olResult:
          student.olResult ||
          '',

        olMath:
          student.olMath ||
          '',

        olEnglish:
          student.olEnglish ||
          '',

        guardianName:
          student.guardianName ||
          '',

        guardianPhoneNumber:
          student.guardianPhoneNumber ||
          '',

        branchId:
          student.branchId ||
          '',

        intakeId:
          student.intakeId ||
          '',

        batchId:
          student.batchId ||
          '',

        facultyId:
          student.facultyId ||
          '',

        programId:
          student.programId ||
          '',

        createdBy:
          student.createdBy ||
          '',

        createdAt:
          student.createdAt,

        updatedAt:
          student.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   CREATE STUDENT BY ADMIN
========================================================= */

export async function createStudentByAdmin(
  req,
  res,
  next
) {
  try {
    const {
      fullName,
      email,
      studentId,
      dob,
      gender,
      nic,
      course,
      whatsappNumber,
      phoneNumber,
      address,
      school,
      olResult,
      olMath,
      olEnglish,
      guardianName,
      guardianPhoneNumber,
      password,
      branchId,
      intakeId,
      batchId,
    } = req.body || {};

    const normalizedEmail =
      normalizeEmail(
        email
      );

    if (
      !safeTrim(
        fullName
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Name is required',
        });
    }

    if (
      !safeTrim(
        studentId
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Student ID is required',
        });
    }

    if (
      !isValidEmail(
        normalizedEmail
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Valid email is required',
        });
    }

    if (!dob) {
      return res
        .status(400)
        .json({
          message:
            'Date of birth is required',
        });
    }

    const normalizedGender =
      String(
        gender || ''
      )
        .trim()
        .toLowerCase();

    if (
      ![
        'male',
        'female',
        'other',
      ].includes(
        normalizedGender
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Valid gender is required',
        });
    }

    if (
      typeof password !==
        'string' ||
      password
        .trim()
        .length < 8
    ) {
      return res
        .status(400)
        .json({
          message:
            'Password must be at least 8 characters',
        });
    }

    const normalizedCourse =
      canonicalCourse(
        course
      );

    if (
      !isAllowedCourse(
        normalizedCourse
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Valid course is required',
        });
    }

    const enrollment =
      await resolveStudentEnrollment(
        branchId,
        intakeId,
        batchId
      );

    if (
      enrollment?.error
    ) {
      return res
        .status(400)
        .json({
          message:
            enrollment.error,
        });
    }

    const safeStudentId =
      safeTrim(
        studentId
      );

    const existing =
      await Student.findOne({
        $or: [
          {
            email:
              normalizedEmail,
          },

          {
            studentId:
              safeStudentId,
          },
        ],
      }).lean();

    if (existing) {
      return res
        .status(409)
        .json({
          message:
            'Email or Student ID already exists',
        });
    }

    const passwordHash =
      await bcrypt.hash(
        password.trim(),
        12
      );

    const created =
      await Student.create({
        fullName:
          safeTrim(
            fullName
          ),

        email:
          normalizedEmail,

        studentId:
          safeStudentId,

        dob,

        gender:
          normalizedGender,

        nic:
          safeTrim(nic),

        course:
          normalizedCourse,

        whatsappNumber:
          safeTrim(
            whatsappNumber
          ),

        phoneNumber:
          safeTrim(
            phoneNumber
          ),

        address:
          safeTrim(
            address
          ),

        school:
          safeTrim(
            school
          ),

        olResult:
          safeTrim(
            olResult
          ),

        olMath:
          safeTrim(
            olMath
          ),

        olEnglish:
          safeTrim(
            olEnglish
          ),

        guardianName:
          safeTrim(
            guardianName
          ),

        guardianPhoneNumber:
          safeTrim(
            guardianPhoneNumber
          ),

        branchId:
          enrollment.branchId,

        intakeId:
          enrollment.intakeId,

        batchId:
          enrollment.batchId,

        passwordHash,

        createdBy:
          'admin',
      });

    await logAdminAction(
      req.adminAuth?.id,
      'CREATE_STUDENT',
      {
        studentMongoId:
          created._id,

        studentId:
          created.studentId,

        studentEmail:
          created.email,

        course:
          created.course,

        branchId:
          created.branchId,

        intakeId:
          created.intakeId,

        batchId:
          created.batchId,
      }
    );

    return res
      .status(201)
      .json({
        student:
          toStudentListItem(
            created
          ),
      });
  } catch (err) {
    if (
      err?.code ===
      11000
    ) {
      return res
        .status(409)
        .json({
          message:
            'Email or Student ID already exists',
        });
    }

    next(err);
  }
}

/* =========================================================
   UPDATE STUDENT BY ADMIN
========================================================= */

export async function updateStudentByAdmin(
  req,
  res,
  next
) {
  try {
    const id =
      String(
        req.params?.id ||
          ''
      ).trim();

    if (!id) {
      return res
        .status(400)
        .json({
          message:
            'Student ID is required',
        });
    }

    const student =
      await Student.findById(
        id
      );

    if (!student) {
      return res
        .status(404)
        .json({
          message:
            'Student not found',
        });
    }

    const {
      fullName,
      email,
      studentId,
      dob,
      gender,
      nic,
      course,
      whatsappNumber,
      phoneNumber,
      address,
      school,
      olResult,
      olMath,
      olEnglish,
      guardianName,
      guardianPhoneNumber,
      branchId,
      intakeId,
      batchId,
    } = req.body || {};

    const normalizedEmail =
      normalizeEmail(
        email
      );

    if (
      !safeTrim(
        fullName
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Name is required',
        });
    }

    if (
      !safeTrim(
        studentId
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Student ID is required',
        });
    }

    if (
      !isValidEmail(
        normalizedEmail
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Valid email is required',
        });
    }

    const normalizedCourse =
      canonicalCourse(
        course
      );

    if (
      !isAllowedCourse(
        normalizedCourse
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Valid course is required',
        });
    }

    const enrollment =
      await resolveStudentEnrollment(
        branchId,
        intakeId,
        batchId
      );

    if (
      enrollment?.error
    ) {
      return res
        .status(400)
        .json({
          message:
            enrollment.error,
        });
    }

    const safeStudentId =
      safeTrim(
        studentId
      );

    const existing =
      await Student.findOne({
        _id: {
          $ne:
            student._id,
        },

        $or: [
          {
            email:
              normalizedEmail,
          },

          {
            studentId:
              safeStudentId,
          },
        ],
      }).lean();

    if (existing) {
      return res
        .status(409)
        .json({
          message:
            'Email or Student ID already exists',
        });
    }

    student.fullName =
      safeTrim(
        fullName
      );

    student.email =
      normalizedEmail;

    student.studentId =
      safeStudentId;

    if (
      dob !==
      undefined
    ) {
      student.dob =
        dob;
    }

    if (
      gender !==
      undefined
    ) {
      student.gender =
        safeTrim(
          gender
        ).toLowerCase();
    }

    student.nic =
      safeTrim(nic);

    student.course =
      normalizedCourse;

    student.whatsappNumber =
      safeTrim(
        whatsappNumber
      );

    student.phoneNumber =
      safeTrim(
        phoneNumber
      );

    student.address =
      safeTrim(
        address
      );

    student.school =
      safeTrim(
        school
      );

    student.olResult =
      safeTrim(
        olResult
      );

    student.olMath =
      safeTrim(
        olMath
      );

    student.olEnglish =
      safeTrim(
        olEnglish
      );

    student.guardianName =
      safeTrim(
        guardianName
      );

    student.guardianPhoneNumber =
      safeTrim(
        guardianPhoneNumber
      );

    student.branchId =
      enrollment.branchId;

    student.intakeId =
      enrollment.intakeId;

    student.batchId =
      enrollment.batchId;

    await student.save();

    await logAdminAction(
      req.adminAuth?.id,
      'EDIT_STUDENT',
      {
        studentMongoId:
          student._id,

        studentId:
          student.studentId,

        studentEmail:
          student.email,

        course:
          student.course,

        branchId:
          student.branchId,

        intakeId:
          student.intakeId,

        batchId:
          student.batchId,
      }
    );

    return res.json({
      student:
        toStudentListItem(
          student
        ),
    });
  } catch (err) {
    if (
      err?.code ===
      11000
    ) {
      return res
        .status(409)
        .json({
          message:
            'Email or Student ID already exists',
        });
    }

    next(err);
  }
}

/* =========================================================
   DELETE STUDENT
========================================================= */

export async function deleteStudentByAdmin(
  req,
  res,
  next
) {
  try {
    const id =
      String(
        req.params?.id ||
          ''
      ).trim();

    if (!id) {
      return res
        .status(400)
        .json({
          message:
            'Student ID is required',
        });
    }

    const student =
      await Student.findById(
        id
      ).lean();

    if (!student) {
      return res
        .status(404)
        .json({
          message:
            'Student not found',
        });
    }

    await Student.findByIdAndDelete(
      id
    );

    await logAdminAction(
      req.adminAuth?.id,
      'DELETE_STUDENT',
      {
        studentId:
          id,

        studentEmail:
          student.email,

        studentStudentId:
          student.studentId,

        studentName:
          student.fullName,
      }
    );

    return res.json({
      message:
        'Student account deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   APP DATA
========================================================= */

export async function listAppDataKeys(
  req,
  res,
  next
) {
  try {
    const keys =
      await AppData.find(
        {},
        {
          key: 1,
          _id: 0,
        }
      )
        .sort({
          key: 1,
        })
        .lean();

    return res.json({
      keys:
        keys.map(
          (
            document
          ) =>
            document.key
        ),
    });
  } catch (err) {
    next(err);
  }
}

export async function getAppDataByKey(
  req,
  res,
  next
) {
  try {
    const {
      key,
    } = req.params;

    if (
      !isSafeKey(
        key
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Invalid key',
        });
    }

    const doc =
      await AppData.findOne({
        key,
      }).lean();

    if (!doc) {
      return res
        .status(404)
        .json({
          message:
            'Not found',
        });
    }

    return res.json({
      key:
        doc.key,

      payload:
        doc.payload,

      updatedAt:
        doc.updatedAt,
    });
  } catch (err) {
    next(err);
  }
}

export async function upsertAppDataByKey(
  req,
  res,
  next
) {
  try {
    const {
      key,
    } = req.params;

    if (
      !isSafeKey(
        key
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            'Invalid key',
        });
    }

    const {
      payload,
    } = req.body || {};

    if (
      payload ===
      undefined
    ) {
      return res
        .status(400)
        .json({
          message:
            'payload is required',
        });
    }

    const updated =
      await AppData.findOneAndUpdate(
        {
          key,
        },
        {
          $set: {
            key,
            payload,
          },
        },
        {
          upsert: true,
          new: true,
        }
      ).lean();

    return res.json({
      key:
        updated.key,

      payload:
        updated.payload,

      updatedAt:
        updated.updatedAt,
    });
  } catch (err) {
    next(err);
  }
}

/* =========================================================
   EDIT STAFF ADMIN
========================================================= */

export async function editStaffUser(
  req,
  res,
  next
) {
  try {
    const {
      id,
    } = req.params;

    const {
      name,
      email,
      password,
    } = req.body || {};

    if (!id) {
      return res
        .status(400)
        .json({
          message:
            'Admin ID is required',
        });
    }

    const admin =
      await Admin.findById(
        id
      ).lean();

    if (!admin) {
      return res
        .status(404)
        .json({
          message:
            'Admin not found',
        });
    }

    if (
      admin.role ===
      'superadmin'
    ) {
      return res
        .status(403)
        .json({
          message:
            'Cannot edit superadmin accounts',
        });
    }

    const updateData =
      {};

    if (
      name &&
      safeTrim(
        name
      )
    ) {
      updateData.name =
        safeTrim(
          name
        );
    }

    if (email) {
      const normalizedEmail =
        normalizeEmail(
          email
        );

      if (
        !isValidEmail(
          normalizedEmail
        )
      ) {
        return res
          .status(400)
          .json({
            message:
              'Valid email is required',
          });
      }

      const existing =
        await Admin.findOne({
          email:
            normalizedEmail,

          _id: {
            $ne:
              id,
          },
        }).lean();

      if (existing) {
        return res
          .status(409)
          .json({
            message:
              'Email already exists',
          });
      }

      updateData.email =
        normalizedEmail;
    }

    if (
      password &&
      typeof password ===
        'string'
    ) {
      if (
        password
          .trim()
          .length < 8
      ) {
        return res
          .status(400)
          .json({
            message:
              'Password must be at least 8 characters',
          });
      }

      updateData.passwordHash =
        await bcrypt.hash(
          password.trim(),
          12
        );
    }

    const updated =
      await Admin.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
        }
      ).lean();

    await logAdminAction(
      req.adminAuth?.id,
      'EDIT_STAFF_ADMIN',
      {
        staffAdminId:
          id,

        changes:
          Object.keys(
            updateData
          ),

        staffAdminEmail:
          updated.email,
      }
    );

    return res.json({
      user:
        toAdminListItem(
          updated
        ),
    });
  } catch (err) {
    if (
      err?.code ===
      11000
    ) {
      return res
        .status(409)
        .json({
          message:
            'Email already exists',
        });
    }

    next(err);
  }
}

/* =========================================================
   DELETE STAFF ADMIN
========================================================= */

export async function deleteStaffUser(
  req,
  res,
  next
) {
  try {
    const {
      id,
    } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({
          message:
            'Admin ID is required',
        });
    }

    const admin =
      await Admin.findById(
        id
      ).lean();

    if (!admin) {
      return res
        .status(404)
        .json({
          message:
            'Admin not found',
        });
    }

    if (
      admin.role ===
      'superadmin'
    ) {
      return res
        .status(403)
        .json({
          message:
            'Cannot delete superadmin accounts',
        });
    }

    if (
      String(
        admin._id
      ) ===
      String(
        req.adminAuth?.id
      )
    ) {
      return res
        .status(403)
        .json({
          message:
            'Cannot delete your own account',
        });
    }

    await Admin.findByIdAndDelete(
      id
    );

    await logAdminAction(
      req.adminAuth?.id,
      'DELETE_STAFF_ADMIN',
      {
        staffAdminId:
          id,

        staffAdminEmail:
          admin.email,

        staffAdminName:
          admin.name,
      }
    );

    return res.json({
      message:
        'Admin account deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}