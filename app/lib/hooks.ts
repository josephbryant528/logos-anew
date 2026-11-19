'use client'

import { useSyncExternalStore } from "react";

// Theme lives on <html> (set before first paint by the script in layout.tsx),
// follows the system until the reader picks one, and is saved on this device.
export const THEME_KEY = "unveiled.theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";
export const themeListeners = new Set<() => void>();
export function applyTheme() {
  let saved: string | null = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch {}
  const dark = saved ? saved === "dark" : window.matchMedia(DARK_QUERY).matches;
  document.documentElement.classList.toggle("dark", dark);
  themeListeners.forEach(l => l());
}
export function setTheme(theme: "light" | "dark") {
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
  applyTheme();
}
export function subscribeTheme(onChange: () => void) {
  themeListeners.add(onChange);
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", applyTheme);
  return () => { themeListeners.delete(onChange); mq.removeEventListener("change", applyTheme); };
}
export function useDarkMode() {
  return useSyncExternalStore(subscribeTheme, () => document.documentElement.classList.contains("dark"), () => false);
}

// True on phone-sized screens. Starts false so the server and first client render match.
export const MOBILE_QUERY = "(max-width: 768px)";
export function subscribeMobile(onChange: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
export function useIsMobile() {
  return useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
}
