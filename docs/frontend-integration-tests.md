# Frontend integration tests (#78)

The test and coverage scripts explicitly use Node.js. jsdom is pinned to 26.1.0
because jsdom 31 failed during worker startup under Bun with an
`addEventListener` / `EventTarget` error. The map tests supply a MouseEvent-based
PointerEvent fallback for Base UI clicks, which jsdom 26 does not implement.
The component tests have also been checked by running Vitest directly under Bun.

Run the full suite with `bun run test --run`, or only these flows with:

```sh
bun run test --run src/components/AddressSearch.test.tsx src/components/map.test.tsx
```

The tests render real React components in jsdom. Only `fetch` responses and the
WebGL map renderer are replaced; search services, query caching, API request
builders, category switches and their event handlers run normally. API keys and
the backend URL use test-only values. No running backend or external API is needed.

## Address search

- Typing is debounced for 700 ms; Visicom receives the latest address and the Lviv
  settlement filter. Geoapify runs after its additional delay with the address
  and geographic filter.
- Loading, successful suggestions, explicit address selection and coordinate
  callbacks are checked.
- Successful responses without matches display the empty-result message.
- HTTP 404 and 503 display an error and allow a successful retry. The current
  provider contract treats non-2xx responses as service errors; no matches are
  represented by successful empty responses.
- Clearing an in-flight search aborts the request and ignores its late response.
  This also covers a regression where restoring input focus reopened the list.

## Category filters

- All seven editable categories are tested individually, in both directions.
- A switch changes draft state; requests are made only after clicking Apply.
- Disabled categories send their corresponding `weight_*` parameter as `0`;
  enabled categories retain `1`, including the always-enabled security category.
- Successful responses update the data passed to the map renderer.
- Previous map data remains visible while an update is loading; an empty result
  clears the rendered data without showing an error.
- A failed update leaves controls usable; retry preserves the applied filters.

These checks cover the current UI: categories filter scoring through `/hexagons`.
There are no separate education/shelter/healthcare point-layer toggles here.
WebGL drawing and live provider/backend availability require separate checks.

## Known limitation: address existence

Manual testing found suggestions for `вулиця Шевченка 1000` and `1100`, reported
as nonexistent buildings. Address suggestions are not proof that a building
exists. Visicom supplies autocomplete, while Geoapify also contributes search
results; the current frontend accepts street-level Geoapify coordinates and
attaches the house number entered by the user when the response has none.
The exact provider response behind the reported suggestions has not been
captured, so this is not confirmed as a Visicom data issue.

Building-existence validation is outside #78. Existing search behavior is retained;
the integration tests check UI/API behavior, not real-world address validity.
Investigate provider responses and address validation in a separate ticket.
