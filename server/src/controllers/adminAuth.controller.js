import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin.js';
import { clearAdminCookie, setAdminCookie, signAdminToken } from '../middleware/adminAuth.js';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function toAdminMePayload(admin) {
  const role = admin?.role ? String(admin.role) : 'staff';
  return {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    role,
  };
}

export async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const normalized = normalizeEmail(email);

    if (!normalized || typeof password !== 'string' || password.trim().length === 0) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: normalized });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password.trim(), admin.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const role = admin?.role ? String(admin.role) : 'staff';
    const token = signAdminToken({ sub: String(admin._id), role });
    setAdminCookie(res, token);

    return res.json({ admin: toAdminMePayload(admin) });
  } catch (err) {
    next(err);
  }
}

export async function adminLogout(req, res, next) {
  try {
    clearAdminCookie(res);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function adminMe(req, res, next) {
  try {
    const id = req.adminAuth?.sub;
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const admin = await Admin.findById(id).lean();
    if (!admin) return res.status(401).json({ message: 'Unauthorized' });

    res.json(toAdminMePayload(admin));
  } catch (err) {
    next(err);
  }
}
