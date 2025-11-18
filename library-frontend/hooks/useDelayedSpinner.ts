// src/hooks/useDelayedSpinner.ts
import { useEffect, useRef, useState } from "react";

type Options = {
  delayBeforeShowMs?: number; // wait this long after load starts before showing spinner
  minVisibleMs?: number; // once shown, keep spinner visible at least this long
};


export default function useDelayedSpinner(isActive: boolean, isAppend: boolean) {
const delayBeforeShowMs = 300;
const minVisibleMs = 1500;

  const [showSpinner, setShowSpinner] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinnerShownAtRef = useRef<number | null>(null);

  useEffect(() => {
    // If a load started
    if (isActive) {
      // Only schedule spinner for append (scroll) loads
      if (!isAppend) return;

      // schedule show after delayBeforeShowMs
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
      }
      showTimerRef.current = setTimeout(() => {
        spinnerShownAtRef.current = Date.now();
        setShowSpinner(true);
        showTimerRef.current = null;
      }, delayBeforeShowMs);
      return;
    }

    // load finished -> either cancel scheduled show or ensure min visible duration
    // If spinner hasn't been shown yet but timer exists, cancel it
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
      setShowSpinner(false);
      spinnerShownAtRef.current = null;
      return;
    }

    // If spinner was shown, ensure it stays visible minVisibleMs
    if (spinnerShownAtRef.current) {
      const elapsed = Date.now() - spinnerShownAtRef.current;
      const remaining = Math.max(0, minVisibleMs - elapsed);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = setTimeout(() => {
        setShowSpinner(false);
        spinnerShownAtRef.current = null;
        hideTimerRef.current = null;
      }, remaining);
    } else {
      setShowSpinner(false);
    }

    return () => {
      // cleanup handled below as well
    };
  }, [isActive, isAppend, delayBeforeShowMs, minVisibleMs]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return showSpinner;
}
