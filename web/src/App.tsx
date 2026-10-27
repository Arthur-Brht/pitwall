import { ComparisonView } from "@/components/pitwall/comparison-view";
import { HistoryView } from "@/components/pitwall/history-view";
import { OverviewView } from "@/components/pitwall/overview-view";
import { PlannerView } from "@/components/pitwall/planner-view";
import { Sidebar } from "@/components/pitwall/sidebar";
import { WorkspaceDialogs } from "@/components/pitwall/workspace-dialogs";
import {
  Topbar,
  WorkspaceHeading,
} from "@/components/pitwall/workspace-heading";
import { PitwallProvider, usePitwall } from "@/lib/pitwall-context";
import { ArrowRight } from "lucide-react";
function Workspace() {
  const { view, setView } = usePitwall();
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="workspace">
        <Topbar />
        <div className="main-content">
          <WorkspaceHeading />
          {view === "overview" && <OverviewView />}
          {view === "comparison" && <ComparisonView />}
          {view === "planner" && <PlannerView />}
          {view === "history" && <HistoryView />}{" "}
          <footer className="footer">
            <span className="footer-brand">
              <span className="tiny-dot lime" />
              PITWALL{" "}
              <small>Weather intelligence for your time on track.</small>
            </span>
            <span>
              Forecasts ≠ trackside measurements{" "}
              <span className="dot-separator">/</span>
              <button onClick={() => setView("history")}>
                Sources & methodology <ArrowRight size={12} />
              </button>
            </span>
          </footer>
          <p className="data-credit">
            Weather data by{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{" "}
            and{" "}
            <a href="https://www.met.no/en" target="_blank" rel="noreferrer">
              MET Norway
            </a>{" "}
            ·{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>{" "}
            · normalized by Pitwall ·{" "}
            <a href="/THIRD_PARTY_NOTICES.txt" target="_blank" rel="noreferrer">
              Library notices
            </a>
          </p>
        </div>
      </main>
      <WorkspaceDialogs />
    </div>
  );
}
export default function Pitwall() {
  return (
    <PitwallProvider>
      <Workspace />
    </PitwallProvider>
  );
}
