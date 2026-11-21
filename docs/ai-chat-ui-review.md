# AI chat UI review (#121)

Reviewed the map assistant in Chrome at 1440 × 900 and 390 × 844 CSS pixels, with the map embedded and expanded. The browser used the application UI and controlled WebSocket events for reproducible timing and failures.

| Reproduction | Verified result |
| --- | --- |
| Open an empty chat and delay `session.ready`. | The panel shows “Підключаємося…”. Once ready, the status clears and the welcome screen offers example questions. |
| Select an example and press Enter. Delay the answer, then return `answer.completed` with a follow-up. | One question appears, sending is disabled while waiting, and the answer appears beneath the question. Selecting the follow-up fills the composer. |
| Send the follow-up and return an `error` with its request ID. | The question stays in the conversation with its error. The previous suggestion stays hidden and the composer accepts another question. |
| Disconnect, reconnect, enter a draft, close with Escape and reopen. | Reconnect opens a session, Escape returns focus to the assistant toggle, and the draft survives closing the panel. |
| Open the embedded assistant where the toolbar wraps. | The panel starts below the last row of map controls at both viewport sizes. |
| In the expanded map, press Tab from the last example while the composer is empty. | Focus moves into the textarea, so a keyboard user can type a question. |

The socket tests also cover a missing chat endpoint, restoring history and sending attached area context.

[Mobile layout while connecting](ai-chat-ui/mobile-390x844.png) · [Desktop conversation after a failed follow-up](ai-chat-ui/desktop-1440x900.png). Images are cropped to the map workspace and chat panel respectively.

## Separate test issue

Run `node node_modules/vitest/vitest.mjs run src/HexDebug.test.tsx`. The test assertions pass, then the debug accordion's animation callback calls `panel.scrollTo`. jsdom lacks that method and Vitest reports an unhandled rejection. The expected result is a clean exit after the accordion test. This also affected the full frontend suite.
