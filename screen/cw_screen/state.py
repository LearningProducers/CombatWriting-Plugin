# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
"""The run's state, from the plugin's own script, and the log's tail.

render_state runs `node <plugin>/scripts/render-state.js --run <folder>` and parses what it
prints; without --write that script touches nothing, so rendering on every change never
renders itself into a loop. read_log returns log.jsonl as a list of dicts; forming_round
finds the latest round the host announced that holds no answers yet.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from cw_screen import STATE_SCHEMA


class StateError(Exception):
    """render-state.js could not be run or did not return a state."""


def render_state(plugin_root: Path, run_dir: Path, node: str = "node", timeout: float = 30.0) -> dict:
    script = Path(plugin_root) / "scripts" / "render-state.js"
    if not script.is_file():
        raise StateError(f"no render-state.js at {script}")
    try:
        proc = subprocess.run([node, str(script), "--run", str(run_dir)], capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError:
        raise StateError(f"node not found at {node!r}") from None
    except subprocess.TimeoutExpired:
        raise StateError(f"render-state.js took longer than {timeout:.0f} s") from None
    if proc.returncode != 0:
        first = (proc.stderr or proc.stdout or "").strip().splitlines()
        raise StateError(first[0] if first else f"render-state.js exited {proc.returncode}")
    try:
        state = json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        raise StateError(f"render-state.js printed no JSON ({e.msg})") from None
    schema = state.get("schema")
    if schema != STATE_SCHEMA:
        raise StateError(f"state schema {schema}, this screen reads {STATE_SCHEMA}: update cw-screen")
    return state


def read_log(run_dir: Path) -> list[dict]:
    p = Path(run_dir) / "log.jsonl"
    if not p.is_file():
        return []
    out: list[dict] = []
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def forming_round(log: list[dict], state: dict | None) -> dict | None:
    """The latest round.announced whose round is not yet in the state's rounds."""
    known = {r.get("round") for r in (state or {}).get("rounds", [])}
    for entry in reversed(log):
        if entry.get("event") == "round.announced":
            return None if entry.get("round") in known else entry
    return None
