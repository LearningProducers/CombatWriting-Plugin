# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
"""The shell: one Textual app in its own terminal tab, watching a run folder.

It follows the newest run under <project>/combat-writing/runs/ (a newer run appearing
switches it; [ and ] move between runs and pin the choice; --run pins one from the start),
sweeps the run folder every second, and on any change runs the plugin's render-state.js in a
worker thread and redraws from the JSON. The freshness line always says when the folder last
changed and when the screen last looked; stale is never silent. The screen writes nothing
inside a run folder, calls no provider and reads no key. Nothing the design did not place:
no command palette, no Textual Header or Footer, no notifications.
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from textual.app import App
from textual.binding import Binding

from cw_screen import __version__
from cw_screen.palette import CW_DARK, CW_LIGHT
from cw_screen.plugin import find_node, find_plugin_root
from cw_screen.screens import Chrome
from cw_screen.screens.briefing import Briefing
from cw_screen.state import StateError, forming_round, read_log, render_state
from cw_screen.sweep import Sweep, freshness_line, list_runs
from cw_screen.widgets import TABS, Line


class NotYet(Chrome):
    """A tab whose screen is built in Part 47. The data is already in the state."""

    def __init__(self, tab: str, name: str, **kw):
        super().__init__(**kw)
        self.TAB = tab
        self.name_ = name

    def body(self):
        yield Line(id="notyet", dim=True)

    def on_mount(self) -> None:
        super().on_mount()
        self.query_one("#notyet", Line).set_text(f"{self.name_}: this screen is built in Part 47. Its data is already in the state.")


class CwScreen(App):
    ENABLE_COMMAND_PALETTE = False
    CSS_PATH = "screen.tcss"
    BINDINGS = [
        Binding("q", "quit", "quit", show=False),
        Binding("bracketleft", "prev_run", "earlier run", show=False),
        Binding("bracketright", "next_run", "later run", show=False),
    ] + [Binding(k, f"tab('{k}')", name, show=False) for k, name in TABS]

    def __init__(self, project: str | Path = ".", run: str | Path | None = None, plugin_root: str | Path | None = None, light: bool = False, interval: float = 1.0, env: dict | None = None, home: Path | None = None):
        super().__init__()
        # The themes first: the stylesheet is parsed with the current theme's variables.
        self.register_theme(CW_DARK)
        self.register_theme(CW_LIGHT)
        self.theme = "cw-light" if light else "cw-dark"
        self.project = Path(project).resolve()
        self.pinned: Path | None = Path(run).resolve() if run else None
        self.run_dir: Path | None = self.pinned
        self.plugin_root, self.plugin_how = find_plugin_root(plugin_root, env=env, home=home)
        self.node = find_node()
        self.light = light
        self.interval = interval
        self.sweep: Sweep | None = None
        self.state: dict | None = None
        self.forming: dict | None = None
        self.state_error: str | None = None
        self.rendering = False
        self.pending = False
        self.ticks = 0
        self.screens_by_tab: dict[str, Chrome] = {}

    @property
    def run_id(self) -> str | None:
        return self.run_dir.name if self.run_dir else None

    def on_mount(self) -> None:
        # Installed screens persist across switches, so a tab keeps its folds and focus.
        self.screens_by_tab["1"] = Briefing()
        for k, name in TABS[1:]:
            self.screens_by_tab[k] = NotYet(k, name)
        for k, screen in self.screens_by_tab.items():
            self.install_screen(screen, name=k)
        self.push_screen("1")
        if not self.plugin_root:
            self.state_error = self.plugin_how
        elif not self.node:
            self.state_error = "node not found on PATH: the screen runs the plugin's scripts with Node"
        self._discover()
        self.tick()
        self.set_interval(self.interval, self.tick)

    # The run being watched.
    def _discover(self) -> None:
        if self.pinned:
            self.run_dir = self.pinned
        else:
            runs = list_runs(self.project)
            newest = runs[-1] if runs else None
            if newest and newest != self.run_dir:
                self.run_dir = newest
                self.state, self.forming = None, None
                self.sweep = None
        if self.run_dir and (self.sweep is None or self.sweep.root != self.run_dir):
            self.sweep = Sweep(self.run_dir)
            self.state, self.forming = None, None
            for s in self.screens_by_tab.values():
                if s.is_mounted:
                    s.set_run(self.run_id)

    def _move_run(self, step: int) -> None:
        runs = list_runs(self.project)
        if not runs:
            return
        try:
            i = runs.index(self.run_dir) if self.run_dir else len(runs) - 1
        except ValueError:
            i = len(runs) - 1
        j = max(0, min(len(runs) - 1, i + step))
        self.pinned = runs[j]
        self._discover()
        self.tick()

    def action_prev_run(self) -> None:
        self._move_run(-1)

    def action_next_run(self) -> None:
        self._move_run(1)

    def action_tab(self, key: str) -> None:
        screen = self.screens_by_tab.get(key)
        if screen and self.screen is not screen:
            self.switch_screen(key)

    # The sweep and the render.
    def tick(self) -> None:
        self.ticks += 1
        if not self.pinned:
            self._discover()
        changed = False
        if self.sweep:
            changed = self.sweep.check()
        if changed and self.plugin_root and self.node:
            self.request_render()
        self._fresh()

    def request_render(self) -> None:
        if self.rendering:
            self.pending = True
            return
        self.rendering = True
        run_dir, root, node = self.run_dir, self.plugin_root, self.node
        self.run_worker(lambda: self._render(run_dir, root, node), thread=True, group="render", exclusive=False)

    def _render(self, run_dir: Path, root: Path, node: str) -> None:
        try:
            state = render_state(root, run_dir, node=node)
            log = read_log(run_dir)
            result, error = (state, forming_round(log, state)), None
        except StateError as e:
            result, error = None, str(e)
        self.call_from_thread(self._rendered, run_dir, result, error)

    def _rendered(self, run_dir: Path, result, error: str | None) -> None:
        self.rendering = False
        if run_dir == self.run_dir:
            if error:
                self.state_error = error
            else:
                self.state_error = None
                self.state, self.forming = result
                screen = self.screen
                if isinstance(screen, Chrome):
                    screen.apply(self.state, self.forming)
        if self.pending:
            self.pending = False
            self.request_render()
        self._fresh()

    def _fresh(self) -> None:
        screen = self.screen
        if not isinstance(screen, Chrome) or not screen.is_mounted:
            return
        if self.sweep is None:
            line = f"watching: no run under {self.project / 'combat-writing' / 'runs'}; waiting" if not self.state_error else f"STALE — {self.state_error}"
            screen.set_fresh(line, bool(self.state_error))
            return
        line = freshness_line(self.sweep, self.run_id, state_error=self.state_error)
        screen.set_fresh(line, line.startswith("STALE"))

    def screen_text(self) -> str:
        """Every plain line the current screen shows, top to bottom, for the tests."""
        from cw_screen.widgets import Plain
        return "\n".join(w.plain for w in self.screen.query(Plain))


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="cw-screen", description="The Combat Writing screen: watch a run live in your own terminal tab.")
    ap.add_argument("--project", default=".", help="the project folder holding combat-writing/runs/ (default: here)")
    ap.add_argument("--run", default=None, help="pin one run folder instead of following the newest")
    ap.add_argument("--plugin-root", default=None, help="the cw plugin's folder (the one holding scripts/render-state.js)")
    ap.add_argument("--light", action="store_true", help="the light palette (dark is the default)")
    ap.add_argument("--interval", type=float, default=1.0, help="seconds between sweeps (default 1)")
    ap.add_argument("--version", action="version", version=f"cw-screen {__version__}")
    args = ap.parse_args(argv)
    if not sys.stdout.isatty():
        print("cw-screen needs a terminal: open it in its own tab.", file=sys.stderr)
        sys.exit(2)
    CwScreen(project=args.project, run=args.run, plugin_root=args.plugin_root, light=args.light, interval=args.interval).run()
