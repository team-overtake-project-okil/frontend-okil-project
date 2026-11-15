# Local chat → WebSocket → AI integration (#74)

This branch starts from main `ef79e0b`, including the existing assistant UI
merged in PR #105. The popup, map selection, context pinning and conversation
layout are retained. The only runtime UI change is resolving the WebSocket
endpoint from the same backend as the map when no explicit endpoint is set.

Backend branch: `feat/74-connect-chat-ai`.
Frontend branch: `feat/74-chat-ai-integration`.

Local `.env.local`:

```dotenv
VITE_BACKEND_URL=http://localhost:8000
VITE_CHAT_WS_URL=ws://localhost:8000/ws/chat
```

`VITE_CHAT_WS_URL` is optional: HTTP backend URLs become WS, HTTPS becomes WSS,
and `/ws/chat` is appended. An explicit WS URL takes precedence. Keep existing
Mapbox/address keys. Groq keys and DB URLs belong only in the backend.

Start a real Redis server, the actual backend (`python -m uvicorn main:app
--reload --port 8000`), and this frontend (`bun run dev -- --port 5173`). Open
http://localhost:5173, go to the map and open **Помічник Окіл**.
For a cold model cache, set backend `CHAT_PRELOAD_AI=true` and wait for
`Application startup complete` before asking the first question. This loads
the classifier outside the existing 30-second reply deadline.

Checks:

1. Ask `Що таке проєкт OKIL?` without selecting a hex: an AI project answer
   should appear without requiring an H3 ID.
2. Select a hex or search for `Кульпарківська, 95`; the context chip should
   show the selected cell. Ask `Назви медичний заклад у цій ділянці.` The
   backend uses the H3 to fetch facts; it does not trust client-supplied scores.
3. Ask `Поясни коротко оцінку цієї ділянки.` With default priorities at the
   verified cell, the numeric score is 79. General textual explanations can
   still contain model inaccuracies; the known formula-wording issue is an
   AI quality observation, not a change to scoring.
4. Reload the page or reconnect after restarting the backend while Redis is
   kept running: the conversation should restore from the session token.
5. If AI/storage fails, the existing readable status/error UI should be shown.

The context header is sent using the existing `message.send` text format.
The backend strips that header before intent classification and retrieves its
own DB facts. Custom user weights are not yet passed to the AI service API;
AI numeric explanations currently use server defaults. Removing a map context
chip does not erase the existing conversation history.

Validation: `bun run test -- --run`, `bun run build`. `chatUrl.test.ts`
checks endpoint resolution; `chatSocket.test.tsx` checks wire format, selected
context, answer/error rendering and session restoration. Existing map-chat
lifecycle tests remain unchanged.
