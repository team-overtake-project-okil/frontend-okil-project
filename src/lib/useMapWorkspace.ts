// Порівняння ділянок, панель зупинки і розгортання карти
import { useCallback, useEffect, useRef, useState } from "react";
import { comparisonLabels } from "./hexagonAssessment";
import { useExpandedMapFocus } from "./useExpandedMapFocus";
import type { HexStopProperties } from "./useStopsByHex";

export function useMapWorkspace() {
  const [assessmentExpanded, setAssessmentExpanded] = useState(false);
  const [openCategory, setOpenCategory] = useState<{
    hexId: string;
    category: string;
  } | null>(null);
  const [selectedHexId, setSelectedHexId] = useState<string | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelStop, setPanelStop] = useState<HexStopProperties | null>(null);
  // Stays after panelStop clears so the route list can slide away.
  const [retainedStop, setRetainedStop] = useState<HexStopProperties | null>(
    null,
  );
  if (panelStop !== null && panelStop !== retainedStop) {
    setRetainedStop(panelStop);
  }
  const panelOpenRef = useRef(false);
  const panelStopRef = useRef<HexStopProperties | null>(null);
  const restoreSlidersRef = useRef(false);
  useEffect(() => {
    panelOpenRef.current = panelOpen;
  }, [panelOpen]);
  const [expanded, setExpanded] = useState(false);
  const [routesEnabled, setRoutesEnabled] = useState(false);
  const clearStopPanel = useCallback(() => {
    if (panelStopRef.current === null) return;
    panelStopRef.current = null;
    setPanelStop(null);
    if (!restoreSlidersRef.current) setPanelOpen(false);
    restoreSlidersRef.current = false;
  }, []);
  const onExpandedEscape = useCallback(() => {
    if (panelStopRef.current) {
      clearStopPanel();
      return;
    }
    setExpanded(false);
    setPanelOpen(false);
  }, [clearStopPanel]);
  const { sectionRef, expandRef } = useExpandedMapFocus({
    expanded,
    onEscape: onExpandedEscape,
  });
  const closeMapPanelsForComparison = () => {
    restoreSlidersRef.current = false;
    clearStopPanel();
    setPanelOpen(false);
    setRoutesEnabled(false);
  };
  const takeStopInPanel = useCallback((stop: HexStopProperties) => {
    setComparisonOpen(false);
    if (panelStopRef.current === null) {
      restoreSlidersRef.current = panelOpenRef.current;
    }
    panelStopRef.current = stop;
    setPanelStop(stop);
    setPanelOpen(true);
    return true;
  }, []);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!panelOpen) return;
    if (!panelStopRef.current) {
      panelRef.current
        ?.querySelector<HTMLButtonElement>(".weights-close")
        ?.focus();
    }
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !expanded) {
        if (panelStopRef.current) {
          panelStopRef.current = null;
          setPanelStop(null);
          if (!restoreSlidersRef.current) setPanelOpen(false);
          restoreSlidersRef.current = false;
          return;
        }
        setPanelOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [panelOpen, expanded, panelRef, toggleRef]);
  useEffect(() => {
    if (!panelStop) return;
    panelRef.current
      ?.querySelector<HTMLButtonElement>(".stop-panel-close")
      ?.focus();
  }, [panelStop, panelRef]);
  const closePanel = () => {
    panelStopRef.current = null;
    restoreSlidersRef.current = false;
    setPanelStop(null);
    setPanelOpen(false);
    toggleRef.current?.focus();
  };

  return {
    refs: { sectionRef, expandRef, panelRef, toggleRef },
    selectedHexId,
    setSelectedHexId,
    comparisonIds,
    comparisonOpen,
    assessmentExpanded,
    setAssessmentExpanded,
    openCategory,
    setOpenCategory,
    canAddToComparison:
      selectedHexId !== null &&
      !comparisonIds.includes(selectedHexId) &&
      comparisonIds.length < comparisonLabels.length,
    atComparisonLimit: comparisonIds.length === comparisonLabels.length,
    panelOpen,
    panelStop,
    faceStop: panelStop ?? retainedStop,
    expanded,
    routesEnabled,
    clearStopPanel,
    closeMapPanelsForComparison,
    takeStopInPanel,
    closePanel,
    onRoutesChange: (enabled: boolean) => {
      if (enabled) setComparisonOpen(false);
      setRoutesEnabled(enabled);
    },
    onTogglePanel: () => {
      if (panelStopRef.current) {
        restoreSlidersRef.current = true;
        clearStopPanel();
        return;
      }
      if (!panelOpen) setComparisonOpen(false);
      setPanelOpen(!panelOpen);
    },
    onToggleExpanded: () => {
      if (expanded) clearStopPanel();
      setExpanded(!expanded);
      setPanelOpen(!expanded && !comparisonOpen);
    },
    onExpandForDetails: () => {
      setAssessmentExpanded(true);
      setExpanded(true);
      setPanelOpen(false);
    },
    onToggleCategory: (category: string) =>
      setOpenCategory((current) =>
        current?.hexId === selectedHexId && current.category === category
          ? null
          : selectedHexId
            ? { hexId: selectedHexId, category }
            : null,
      ),
    onAddToComparison: () => {
      if (selectedHexId === null) return;
      closeMapPanelsForComparison();
      setComparisonIds([...comparisonIds, selectedHexId]);
    },
    onToggleComparison: () => {
      if (!comparisonOpen) closeMapPanelsForComparison();
      setComparisonOpen(!comparisonOpen);
    },
    onRemoveComparison: (id: string) => {
      setComparisonIds(comparisonIds.filter((item) => item !== id));
      if (comparisonIds.length <= 2) setComparisonOpen(false);
    },
  };
}
