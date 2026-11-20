import { useEffect } from "react";

/**
 * Asks the browser to confirm before the tab is closed or reloaded while
 * `active`. A video upload stopped halfway leaves a video Bunny never gets,
 * and it can't be resumed into the same video later.
 */
export function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Older browsers only show the prompt when returnValue is set.
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}
