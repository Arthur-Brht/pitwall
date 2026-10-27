import { ComparisonView } from "@/components/pitwall/comparison-view";
import { HistoryView } from "@/components/pitwall/history-view";
import { OverviewView } from "@/components/pitwall/overview-view";
import { PlannerView } from "@/components/pitwall/planner-view";
import { Sidebar } from "@/components/pitwall/sidebar";
import { WorkspaceDialogs } from "@/components/pitwall/workspace-dialogs";
import { WorkspaceHeading } from "@/components/pitwall/workspace-heading";
import { PitwallProvider, usePitwall } from "@/lib/pitwall-context";
function Workspace() {
  const { view } = usePitwall();
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="workspace">
        <div className="main-content">
          <WorkspaceHeading />
          {view === "overview" && <OverviewView />}
          {view === "comparison" && <ComparisonView />}
          {view === "planner" && <PlannerView />}
          {view === "history" && <HistoryView />}
          <footer className="footer">
            Forecasts, not trackside measurements. Weather data by{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{" "}
            and{" "}
            <a href="https://www.met.no/en" target="_blank" rel="noreferrer">
              MET Norway
            </a>{" "}
            (
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>
            ), radar by RainViewer.{" "}
            <a href="/THIRD_PARTY_NOTICES.txt" target="_blank" rel="noreferrer">
              Library notices
            </a>
          </footer>
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
