import { Router } from 'express';
import { listEntities } from '../controllers/entities.controller.js';
import { Student } from '../models/Student.js';
import { requireAdmin, requirePermission } from '../middleware/adminAuth.js';

export const entitiesRouter = Router();

/*
  Get all registered students for admin pages.

  Full URL if mounted as app.use('/api/entities', entitiesRouter):
  GET /api/entities/students
*/
entitiesRouter.get(
  '/students',
  requireAdmin,
  requirePermission('VIEW_STUDENTS'),
  async (req, res, next) => {
    try {
      const students = await Student.find({})
        .select(
          'name fullName studentName firstName lastName studentId studentNo registrationNo email studentEmail phone mobile contactNo contactNumber branchId intakeId batchId course program diploma courseName programName diplomaName createdAt'
        )
        .sort({
          createdAt: -1,
        })
        .lean();

      return res.json({
        count: students.length,
        students: students.map((student) => ({
          id: student._id,
          _id: student._id,

          name:
            student.name ||
            student.fullName ||
            student.studentName ||
            `${student.firstName || ''} ${student.lastName || ''}`.trim() ||
            'Unnamed Student',

          studentId:
            student.studentId ||
            student.studentNo ||
            student.registrationNo ||
            '',

          email: student.email || student.studentEmail || '',

          phone:
            student.phone ||
            student.mobile ||
            student.contactNo ||
            student.contactNumber ||
            '',

          branchId: student.branchId || '',
          intakeId: student.intakeId || '',
          batchId: student.batchId || '',

          course:
            student.course ||
            student.program ||
            student.diploma ||
            student.courseName ||
            student.programName ||
            student.diplomaName ||
            '',

          program: student.program || '',
          diploma: student.diploma || '',

          registeredAt: student.createdAt,
          createdAt: student.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

/*
  Get registered students for one batch.
  GET /api/entities/students/batch/:batchId
*/
entitiesRouter.get(
  '/students/batch/:batchId',
  requireAdmin,
  requirePermission('VIEW_STUDENTS'),
  async (req, res, next) => {
    try {
      const { batchId } = req.params;

      const students = await Student.find({
        batchId: String(batchId || '').trim(),
      })
        .select(
          'name fullName studentName firstName lastName studentId studentNo registrationNo email studentEmail phone mobile contactNo contactNumber branchId intakeId batchId course program diploma courseName programName diplomaName createdAt'
        )
        .sort({
          createdAt: -1,
        })
        .lean();

      return res.json({
        batchId,
        count: students.length,
        students: students.map((student) => ({
          id: student._id,
          _id: student._id,

          name:
            student.name ||
            student.fullName ||
            student.studentName ||
            `${student.firstName || ''} ${student.lastName || ''}`.trim() ||
            'Unnamed Student',

          studentId:
            student.studentId ||
            student.studentNo ||
            student.registrationNo ||
            '',

          email: student.email || student.studentEmail || '',

          phone:
            student.phone ||
            student.mobile ||
            student.contactNo ||
            student.contactNumber ||
            '',

          branchId: student.branchId || '',
          intakeId: student.intakeId || '',
          batchId: student.batchId || '',

          course:
            student.course ||
            student.program ||
            student.diploma ||
            student.courseName ||
            student.programName ||
            student.diplomaName ||
            '',

          program: student.program || '',
          diploma: student.diploma || '',

          registeredAt: student.createdAt,
          createdAt: student.createdAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  }
);

/*
  Generic hierarchical endpoint
  Keep this LAST.
  GET /api/entities/:type?parentId=...
*/
entitiesRouter.get('/:type', listEntities);

export default entitiesRouter;