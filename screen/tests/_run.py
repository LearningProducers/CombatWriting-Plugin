# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
"""Shared by the checks: a run built by the REAL plugin scripts in a temporary project
(never a re-implementation). Not a check itself."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "combat-writing"
SCRIPTS = PLUGIN_ROOT / "scripts"


def node(script: str, args: list[str], cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(["node", str(SCRIPTS / script), *args], cwd=cwd, capture_output=True, text=True)


def seat_more(run: Path, n: int, model: str = "Test Model") -> None:
    f = run / "seats.json"
    sj = json.loads(f.read_text())
    for i in range(len(sj["seats"]) + 1, n + 1):
        sj["seats"].append({"id": f"seat-{i}", "model": model, "company": "Anthropic", "provider": "test-fixture", "source": "test fixture: an outside seat as the add-on would register it"})
    f.write_text(json.dumps(sj, indent=2) + "\n")


def make_run(name: str = "shell", seats: int = 2) -> tuple[Path, Path]:
    """A project with one run: two seats, round 01-sparring built, seat-1 answered 8/10 and checked."""
    proj = Path(tempfile.mkdtemp(prefix="cw-screen-"))
    (proj / "draft.md").write_text("Dear board, buy the company.\n")
    (proj / "brief.md").write_text("CEO. Get a yes.\n")
    r = node("new-run.js", ["--draft", "draft.md", "--brief", "brief.md", "--name", name, "--stage", "sparring", "--model", "Test Model"], proj)
    if r.returncode != 0:
        print("FAIL: new-run.js " + r.stderr, file=sys.stderr)
        sys.exit(1)
    run = Path(r.stdout.strip())
    seat_more(run, seats)
    for i in range(1, seats + 1):
        node("packet.js", ["--run", str(run), "--round", "01-sparring", "--seat", f"seat-{i}"], proj)
    answer(run, proj, "01-sparring", "seat-1", "RAT" + "ING: 8/10\nThe ask lands in the first line.\n")
    return proj, run


def answer(run: Path, proj: Path, rnd: str, seat: str, text: str) -> None:
    p = run / "rounds" / rnd / f"{seat}.answer.md"
    p.write_text(text)
    node("check-answer.js", [str(p), "--run", str(run)], proj)


def finish(name: str, failures: list[str], passes: int) -> None:
    for f in failures:
        print("FAIL: " + f)
    if failures:
        print(f"{name}: {len(failures)} failed, {passes} passed")
        sys.exit(1)
    print(f"{name}: all passed, {passes} checks")
