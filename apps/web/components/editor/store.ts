"use client";
import { useCallback, useReducer, useRef } from "react";

interface H<T> { past: T[]; present: T | null; future: T[]; base: T | null }
const LIMIT = 120;

/**
 * Undo/redo history kept in a ref (no side effects inside React updaters, so StrictMode double-invocation can't corrupt it).
 * `commit` records one step; `live` updates without recording (drags, typing) and `endLive` records the whole gesture as one step.
 */
export function useHistory<T>() {
  const h = useRef<H<T>>({ past: [], present: null, future: [], base: null });
  const [, force] = useReducer((x: number) => x + 1, 0);
  const commit = useCallback((fn: (d: T) => T) => {
    const s = h.current; if (!s.present) return;
    if (s.base) { s.past = [...s.past.slice(-LIMIT), s.base]; s.base = null; } // close any open gesture first
    const next = fn(s.present); if (next === s.present) { force(); return; }
    s.past = [...s.past.slice(-LIMIT), s.present]; s.present = next; s.future = []; force();
  }, []);
  const live = useCallback((fn: (d: T) => T) => {
    const s = h.current; if (!s.present) return;
    const next = fn(s.present); if (next === s.present) return;
    if (!s.base) s.base = s.present;
    s.present = next; force();
  }, []);
  const endLive = useCallback(() => {
    const s = h.current, b = s.base; s.base = null;
    if (b && s.present && b !== s.present) { s.past = [...s.past.slice(-LIMIT), b]; s.future = []; }
    force();
  }, []);
  /** Drop an in-progress gesture without recording it. */
  const cancelLive = useCallback(() => { const s = h.current; if (s.base) { s.present = s.base; s.base = null; } force(); }, []);
  const undo = useCallback(() => {
    const s = h.current; if (s.base) { s.past = [...s.past, s.base]; s.base = null; }
    if (!s.past.length || !s.present) { force(); return; }
    s.future = [s.present, ...s.future]; s.present = s.past[s.past.length - 1]; s.past = s.past.slice(0, -1); force();
  }, []);
  const redo = useCallback(() => {
    const s = h.current; if (!s.future.length || !s.present) return;
    s.past = [...s.past, s.present]; s.present = s.future[0]; s.future = s.future.slice(1); force();
  }, []);
  const reset = useCallback((d: T | null) => { h.current = { past: [], present: d, future: [], base: null }; force(); }, []);
  const s = h.current;
  return { doc: s.present, canUndo: s.past.length > 0 || s.base !== null, canRedo: s.future.length > 0, commit, live, endLive, cancelLive, undo, redo, reset };
}
