"use client";

import { useEffect } from "react";

/**
 * Marketing UI expects the `dark` class on the root element.
 * Follow system preference while this page is mounted; restore on leave.
 */
export default function ThemeSync() {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const previous = root.classList.contains("dark");

    const apply = () => {
      root.classList.toggle("dark", media.matches);
    };

    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      root.classList.toggle("dark", previous);
    };
  }, []);

  return null;
}
