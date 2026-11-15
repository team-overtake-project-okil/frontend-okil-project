import { CategoryScore } from "./map/CategoryScore";
import { useMemo, useState } from "react";
import { Chat, type HexChatContext } from "./Chat";
import { categoryLabels } from "../lib/hexagonAssessment";
import type { AddressSuggestion } from "../services/geocoding";
import { AssessmentCard } from "./map/AssessmentCard";
import { HexagonComparison } from "./map/HexagonComparison";
import { MapboxMap } from "./MapboxMap";
import { MapToolbar } from "./map/MapToolbar";
import { WeightsPanel } from "./map/WeightsPanel";
import { useMapRatings } from "../lib/useMapRatings";
import { useMapWorkspace } from "../lib/useMapWorkspace";
import "./map/MapTypography.css";

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
  const [panelMode, setPanelMode] = useState<"assessment" | "chat" | null>(null);
  const [chatContext, setChatContext] = useState<HexChatContext | null>(null);
  const chatOpen = panelMode === "chat";
  const [chatHost, setChatHost] = useState<HTMLDivElement | null>(null);
  const [comparisonActive, setComparisonActive] = useState(false);
  const workspace = useMapWorkspace();
  const { sectionRef, expandRef, panelRef, toggleRef } = workspace.refs;
  const ratings = useMapRatings(workspace.selectedHexId);

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
  const setChatOpen = (open: boolean) =>
  {
    if (open) setChatContext(selectedChatContext);
    setPanelMode(open ? "chat" : chatOpen && workspace.selectedHexId ? "assessment" : null);
  };
  const hideMapControls = chatOpen || (
    panelMode === "assessment" && Boolean(workspace.selectedHexId) && workspace.assessmentExpanded
  );
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
      className={`map-section ${hideMapControls ? "map-details-open" : ""} ${workspace.expanded ? "map-expanded" : ""} ${workspace.panelOpen ? "panel-open" : ""} ${comparisonActive && workspace.comparisonOpen && !workspace.panelOpen ? "comparison-table-open" : ""}`}
      role={workspace.expanded ? "dialog" : undefined}
      aria-modal={workspace.expanded ? true : undefined}
      aria-labelledby="map-heading"
    >
      <Chat
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
          onToggleChat={() =>
          {
            if (chatOpen)
            {
              setChatOpen(false);
            }
            else
            {
              setChatContext(null);
              setPanelMode("chat");
            }
          }}
          comparisonActive={comparisonActive && !workspace.panelOpen}
          onToggleComparisonPanel={() => {
            if (comparisonActive && !workspace.panelOpen) {
              setComparisonActive(false);
            } else {
              workspace.closeMapPanelsForComparison();
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
            clearSelectionKey={clearSelectionKey}
            searchedLocation={searchedLocation}
            selectedHexId={workspace.selectedHexId}
            onHexSelect={(id) =>
            {
              workspace.setSelectedHexId(id);
              setPanelMode((mode) => mode === "chat" ? "chat" : id ? "assessment" : null);
            }}
            onStopInPanel={workspace.takeStopInPanel}
            onStopPanelDismiss={workspace.clearStopPanel}
            routesEnabled={workspace.routesEnabled}
          />
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
        {workspace.panelOpen && (
          <WeightsPanel
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
        {panelMode !== null && (
          <AssessmentCard
            selectedHexId={workspace.selectedHexId}
            assessmentData={ratings.assessmentData}
            showAssessmentSkeleton={ratings.showAssessmentSkeleton}
            isAssessmentError={ratings.isAssessmentError}
            assessmentError={ratings.assessmentError}
            chatOpen={chatOpen}
            isHexAttached={chatOpen && chatContext?.id === workspace.selectedHexId}
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
        {comparisonActive && !workspace.panelOpen && (
          <HexagonComparison
            ids={workspace.comparisonIds}
            selectedId={workspace.selectedHexId}
            onAdd={workspace.onAddToComparison}
            weights={ratings.assessmentWeights}
            open={workspace.comparisonOpen}
            onToggle={workspace.onToggleComparison}
            onRemove={workspace.onRemoveComparison}
          />
        )}
      </div>
    </div>
  );
};
