# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
"""The screens, one per tab. Each is a whole terminal: the title strip, the body, the tab
strip and the freshness line, composed by the design and nothing else."""

from __future__ import annotations

from textual.app import ComposeResult
from textual.containers import Vertical, VerticalScroll
from textual.screen import Screen

from cw_screen.widgets import Freshness, TabStrip, TitleStrip


class Chrome(Screen):
    """The chrome every tab shares. A subclass fills the body and reacts to a new state."""

    TAB = "1"

    def compose(self) -> ComposeResult:
        yield TitleStrip(id="title")
        with VerticalScroll(id="body"):
            yield from self.body()
        with Vertical(id="foot"):
            yield TabStrip(id="tabs")
            yield Freshness(id="fresh")

    def body(self) -> ComposeResult:
        yield from ()

    def on_mount(self) -> None:
        self.query_one("#tabs", TabStrip).set_active(self.TAB)
        self.query_one("#title", TitleStrip).set_run(self.app.run_id)
        self.query_one("#fresh", Freshness).set_line("starting", False)

    def on_screen_resume(self) -> None:
        # Shown again (or first): draw from what the app holds, then the freshness line.
        self.set_run(self.app.run_id)
        self.apply(self.app.state, self.app.forming)
        self.app._fresh()

    def set_run(self, run_id: str | None) -> None:
        self.query_one("#title", TitleStrip).set_run(run_id)

    def set_fresh(self, line: str, stale: bool) -> None:
        self.query_one("#fresh", Freshness).set_line(line, stale)

    def apply(self, state: dict | None, forming: dict | None) -> None:
        """A new state from the disk. Subclasses redraw from it."""
