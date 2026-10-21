# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
"""The Briefing, the first screen, in its read-only form (Part 44): Mission and Objective
(not set until Part 45 writes them), the adjutant (Part 45), the dialogue of the seats
round by round as the files land, the bench and who is seated, and the Launch block. Not a
board, nothing a card, not a form."""

from __future__ import annotations

from textual.app import ComposeResult
from textual.containers import Vertical
from textual.widgets import Static

from cw_screen.screens import Chrome
from cw_screen.widgets import Entry, Launch, Line, RoundLine


def seat_head(seat: dict) -> str:
    return f"{seat['id']} · {seat['label']}"


def badge_of(cell: dict) -> str:
    kind = cell.get("kind")
    if kind in ("missing", "not-asked"):
        return cell.get("text", kind)
    if kind == "failed":
        return "failed read" + (f" · {cell['mark']}" if cell.get("mark") else "")
    if kind == "critique":
        return "critique, no rating asked" + (f" · {cell['mark']}" if cell.get("mark") else "")
    return f"{cell.get('rating')}/10" + (f" · {cell['mark']}" if cell.get("mark") else "")


def verdict_of(cell: dict) -> str:
    kind = cell.get("kind")
    if kind == "missing":
        return "No answer this round. Nothing stands in for it."
    if kind == "not-asked":
        return "Not asked this round."
    if kind == "failed":
        reasons = cell.get("reasons") or []
        return "Failed read: " + (reasons[0] if reasons else "the contract was broken") + "."
    return cell.get("verdict_line") or ""


def final_head(cell: dict) -> str:
    return cell.get("text", "")


class Briefing(Chrome):
    TAB = "1"

    def __init__(self, **kw):
        super().__init__(**kw)
        self.opened: set[str] = set()

    def body(self) -> ComposeResult:
        yield Line("Mission", id="mission", dim=True)
        yield Line("Objective", id="objective", dim=True)
        yield Static("ADJUTANT", classes="heading")
        yield Line(id="adjutant", dim=True)
        yield Static("THE DIALOGUE", classes="heading")
        yield Vertical(id="dialogue")
        yield Static("AVAILABLE", classes="heading")
        yield Vertical(id="available")
        yield Launch(id="launch")

    def on_mount(self) -> None:
        super().on_mount()
        self.query_one("#mission", Line).set_text("not set")
        self.query_one("#objective", Line).set_text("not set")
        self.query_one("#adjutant", Line).set_text("not set: the adjutant speaks when the briefing lands (Part 45)")
        self.query_one("#launch", Launch).set_band(None)

    def on_entry_toggled(self, msg: Entry.Toggled) -> None:
        if msg.opened:
            self.opened.add(msg.key)
        else:
            self.opened.discard(msg.key)

    def apply(self, state: dict | None, forming: dict | None) -> None:
        briefing = (state or {}).get("briefing") or {}
        mission = (briefing.get("mission") or {}).get("text")
        objective = (briefing.get("objective") or {}).get("text")
        self.query_one("#mission", Line).set_text(mission or "not set", dim=not mission)
        self.query_one("#objective", Line).set_text(objective or "not set", dim=not objective)
        adj = briefing.get("adjutant") or {}
        self.query_one("#adjutant", Line).set_text(adj.get("frame") or "not set: the adjutant speaks when the briefing lands (Part 45)", dim=not adj.get("frame"))
        self._dialogue(state, forming)
        self._available(state)
        self.query_one("#launch", Launch).set_band((state or {}).get("band"))

    def _dialogue(self, state: dict | None, forming: dict | None) -> None:
        box = self.query_one("#dialogue", Vertical)
        focused = self.app.focused.key if isinstance(self.app.focused, Entry) else None
        box.remove_children()
        widgets = []
        seats = {s["id"]: s for s in (state or {}).get("seats", [])}
        rounds = (state or {}).get("rounds", [])
        if not rounds and not forming:
            widgets.append(Line(dim=True, id="noround"))
        for r in rounds:
            put = r.get("put_to", [])
            head = f"Round {r['round']} · {r.get('task_line', '')}"
            if r.get("rating_line"):
                head += f" · {r['rating_line']}"
            head += f" · {len(r.get('answered', []))} of {len(put)} seat{'s' if len(put) != 1 else ''} answered"
            widgets.append(RoundLine(head))
            for sid in put:
                cell = r.get("cells", {}).get(sid) or {}
                seat = seats.get(sid, {"id": sid, "label": sid})
                key = f"{r['round']}:{sid}"
                if r.get("final"):
                    read = "\n\n".join(x.get("answer") or "" for x in (cell.get("sn"), cell.get("redflag")) if x and x.get("answer"))
                    widgets.append(Entry(key, seat_head(seat), final_head(cell), "", read or None, key in self.opened))
                else:
                    note = f"  (your note: “{cell['note']}”)" if cell.get("note") else ""
                    widgets.append(Entry(key, seat_head(seat) + note, badge_of(cell), verdict_of(cell), cell.get("answer"), key in self.opened))
        if forming:
            widgets.append(RoundLine(forming.get("line") or f"Round {forming.get('round')} forming", forming=True))
        box.mount_all(widgets)
        if not rounds and not forming:
            self.query_one("#noround", Line).set_text((state or {}).get("no_rounds_line") or "No run yet.")
        if focused:
            for w in box.query(Entry):
                if w.key == focused:
                    w.focus()
                    break

    def _available(self, state: dict | None) -> None:
        box = self.query_one("#available", Vertical)
        box.remove_children()
        lines = []
        for s in (state or {}).get("seats", []):
            where = "the fresh reader" if s.get("fresh_reader") else f"seated · served by {s.get('served_by') or s.get('provider')}"
            lines.append(Line().set_text_and_return(f"{s['id']} · {s['label']} · {where}"))
        for extra in (state or {}).get("seats_lines", []):
            lines.append(Line(dim=True).set_text_and_return(extra))
        if not lines:
            lines.append(Line(dim=True).set_text_and_return("no run yet"))
        box.mount_all(lines)
