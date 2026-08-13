import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'iaac_token';

/* =========================================================
   JWT SECRET
========================================================= */

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET must be set in production'
    );
  }

  return 'dev_only_change_me';
}

/* =========================================================
   COOKIE NAME
========================================================= */

export function getAuthCookieName() {
  return COOKIE_NAME;
}

/* =========================================================
   SIGN TOKEN
========================================================= */

export function signAuthToken(
  payload,
  options = {}
) {
  return jwt.sign(
    payload,
    getJwtSecret(),
    {
      expiresIn: '7d',
      ...options,
    }
  );
}

/* =========================================================
   VERIFY TOKEN
========================================================= */

export function verifyAuthToken(token) {
  return jwt.verify(
    token,
    getJwtSecret()
  );
}

/* =========================================================
   REQUIRE AUTHENTICATION
========================================================= */

export function requireAuth(
  req,
  res,
  next
) {
  try {
    const token =
      req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        message: 'Unauthorized',
      });
    }

    const decoded =
      verifyAuthToken(token);

    req.auth = decoded;

    return next();
  } catch {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }
}

/* =========================================================
   REQUIRE STUDENT
========================================================= */

export function requireStudent(
  req,
  res,
  next
) {
  if (
    !req.auth ||
    req.auth?.role !== 'student'
  ) {
    return res.status(403).json({
      message:
        'Student access required',
    });
  }

  return next();
}

/* =========================================================
   REQUIRE LECTURER
========================================================= */

export function requireLecturer(
  req,
  res,
  next
) {
  if (
    !req.auth ||
    req.auth?.role !== 'lecturer'
  ) {
    return res.status(403).json({
      message:
        'Lecturer access required',
    });
  }

  return next();
}

/* =========================================================
   SET AUTH COOKIE
========================================================= */

export function setAuthCookie(
  res,
  token
) {
  const isProd =
    process.env.NODE_ENV ===
    'production';

  res.cookie(
    COOKIE_NAME,
    token,
    {
      httpOnly: true,

      /*
      Local development:
      secure = false

      Production:
      secure = true
      */
      secure: isProd,

      sameSite: 'lax',

      path: '/',

      maxAge:
        7 *
        24 *
        60 *
        60 *
        1000,
    }
  );
}

/* =========================================================
   CLEAR AUTH COOKIE
========================================================= */

export function clearAuthCookie(
  res
) {
  const isProd =
    process.env.NODE_ENV ===
    'production';

  res.clearCookie(
    COOKIE_NAME,
    {
      httpOnly: true,

      secure: isProd,

      sameSite: 'lax',

      path: '/',
    }
  );
}