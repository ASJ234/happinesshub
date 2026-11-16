"use client";

import { useCallback, useState } from "react";
import { ConfirmDialog, type ConfirmOptions } from "./ConfirmDialog";

/**
 * `ask(options)` opens a confirmation dialog; render `dialog` once in the
 * component. Example:
 *
 *   const { ask, dialog } = useConfirm();
 *   <button onClick={() => ask({ title: "Delete video?", action: remove })} />
 *   {dialog}
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const ask = useCallback((next: ConfirmOptions) => setOptions(next), []);
  const close = useCallback(() => setOptions(null), []);

  const dialog = options ? <ConfirmDialog {...options} onClose={close} /> : null;
  return { ask, dialog, isOpen: options !== null };
}
