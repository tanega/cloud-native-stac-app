import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setWorkerUrl } from "maplibre-gl";
import "./index.css";
import App from "./App.tsx";

// maplibre-gl builds its worker URL from a dynamic template string at
// runtime, which Rollup can't statically bundle, and the worker file
// itself imports a sibling "shared" chunk by relative path — so it must
// be served as a stable pair, not run through Vite's hashed asset
// pipeline. `predev`/`prebuild` (see package.json) copy both files from
// node_modules into public/vendor/ before every dev run and build.
setWorkerUrl("/vendor/maplibre-gl-worker.mjs");

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
