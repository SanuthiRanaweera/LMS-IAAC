import { Navigate, useOutletContext } from 'react-router-dom';

export default function RequireAdminRole({ allow, children }) {
  const { admin } = useOutletContext() || {};
  const role = admin?.role || 'staff';
  const allowed = Array.isArray(allow) ? allow : [allow];

  if (allowed.includes(role)) return children;
  return <Navigate to="/admin" replace />;
}
