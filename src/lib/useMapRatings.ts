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
} from "./assessmentWeights";
import {
  getHexagonRatings,
  hexagonAssessmentOptions,
} from "./hexagonAssessment";
import {
  defaultAnchors,
  sameAnchors,
  validAnchors,
  type MobilityAnchor,
} from "./mobilityAnchors";
import { withIntegerRating } from "./hexagonRating";
import { mobilityPresets, presetAnchors } from "./mobilityPresets";

export function useMapRatings(selectedHexId: string | null) {
  const [anchors, setAnchors] = useState(defaultAnchors);
  const [appliedAnchors, setAppliedAnchors] = useState(defaultAnchors);
  const [personalRoutesEnabled, setPersonalRoutesEnabled] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const selectedPreset = mobilityPresets.find(
    (preset) => preset.id === selectedPresetId,
  );
  const [appliedRoutesEnabled, setAppliedRoutesEnabled] = useState(false);
  const activeAnchors = useMemo(
    () => (appliedRoutesEnabled ? appliedAnchors : []),
    [appliedRoutesEnabled, appliedAnchors],
  );
  const anchorsDirty =
    personalRoutesEnabled !== appliedRoutesEnabled ||
    (personalRoutesEnabled && !sameAnchors(anchors, appliedAnchors));
  const [togglers, setTogglers] = useState(defaultTogglers);
  // Keep draft priorities separate from the values used by the map.
  const [appliedTogglers, setAppliedTogglers] = useState<TogglerStates | null>(
    null,
  );
  const assessmentWeights = useMemo(
    () => ({
      ...buildAssessmentWeights(appliedTogglers ?? defaultTogglers()),
      ...(!appliedRoutesEnabled ? { weight_mobility: 0 } : {}),
    }),
    [appliedTogglers, appliedRoutesEnabled],
  );
  const {
    data: hexagonsData = [],
    isLoading: isHexagonsLoading,
    isError: isHexagonsError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["hexagons", assessmentWeights, activeAnchors],
    placeholderData: keepPreviousData,
    queryFn: async ({ queryKey, signal }) => {
      const weights = queryKey[1] as AssessmentWeights | null;
      const hexagons = await getHexagonRatings(weights, signal, activeAnchors);
      return hexagons.map(withIntegerRating);
    },
  });
  const assessment = useQuery(
    hexagonAssessmentOptions(selectedHexId, assessmentWeights, activeAnchors),
  );
  const dirty =
    anchorsDirty ||
    !sameWeights(
      buildAssessmentWeights(togglers),
      buildAssessmentWeights(appliedTogglers ?? defaultTogglers()),
    );
  const updateToggler = (id: string, patch: Partial<TogglerState>) =>
    setTogglers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const handleApply = () => {
    if (personalRoutesEnabled && !validAnchors(anchors)) return;
    setAppliedAnchors(anchors.map((point) => ({ ...point })));
    setAppliedRoutesEnabled(personalRoutesEnabled);
    const nextAppliedTogglers = { ...togglers };
    const nextWeights = {
      ...buildAssessmentWeights(nextAppliedTogglers),
      ...(!personalRoutesEnabled ? { weight_mobility: 0 } : {}),
    };
    const weightsUnchanged = sameWeights(assessmentWeights, nextWeights);

    setAppliedTogglers(nextAppliedTogglers);
    if (weightsUnchanged && !anchorsDirty) {
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
    anchors,
    appliedAnchors: activeAnchors,
    personalRoutesEnabled,
    appliedRoutesEnabled,
    setPersonalRoutesEnabled,
    selectedPresetId,
    presetModified: Boolean(
      selectedPreset && !sameAnchors(anchors, presetAnchors(selectedPreset)),
    ),
    selectPreset: (id: string) => {
      if (id === "custom") {
        setSelectedPresetId(id);
        return;
      }
      const preset = mobilityPresets.find((item) => item.id === id);
      if (!preset) return;
      setAnchors(presetAnchors(preset));
      setSelectedPresetId(id);
    },
    canApply: !personalRoutesEnabled || validAnchors(anchors),
    saveAnchor: (point: MobilityAnchor) =>
      setAnchors((prev) => {
        if (prev.some((item) => item.id === point.id))
          return prev.map((item) => (item.id === point.id ? point : item));
        return prev.length < 5 ? [...prev, point] : prev;
      }),
    removeAnchor: (id: string) =>
      setAnchors((prev) => prev.filter((point) => point.id !== id)),
    togglers,
    dirty,
    updateToggler,
    handleApply,
    handleReset: () => {
      setTogglers(defaultTogglers());
      setAnchors(defaultAnchors());
      setPersonalRoutesEnabled(false);
      setSelectedPresetId(null);
    },
  };
}
