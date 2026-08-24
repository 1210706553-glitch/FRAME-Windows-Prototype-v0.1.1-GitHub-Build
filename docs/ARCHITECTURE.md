# v0.2 Architecture

## Current boundary

The shipped vertical slice is deliberately small:

- `src/lib/planner.ts` owns deterministic task templates, scheduling, progress and replanning.
- `src/types.ts` defines the versioned local state contract.
- `src/App.tsx` owns onboarding, today, plan, focus, review and settings views.
- State is stored under `mickey-toolkit.state.v2` in the local WebView2 profile.
- Tauri supplies the Windows application shell, logging, native notifications, autostart and a system tray.
- `src/lib/reminders.ts` is a deterministic reminder policy; `native-reminders.ts` is the thin Tauri adapter.

There is no media player, video file pipeline, transcription, database or XML exporter in this release.

## Next native boundary

Windows distraction enforcement must be added behind narrow Tauri commands. Every system change must be reversible, log its original state and recover after an abnormal exit. DeepSeek support belongs to a separate optional adapter and may only create suggestions for stages 1–3.
