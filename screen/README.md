<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# The Combat Writing™ screen

**Reading is Peace. Writing is War.**

The screen is the Combat Writing plugin's full-screen terminal interface: a second terminal tab that shows the current run live while the slash commands run in Claude Code. It renders; it never computes the run. Every number on it is the output of the plugin's own `render-state.js`, read from the run folder it watches, so the rating that leads every result is the same number the record and the board show. It writes nothing inside a run folder, calls no provider and reads no key. The browser board keeps opening after every round as it does today, with the screen watching or not.

This folder is part of the plugin's repository and is source-available under the same terms: you can read every file and run the screen under the terms in the repository's [NOTICE](../NOTICE); it is not released under an OSI-approved license.

## Install

The screen is a Python package on Textual, installed as a tool with uv. uv is installed user-level on your own account, by your own hand, from the official standalone installer, never with sudo; it provides its own Python, so your system's Python is not used.

```
uv tool install "git+https://github.com/LearningProducers/CombatWriting-Plugin@cw-screen--v0.1.0#subdirectory=screen"
```

Node must be on your PATH: the screen runs the plugin's scripts with it, as Claude Code does.

## Launch

In your project folder, in a second terminal tab:

```
cw-screen
```

It follows the newest run under `combat-writing/runs/`; a newer run appearing switches it; `[` and `]` move between runs and pin the choice; `--run <folder>` pins one from the start; `--light` takes the light palette (dark is the default); `--plugin-root <folder>` names the plugin's folder when the screen cannot find it (it looks in `CW_PLUGIN_ROOT`, then in Claude Code's plugin cache for the newest `cw`, then in a repository checkout).

## What is on the first screen

The title strip (the run id and the motto). Mission and Objective (set by the briefing, Part 45). The adjutant (Part 45). The dialogue: the seats in turn, round by round as the files land, each with its rating or its state and its verdict line in bold; Enter opens the full read as plain text at a 70-character measure. Available: the bench and who is seated, with the plugin's own next-command sentences when the crew is short. Launch: lit green on SEND, dark red on BACK TO THE DRAWING BOARD naming the seat, grey over the two numbers on final reads, dim with no rating; 7 is never a rating and never shown. The tab strip at the bottom with its key hints, and last the freshness line: `watching <run> · last change 00:04 ago · swept 0.3 s ago`. Stale is never silent: a folder that cannot be read, or a state the script could not render, turns that line red with the time and the reason.

## Checks

From `screen/`: `uv sync --frozen`, then `uv run python tests/<name>_check.py` for each of `state_check`, `sweep_check`, `shell_check` and `no_method_text_check`. They build a run with the real plugin scripts in a temporary folder and drive the app headless; no provider is called.
