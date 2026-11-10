import type { AddressSuggestion } from "../services/geocoding";
import { AssessmentCard } from "./map/AssessmentCard";
import { HexagonComparison } from "./map/HexagonComparison";
import { MapboxMap } from "./MapboxMap";
import { MapToolbar } from "./map/MapToolbar";
import { WeightsPanel } from "./map/WeightsPanel";
import { useMapRatings } from "../lib/useMapRatings";
import { useMapWorkspace } from "../lib/useMapWorkspace";

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
  const workspace = useMapWorkspace();
  const { sectionRef, expandRef, panelRef, toggleRef } = workspace.refs;
  const ratings = useMapRatings(workspace.selectedHexId);

  return (
    <div
      ref={sectionRef}
      id="map"
      className={`map-section ${workspace.expanded ? "map-expanded" : ""} ${workspace.panelOpen ? "panel-open" : ""}`}
      role={workspace.expanded ? "dialog" : undefined}
      aria-modal={workspace.expanded ? true : undefined}
      aria-labelledby="map-heading"
    >
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
            onHexSelect={workspace.setSelectedHexId}
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
        {workspace.selectedHexId && (
          <AssessmentCard
            hexId={workspace.selectedHexId}
            data={ratings.assessmentData}
            showSkeleton={ratings.showAssessmentSkeleton}
            isError={ratings.isAssessmentError}
            error={ratings.assessmentError}
            expanded={workspace.expanded}
            detailsOpen={workspace.assessmentExpanded}
            openCategory={workspace.openCategory}
            canAdd={workspace.canAddToComparison}
            added={workspace.comparisonIds.includes(workspace.selectedHexId)}
            atLimit={workspace.atComparisonLimit}
            onClear={() => onAddressChange(null)}
            onRetry={() => void ratings.refetchAssessment()}
            onAdd={workspace.onAddToComparison}
            onToggleDetails={() =>
              workspace.setAssessmentExpanded((open) => !open)
            }
            onExpandForDetails={workspace.onExpandForDetails}
            onToggleCategory={workspace.onToggleCategory}
          />
        )}
        <div className="map-legend">
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
        {workspace.comparisonIds.length > 0 && !workspace.panelOpen && (
          <HexagonComparison
            ids={workspace.comparisonIds}
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
