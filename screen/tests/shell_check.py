# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
# shell_check.py: the shell, headless, through Textual's run_test and Pilot, on a run built
# by the real plugin scripts. Pins: no command palette, no Textual Header or Footer; the title
# strip carries the run id and the motto as written; the tab strip carries the five tabs and
# the key hints; the freshness line says what it watches; the credit line is nowhere; the
# dialogue shows the round, the seat, its rating and its verdict line from the state; the
# Launch reads SEND, then BACK TO THE DRAWING BOARD naming the seat within a few sweeps after
# a new answer lands on disk and is checked; Enter opens a read as plain text; a round the
# host announced shows as forming; a tab not yet built says so; a run folder that disappears
# turns the freshness line stale with the time; a wrong plugin root is said on screen; a
# newer run appearing is followed; --light takes the light palette.
#
# Run from screen/:   uv run python tests/shell_check.py        Exit 0 on pass, 1 on failure.

from __future__ import annotations

import asyncio
import shutil
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _run import PLUGIN_ROOT, answer, finish, make_run, node, seat_more  # noqa: E402

from cw_screen import MOTTO  # noqa: E402
from cw_screen.app import CwScreen  # noqa: E402
from cw_screen.widgets import Entry  # noqa: E402

CREDIT = "Combat Writing — Learning Producers Inc., " + "Israel Hernandez, founder"
failures: list[str] = []
passes = 0


def check(cond, msg):
    global passes
    if cond:
        passes += 1
    else:
        failures.append(msg)


async def wait_for(app, pilot, pred, seconds=6.0):
    t0 = time.time()
    while time.time() - t0 < seconds:
        await pilot.pause(0.2)
        if pred(app.screen_text()):
            return time.time() - t0
    return None


async def main():
    proj, run = make_run("shell")
    app = CwScreen(project=proj, plugin_root=PLUGIN_ROOT, interval=0.2)
    async with app.run_test(size=(110, 44)) as pilot:
        took = await wait_for(app, pilot, lambda t: "8/10" in t)
        text = app.screen_text()
        check(took is not None, "shell: the first state never rendered; screen reads:\n" + text)
        check(app.ENABLE_COMMAND_PALETTE is False, "shell: the command palette is on")
        check(len(app.screen.query("Header")) == 0 and len(app.screen.query("Footer")) == 0, "shell: a Textual Header or Footer is on the screen")
        check(app.theme == "cw-dark", "shell: dark should be the default theme, got " + app.theme)
        check(run.name in text and MOTTO in text, "shell: the title strip lacks the run id or the motto")
        for tab in ("1 Briefing", "2 Strategy", "3 Sparring", "4 Battle", "5 Champion"):
            check(tab in text, "shell: tab missing: " + tab)
        check("Enter open · [ ] runs · q quit" in text, "shell: the key hints are missing")
        check(("watching " + run.name) in text and "last change" in text and "swept" in text, "shell: the freshness line is wrong: " + text.splitlines()[-1])
        check(CREDIT not in text, "shell: the credit line is on the screen")
        check("Round 01-sparring" in text and "a rating asked" in text and "1 of 2 seats answered" in text, "shell: the round line is wrong")
        check("seat-1 · Test Model (Anthropic), seat-1" in text and "8/10" in text and "The ask lands in the first line." in text, "shell: seat-1's entry is wrong")
        check("seat-2 · Test Model (Anthropic), seat-2" in text and "No answer this round. Nothing stands in for it." in text, "shell: seat-2 should be missing")
        check("LAUNCH   SEND" in text and "8/10 seat-1" in text, "shell: the launch should read SEND over seat-1's 8")
        check("seat-1 · Test Model (Anthropic), seat-1 · the fresh reader" in text and "seated · served by test-fixture" in text, "shell: the available block is wrong")
        check("Mission  not set" in text and "Objective  not set" in text, "shell: mission and objective should read not set")
        check(("RAT" + "ING: 8/10") not in text, "shell: a closed read should not show its first line")

        # A new answer lands on disk and is checked: the entry and the launch follow within a few sweeps.
        answer(run, proj, "01-sparring", "seat-2", "RAT" + "ING: 4/10\nNot ready. The close pleads.\n")
        took = await wait_for(app, pilot, lambda t: "BACK TO THE DRAWING BOARD" in t)
        text = app.screen_text()
        check(took is not None and took < 5, "shell: the new answer was not seen within 5 s")
        check("4/10 seat-2 ← sends it back" in text and "Not ready. The close pleads." in text and "2 of 2 seats answered" in text, "shell: after seat-2's 4/10 the launch should name it:\n" + text)

        # Enter opens the read as plain text.
        first = app.screen.query(Entry).first()
        first.focus()
        await pilot.pause(0.1)
        await pilot.press("enter")
        await pilot.pause(0.2)
        text = app.screen_text()
        check(("RAT" + "ING: 8/10") in text, "shell: Enter should open the full read")
        await pilot.press("enter")
        await pilot.pause(0.2)
        check(("RAT" + "ING: 8/10") not in app.screen_text(), "shell: Enter again should close the read")

        # The host announces a round: it shows as forming until its folder holds answers.
        node("announce.js", ["--run", str(run), "--round", "02-battle", "--kind", "N", "--to", "seat-1,seat-2", "--rerate"], proj)
        took = await wait_for(app, pilot, lambda t: "forming" in t)
        check(took is not None and "Round 02 forming: N to 2 seats" in app.screen_text(), "shell: the forming line did not show")

        # A tab not yet built says so; 1 returns.
        await pilot.press("3")
        await pilot.pause(0.3)
        text = app.screen_text()
        check("Sparring: this screen is built in Part 47" in text and run.name in text and "watching" in text, "shell: tab 3 should say it is not built yet, with the chrome")
        await pilot.press("1")
        await pilot.pause(0.3)
        check("LAUNCH" in app.screen_text(), "shell: tab 1 should return to the briefing")

        # A newer run appears: the screen follows it.
        (proj / "draft2.md").write_text("Second draft, new run.\n")
        r = node("new-run.js", ["--draft", "draft2.md", "--name", "zz-newer", "--stage", "battle", "--model", "Test Model"], proj)
        newer = Path(r.stdout.strip())
        took = await wait_for(app, pilot, lambda t: newer.name in t)
        check(took is not None and "No rounds yet" in app.screen_text(), "shell: a newer run should be followed: " + app.screen_text().splitlines()[0])
        # [ goes back to the earlier run and pins it.
        await pilot.press("bracketleft")
        took = await wait_for(app, pilot, lambda t: run.name in t.splitlines()[0])
        check(took is not None, "shell: [ should move to the earlier run")

        # The run folder disappears: stale, with the time.
        shutil.rmtree(run)
        took = await wait_for(app, pilot, lambda t: "STALE since" in t)
        check(took is not None and "could not be read" in app.screen_text(), "shell: a gone folder should turn the line stale")

    # A wrong plugin root is said on screen; --light takes the light palette.
    app2 = CwScreen(project=proj, plugin_root=proj, light=True, interval=0.2, env={})
    async with app2.run_test(size=(100, 30)) as pilot:
        await pilot.pause(0.5)
        t = app2.screen_text()
        check(app2.theme == "cw-light", "shell: --light should take the light palette")
        check("STALE" in t and "has no" in t and "render-state.js" in t, "shell: a wrong plugin root should be said: " + t.splitlines()[-1])
    shutil.rmtree(proj, ignore_errors=True)


asyncio.run(main())
finish("shell_check", failures, passes)
