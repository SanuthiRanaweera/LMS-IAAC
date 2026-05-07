import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './admin/layouts/AdminLayout.jsx';
import RequireAdminRole from './admin/components/RequireAdminRole.jsx';
import AdminDashboardPage from './admin/pages/AdminDashboardPage.jsx';
import AdminLoginPage from './admin/pages/AdminLoginPage.jsx';
import AdminScheduleLecturePage from './admin/pages/AdminScheduleLecturePage.jsx';
import AdminStudentsPage from './admin/pages/AdminStudentsPage.jsx';
import AdminUsersPage from './admin/pages/AdminUsersPage.jsx';
import AdminProgramsPage from './admin/pages/AdminProgramsPage.jsx';
import AdminIntakesPage from './admin/pages/AdminIntakesPage.jsx';
import AdminBatchStudentsPage from './admin/pages/AdminBatchStudentsPage.jsx';
import AdminMaterialUploadPage from './admin/pages/AdminMaterialUploadPage.jsx';
import AdminBranchesPage from './admin/pages/AdminBranchesPage.jsx';
import AdminBranchIntakesPage from './admin/pages/AdminBranchIntakesPage.jsx';
import AdminBranchBatchesPage from './admin/pages/AdminBranchBatchesPage.jsx';
import AdminRecordingsPage from './admin/pages/AdminRecordingsPage.jsx';
import StudentLayout from './layouts/StudentLayout.jsx';
import LecturerLayout from './layouts/LecturerLayout.jsx';
import CoursesPage from './pages/CoursesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HelpDeskPage from './pages/HelpDeskPage.jsx';
import KnowledgeHubPage from './pages/KnowledgeHubPage.jsx';
import MaterialsPage from './pages/MaterialsPage.jsx';
import PolicyPage from './pages/PolicyPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RecordingsPage from './pages/RecordingsPage.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import LecturerDashboardPage from './pages/lecturer/LecturerDashboardPage.jsx';
import LecturerChangePasswordPage from './pages/lecturer/LecturerChangePasswordPage.jsx';
import LecturerSchedulePage from './pages/lecturer/LecturerSchedulePage.jsx';
import LecturerRecordingsPage from './pages/lecturer/LecturerRecordingsPage.jsx';
import LecturerKnowledgeHubPage from './pages/lecturer/LecturerKnowledgeHubPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="course-overview" element={<Navigate to="/admin/branches" replace />} />
          <Route
            path="users"
            element={
              <RequireAdminRole allow="superadmin">
                <AdminUsersPage />
              </RequireAdminRole>
            }
          />
          <Route path="students" element={<AdminStudentsPage />} />
          <Route
            path="branches"
            element={
              <RequireAdminRole allow="superadmin">
                <AdminBranchesPage />
              </RequireAdminRole>
            }
          />
          <Route
            path="branches/:branchId/intakes"
            element={
              <RequireAdminRole allow="superadmin">
                <AdminBranchIntakesPage />
              </RequireAdminRole>
            }
          />
          <Route
            path="branches/:branchId/intakes/:intakeId/batches"
            element={
              <RequireAdminRole allow="superadmin">
                <AdminBranchBatchesPage />
              </RequireAdminRole>
            }
          />
          <Route
            path="faculties"
            element={<Navigate to="/admin/branches" replace />}
          />
          <Route
            path="faculties/:facultyId/programs"
            element={
              <RequireAdminRole allow="superadmin">
                <AdminProgramsPage />
              </RequireAdminRole>
            }
          />
          <Route
            path="programs/:programId/intakes"
            element={
              <RequireAdminRole allow="superadmin">
                <AdminIntakesPage />
              </RequireAdminRole>
            }
          />
          <Route
            path="programs/:programId/intakes/:intakeId/students"
            element={
              <RequireAdminRole allow="superadmin">
                <AdminBatchStudentsPage />
              </RequireAdminRole>
            }
          />
          {/* Content manager removed; keep a redirect for any old bookmarks */}
          <Route path="content" element={<Navigate to="/admin" replace />} />
          <Route path="schedule" element={<AdminScheduleLecturePage />} />
          <Route path="materials/upload" element={<AdminMaterialUploadPage />} />
          <Route
            path="recordings"
            element={
              <RequireAdminRole allow="superadmin">
                <AdminRecordingsPage />
              </RequireAdminRole>
            }
          />
        </Route>

        {/* Student */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Lecturer */}
        <Route path="/lecturer/change-password" element={<LecturerChangePasswordPage />} />
        <Route path="/lecturer" element={<LecturerLayout />}>
          <Route index element={<Navigate to="/lecturer/dashboard" replace />} />
          <Route path="dashboard" element={<LecturerDashboardPage />} />
          <Route path="schedule" element={<LecturerSchedulePage />} />
          <Route path="recordings" element={<LecturerRecordingsPage />} />
          <Route path="knowledge-hub" element={<LecturerKnowledgeHubPage />} />
          <Route path="*" element={<Navigate to="/lecturer/dashboard" replace />} />
        </Route>

        <Route element={<StudentLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="materials" element={<MaterialsPage />} />
          <Route path="knowledge-hub" element={<KnowledgeHubPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="recordings" element={<RecordingsPage />} />
          <Route path="policy" element={<PolicyPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="help" element={<HelpDeskPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
