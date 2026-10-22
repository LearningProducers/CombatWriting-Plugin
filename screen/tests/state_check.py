# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
# state_check.py: the screen reads the run through the plugin's own render-state.js and
# holds no rule of the method. Pins: render_state parses the JSON of a run built by the real
# scripts (schema 1, the run id, the seats, the band); a folder with no seats.json and a wrong
# plugin root raise StateError with the reason; read_log parses the log; forming_round returns
# the announced round that holds no answers yet and nothing once the round is built; the
# plugin root is found by argument, by variable, in the cache layout and in the checkout.
#
# Run from screen/:   uv run python tests/state_check.py        Exit 0 on pass, 1 on failure.

from __future__ import annotations

import os
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _run import PLUGIN_ROOT, finish, make_run, node  # noqa: E402

from cw_screen.plugin import cache_candidates, find_plugin_root  # noqa: E402
from cw_screen.state import StateError, forming_round, read_log, render_state  # noqa: E402

failures: list[str] = []
passes = 0


def check(cond, msg):
    global passes
    if cond:
        passes += 1
    else:
        failures.append(msg)


proj, run = make_run("state")
st = render_state(PLUGIN_ROOT, run)
check(st["schema"] == 1 and st["run"]["id"] == run.name and st["run"]["stage_started"] == "sparring", "state: wrong run block " + str(st.get("run")))
check([s["id"] for s in st["seats"]] == ["seat-1", "seat-2"] and st["seats"][0]["fresh_reader"] is True, "state: seats wrong")
check(len(st["rounds"]) == 1 and st["rounds"][0]["cells"]["seat-1"]["rating"] == 8 and st["rounds"][0]["cells"]["seat-2"]["kind"] == "missing", "state: round cells wrong")
check(st["band"]["verdict"] == "SEND", "state: band should be SEND with one seat at 8, got " + str(st["band"].get("verdict")))

try:
    render_state(PLUGIN_ROOT, proj)
    check(False, "state: a folder with no seats.json should raise")
except StateError as e:
    check("no seats.json" in str(e), "state: wrong reason for a non-run folder: " + str(e))
try:
    render_state(proj, run)
    check(False, "state: a wrong plugin root should raise")
except StateError as e:
    check("no render-state.js" in str(e), "state: wrong reason for a bad plugin root: " + str(e))
try:
    render_state(PLUGIN_ROOT, run, node="/no/such/node")
    check(False, "state: a missing node should raise")
except StateError as e:
    check("node not found" in str(e), "state: wrong reason for a missing node: " + str(e))

log = read_log(run)
check(any(e.get("event") == "run.created" for e in log) and any(e.get("event") == "answer.checked" for e in log), "state: read_log misses events")
check(forming_round(log, st) is None, "state: no round announced, forming must be None")
node("announce.js", ["--run", str(run), "--round", "02-battle", "--kind", "N", "--to", "seat-1,seat-2", "--rerate"], proj)
log = read_log(run)
f = forming_round(log, st)
check(f is not None and f["round"] == "02-battle" and f["kind"] == "N" and "forming" in f["line"], "state: the announced round should be forming: " + str(f))
node("packet.js", ["--run", str(run), "--round", "02-battle", "--seat", "seat-1", "--rerate"], proj)
st2 = render_state(PLUGIN_ROOT, run)
check(forming_round(read_log(run), st2) is None, "state: once the round is built it is no longer forming")
check(read_log(proj) == [], "state: a folder with no log reads as empty")

# The plugin root.
check(find_plugin_root(PLUGIN_ROOT)[0] == PLUGIN_ROOT.resolve() and find_plugin_root(PLUGIN_ROOT)[1] == "--plugin-root", "plugin: explicit root not taken")
r, how = find_plugin_root(proj, env={})
check(r is None and "has no" in how, "plugin: a bad explicit root should say so: " + how)
r, how = find_plugin_root(None, env={"CW_PLUGIN_ROOT": str(PLUGIN_ROOT)}, home=proj)
check(r == PLUGIN_ROOT.resolve() and how == "CW_PLUGIN_ROOT", "plugin: the variable route failed: " + how)
home = Path(tempfile.mkdtemp(prefix="cw-home-"))
for v in ("0.7.2", "0.10.0", "0.8.0"):
    d = home / ".claude" / "plugins" / "cache" / "learning-producers" / "cw" / v / "scripts"
    d.mkdir(parents=True)
    (d / "render-state.js").write_text("")
cands = cache_candidates(home)
check([c.name for c in cands] == ["0.10.0", "0.8.0", "0.7.2"], "plugin: cache candidates not newest first by version: " + str([c.name for c in cands]))
r, how = find_plugin_root(None, env={}, home=home)
check(r == cands[0] and how == "plugin cache, cw 0.10.0", "plugin: the cache route failed: " + how)
r, how = find_plugin_root(None, env={}, home=proj)
check(r == PLUGIN_ROOT.resolve() and how == "repository checkout", "plugin: the checkout route failed: " + how)

shutil.rmtree(proj, ignore_errors=True)
shutil.rmtree(home, ignore_errors=True)
finish("state_check", failures, passes)
