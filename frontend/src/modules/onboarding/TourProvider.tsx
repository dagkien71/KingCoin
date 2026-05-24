"use client";

import useAuth from "@/hooks/useAuth";
import {
  isTourCompletedLocally,
  isTourSkippedThisSession,
  mergeCompletedTours,
} from "@/lib/tour-storage";
import TourWelcomeModal from "@/modules/onboarding/TourWelcomeModal";
import {
  PLATFORM_MAIN_TOUR_ID,
  type StartTourOptions,
  type TourId,
} from "@/modules/onboarding/tour-types";
import { useProductTour } from "@/modules/onboarding/useProductTour";
import { useRouter } from "next/router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type TourContextValue = {
  startTour: (tourId: TourId, options?: StartTourOptions) => void;
  isRunning: boolean;
};

const TourContext = createContext<TourContextValue | null>(null);

const EXCLUDED_PREFIXES = ["/admin", "/issuer", "/login", "/register"];

function isExcludedRoute(pathname: string) {
  return EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function TourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();
  const { startTour: runTour, isRunning, skipTourPrompt } = useProductTour();
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const promptedRef = useRef(false);

  const completedTours = useMemo(
    () => mergeCompletedTours([], user?.completedTours),
    [user?.completedTours]
  );

  const isPlatformTourDone = useCallback(() => {
    return (
      completedTours.includes(PLATFORM_MAIN_TOUR_ID) ||
      isTourCompletedLocally(PLATFORM_MAIN_TOUR_ID)
    );
  }, [completedTours]);

  const startTour = useCallback(
    (tourId: TourId, options?: StartTourOptions) => {
      setWelcomeOpen(false);
      void runTour(tourId, options);
    },
    [runTour]
  );

  useEffect(() => {
    if (!router.isReady || promptedRef.current || isRunning) return;
    if (isExcludedRoute(router.pathname)) return;
    if (isPlatformTourDone()) return;
    if (isTourSkippedThisSession()) return;

    promptedRef.current = true;
    const t = window.setTimeout(() => setWelcomeOpen(true), 1000);
    return () => window.clearTimeout(t);
  }, [router.isReady, router.pathname, isRunning, isPlatformTourDone]);

  const value = useMemo(
    () => ({ startTour, isRunning }),
    [startTour, isRunning]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      <TourWelcomeModal
        open={welcomeOpen}
        onStart={() => startTour(PLATFORM_MAIN_TOUR_ID, { force: true })}
        onLater={() => {
          skipTourPrompt();
          setWelcomeOpen(false);
        }}
      />
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within TourProvider");
  }
  return ctx;
}

export function useTourOptional() {
  return useContext(TourContext);
}
