import { Router } from 'express';

import {
  requireAdminForAppDataKey,
  requireAdminRole,
  requirePermission,
} from '../middleware/adminAuth.js';

import {
  createStudentByAdmin,
  createStaffUser,
  deleteStudentByAdmin,
  editStaffUser,
  deleteStaffUser,
  getAdminMetrics,
  getAppDataByKey,
  getStudentById,
  listAdminUsers,
  listAppDataKeys,
  listStudents,
  listStudentsForResults,
  updateStudentByAdmin,
  upsertAppDataByKey,
} from '../controllers/admin.controller.js';

import {
  listFaculties,
  listIntakes,
  listPrograms,
  listSubjects,
} from '../controllers/academics.controller.js';

export const adminRouter = Router();

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

adminRouter.get(
  '/metrics',
  requireAdminRole(['superadmin', 'staff']),
  getAdminMetrics
);

/* =========================================================
   ADMIN USER MANAGEMENT
   Superadmin permissions
========================================================= */

adminRouter.get(
  '/users',
  requirePermission('VIEW_ANALYTICS'),
  listAdminUsers
);

adminRouter.post(
  '/users',
  requirePermission('CREATE_STAFF_ADMIN'),
  createStaffUser
);

adminRouter.put(
  '/users/:id',
  requirePermission('EDIT_STAFF_ADMIN'),
  editStaffUser
);

adminRouter.delete(
  '/users/:id',
  requirePermission('DELETE_STAFF_ADMIN'),
  deleteStaffUser
);

/* =========================================================
   STUDENT MANAGEMENT
========================================================= */

/*
Normal student list

Examples:

GET /api/admin/students

GET /api/admin/students?branchId=branch1

GET /api/admin/students?
branchId=branch1
&batchId=batch1
&course=Cabin%20Crew
*/
adminRouter.get(
  '/students',
  requirePermission('VIEW_STUDENTS'),
  listStudents
);

/*
Results student filtering

IMPORTANT:
This route must stay ABOVE:

/students/:id

Otherwise Express may think "results" is a student ID.

Example:

GET /api/admin/students/results
  ?branchId=branch1
  &batchId=batch1
  &course=Cabin%20Crew

Response:

{
  "count": 2,
  "students": [
    {
      "id": "...",
      "studentId": "IAAC001",
      "fullName": "Student One"
    }
  ]
}
*/
adminRouter.get(
  '/students/results',
  requirePermission('VIEW_STUDENTS'),
  listStudentsForResults
);

/*
Get one student
*/
adminRouter.get(
  '/students/:id',
  requirePermission('VIEW_STUDENTS'),
  getStudentById
);

/*
Create student
*/
adminRouter.post(
  '/students',
  requirePermission('CREATE_STUDENT'),
  createStudentByAdmin
);

/*
Update student
*/
adminRouter.put(
  '/students/:id',
  requirePermission('EDIT_STUDENT'),
  updateStudentByAdmin
);

/*
Delete student
*/
adminRouter.delete(
  '/students/:id',
  requirePermission('DELETE_STUDENT'),
  deleteStudentByAdmin
);

/* =========================================================
   APP DATA MANAGEMENT
========================================================= */

adminRouter.get(
  '/app-data/keys',
  requireAdminRole('superadmin'),
  listAppDataKeys
);

adminRouter.get(
  '/app-data/:key',
  requireAdminForAppDataKey({
    mode: 'read',
  }),
  getAppDataByKey
);

adminRouter.put(
  '/app-data/:key',
  requireAdminForAppDataKey({
    mode: 'write',
  }),
  upsertAppDataByKey
);

/* =========================================================
   ACADEMIC HIERARCHY
========================================================= */

/*
Both superadmin and staff can view academic hierarchy.
*/

adminRouter.get(
  '/academics/faculties',
  requireAdminRole(['superadmin', 'staff']),
  listFaculties
);

adminRouter.get(
  '/academics/programs',
  requireAdminRole(['superadmin', 'staff']),
  listPrograms
);

adminRouter.get(
  '/academics/intakes',
  requireAdminRole(['superadmin', 'staff']),
  listIntakes
);

adminRouter.get(
  '/academics/subjects',
  requireAdminRole(['superadmin', 'staff']),
  listSubjects
);