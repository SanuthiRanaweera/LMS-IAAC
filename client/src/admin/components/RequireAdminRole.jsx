import { Navigate, useOutletContext } from 'react-router-dom';

export default function RequireAdminRole({ allow, permission, children }) {
  const { admin } = useOutletContext() || {};
  const role = admin?.role || 'staff';
  const allowed = Array.isArray(allow) ? allow : [allow];

  if (allowed.includes(role) || (permission && admin?.[permission] === true)) return children;
  return <Navigate to="/admin" replace />;
}
