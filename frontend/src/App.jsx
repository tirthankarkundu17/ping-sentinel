import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/AppShell";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import MonitorsPage from "./pages/MonitorsPage";
import MonitorDetailsPage from "./pages/MonitorDetailsPage";

function ProtectedScreen({ children }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedScreen>
            <DashboardPage />
          </ProtectedScreen>
        }
      />
      <Route
        path="/monitors"
        element={
          <ProtectedScreen>
            <MonitorsPage />
          </ProtectedScreen>
        }
      />
      <Route
        path="/monitors/:id"
        element={
          <ProtectedScreen>
            <MonitorDetailsPage />
          </ProtectedScreen>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
