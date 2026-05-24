"use client";

import useAuth from "@/hooks/useAuth";
import { useCompleteTour } from "@/lib/tour-api";
import {
  markTourCompletedLocally,
  markTourSkippedThisSession,
} from "@/lib/tour-storage";
import { platformMainTourMeta } from "@/modules/onboarding/tours/platform-main";
import type {
  StartTourOptions,
  TourId,
  TourStep,
} from "@/modules/onboarding/tour-types";
import { waitForElement } from "@/modules/onboarding/wait-for-element";
import { driver, type Driver } from "driver.js";
import { useRouter } from "next/router";
import { useCallback, useRef, useState } from "react";

const TOURS: Record<TourId, TourStep[]> = {
  "platform-main": platformMainTourMeta.steps,
};

function shouldNavigate(currentPath: string, targetRoute?: string): boolean {
  if (!targetRoute) return false;
  const targetPath = targetRoute.split("?")[0];
  if (currentPath === targetPath) return false;
  if (targetPath.startsWith("/trade") && currentPath.startsWith("/trade")) {
    return false;
  }
  if (targetPath.startsWith("/futures") && currentPath.startsWith("/futures")) {
    return false;
  }
  return true;
}

function progressLabel(index: number, total: number) {
  return `${index + 1} / ${total}`;
}

export function useProductTour() {
  const router = useRouter();
  const { updateUserInfo } = useAuth();
  const completeTourApi = useCompleteTour();
  const driverRef = useRef<Driver | null>(null);
  const runningRef = useRef(false);
  const stepIndexRef = useRef(0);
  const tourIdRef = useRef<TourId>("platform-main");
  const stepsRef = useRef<TourStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const destroyDriver = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = null;
  }, []);

  const finishTour = useCallback(
    async (completed: boolean) => {
      runningRef.current = false;
      setIsRunning(false);
      destroyDriver();
      window.dispatchEvent(new CustomEvent("kc-tour-close-mobile-nav"));
      if (completed) {
        const id = tourIdRef.current;
        markTourCompletedLocally(id);
        await completeTourApi(id);
        void updateUserInfo();
      }
    },
    [completeTourApi, destroyDriver, updateUserInfo]
  );

  const showStep = useCallback(
    async (index: number) => {
      if (!runningRef.current) return;
      const steps = stepsRef.current;
      const step = steps[index];
      if (!step) return;

      stepIndexRef.current = index;
      destroyDriver();

      if (step.beforeShow) {
        await step.beforeShow();
      }

      if (shouldNavigate(router.pathname, step.route)) {
        await router.push(step.route!);
      }

      let element: Element | undefined;
      if (step.target) {
        const found = await waitForElement(step.target);
        element = found ?? undefined;
      }

      const isFirst = index === 0;
      const isLast = index === steps.length - 1;
      const total = steps.length;

      const drv = driver({
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.68,
        popoverClass: "kc-tour-popover",
        disableActiveInteraction: true,
        showProgress: true,
        progressText: progressLabel(index, total),
        nextBtnText: isLast ? "Hoàn tất" : "Tiếp theo",
        prevBtnText: "Quay lại",
        doneBtnText: "Hoàn tất",
        showButtons: isFirst
          ? ["next", "close"]
          : isLast
            ? ["previous", "next", "close"]
            : ["previous", "next", "close"],
        onCloseClick: () => {
          void finishTour(false);
        },
        onNextClick: () => {
          if (isLast) {
            void finishTour(true);
          } else {
            void showStep(index + 1);
          }
        },
        onPrevClick: () => {
          if (index > 0) void showStep(index - 1);
        },
      });

      driverRef.current = drv;

      drv.highlight({
        element: element as HTMLElement | undefined,
        popover: {
          title: step.title,
          description: step.description,
          side: step.side ?? (element ? "bottom" : "over"),
          showProgress: true,
          progressText: progressLabel(index, total),
          nextBtnText: isLast ? "Hoàn tất" : "Tiếp theo",
          doneBtnText: "Hoàn tất",
          onNextClick: () => {
            if (isLast) {
              void finishTour(true);
            } else {
              void showStep(index + 1);
            }
          },
          onPrevClick: () => {
            if (index > 0) void showStep(index - 1);
          },
          onCloseClick: () => {
            void finishTour(false);
          },
        },
      });
    },
    [destroyDriver, finishTour, router]
  );

  const startTour = useCallback(
    async (tourId: TourId, options?: StartTourOptions) => {
      const steps = TOURS[tourId];
      if (!steps?.length) return;

      tourIdRef.current = tourId;
      stepsRef.current = steps;
      runningRef.current = true;
      setIsRunning(true);

      const from = options?.fromStep ?? 0;
      await showStep(from);
    },
    [showStep]
  );

  const skipTourPrompt = useCallback(() => {
    markTourSkippedThisSession();
  }, []);

  const stopTour = useCallback(() => {
    void finishTour(false);
  }, [finishTour]);

  return {
    isRunning,
    startTour,
    stopTour,
    skipTourPrompt,
  };
}
