"use client";

import { create } from "zustand";

type CommandAction = "open" | "close" | "toggle";
type NotificationsAction = "open" | "close" | "toggle";
export type ThemeMode = "dark" | "light";
export type LocaleMode = "en" | "ar";

interface UiStore {
  commandOpen: boolean;
  notificationsOpen: boolean;
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  locale: LocaleMode;
  setCommand: (action: CommandAction) => void;
  setNotifications: (action: NotificationsAction) => void;
  toggleSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLocale: (locale: LocaleMode) => void;
  toggleLocale: () => void;
}

function resolveState(current: boolean, action: "open" | "close" | "toggle") {
  if (action === "open") return true;
  if (action === "close") return false;

  return !current;
}

export const useUiStore = create<UiStore>((set) => ({
  commandOpen: false,
  notificationsOpen: false,
  sidebarCollapsed: false,
  theme: "dark",
  locale: "en",
  setCommand: (action) => set((state) => ({ commandOpen: resolveState(state.commandOpen, action) })),
  setNotifications: (action) =>
    set((state) => ({ notificationsOpen: resolveState(state.notificationsOpen, action) })),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
  setLocale: (locale) => set({ locale }),
  toggleLocale: () => set((state) => ({ locale: state.locale === "en" ? "ar" : "en" })),
}));
