import { Router } from 'express';

import {
  requireAdminRole,
  requirePermission,
} from '../middleware/adminAuth.js';

import {
  createResult,
  listResults,
  getResultById,
  updateResult,
  publishResult,
  unpublishResult,
  deleteResult,
  getStudentPublishedResults,
} from '../controllers/results.controller.js';

export const resultsRouter = Router();

/* =========================================================
   ADMIN / SUPERADMIN RESULT MANAGEMENT
========================================================= */

/*
GET /api/results

Optional filters:

GET /api/results?branchId=branch01
GET /api/results?intakeId=intake01
GET /api/results?batchId=batch01
GET /api/results?course=Cabin%20Crew
GET /api/results?published=true
GET /api/results?published=false

Combined example:

GET /api/results
  ?branchId=branch01
  &intakeId=intake01
  &batchId=batch01
  &course=Cabin%20Crew
*/
resultsRouter.get(
  '/',
  requireAdminRole(['superadmin', 'staff']),
  listResults
);

/* =========================================================
   CREATE RESULT
========================================================= */

/*
POST /api/results

Example body:

{
  "resultTitle": "Cabin Crew Final Examination 2026",
  "resultDate": "2026-08-13",

  "branchId": "branch01",
  "intakeId": "Batch 04B",
  "batchId": "Cabin Crew",

  "course": "Cabin Crew",

  "isPublished": false,

  "results": [
    {
      "student": "MongoDBStudentObjectId",
      "marks": 85,
      "grade": "A",
      "status": "PASS",
      "remarks": "Good performance"
    }
  ]
}
*/
resultsRouter.post(
  '/',
  requirePermission('UPDATE_RESULTS'),
  createResult
);

/* =========================================================
   ADMIN: GET PUBLISHED RESULTS OF ONE STUDENT
========================================================= */

/*
This endpoint is intended for Admin / Super Admin.

Examples:

GET /api/results/student/CCR0401B

or

GET /api/results/student/66b123456789abcdef123456

IMPORTANT:
Keep this route BEFORE /:id.
*/
resultsRouter.get(
  '/student/:studentId',
  requireAdminRole(['superadmin', 'staff']),
  getStudentPublishedResults
);

/* =========================================================
   PUBLISH RESULT
========================================================= */

/*
PUT /api/results/:id/publish
*/
resultsRouter.put(
  '/:id/publish',
  requirePermission('UPDATE_RESULTS'),
  publishResult
);

/* =========================================================
   UNPUBLISH RESULT
========================================================= */

/*
PUT /api/results/:id/unpublish
*/
resultsRouter.put(
  '/:id/unpublish',
  requirePermission('UPDATE_RESULTS'),
  unpublishResult
);

/* =========================================================
   GET ONE RESULT
========================================================= */

/*
GET /api/results/:id
*/
resultsRouter.get(
  '/:id',
  requireAdminRole(['superadmin', 'staff']),
  getResultById
);

/* =========================================================
   UPDATE RESULT
========================================================= */

/*
PUT /api/results/:id
*/
resultsRouter.put(
  '/:id',
  requirePermission('UPDATE_RESULTS'),
  updateResult
);

/* =========================================================
   DELETE RESULT
========================================================= */

/*
DELETE /api/results/:id
*/
resultsRouter.delete(
  '/:id',
  requirePermission('UPDATE_RESULTS'),
  deleteResult
);