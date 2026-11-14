# Clear chat history (#111)

`Chat` accepts an optional `renderClearHistory(controls)` render prop. It passes
the controls from `src/components/ClearChatHistory.tsx` to your UI. Without this
prop, the component renders nothing. No clear button, confirmation dialog,
icons, classes or styles are provided.

Connect your own action to `controls.requestClear`. When
`controls.confirmationRequired` is true, display your confirmation UI. Connect
its cancel action to `controls.cancel` and its destructive action to
`controls.confirm`. Calling `confirm` without first requesting confirmation
does nothing. Respect `controls.disabled`, display pending feedback using
`controls.clearing`, and display `controls.error` when present. A failed attempt
keeps the confirmation open so the user can retry or cancel.

Pass the render prop at the existing `<Chat>` call in `src/components/map.tsx`
when the visual design is ready. The connection and cleanup logic are already
wired inside `Chat`; the visual component should not open another socket or
manipulate session storage.

After explicit confirmation, the client sends on its existing socket:

```json
{"type":"session.clear","requestId":"<unique-id>","sessionToken":"<current-token>"}
```

The backend must have acknowledged `session.open` for that token. It returns:

```json
{"type":"session.cleared","requestId":"<same-id>","deleted":true}
```

`deleted: false` is also success: the session had already expired or another
connection had deleted it. Errors use the existing `error` envelope with the
same `requestId`. Requires backend issue #83.

Only a matching success acknowledgement clears the messages, draft, attached
hex context and old `okil.chat.token` from session storage. The client then sends
`session.open` without a token and stores the new token on `session.ready`.
Sending questions is blocked during deletion and until the new session is ready.
Deletion can interrupt an in-flight answer. Delayed old answers cannot recreate
removed turns.

Storage errors keep the current history and token for retry. A disconnect or
10-second acknowledgement timeout reports failure without assuming that Redis
was cleared. Reconnect reconciles the stored token with the backend; if it has
been deleted, `session_expired` discards stale local history and starts a new chat.
Other connections using a deleted token also receive `session_expired` on their
next operation or restore. Deletion does not broadcast an immediate UI update
to idle sockets.

Verification: `npm run test -- --run src/tests/chatSocket.test.tsx
src/tests/map-chat.test.tsx`, `npm run build`.
