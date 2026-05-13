"use client";

import { useCallback } from "react";

type PersistTarget = "localStorage" | "sessionStorage" | "none";

interface UseTabNavigationOptions<T extends string = string> {
  onTabChange?: (tab: T) => void;
  persistTo?: PersistTarget;
  persistKey?: string;
}

interface UseTabNavigationReturn<T extends string = string> {
  saveTabPreference: (tab: T) => void;
}

export function useTabNavigation<T extends string = string>({
  onTabChange,
  persistTo = "none",
  persistKey = "active-tab",
}: UseTabNavigationOptions<T>): UseTabNavigationReturn<T> {
  const saveTabPreference = useCallback(
    (tab: T) => {
      if (persistTo === "localStorage") {
        localStorage.setItem(persistKey, tab);
      } else if (persistTo === "sessionStorage") {
        sessionStorage.setItem(persistKey, tab);
      }

      if (onTabChange) {
        onTabChange(tab);
      }
    },
    [onTabChange, persistTo, persistKey]
  );

  return { saveTabPreference };
}
