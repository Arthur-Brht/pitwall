import { InstallApp } from "@/components/pitwall/install-app";
import { usePitwall } from "@/lib/pitwall-context";
import { Plus, Settings2 } from "lucide-react";

export function Sidebar() {
  const {
    pwa,
    setView,
    track,
    favorites,
    setSettings,
    setSearchOpen,
    setCoordinateMode,
    mobileNav,
    setMobileNav,
    choose,
  } = usePitwall();
  return (
    <>
      <aside
        id="saved-circuits"
        className={`sidebar ${mobileNav ? "open" : ""}`}
      >
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("overview");
          }}
        >
          <span className="brand-mark" aria-hidden="true" />
          Pitwall
        </a>
        <div className="sidebar-heading">Circuits</div>
        <nav className="circuit-list" aria-label="Saved circuits">
          {favorites.map((f) => (
            <button
              key={f.id}
              className={`circuit-item ${f.id === track.id ? "active" : ""}`}
              aria-current={f.id === track.id ? "true" : undefined}
              onClick={() => choose(f)}
            >
              <strong>{f.name}</strong>
              <small>{f.country}</small>
            </button>
          ))}
        </nav>
        <button
          className="add-circuit"
          aria-label="Add a circuit or location"
          onClick={(event) => {
            event.currentTarget.focus();
            setCoordinateMode(false);
            setSearchOpen(true);
          }}
        >
          <Plus size={15} /> Add location
        </button>
        <div className="sidebar-bottom">
          <InstallApp pwa={pwa} />
          <button
            className="sidebar-settings"
            onClick={(event) => {
              event.currentTarget.focus();
              setSettings(true);
            }}
          >
            <Settings2 size={15} /> Weather preferences
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="sidebar-scrim"
          aria-label="Close circuits"
          onClick={() => setMobileNav(false)}
        />
      )}
    </>
  );
}
