import { lazy, Suspense } from "react";
import App from "./App";
const HexDebug = lazy(() => import("./HexDebug"));
export default function Routes() {
  if (location.pathname.replace(/\/$/, "") === "/admin/hex-debug")
    return (
      <Suspense fallback="Завантаження…">
        <HexDebug />
      </Suspense>
    );
  return <App />;
}
