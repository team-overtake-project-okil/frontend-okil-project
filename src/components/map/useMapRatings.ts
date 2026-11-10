// Оцінки гексагонів і вибраної ділянки, разом із вагами пріоритетів
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  buildAssessmentWeights,
  defaultTogglers,
  sameWeights,
  type AssessmentWeights,
  type TogglerState,
  type TogglerStates,
} from "../../lib/assessmentWeights";
import {
  getHexagonRatings,
  hexagonAssessmentOptions,
} from "../../lib/hexagonAssessment";
import { withIntegerRating } from "./hexagonRating";

export function useMapRatings(selectedHexId: string | null) {
  const [togglers, setTogglers] = useState(defaultTogglers);
  // null means the user has not applied weights yet, so the API defaults stay.
  const [appliedTogglers, setAppliedTogglers] = useState<TogglerStates | null>(
    null,
  );
  const assessmentWeights = useMemo(
    () =>
      appliedTogglers === null ? null : buildAssessmentWeights(appliedTogglers),
    [appliedTogglers],
  );
  const {
    data: hexagonsData = [],
    isLoading: isHexagonsLoading,
    isError: isHexagonsError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["hexagons", assessmentWeights],
    placeholderData: keepPreviousData,
    queryFn: async ({ queryKey, signal }) => {
      const weights = queryKey[1] as AssessmentWeights | null;
      const hexagons = await getHexagonRatings(weights, signal);
      return hexagons.map(withIntegerRating);
    },
  });
  const assessment = useQuery(
    hexagonAssessmentOptions(selectedHexId, assessmentWeights),
  );
  const dirty = !sameWeights(
    buildAssessmentWeights(togglers),
    assessmentWeights ?? buildAssessmentWeights(defaultTogglers()),
  );
  const updateToggler = (id: string, patch: Partial<TogglerState>) =>
    setTogglers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const handleApply = () => {
    const nextAppliedTogglers = { ...togglers };
    const nextWeights = buildAssessmentWeights(nextAppliedTogglers);
    const weightsUnchanged = sameWeights(assessmentWeights, nextWeights);

    setAppliedTogglers(nextAppliedTogglers);
    if (weightsUnchanged) {
      void refetch();
      if (selectedHexId) void assessment.refetch();
    }
  };

  return {
    hexagonsData,
    showSkeleton: isHexagonsLoading || (isHexagonsError && isFetching),
    isHexagonsError,
    isFetching,
    refetch,
    assessmentData: assessment.data,
    showAssessmentSkeleton:
      assessment.isLoading || (assessment.isError && assessment.isFetching),
    isAssessmentError: assessment.isError,
    assessmentError: assessment.error,
    refetchAssessment: assessment.refetch,
    assessmentWeights,
    togglers,
    dirty,
    updateToggler,
    handleApply,
    handleReset: () => setTogglers(defaultTogglers()),
  };
}
