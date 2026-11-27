import { CategoryScore } from "./map/CategoryScore";
import { useMemo, useState } from "react";
import { Chat, type HexChatContext } from "./Chat";
import {
  anchorRouteColors,
  categoryLabels,
  comparisonLabels,
  hexagonAssessmentOptions,
  hexagonComparisonOptions,
} from "../lib/hexagonAssessment";
import { useQuery } from "@tanstack/react-query";
import type { AddressSuggestion } from "../services/geocoding";
import { AssessmentCard } from "./map/AssessmentCard";
import { HexagonComparison } from "./map/HexagonComparison";
import { MapboxMap } from "./MapboxMap";
import { MapToolbar } from "./map/MapToolbar";
import { WeightsPanel } from "./map/WeightsPanel";
import { useMapRatings } from "../lib/useMapRatings";
import { useMapWorkspace } from "../lib/useMapWorkspace";
import "./map/MapTypography.scss";

export type { Hexagon, int } from "../lib/hexagonRating";

interface MapProps {
  clearSelectionKey: number;
  searchedLocation: AddressSuggestion | null;
  onAddressChange: (address: AddressSuggestion | null) => void;
}

export const Map = ({
  searchedLocation,
  onAddressChange,
  clearSelectionKey,
}: MapProps) => {
  const [panelMode, setPanelMode] = useState<"assessment" | "chat" | null>(
    null,
  );
  const [chatContext, setChatContext] = useState<HexChatContext | null>(null);
  const chatOpen = panelMode === "chat";
  const [chatHost, setChatHost] = useState<HTMLDivElement | null>(null);
  const [comparisonActive, setComparisonActive] = useState(false);
  const [pickingAnchor, setPickingAnchor] = useState<string | null>(null);
  const [pickingAnchorLabel, setPickingAnchorLabel] = useState("");
  const workspace = useMapWorkspace();
  const { sectionRef, expandRef, panelRef, toggleRef } = workspace.refs;
  const comparing = comparisonActive && workspace.comparisonOpen;
  const ratings = useMapRatings(comparisonActive ? null : workspace.selectedHexId);
  const comparison = useQuery(
    hexagonComparisonOptions(
      workspace.comparisonIds,
      ratings.assessmentWeights,
      ratings.appliedAnchors,
      comparing,
    ),
  );
  const [routeOriginId, setRouteOriginId] = useState<string | null>(null);
  const currentRouteOriginId =
    routeOriginId && workspace.comparisonIds.includes(routeOriginId)
      ? routeOriginId
      : null;
  const comparisonRoutes = useQuery({
    ...hexagonAssessmentOptions(
      comparing && ratings.appliedAnchors.length > 0 ? currentRouteOriginId : null,
      ratings.assessmentWeights,
      ratings.appliedAnchors,
    ),
    retry: false,
    staleTime: (query) => query.state.data?.routes?.features.length ? Infinity : 0,
  });
  const hasComparisonRoutes = Boolean(comparisonRoutes.data?.routes?.features.length);
  const routePending = !hasComparisonRoutes && comparisonRoutes.isFetching;
  const routeError =
    !hasComparisonRoutes && !routePending && (comparisonRoutes.isError || comparisonRoutes.isSuccess)
      ? "Не вдалося побудувати маршрут"
      : undefined;
  const clearComparison = () => {
    setRouteOriginId(null);
    workspace.clearComparison();
  };
  const endComparison = () => {
    clearComparison();
    setComparisonActive(false);
  };
  const selectHex = (id: string | null) => {
    workspace.setSelectedHexId(id);
    setPanelMode((mode) =>
      mode === "chat" ? "chat" : id ? "assessment" : null,
    );
  };

  const assessmentRoutes = comparing
    ? comparisonRoutes.data?.routes ?? null
    : !comparisonActive && ratings.personalRoutesEnabled && ratings.appliedRoutesEnabled
      ? ratings.assessmentData?.routes ?? null
      : null;
  const anchorPoints = useMemo(() => {
    if (!comparing && !ratings.personalRoutesEnabled) return [];
    const anchors = comparing ? ratings.appliedAnchors : ratings.anchors;
    const colors = anchorRouteColors(assessmentRoutes);
    if (colors.size === 0) return anchors;
    return anchors.map((anchor) => {
      const index = ratings.appliedAnchors.findIndex(
        (applied) =>
          applied.id === anchor.id &&
          applied.lat === anchor.lat &&
          applied.lng === anchor.lng,
      );
      return { ...anchor, routeColor: colors.get(index) };
    });
  }, [
    assessmentRoutes,
    comparing,
    ratings.anchors,
    ratings.appliedAnchors,
    ratings.personalRoutesEnabled,
  ]);

  const selectedChatContext = useMemo<HexChatContext | null>(() => {
    if (
      !workspace.selectedHexId ||
      !ratings.assessmentData ||
      ratings.showAssessmentSkeleton ||
      ratings.isAssessmentError
    )
      return null;
    return {
      id: workspace.selectedHexId,
      score: ratings.assessmentData.overall_rating,
      categories: ratings.assessmentData.categories
        .filter((item) => item.enabled)
        .map((item) => ({
          title:
            categoryLabels.find(([key]) => key === item.category)?.[1] ??
            item.category,
          score: item.score,
        })),
    };
  }, [
    workspace.selectedHexId,
    ratings.assessmentData,
    ratings.showAssessmentSkeleton,
    ratings.isAssessmentError,
  ]);
  const setChatOpen = (open: boolean) => {
    if (open) {
      if (comparisonActive) endComparison();
      setChatContext(selectedChatContext);
    }
    setPanelMode(
      open ? "chat" : chatOpen && workspace.selectedHexId ? "assessment" : null,
    );
  };
  const hideMapControls =
    chatOpen ||
    (!comparisonActive &&
      panelMode === "assessment" &&
      Boolean(workspace.selectedHexId) &&
      workspace.assessmentExpanded);
  const categoryDetails =
    workspace.selectedHexId &&
    workspace.assessmentExpanded &&
    !ratings.showAssessmentSkeleton &&
    !ratings.isAssessmentError ? (
      <div className="assessment-category-body">
        {workspace.selectedHexId &&
          !ratings.showAssessmentSkeleton &&
          !ratings.isAssessmentError && (
            <div className="assessment-details">
              {categoryLabels.map(([key, title]) => {
                const item = ratings.assessmentData?.categories.find(
                  (c) => c.category === key,
                );
                return (
                  <CategoryScore
                    key={key}
                    title={title}
                    item={item}
                    open={
                      workspace.openCategory?.hexId ===
                        workspace.selectedHexId &&
                      workspace.openCategory.category === key
                    }
                    onToggle={() => workspace.onToggleCategory(key)}
                  />
                );
              })}
            </div>
          )}
      </div>
    ) : null;
  return (
    <div
      ref={sectionRef}
      id="map"
      className={`map-section ${hideMapControls ? "map-details-open" : ""} ${workspace.expanded ? "map-expanded" : ""} ${workspace.panelOpen ? "panel-open" : ""} ${comparing ? "comparison-table-open" : ""}`}
      role={workspace.expanded ? "dialog" : undefined}
      aria-modal={workspace.expanded ? true : undefined}
      aria-labelledby="map-heading"
    >
      <Chat
        assessmentWeights={ratings.assessmentWeights}
        appliedAnchors={ratings.appliedAnchors}
        open={chatOpen}
        onOpenChange={setChatOpen}
        host={chatHost}
        selectedContext={selectedChatContext}
        attachedContext={chatContext}
        onContextChange={setChatContext}
      />
      <div className="map-heading">
        <div>
          <div className="text-block eyebrow uppercase">досліджуйте місто</div>
          <div
            role="heading"
            aria-level={2}
            className="heading-2"
            id="map-heading"
          >
            Знайдіть місце за своїми пріоритетами.
          </div>
        </div>
        <div className="text-block">
          Досліджуйте окіл: від щоденних потреб до транспорту й відпочинку.
          Натисніть на ділянку, щоб побачити оцінку
        </div>
      </div>
      <div className="map-workspace">
        <MapToolbar
          chatOpen={chatOpen}
          onToggleChat={() => {
            if (chatOpen) {
              setChatOpen(false);
            } else {
              if (comparisonActive) endComparison();
              setChatContext(null);
              setPanelMode("chat");
            }
          }}
          comparisonActive={comparisonActive}
          onToggleComparisonPanel={() => {
            if (comparisonActive) {
              endComparison();
            } else {
              workspace.prepareComparison();
              setPanelMode(workspace.selectedHexId ? "assessment" : null);
              setComparisonActive(true);
            }
          }}
          expanded={workspace.expanded}
          panelOpen={workspace.panelOpen}
          dirty={ratings.dirty}
          routesEnabled={workspace.routesEnabled}
          searchedLocation={searchedLocation}
          onAddressChange={onAddressChange}
          onRoutesChange={workspace.onRoutesChange}
          onTogglePanel={workspace.onTogglePanel}
          onToggleExpanded={workspace.onToggleExpanded}
          toggleRef={toggleRef}
          expandRef={expandRef}
        />
        <div className="map-canvas">
          <MapboxMap
            hexagons={ratings.hexagonsData}
            comparisonIds={workspace.comparisonIds}
            comparisonRouteOriginId={
              comparing && hasComparisonRoutes ? currentRouteOriginId : null
            }
            onAddToComparison={
              comparisonActive && workspace.canAddToComparison
                ? workspace.onAddToComparison
                : undefined
            }
            comparisonActionLabel={
              workspace.atComparisonLimit
                ? `Додати замість ${comparisonLabels[comparisonLabels.length - 1]}`
                : undefined
            }
            clearSelectionKey={clearSelectionKey}
            searchedLocation={searchedLocation}
            selectedHexId={workspace.selectedHexId}
            assessmentRoutes={assessmentRoutes}
            anchorPoints={anchorPoints}
            onAnchorPick={
              pickingAnchor !== null
                ? ({ lat, lng }) => {
                    const previous = ratings.anchors.find(
                      (point) => point.id === pickingAnchor,
                    );
                    ratings.saveAnchor({
                      id: previous?.id ?? crypto.randomUUID(),
                      label:
                        pickingAnchorLabel ||
                        previous?.label ||
                        `Місце на карті ${ratings.anchors.length + 1}`,
                      lat,
                      lng,
                      source: "map",
                    });
                    setPickingAnchor(null);
                  }
                : null
            }
            onHexSelect={selectHex}
            onStopInPanel={workspace.takeStopInPanel}
            onStopPanelDismiss={workspace.clearStopPanel}
            routesEnabled={!comparisonActive && workspace.routesEnabled}
          />
          {pickingAnchor !== null && (
            <div className="anchor-map-hint" role="status">
              Оберіть місце на карті
              <button type="button" onClick={() => setPickingAnchor(null)}>
                Скасувати
              </button>
            </div>
          )}
          {ratings.showSkeleton && (
            <div className="map-data-status" role="status">
              Завантажуємо оцінки…
            </div>
          )}
          {ratings.isHexagonsError && !ratings.isFetching && (
            <div className="map-data-status" role="alert">
              <div className="text-block">
                Не вдалося завантажити оцінки. Карта доступна без них.
              </div>
              <button
                className="secondary-button"
                onClick={() => void ratings.refetch()}
              >
                Спробувати знову
              </button>
            </div>
          )}
        </div>
        {workspace.panelOpen && pickingAnchor === null && (
          <WeightsPanel
            selectedPresetId={ratings.selectedPresetId}
            presetModified={ratings.presetModified}
            onSelectPreset={ratings.selectPreset}
            personalRoutesEnabled={ratings.personalRoutesEnabled}
            onPersonalRoutesChange={ratings.setPersonalRoutesEnabled}
            canApply={ratings.canApply}
            anchors={ratings.anchors}
            onSaveAnchor={ratings.saveAnchor}
            onRemoveAnchor={ratings.removeAnchor}
            pickingAnchor={pickingAnchor}
            onPickAnchor={(id, label = "") => {
              setPickingAnchor(id);
              setPickingAnchorLabel(label);
            }}
            panelRef={panelRef}
            stop={workspace.panelStop}
            faceStop={workspace.faceStop}
            dirty={ratings.dirty}
            togglers={ratings.togglers}
            onTogglerChange={ratings.updateToggler}
            onClose={workspace.closePanel}
            onReset={ratings.handleReset}
            onApply={ratings.handleApply}
            onStopClose={workspace.clearStopPanel}
          />
        )}
        {panelMode !== null && !comparisonActive && (
          <AssessmentCard
            selectedHexId={workspace.selectedHexId}
            assessmentData={ratings.assessmentData}
            showAssessmentSkeleton={ratings.showAssessmentSkeleton}
            isAssessmentError={ratings.isAssessmentError}
            assessmentError={ratings.assessmentError}
            chatOpen={chatOpen}
            isHexAttached={
              chatOpen && chatContext?.id === workspace.selectedHexId
            }
            details={categoryDetails}
            assessmentExpanded={workspace.assessmentExpanded}
            setChatOpen={setChatOpen}
            setAssessmentExpanded={workspace.setAssessmentExpanded}
            refetchAssessment={ratings.refetchAssessment}
            setChatHost={setChatHost}
          />
        )}
        <div className="map-legend" hidden={hideMapControls}>
          <div className="inline-text">Оцінка комфорту</div>
          <div className="legend-ramp" />
          <div>
            <div className="inline-text">0</div>
            <div className="inline-text">50</div>
            <div className="inline-text">100</div>
          </div>
        </div>
        {ratings.isFetching && !ratings.showSkeleton && (
          <div className="text-block map-updating" role="status">
            Оновлюємо оцінки…
          </div>
        )}
        {comparisonActive && (
          <HexagonComparison
            ids={workspace.comparisonIds}
            onExit={endComparison}
            onClear={clearComparison}
            comparison={comparison}
            showRouteControls={ratings.appliedAnchors.length > 0}
            routeOriginId={currentRouteOriginId}
            onRouteOriginChange={(id) =>
              setRouteOriginId((current) => current === id ? null : id)
            }
            routePending={routePending}
            routeError={routeError}
            open={workspace.comparisonOpen}
            onToggle={() => {
              setRouteOriginId(null);
              workspace.onToggleComparison();
            }}
            onRemove={(id) => {
              if (routeOriginId === id) setRouteOriginId(null);
              workspace.onRemoveComparison(id);
            }}
          />
        )}
      </div>
    </div>
  );
};
