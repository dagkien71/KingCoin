import useConfigApi from "@/hooks/useConfigApi";
import { useCallback } from "react";
import type { TourId } from "@/modules/onboarding/tour-types";

export function useCompleteTour() {
  const Api = useConfigApi();

  return useCallback(
    async (tourId: TourId) => {
      try {
        await Api.post(`/users/me/tours/${encodeURIComponent(tourId)}/complete`);
      } catch {
        /* guest or offline — localStorage fallback */
      }
    },
    [Api]
  );
}
