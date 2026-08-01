import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { PlaybookProvider } from "./lib/playbook";
import { LobbyScreen } from "./screens/LobbyScreen";
import { MatchScreen } from "./screens/MatchScreen";
import { BookScreen } from "./screens/BookScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

function Shell() {
  const { loading, mode, user, supabaseReady } = useAuth();

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
            Playbook
          </p>
        </header>
        <Routes>
          <Route path="/" element={<Navigate to="/lobby" replace />} />
          <Route path="/lobby" element={<LobbyScreen />} />
          <Route path="/match" element={<MatchScreen />} />
          <Route path="/book" element={<BookScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/lobby" replace />} />
        </Routes>
        <nav className="nav">
          <div className="nav-inner">
            <NavLink to="/lobby" className={({ isActive }) => (isActive ? "active" : "")}>
              Packs
            </NavLink>
            <NavLink to="/match" className={({ isActive }) => (isActive ? "active" : "")}>
              Match
            </NavLink>
            <NavLink to="/book" className={({ isActive }) => (isActive ? "active" : "")}>
              Book
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
              Settings
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
