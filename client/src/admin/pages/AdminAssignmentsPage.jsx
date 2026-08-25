import UploadAssignment from '../components/UploadAssignment.jsx';
import { useOutletContext } from 'react-router-dom';

export default function AdminAssignmentsPage() {
  const { admin } = useOutletContext();
  return <UploadAssignment admin={admin} />;
}