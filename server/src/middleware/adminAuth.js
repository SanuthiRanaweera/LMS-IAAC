import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.js';

const COOKIE_NAME = 'iaac_admin_token';

function getJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_JWT_SECRET (or JWT_SECRET) must be set in production');
  }

  return 'dev_only_change_me';
}

// Log admin actions for audit trail
export async function logAdminAction(adminId, action, details = {}) {
  try {
    console.log(`[ADMIN ACTION] ${new Date().toISOString()} - Admin ${adminId}: ${action}`, details);
    // Could be extended to save to database or external logging service
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

// Check if action requires super admin permissions
export function requireSuperAdmin(action) {
  const superAdminActions = [
    'CREATE_STAFF_ADMIN',
    'EDIT_STAFF_ADMIN', 
    'DELETE_STAFF_ADMIN',
    'DELETE_STUDENT',
    'EDIT_CONTENT',
    'DELETE_CONTENT',
    'VIEW_ANALYTICS',
    'MANAGE_SETTINGS',
    'MANAGE_FACULTIES',
    'MANAGE_PROGRAMS',
    'MANAGE_INTAKES'
  ];
  return superAdminActions.includes(action);
}

// Check if action is allowed for staff admin
export function isStaffAllowedAction(action) {
  const staffAllowedActions = [
    'ADD_MATERIALS',
    'EDIT_MATERIALS',
    'DELETE_MATERIALS',
    'ADD_ASSIGNMENTS',
    'VIEW_ASSIGNMENTS',
    'ADD_SCHEDULE',
    'VIEW_STUDENTS',
    'CREATE_STUDENT',
    'EDIT_STUDENT'
  ];
  return staffAllowedActions.includes(action);
}

export function signAdminToken(payload, options = {}) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d', ...options });
}

export function verifyAdminToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = verifyAdminToken(token);

    // Normalize token shape for downstream code.
    // Many handlers use `req.adminAuth.id` but the JWT uses `sub`.
    decoded.id = decoded.id || decoded.sub;

    // Security: never treat a missing/empty role as superadmin.
    // If role is missing (legacy tokens), resolve from DB.
    if (!decoded.role) {
      Admin.findById(decoded.sub)
        .select('role')
        .lean()
        .then((admin) => {
          if (!admin) return res.status(401).json({ message: 'Unauthorized' });

          const role = admin?.role ? String(admin.role) : 'staff';
          decoded.role = ['superadmin', 'staff', 'lecturer'].includes(role) ? role : 'staff';
          req.adminAuth = decoded;
          next();
        })
        .catch(() => res.status(401).json({ message: 'Unauthorized' }));
      return;
    }

    req.adminAuth = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

export function getEffectiveAdminRole(adminAuth) {
  const role = adminAuth?.role ? String(adminAuth.role) : '';
  // Missing role should never escalate privileges.
  if (!role) return 'staff';
  return role;
}

export function requireAdminRole(roles) {
  const allowed = Array.isArray(roles) ? roles.map(String) : [String(roles)];
  return (req, res, next) => {
    const role = getEffectiveAdminRole(req.adminAuth);
    if (!allowed.includes(role)) return res.status(403).json({ message: 'Forbidden' });
    return next();
  };
}

export function requireAdminForAppDataKey(options = {}) {
  const { mode = 'read' } = options;
  return (req, res, next) => {
    const role = getEffectiveAdminRole(req.adminAuth);
    const key = String(req.params?.key || '');
    const adminId = req.adminAuth?.id;

    if (role === 'superadmin') {
      if (mode === 'write') {
        logAdminAction(adminId, `EDIT_CONTENT_${key.toUpperCase()}`, { key, mode });
      }
      return next();
    }

    // Limited-role permissions for app data
    if (role === 'staff' || role === 'lecturer') {
      // Staff can add/read materials and schedule
      const allowedKeys = ['materials', 'schedule'];
      
      if (allowedKeys.includes(key)) {
        if (mode === 'write') {
          // Staff can only ADD, not edit existing content
          logAdminAction(adminId, `ADD_CONTENT_${key.toUpperCase()}`, { key, mode });
        }
        return next();
      }
      
      return res.status(403).json({ 
        message: "You don't have permission to perform this action. Please contact your super admin." 
      });
    }

    return res.status(403).json({ message: 'Forbidden' });
  };
}

// Enhanced role checking with action-based permissions
export function requirePermission(action) {
  return (req, res, next) => {
    const role = getEffectiveAdminRole(req.adminAuth);
    const adminId = req.adminAuth?.id;

    if (role === 'superadmin') {
      if (requireSuperAdmin(action)) {
        logAdminAction(adminId, action, { role });
      }
      return next();
    }

    if (role === 'staff' || role === 'lecturer') {
      if (isStaffAllowedAction(action)) {
        logAdminAction(adminId, action, { role });
        return next();
      }
      
      return res.status(403).json({ 
        message: "You don't have permission to perform this action. Please contact your super admin." 
      });
    }

    return res.status(403).json({ message: 'Forbidden' });
  };
}

export function setAdminCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAdminCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}
