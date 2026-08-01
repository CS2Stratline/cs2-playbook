import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { PlaybookProvider } from "./lib/playbook";
import { MapSideChrome } from "./components/MapSideChrome";
import { BookOpen, Crosshair, Gear } from "./components/icons";
import { MatchScreen } from "./screens/MatchScreen";
import { BookScreen } from "./screens/BookScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { LiveScreen } from "./screens/LiveScreen";

function Shell() {
  const { loading, mode, user, supabaseReady } = useAuth();
  const location = useLocation();
  const isLive = location.pathname.startsWith("/live");
  const showChrome = !isLive && !location.pathname.startsWith("/settings");

  if (isLive) {
    return (
      <Routes>
        <Route path="/live/:token" element={<LiveScreen />} />
      </Routes>
    );
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="empty">LOADING…</div>
      </div>
    );
  }

  const subtitle = user
    ? "Cloud"
    : supabaseReady
      ? "Guest · local"
      : mode === "local"
        ? "Local demo"
        : "Guest";

  return (
    <PlaybookProvider>
      <div className="app-shell">
        <header className="topbar">
          <p className="brand">
            <span>CS2 · {subtitle}</span>
            <span className="brand-mark">Playbook</span>
          </p>
          {showChrome && <MapSideChrome />}
        </header>
        <Routes>
          <Route path="/" element={<Navigate to="/match" replace />} />
          <Route path="/lobby" element={<Navigate to="/playbook" replace />} />
          <Route path="/book" element={<Navigate to="/playbook" replace />} />
          <Route path="/match" element={<MatchScreen />} />
          <Route path="/playbook" element={<BookScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/match" replace />} />
        </Routes>
        <nav className="nav">
          <div className="nav-inner">
            <NavLink to="/match" className={({ isActive }) => (isActive ? "active" : "")}>
              <Crosshair size={16} />
              <span>Match</span>
            </NavLink>
            <NavLink to="/playbook" className={({ isActive }) => (isActive ? "active" : "")}>
              <BookOpen size={16} />
              <span>Playbook</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
              <Gear size={16} />
              <span>Settings</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </PlaybookProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
