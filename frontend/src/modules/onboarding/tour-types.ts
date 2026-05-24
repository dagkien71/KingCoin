import type { Side } from "driver.js";

export const PLATFORM_MAIN_TOUR_ID = "platform-main";

export type TourId = typeof PLATFORM_MAIN_TOUR_ID;

export type TourStep = {
  id: string;
  /** CSS selector, e.g. `[data-tour="header-search"]` */
  target?: string;
  /** Navigate before highlighting */
  route?: string;
  title: string;
  description: string;
  side?: Side;
  /** Run before highlight (open mobile menu, etc.) */
  beforeShow?: () => void | Promise<void>;
};

export type StartTourOptions = {
  force?: boolean;
  fromStep?: number;
};
