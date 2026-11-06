# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
"""The widgets the design placed: the title strip, the tab strip, the freshness line, a
line, a round line, a seat's entry. Nothing else."""

from __future__ import annotations

import textwrap

from rich.text import Text
from textual.binding import Binding
from textual.message import Message
from textual.widgets import Static

from cw_screen import MOTTO

TABS = [("1", "Briefing"), ("2", "Strategy"), ("3", "Sparring"), ("4", "Battle"), ("5", "Champion")]
KEY_HINTS = "Enter open · [ ] runs · q quit"
MEASURE = 70


class Plain(Static):
    """A Static that keeps the plain text it shows, for the tests and for the record."""

    plain: str = ""

    def show(self, text: Text | str) -> None:
        self.plain = text.plain if isinstance(text, Text) else str(text)
        self.update(text if isinstance(text, Text) else Text(str(text)))


class TitleStrip(Plain):
    def set_run(self, run_id: str | None, light: bool = False) -> None:
        t = Text(run_id or "no run", style="bold")
        t.append("    ")
        t.append(MOTTO, style="italic")
        self.show(t)


class TabStrip(Plain):
    def set_active(self, key: str) -> None:
        t = Text()
        for k, name in TABS:
            if t.plain:
                t.append("  ")
            t.append(f"{k} {name}", style="bold reverse" if k == key else "")
        t.append("    ")
        t.append(KEY_HINTS, style="dim")
        self.show(t)


class Freshness(Plain):
    def set_line(self, line: str, stale: bool) -> None:
        self.set_class(stale, "stale")
        self.show(Text(line))


class Line(Plain):
    """One line of the design: a label and its text, or a bare sentence."""

    def __init__(self, label: str | None = None, *, dim: bool = False, **kw):
        super().__init__(**kw)
        self.label = label
        self.add_class("line")
        if dim:
            self.add_class("dim")

    def set_text(self, text: str, dim: bool | None = None) -> None:
        t = Text()
        if self.label:
            t.append(f"{self.label}  ", style="bold")
        t.append(text)
        if dim is not None:
            self.set_class(dim, "dim")
        self.show(t)

    def set_text_and_return(self, text: str) -> "Line":
        self.set_text(text)
        return self


class RoundLine(Plain):
    def __init__(self, text: str, forming: bool = False, **kw):
        super().__init__(**kw)
        self.add_class("forming" if forming else "round")
        self.show(Text(text))


class Entry(Plain):
    """One seat's turn in the dialogue: the seat, its state or rating, the verdict line in
    bold, and the full read under Enter, wrapped at the measure. The seat's words are text,
    never markup."""

    can_focus = True
    BINDINGS = [Binding("enter", "toggle", "open the read", show=False)]

    def __init__(self, key: str, head: str, badge: str, verdict: str, read: str | None, opened: bool = False, **kw):
        super().__init__(**kw)
        self.key = key
        self.head, self.badge, self.verdict, self.read = head, badge, verdict, read
        self.opened = opened and bool(read)
        self._draw()

    def _draw(self) -> None:
        t = Text()
        t.append(self.head, style="bold")
        if self.badge:
            t.append("   ")
            t.append(self.badge, style="dim")
        t.append("\n")
        t.append(self.verdict or "(no words after the first line)", style="bold italic")
        if self.opened and self.read:
            t.append("\n\n")
            paras = [p.strip() for p in self.read.replace("\r\n", "\n").split("\n\n") if p.strip()]
            t.append("\n\n".join(textwrap.fill(" ".join(p.split()), MEASURE) for p in paras))
        self.set_class(self.opened, "opened")
        self.show(t)

    def action_toggle(self) -> None:
        if not self.read:
            return
        self.opened = not self.opened
        self._draw()
        self.post_message(self.Toggled(self.key, self.opened))

    class Toggled(Message):
        def __init__(self, key: str, opened: bool) -> None:
            super().__init__()
            self.key, self.opened = key, opened
