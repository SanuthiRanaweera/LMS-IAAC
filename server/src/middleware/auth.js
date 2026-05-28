import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'iaac_token';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }

  return 'dev_only_change_me';
}

export function getAuthCookieName() {
  return COOKIE_NAME;
}

export function signAuthToken(payload, options = {}) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d', ...options });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = verifyAuthToken(token);
    req.auth = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

export function requireLecturer(req, res, next) {
  if (req.auth?.role !== 'lecturer') {
    return res.status(403).json({ message: 'Lecturer access required' });
  }
  return next();
}

export function requireStudent(req, res, next) {
  if (req.auth?.role !== 'student') {
    return res.status(403).json({ message: 'Student access required' });
  }
  return next();
}

export function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}

