import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ClubList from "./pages/ClubList";
import ClubDetail from "./pages/ClubDetail";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted center">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="top-nav">
      <a href="/" className="brand">
        ClubSync
      </a>
      <div className="top-nav-right">
        <span className="muted">Hi, {user.first_name || user.username}</span>
        <button className="link-button" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <TopNav />
      <main className="app-main">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ClubList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clubs/:clubId"
            element={
              <ProtectedRoute>
                <ClubDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </>
  );
}
