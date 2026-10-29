export const togglerIds = ["01", "02", "03", "04", "05", "06", "08"] as const;
export const lockedTogglerIds = new Set<string>(["08"]);

export type TogglerState = { value: number; on: boolean };
export type TogglerStates = Record<string, TogglerState>;
// Slider 20 is backend weight 1 (sent as value / 20).
const DEFAULT_TOGGLER: TogglerState = { value: 20, on: true };
export const defaultTogglers = (): TogglerStates =>
  Object.fromEntries(togglerIds.map((id) => [id, DEFAULT_TOGGLER]));

export type AssessmentWeights = {
  weight_health: number;
  weight_study: number;
  weight_daily: number;
  weight_mobility: number;
  weight_sport: number;
  weight_enjoyment: number;
  weight_security: number;
};

export function buildAssessmentWeights(
  togglers: TogglerStates,
): AssessmentWeights {
  const weight = (id: string) =>
    togglers[id].on ? togglers[id].value / 20 : 0;

  return {
    weight_health: weight("03"),
    weight_study: weight("04"),
    weight_daily: weight("02"),
    weight_mobility: weight("01"),
    weight_sport: weight("06"),
    weight_enjoyment: weight("05"),
    weight_security: weight("08"),
  };
}

export function sameWeights(
  a: AssessmentWeights | null,
  b: AssessmentWeights | null,
) {
  if (a === null || b === null) return a === b;
  return (Object.keys(a) as (keyof AssessmentWeights)[]).every(
    (key) => a[key] === b[key],
  );
}

// No query string keeps the backend defaults (every weight is 1).
export function weightsSearch(weights: AssessmentWeights | null) {
  if (weights === null) return "";
  const query = new URLSearchParams(
    Object.entries(weights).map(([key, value]) => [key, String(value)]),
  ).toString();
  return query ? `?${query}` : "";
}
