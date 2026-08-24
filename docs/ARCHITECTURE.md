# v0.6 Architecture

## Current boundary

The shipped vertical slice is deliberately small:

- `src/lib/planner.ts` owns deterministic task templates, scheduling, progress and replanning.
- `src/types.ts` defines the versioned local state contract.
- `src/App.tsx` owns onboarding, today, plan, focus, review and settings views.
- State is stored under `mickey-toolkit.state.v2` in the local WebView2 profile.
- Tauri supplies the Windows application shell, logging, native notifications, autostart and a system tray.
- `src/lib/reminders.ts` is a deterministic reminder policy; `native-reminders.ts` is the thin Tauri adapter.
- `src/lib/subtitles.ts` validates and normalizes local SRT/TXT input without making network requests.
- `src/lib/deepseek.ts` exposes only key status, key management and a single subtitle-analysis command.
- Rust stores the DeepSeek key in Windows Credential Manager and performs the HTTPS request so the secret never enters localStorage.
- Schema v4 stores the edited transcript and editable planning result; v2/v3 states migrate in place without changing the application identifier.
- `src/lib/app-updater.ts` is the narrow Tauri updater adapter. Browser previews return an explicit unsupported state and never simulate an update.
- The app performs one delayed startup check, prompts only when a signed newer release exists, and defers the prompt during focus.
- GitHub Releases provide the public `latest.json`; Tauri verifies every NSIS update with the embedded public key before installation.
- Signing private material exists only in GitHub Actions Secrets. Normal pushes build and test; a separate manually triggered workflow publishes releases.

There is no media player, video file pipeline, transcription, database or XML exporter in this release. AI is limited to stages 1–3 and only replaces unfinished tasks in those stages after explicit user confirmation.

## Next native boundary

Website distraction enforcement remains a later, separate boundary. It must not be represented as active until a reversible Windows implementation and recovery path have passed real-device testing.
