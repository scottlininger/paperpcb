/**
 * replicadInit.js — Lazy singleton for Replicad/OpenCascade WASM initialization.
 * WASM is only loaded on first call to ensureReplicadReady().
 */
import * as replicad from "https://esm.sh/replicad";

let _initPromise = null;

export async function ensureReplicadReady() {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    const mod = await import("./replicad_single.js");
    const oc = await mod.default({
      locateFile: () => "./replicad_single.wasm",
    });
    replicad.setOC(oc);
    return replicad;
  })();
  return _initPromise;
}

export { replicad };
