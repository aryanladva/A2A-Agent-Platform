# Execution Sandbox — Reference

How generated/test code actually runs without touching the host
machine directly.

## Why
A coding agent will often need to run code (tests, a script, a build
command) to verify its own output. That execution must never run
directly on the user's OS outside a contained boundary.

## Design
- Each task that needs execution gets a **short-lived container**
  (Docker) scoped to the selected project folder only — mounted
  read-write inside the container, nothing else on the host is
  reachable.
- Container image includes common language runtimes needed for the
  project (detected from the project — `package.json` → Node,
  `requirements.txt`/`pyproject.toml` → Python, etc.). Pull/build the
  right image per project type; don't ship one giant image with every
  language pre-installed.
- No network access inside the sandbox by default — code runs
  offline. If a task genuinely needs network (e.g. `npm install`),
  that's an explicit, user-visible permission per task, not a default.
- Resource limits: CPU/memory caps per container (e.g. 2 CPU, 2GB RAM,
  60s default timeout, configurable per task) so a runaway process
  can't hang the app.
- Container is destroyed after the task completes — no persistent
  state inside the sandbox; any output the user wants kept goes
  through the normal diff-approval file-write path, not by leaving
  files inside a lingering container.

## Fallback (no Docker available)
If Docker isn't installed/running, the app should clearly tell the
user "code execution requires Docker" rather than silently falling
back to running code directly on the host. Code *generation* and
*review* skills still work without Docker — only *Debug/Test* (which
needs to actually run things) is blocked until Docker is available.

## What the agent sees
The Debug/Test agent gets:
- stdout/stderr from the container
- exit code
- wall-clock time taken
It does not get raw host filesystem access — only what's inside the
mounted project folder.
