"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const CROSS_TAB_ACTIVITY_KEY = "bo_last_activity_at";

interface IdleTimeoutOptions {
  enabled?: boolean;
  idleTimeoutMinutes?: number;
  warningSeconds?: number;
  onTimeout?: () => void;
  onExtend?: () => Promise<boolean | void> | boolean | void;
}

export function useIdleTimeout({
  enabled = true,
  idleTimeoutMinutes = 30,
  warningSeconds = 60,
  onTimeout,
  onExtend,
}: IdleTimeoutOptions = {}) {
  const safeIdleMinutes = Math.max(1, Number(idleTimeoutMinutes) || 30);
  const effectiveWarningSeconds = Math.min(
    Math.max(10, Number(warningSeconds) || 60),
    Math.max(10, safeIdleMinutes * 60 - 5),
  );

  const [isWarning, setIsWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(effectiveWarningSeconds);
  const lastActivityRef = useRef<number>(Date.now());
  const isWarningRef = useRef<boolean>(false);
  const timedOutRef = useRef<boolean>(false);
  const onTimeoutRef = useRef(onTimeout);
  const onExtendRef = useRef(onExtend);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    onExtendRef.current = onExtend;
  }, [onExtend]);

  useEffect(() => {
    isWarningRef.current = isWarning;
  }, [isWarning]);

  // Reset activity when enabled turns on
  useEffect(() => {
    if (enabled) {
      const now = Date.now();
      lastActivityRef.current = now;
      timedOutRef.current = false;
      setIsWarning(false);
      setSecondsRemaining(effectiveWarningSeconds);
      try {
        localStorage.setItem(CROSS_TAB_ACTIVITY_KEY, String(now));
      } catch {}
    }
  }, [enabled, effectiveWarningSeconds]);

  const resetActivity = useCallback(async () => {
    const now = Date.now();
    lastActivityRef.current = now;
    timedOutRef.current = false;
    isWarningRef.current = false;
    setIsWarning(false);
    setSecondsRemaining(effectiveWarningSeconds);
    try {
      localStorage.setItem(CROSS_TAB_ACTIVITY_KEY, String(now));
    } catch {}
    if (onExtendRef.current) {
      await onExtendRef.current();
    }
  }, [effectiveWarningSeconds]);

  // Throttled user activity listener + cross-tab storage sync (no re-renders during normal activity)
  useEffect(() => {
    if (!enabled) return;

    let lastRecorded = 0;
    const handleUserActivity = () => {
      if (isWarningRef.current || timedOutRef.current) return;
      const now = Date.now();
      if (now - lastRecorded > 1500) {
        lastRecorded = now;
        lastActivityRef.current = now;
        try {
          localStorage.setItem(CROSS_TAB_ACTIVITY_KEY, String(now));
        } catch {}
      }
    };

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === CROSS_TAB_ACTIVITY_KEY && e.newValue) {
        const ts = Number(e.newValue);
        if (Number.isFinite(ts) && ts > lastActivityRef.current) {
          lastActivityRef.current = ts;
          if (isWarningRef.current) {
            isWarningRef.current = false;
            setIsWarning(false);
            setSecondsRemaining(effectiveWarningSeconds);
          }
        }
      }
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));
    window.addEventListener("storage", handleStorageSync);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      window.removeEventListener("storage", handleStorageSync);
    };
  }, [enabled, effectiveWarningSeconds]);

  // Periodic 1-second check
  useEffect(() => {
    if (!enabled) return;

    const idleTimeoutMs = safeIdleMinutes * 60 * 1000;
    const warningThresholdMs = idleTimeoutMs - effectiveWarningSeconds * 1000;

    const timer = setInterval(() => {
      if (timedOutRef.current) return;
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= idleTimeoutMs) {
        timedOutRef.current = true;
        clearInterval(timer);
        if (onTimeoutRef.current) {
          onTimeoutRef.current();
        }
      } else if (elapsed >= warningThresholdMs) {
        if (!isWarningRef.current) {
          isWarningRef.current = true;
          setIsWarning(true);
        }
        const rem = Math.max(0, Math.ceil((idleTimeoutMs - elapsed) / 1000));
        setSecondsRemaining(rem);
      } else if (isWarningRef.current) {
        isWarningRef.current = false;
        setIsWarning(false);
        setSecondsRemaining(effectiveWarningSeconds);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [enabled, safeIdleMinutes, effectiveWarningSeconds]);

  return {
    isWarning,
    secondsRemaining,
    resetActivity,
  };
}
