import { createContext, useContext, type ReactNode } from "react";
import { usePitwallState } from "./use-pitwall-state";
const PitwallContext = createContext<ReturnType<typeof usePitwallState> | null>(
  null,
);
export function PitwallProvider({ children }: { children: ReactNode }) {
  const state = usePitwallState();
  return (
    <PitwallContext.Provider value={state}>{children}</PitwallContext.Provider>
  );
}
export function usePitwall() {
  const state = useContext(PitwallContext);
  if (!state) throw Error("Pitwall components need a workspace provider.");
  return state;
}
