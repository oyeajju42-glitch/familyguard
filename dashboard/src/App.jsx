import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardHome from "./pages/DashboardHome";
import LiveLocationPage from "./pages/LiveLocationPage";
import ScreenTimePage from "./pages/ScreenTimePage";
import InstalledAppsPage from "./pages/InstalledAppsPage";
import SmsLogsPage from "./pages/SmsLogsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ActivityFeedPage from "./pages/ActivityFeedPage";
import CommandsPage from "./pages/CommandsPage";

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="location" element={<LiveLocationPage />} />
        <Route path="screen-time" element={<ScreenTimePage />} />
        <Route path="installed-apps" element={<InstalledAppsPage />} />
        <Route path="sms" element={<SmsLogsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="activity" element={<ActivityFeedPage />} />
        <Route path="commands" element={<CommandsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
