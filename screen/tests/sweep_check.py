# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
# sweep_check.py: the one-second sweep sees a file landing within one check, and the
# freshness line is never silent about stale. Pins: the first check of a folder counts as a
# change and the second does not; a new file, a changed file and a removed file are changes;
# the line says when the folder last changed and when the screen last looked; a folder that
# is gone turns the line stale with the time and the reason; a state error turns it stale;
# ago() formats; list_runs returns run folders (seats.json present) oldest first.
#
# Run from screen/:   uv run python tests/sweep_check.py        Exit 0 on pass, 1 on failure.

from __future__ import annotations

import shutil
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _run import finish  # noqa: E402

from cw_screen.sweep import Sweep, ago, freshness_line, list_runs  # noqa: E402

failures: list[str] = []
passes = 0


def check(cond, msg):
    global passes
    if cond:
        passes += 1
    else:
        failures.append(msg)


root = Path(tempfile.mkdtemp(prefix="cw-sweep-"))
(root / "rounds" / "01-sparring").mkdir(parents=True)
(root / "seats.json").write_text("{}")
now = [1000.0]
sw = Sweep(root, clock=lambda: now[0])
check(sw.check() is True, "sweep: the first check should count as a change")
now[0] += 1
check(sw.check() is False, "sweep: nothing changed, the second check should say so")
now[0] += 1
(root / "rounds" / "01-sparring" / "seat-1.answer.md").write_text("x\n")
check(sw.check() is True and sw.changes[-1] == ["rounds/01-sparring/seat-1.answer.md"], "sweep: a new file was not seen: " + str(sw.changes))
now[0] += 1
check(sw.check() is False, "sweep: the new file counted twice")
now[0] += 1
(root / "rounds" / "01-sparring" / "seat-1.answer.md").write_text("longer text\n")
check(sw.check() is True, "sweep: a changed file was not seen")
now[0] += 1
(root / "seats.json").unlink()
check(sw.check() is True and sw.changes[-1] == ["seats.json"], "sweep: a removed file was not seen")
line = freshness_line(sw, "2026-10-21-1200-run", now=now[0] + 4.3)
check(line == "watching 2026-10-21-1200-run · last change 00:04 ago · swept 4.3 s ago", "sweep: the freshness line reads: " + line)
check(freshness_line(sw, None, now=now[0]).startswith("watching: no run yet"), "sweep: no run should say so")
err = freshness_line(sw, "r", now=now[0], state_error="state schema 2, this screen reads 1: update cw-screen")
check(err.startswith("STALE since ") and err.endswith("— state schema 2, this screen reads 1: update cw-screen"), "sweep: a state error should read stale: " + err)
shutil.rmtree(root)
now[0] += 1
check(sw.check() is False and sw.stale_since == now[0] and "could not be read" in (sw.stale_reason or ""), "sweep: a gone folder should be stale with the time: " + str((sw.stale_since, sw.stale_reason)))
st = freshness_line(sw, "r", now=now[0])
check(st.startswith("STALE since ") and "could not be read" in st, "sweep: the stale line reads: " + st)
check(ago(4) == "00:04" and ago(65) == "01:05" and ago(3661) == "1:01:01" and ago(-2) == "00:00", "sweep: ago() formats wrong")

proj = Path(tempfile.mkdtemp(prefix="cw-runs-"))
runs = proj / "combat-writing" / "runs"
for n in ("2026-10-21-1300-b", "2026-10-21-1200-a", "2026-10-21-1400-c"):
    (runs / n).mkdir(parents=True)
    (runs / n / "seats.json").write_text("{}")
(runs / "2026-10-21-1500-not-a-run").mkdir()
(runs / "stray.txt").write_text("")
check([p.name for p in list_runs(proj)] == ["2026-10-21-1200-a", "2026-10-21-1300-b", "2026-10-21-1400-c"], "sweep: list_runs wrong: " + str([p.name for p in list_runs(proj)]))
check(list_runs(Path(tempfile.mkdtemp())) == [], "sweep: a project with no runs folder should list none")
shutil.rmtree(proj, ignore_errors=True)
finish("sweep_check", failures, passes)
