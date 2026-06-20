# Standalone demo (no build)

`UnFry.jsx` is a single self-contained React component that runs the entire loop
in-memory — classification, load scoring, break overlay, challenge generation
(local bank), and live session stats. Real time is compressed so thresholds trip
in seconds. Drop it into any React sandbox to demo without installing the
extension or running the backend.

## `BreakToys.jsx`
A self-contained, zero-dependency version of the three dashboard toys — Zen Sand
Raker, Tone Matrix, and Falling Sand. Uses the native Web Audio API instead of
Tone.js, so it runs in any React sandbox with no installs. Pass an optional
`dominantCategory` prop to switch the Tone Matrix mood synth.
