import { InstallApp } from "@/components/pitwall/install-app";
import { usePitwall } from "@/lib/pitwall-context";
import { version } from "../../../../package.json";
import { ChevronRight, Compass, Plus, SlidersHorizontal } from "lucide-react";

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
          <span className="brand-mark">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <span>
            Pitwall<span className="brand-period">.</span>
            <small>RACE WEATHER</small>
          </span>
        </a>
        <div className="workspace-label">
          <span className="tiny-dot lime" /> YOUR WEATHER DESK
        </div>
        <div className="sidebar-heading">
          MY CIRCUITS{" "}
          <span>{favorites.length.toString().padStart(2, "0")}</span>
        </div>
        <div className="circuit-list">
          {favorites.map((f, i) => (
            <button
              key={f.id}
              className={`circuit-item ${f.id === track.id ? "active" : ""}`}
              onClick={() => choose(f)}
            >
              <span className="circuit-number">
                {(i + 1).toString().padStart(2, "0")}
              </span>
              <span>
                <strong>{f.name}</strong>
                <small>{f.country}</small>
              </span>
              {f.id === track.id ? (
                <span className="selected-point" />
              ) : (
                <ChevronRight size={12} />
              )}
            </button>
          ))}
        </div>
        <button
          className="add-circuit"
          onClick={(event) => {
            event.currentTarget.focus();
            setCoordinateMode(false);
            setSearchOpen(true);
          }}
        >
          <Plus size={15} /> Add a circuit or location
        </button>
        <div className="sidebar-bottom">
          <InstallApp pwa={pwa} />
          <div className="sidebar-note">
            <Compass size={19} />
            <strong>
              One circuit.
              <br />
              Every perspective.
            </strong>
            <p>
              Compare the forecast.
              <br />
              Understand the uncertainty.
            </p>
          </div>
          <button
            className="sidebar-settings"
            onClick={(event) => {
              event.currentTarget.focus();
              setSettings(true);
            }}
          >
            <SlidersHorizontal size={15} /> Weather preferences{" "}
            <ChevronRight size={12} />
          </button>
          <span className="version">
            PITWALL / V{version} <span>LOCAL WORKSPACE</span>
          </span>
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
