import { Router } from 'express';
import { requireAdminForAppDataKey, requireAdminRole, requirePermission } from '../middleware/adminAuth.js';
import {
  createStudentByAdmin,
  createStaffUser,
  deleteStudentByAdmin,
  editStaffUser,
  deleteStaffUser,
  getAdminMetrics,
  getAppDataByKey,
  listAdminUsers,
  listAppDataKeys,
  listStudents,
  upsertAppDataByKey,
} from '../controllers/admin.controller.js';
import {
  listFaculties,
  listIntakes,
  listPrograms,
  listSubjects,
} from '../controllers/academics.controller.js';

export const adminRouter = Router();

adminRouter.get('/metrics', requireAdminRole(['superadmin', 'staff']), getAdminMetrics);

// Admin user management (superadmin only)
adminRouter.get('/users', requirePermission('VIEW_ANALYTICS'), listAdminUsers);
adminRouter.post('/users', requirePermission('CREATE_STAFF_ADMIN'), createStaffUser);
adminRouter.put('/users/:id', requirePermission('EDIT_STAFF_ADMIN'), editStaffUser);
adminRouter.delete('/users/:id', requirePermission('DELETE_STAFF_ADMIN'), deleteStaffUser);

// Student management (both roles can view and create)
adminRouter.get('/students', requirePermission('VIEW_STUDENTS'), listStudents);
adminRouter.post('/students', requirePermission('CREATE_STUDENT'), createStudentByAdmin);
adminRouter.delete('/students/:id', requirePermission('DELETE_STUDENT'), deleteStudentByAdmin);

// App data management with enhanced permissions
adminRouter.get('/app-data/keys', requireAdminRole('superadmin'), listAppDataKeys);
adminRouter.get('/app-data/:key', requireAdminForAppDataKey({ mode: 'read' }), getAppDataByKey);
adminRouter.put('/app-data/:key', requireAdminForAppDataKey({ mode: 'write' }), upsertAppDataByKey);

// Academic hierarchy management (superadmin only for management, staff can view)
adminRouter.get('/academics/faculties', requireAdminRole(['superadmin', 'staff']), listFaculties);
adminRouter.get('/academics/programs', requireAdminRole(['superadmin', 'staff']), listPrograms);
adminRouter.get('/academics/intakes', requireAdminRole(['superadmin', 'staff']), listIntakes);
adminRouter.get('/academics/subjects', requireAdminRole(['superadmin', 'staff']), listSubjects);
