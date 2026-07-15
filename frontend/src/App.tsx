import { Navigate, Route, Routes } from 'react-router-dom';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPage from './pages/AdminPage';
import AdminTestsPage from './pages/AdminTestsPage';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ProfilePage from './pages/ProfilePage';
import Register from './pages/Register';
import TreesPage from './pages/TreesPage';
import UserProfilePage from './pages/UserProfilePage';
import VerifyEmailPage from './pages/VerifyEmailPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <TreesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route
        path="/app/admin/tests"
        element={
          <AdminRoute>
            <AdminTestsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/app/users/:username"
        element={
          <ProtectedRoute>
            <UserProfilePage />
          </ProtectedRoute>
        }
      />
      {/* Cualquier otra ruta vuelve a la landing. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
