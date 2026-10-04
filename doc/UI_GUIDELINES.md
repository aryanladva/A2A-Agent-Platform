# UI Guidelines — Desktop Coding Agent

Simple, clean, net — no clutter. This is a tool for coders, not a
marketing dashboard. Every screen should answer "what's happening to
my code right now" at a glance.

## Principles
- **One primary view at a time.** No nested modals inside modals.
- **Monospace for anything code-related** (diffs, file paths, logs).
  Sans-serif for everything else.
- **Diffs are the hero UI element** — this is the one thing the user
  must never misread. Red/green, line-numbered, syntax-highlighted.
- **No unnecessary chrome.** No marketing copy, no onboarding
  carousels, no empty-state illustrations. A blank project state just
  says "Select a project folder to begin."

## Color palette (dark-first, light mode optional)
| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0d1117` | `#ffffff` | App background |
| `--surface` | `#161b22` | `#f6f8fa` | Panels, cards |
| `--border` | `#30363d` | `#d0d7de` | Dividers |
| `--text` | `#e6edf3` | `#1f2328` | Primary text |
| `--text-dim` | `#8b949e` | `#656d76` | Secondary text |
| `--accent` | `#58a6ff` | `#0969da` | Active state, links |
| `--diff-add` | `#2ea043` | `#1a7f37` | Added lines |
| `--diff-del` | `#f85149` | `#cf222e` | Removed lines |

Two colors total for brand/accent (per earlier decision): `--accent`
for interactive elements, neutral grays for everything else.

## Layout
```
┌─────────────┬──────────────────────────────┐
│             │                               │
│  File tree  │   Chat / task panel           │
│  (project)  │   (requests + streamed        │
│             │    progress)                  │
│             │                               │
├─────────────┴──────────────────────────────┤
│  Diff viewer (expands when a change is      │
│  proposed — collapsed otherwise)             │
└───────────────────────────────────────────────┘
```
- Left sidebar: file tree of the selected project (collapsible)
- Center: chat/task panel — this is where the user types a request
  and sees agent progress stream in
- Bottom panel: diff viewer, only visible when there's a pending
  change to approve/reject

## Typography
- UI text: system font stack (`-apple-system, Segoe UI, sans-serif`)
- Code/diffs/logs: `ui-monospace, "Cascadia Code", Consolas, monospace`
- Base size 14px, diffs 13px for density

## Interaction rules
- Every agent action that touches a file produces a diff — never a
  silent write. The diff viewer is where the user clicks Approve /
  Reject per file, not per hunk (keep it simple).
- Task status badges: `queued` (gray), `running` (accent, pulsing dot),
  `done` (green), `failed` (red) — no more than these four states
  shown in the UI.
- No sound, no browser-style notifications badge spam — one subtle
  system notification only when a long task completes while the
  window isn't focused.

## What to deliberately leave out (keeps it simple)
- No themes marketplace, no plugin store UI (plugins are config-level
  for now, not a UI feature)
- No telemetry/analytics dashboard in v1
- No multi-project tabs in v1 — one project open at a time
