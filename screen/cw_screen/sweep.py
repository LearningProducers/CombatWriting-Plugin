# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
"""The one-second sweep and the freshness clock.

No file watcher: a sweep of the run folder's names, sizes and modification times costs
nothing at a run's size, works under tmux and on network folders, and lets the freshness
line say when the screen last looked. Watcher libraries drop events silently on macOS under
load, the failure the freshness line exists to prevent. Stale is never silent: a sweep that
fails, or a folder that is gone, is said with the time it happened.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from pathlib import Path


def snapshot(root: Path) -> frozenset:
    """Every file under root as (relative path, size, mtime_ns). Raises if root cannot be read."""
    out = set()
    stack = [Path(root)]
    while stack:
        d = stack.pop()
        with os.scandir(d) as it:
            for e in it:
                if e.is_dir(follow_symlinks=False):
                    stack.append(Path(e.path))
                elif e.is_file(follow_symlinks=False):
                    st = e.stat(follow_symlinks=False)
                    out.add((os.path.relpath(e.path, root), st.st_size, st.st_mtime_ns))
    return frozenset(out)


@dataclass
class Sweep:
    root: Path
    clock: callable = time.time
    last: frozenset | None = None
    last_change: float | None = None
    last_swept: float | None = None
    stale_since: float | None = None
    stale_reason: str | None = None
    sweeps: int = 0
    changes: list = field(default_factory=list)

    def check(self) -> bool:
        """One sweep. Returns True when something under root changed since the last sweep."""
        now = self.clock()
        self.sweeps += 1
        try:
            snap = snapshot(self.root)
        except OSError as e:
            if self.stale_since is None:
                self.stale_since = now
            self.stale_reason = f"{self.root} could not be read ({e.strerror or e})"
            self.last_swept = now
            return False
        self.stale_since = None
        self.stale_reason = None
        self.last_swept = now
        changed = snap != self.last
        if changed:
            if self.last is not None:
                self.changes.append(sorted(f for f, _, _ in (snap ^ self.last)))
            self.last = snap
            self.last_change = now if self.last_change is not None or self.sweeps > 1 else self._newest_mtime(snap)
        return changed

    @staticmethod
    def _newest_mtime(snap: frozenset) -> float:
        return max((m for _, _, m in snap), default=0) / 1e9


def ago(seconds: float) -> str:
    s = int(seconds)
    if s < 0:
        s = 0
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m:02d}:{sec:02d}"


def clock_hms(t: float) -> str:
    return time.strftime("%H:%M:%S", time.localtime(t))


def freshness_line(sweep: Sweep, run_id: str | None, now: float | None = None, state_error: str | None = None) -> str:
    """The line the screen always shows last. Stale is never silent."""
    now = sweep.clock() if now is None else now
    if sweep.stale_since is not None:
        return f"STALE since {clock_hms(sweep.stale_since)} — {sweep.stale_reason}"
    if state_error:
        since = clock_hms(sweep.last_swept or now)
        return f"STALE since {since} — {state_error}"
    parts = [f"watching {run_id}" if run_id else "watching: no run yet"]
    if sweep.last_change is not None:
        parts.append(f"last change {ago(now - sweep.last_change)} ago")
    if sweep.last_swept is not None:
        parts.append(f"swept {max(0.0, now - sweep.last_swept):.1f} s ago")
    return " · ".join(parts)


def list_runs(project: Path) -> list[Path]:
    """Run folders under <project>/combat-writing/runs/, oldest first (the id carries the time)."""
    runs = Path(project) / "combat-writing" / "runs"
    if not runs.is_dir():
        return []
    out = [p for p in runs.iterdir() if p.is_dir() and (p / "seats.json").is_file()]
    out.sort(key=lambda p: p.name)
    return out
