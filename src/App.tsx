import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { PlaybookProvider } from "./lib/playbook";
import { BrandLockup } from "./components/BrandLockup";
import { BrandSplash } from "./components/BrandSplash";
import { MapSideChrome } from "./components/MapSideChrome";
import { BookOpen, Crosshair, Dice, Gear } from "./components/icons";
import { MatchScreen } from "./screens/MatchScreen";
import { BookScreen } from "./screens/BookScreen";
import { RouletteScreen } from "./screens/RouletteScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { LiveScreen } from "./screens/LiveScreen";

function Shell() {
  const { loading, mode, supabaseReady, isPermanent } = useAuth();
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
    return <BrandSplash />;
  }

  const subtitle = !supabaseReady
    ? mode === "local"
      ? "Local demo"
      : "Guest"
    : isPermanent
      ? "Signed in"
      : "Guest";

  return (
    <PlaybookProvider>
      <div className="app-shell">
        <header className="topbar">
          <BrandLockup eyebrow={`CS2 · ${subtitle}`} />
          {showChrome && <MapSideChrome />}
        </header>
        <Routes>
          <Route path="/" element={<Navigate to="/match" replace />} />
          <Route path="/roulette" element={<RouletteScreen />} />
          <Route path="/match" element={<MatchScreen />} />
          <Route path="/playbook" element={<BookScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/match" replace />} />
        </Routes>
        <nav className="nav">
          <div className="nav-inner nav-inner-4">
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
            <NavLink
              to="/roulette"
              className={({ isActive }) => (isActive ? "active nav-meme" : "nav-meme")}
              title="Strat Roulette — memes only"
            >
              <Dice size={16} />
              <span>Roulette</span>
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
