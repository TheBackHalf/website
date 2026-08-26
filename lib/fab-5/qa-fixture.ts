/** Disposable in-process QA surface for Row 17 correction/retest. Never a participant-facing product surface. */

export type ControlledSurfaceState = {
  id: string;
  label: string;
  controlPresent: boolean;
  lastRetest: "none" | "fail" | "pass";
  correctionApplied: boolean;
  imaniSelfReport: "complete" | "none";
};

const INITIAL: ControlledSurfaceState = {
  id: "qa-lumina-intro-control",
  label: "Controlled Lumina intro identity control (disposable QA only)",
  controlPresent: false,
  lastRetest: "none",
  correctionApplied: false,
  imaniSelfReport: "complete",
};

let state: ControlledSurfaceState = { ...INITIAL };

export function resetControlledSurface(): ControlledSurfaceState {
  state = { ...INITIAL };
  return inspectControlledSurface();
}

export function inspectControlledSurface(): ControlledSurfaceState {
  return { ...state };
}

export function applyControlledSurfaceCorrection(): ControlledSurfaceState {
  state = {
    ...state,
    controlPresent: true,
    correctionApplied: true,
    imaniSelfReport: "none",
    lastRetest: "none",
  };
  return inspectControlledSurface();
}

export function retestControlledSurface(): ControlledSurfaceState {
  state = {
    ...state,
    lastRetest: state.controlPresent ? "pass" : "fail",
  };
  return inspectControlledSurface();
}
