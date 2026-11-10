// Shared Tailwind class strings for form controls and buttons.

/** Text inputs, selects and textareas in compact forms and panels. */
export const inputClass =
  "w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

/** The roomier inputs on full-page forms (upload, subscription, payment). */
export const inputLargeClass =
  "w-full bg-surface-elevated border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50";

/** A full-width primary button that ends a form. */
export const submitButtonClass =
  "w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

/** Small outlined buttons, e.g. for picking photos. */
export const chipButtonClass =
  "inline-flex items-center gap-1.5 text-xs bg-surface-elevated hover:bg-primary/15 border border-border rounded-lg px-3 py-2 transition-colors disabled:opacity-50";

/** The round remove button placed over a photo. */
export const removeButtonClass =
  "w-7 h-7 rounded-full bg-black/70 text-red-400 flex items-center justify-center disabled:opacity-50";
