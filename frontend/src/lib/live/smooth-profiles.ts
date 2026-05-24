import {
  SMOOTH_TAU_CHART_MS,
  SMOOTH_TAU_NAV_MS,
  SMOOTH_TAU_UI_MS,
} from "@/constants/live-display";

export type SmoothProfile = "ui" | "chart" | "nav";

export const SMOOTH_PROFILES: SmoothProfile[] = ["ui", "chart", "nav"];

export function smoothTauMs(profile: SmoothProfile): number {
  switch (profile) {
    case "chart":
      return SMOOTH_TAU_CHART_MS;
    case "nav":
      return SMOOTH_TAU_NAV_MS;
    default:
      return SMOOTH_TAU_UI_MS;
  }
}

export function allSmoothTauMs(): Record<SmoothProfile, number> {
  return {
    ui: SMOOTH_TAU_UI_MS,
    chart: SMOOTH_TAU_CHART_MS,
    nav: SMOOTH_TAU_NAV_MS,
  };
}
