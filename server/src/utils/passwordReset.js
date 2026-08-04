function normalizeBaseUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/$/, '');
}

export function resolvePasswordResetBaseUrl(req, fallback = '') {
  const configured = normalizeBaseUrl(fallback || process.env.APP_BASE_URL || '');
  if (configured) return configured;

  const forwardedProto = req?.get?.('x-forwarded-proto');
  const forwardedHost = req?.get?.('x-forwarded-host') || req?.get?.('host');
  if (forwardedProto && forwardedHost) {
    return `${String(forwardedProto).split(',')[0].trim()}://${String(forwardedHost).split(',')[0].trim()}`;
  }

  const origin = req?.get?.('origin');
  if (origin) return normalizeBaseUrl(origin);

  const referer = req?.get?.('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      return `${url.protocol}//${url.host}`;
    } catch {
      return '';
    }
  }

  const proto = req?.protocol || 'http';
  const host = req?.get?.('host');
  if (proto && host) return `${proto}://${host}`;

  return '';
}

export function buildPasswordResetUrl(req, token, fallback = '') {
  const base = resolvePasswordResetBaseUrl(req, fallback);
  if (!base || !token) return '';
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
