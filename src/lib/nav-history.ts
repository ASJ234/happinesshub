// Remembers whether this tab has moved between pages inside the site, so a
// "Back" button knows the previous history entry is one of our pages (and
// not another site, or nothing when a shared link was opened directly).
// It lives in memory, so a full reload starts over, which errs on the safe side.

let inSiteNavigations = 0;

export function noteInSiteNavigation(): void {
  inSiteNavigations++;
}

export function cameFromInsideSite(): boolean {
  return inSiteNavigations > 0;
}
