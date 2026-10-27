import { useEffect } from "react";

/** Keep keyboard focus in the visible modal and restore its opener on close. */
export function useModalFocus(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const dialog = [
      ...document.querySelectorAll<HTMLElement>(
        '[role="dialog"][aria-modal="true"]',
      ),
    ].at(-1);
    if (!dialog) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    const surfaces = [
      ...document.querySelectorAll<HTMLElement>(".workspace, .sidebar"),
    ];
    const priorInert = surfaces.map((element) => element.inert);
    surfaces.forEach((element) => {
      element.inert = true;
    });
    document.body.style.overflow = "hidden";
    const focusable = () =>
      [
        ...dialog.querySelectorAll<HTMLElement>(
          "button, a[href], input, select, textarea, [tabindex]",
        ),
      ].filter(
        (element) =>
          element.tabIndex >= 0 &&
          !element.hasAttribute("disabled") &&
          element.getClientRects().length > 0,
      );
    const focusFirst = () => (focusable()[0] ?? dialog).focus();
    if (!dialog.contains(document.activeElement)) focusFirst();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = focusable(),
        first = elements[0],
        last = elements.at(-1);
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !dialog.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      surfaces.forEach((element, i) => {
        element.inert = priorInert[i];
      });
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);
}
