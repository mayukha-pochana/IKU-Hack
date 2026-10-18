// OWNER: Member 2 - seamless page changes with the browser's View Transitions API (Chrome, Edge, Safari 18+).
// The old page dissolves into the new one while the logo, sidebar and tab bar stay put (see globals.css).
// Each page renders its own DashboardLayout, so the "new page is ready" signal lives here at module level.
// Browsers without the API, or with reduced motion on, just navigate (the page still fades in).
type Router = { push: (href: string) => void };
type Doc = Document & { startViewTransition?: (cb: () => Promise<void>) => unknown };

let pending: (() => void) | null = null;

export const supportsViewTransitions = () => typeof document !== "undefined" && "startViewTransition" in document;

export function navigate(router: Router, href: string) {
  const doc = document as Doc;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced) { router.push(href); return; }
  let started = false;
  const t = doc.startViewTransition(() => new Promise<void>((resolve) => {
    started = true;
    pending = resolve;
    router.push(href);
    window.setTimeout(() => { if (pending === resolve) { pending = null; resolve(); } }, 1500); // never hang
  })) as { skipTransition?: () => void };
  // If the browser can't start it (e.g. the tab isn't painting), skip it and navigate normally.
  window.setTimeout(() => { if (!started) { t.skipTransition?.(); router.push(href); } }, 300);
}

/** Call once the new page has mounted: the browser then plays the transition. */
export function pageReady() { const r = pending; pending = null; r?.(); }

/** onClick for a Next <Link>: keeps cmd/ctrl-click, middle-click and same-page clicks working normally. */
export function transitionClick(router: Router, href: string, current: string) {
  return (e: React.MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || href === current) return;
    e.preventDefault();
    navigate(router, href);
  };
}
