// Статус завантаження маршрутів і зупинок поверх карти
interface RouteStatusProps {
  routesEnabled: boolean;
  selectedHexId: string | null;
  routesCount: number;
  routesFetching: boolean;
  routesError: boolean;
  stopsFetching: boolean;
  stopsError: boolean;
  onRetryRoutes: () => void;
  onRetryStops: () => void;
}

export function RouteStatus({
  routesEnabled,
  selectedHexId,
  routesCount,
  routesFetching,
  routesError,
  stopsFetching,
  stopsError,
  onRetryRoutes,
  onRetryStops,
}: RouteStatusProps) {
  const message =
    !routesEnabled || !selectedHexId
      ? null
      : routesFetching
        ? "Завантажуємо маршрути…"
        : routesError
          ? "Не вдалося завантажити маршрути"
          : routesCount === 0
            ? "У цій ділянці немає зупинок маршрутів"
            : `Маршрутів із зупинкою тут: ${routesCount}`;

  if (!message) return null;

  return (
    <div
      role="status"
      className="route-status absolute top-3 left-3 flex items-center gap-3 rounded-lg bg-white/90 px-3 py-2 text-sm shadow"
    >
      <div className="inline-text">{message}</div>
      {routesError && !routesFetching && (
        <button
          type="button"
          className="rounded border px-2 py-0.5"
          onClick={onRetryRoutes}
        >
          Повторити
        </button>
      )}
      {stopsError && !stopsFetching && (
        <button
          type="button"
          className="rounded border px-2 py-0.5"
          onClick={onRetryStops}
        >
          Повторити зупинки
        </button>
      )}
    </div>
  );
}
