# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
"""The palette: the board's CSS variables (render-board.js), so the two presentations share
one set of colors. Dark is the default in a terminal; --light takes the other set."""

from __future__ import annotations

from textual.theme import Theme

DARK = {
    "surface": "#171614", "paper": "#1f1e1b", "surface-2": "#262522",
    "ink": "#f3f1ea", "ink-2": "#bdb9ae", "ink-3": "#8b887f", "rule": "#363430", "frame": "#d9d4c7",
    "send": "#2e8b57", "send-ink": "#0b1a10", "back": "#c83a3a", "back-ink": "#1a0b0b",
    "none": "#5f5c55", "none-ink": "#f3f1ea", "good": "#4caf6e", "bad": "#ef6b6b",
}
LIGHT = {
    "surface": "#f7f5f0", "paper": "#fffdf8", "surface-2": "#efece5",
    "ink": "#141311", "ink-2": "#55524c", "ink-3": "#8a877f", "rule": "#dcd8cf", "frame": "#2b2823",
    "send": "#1a6b3a", "send-ink": "#ffffff", "back": "#9b1c1c", "back-ink": "#ffffff",
    "none": "#6b675f", "none-ink": "#ffffff", "good": "#1a7f37", "bad": "#c62828",
}


def theme(name: str, p: dict, dark: bool) -> Theme:
    return Theme(
        name=name, dark=dark,
        primary=p["frame"], secondary=p["ink-2"], accent=p["frame"],
        background=p["surface"], surface=p["paper"], panel=p["surface-2"], foreground=p["ink"],
        success=p["send"], error=p["back"], warning=p["none"],
        variables={
            "ink": p["ink"], "ink-2": p["ink-2"], "ink-3": p["ink-3"], "rule": p["rule"], "frame": p["frame"],
            "send": p["send"], "send-ink": p["send-ink"], "back": p["back"], "back-ink": p["back-ink"],
            "none": p["none"], "none-ink": p["none-ink"], "good": p["good"], "bad": p["bad"],
            "paper": p["paper"], "surface-2": p["surface-2"],
        },
    )


CW_DARK = theme("cw-dark", DARK, True)
CW_LIGHT = theme("cw-light", LIGHT, False)
