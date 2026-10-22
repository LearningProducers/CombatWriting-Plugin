# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
"""Finding the plugin's scripts.

The screen runs the plugin's render-state.js; it holds no rule of the method itself. The
plugin root is found in this order: the --plugin-root argument, the CW_PLUGIN_ROOT variable,
the newest `cw` version folder in the host's plugin cache (measured on this machine on
2026-10-21: ~/.claude/plugins/cache/<marketplace>/cw/<version>/), then a repository checkout
this package sits in (screen/ beside plugins/combat-writing/). None found is said on screen,
never silently.
"""

from __future__ import annotations

import os
import re
import shutil
from pathlib import Path

RENDER_STATE = Path("scripts") / "render-state.js"


def _version_key(name: str) -> tuple:
    parts = re.findall(r"\d+", name)
    return tuple(int(p) for p in parts) if parts else (-1,)


def _holds_scripts(root: Path) -> bool:
    return (root / RENDER_STATE).is_file()


def cache_candidates(home: Path | None = None) -> list[Path]:
    """Every `cw/<version>` folder in the host's plugin cache, newest version first."""
    home = home or Path.home()
    cache = home / ".claude" / "plugins" / "cache"
    found: list[Path] = []
    if not cache.is_dir():
        return found
    for marketplace in cache.iterdir():
        plugin = marketplace / "cw"
        if not plugin.is_dir():
            continue
        for version in plugin.iterdir():
            if version.is_dir():
                found.append(version)
    found.sort(key=lambda p: _version_key(p.name), reverse=True)
    return found


def checkout_candidate() -> Path | None:
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / "plugins" / "combat-writing"
        if _holds_scripts(candidate):
            return candidate
    return None


def find_plugin_root(explicit: str | os.PathLike | None = None, env: dict | None = None, home: Path | None = None) -> tuple[Path | None, str]:
    """Returns (root, how) where how names the route taken, or (None, reason) when none is found."""
    env = os.environ if env is None else env
    if explicit:
        p = Path(explicit).expanduser().resolve()
        return (p, "--plugin-root") if _holds_scripts(p) else (None, f"--plugin-root {p} has no {RENDER_STATE}")
    from_env = env.get("CW_PLUGIN_ROOT")
    if from_env:
        p = Path(from_env).expanduser().resolve()
        return (p, "CW_PLUGIN_ROOT") if _holds_scripts(p) else (None, f"CW_PLUGIN_ROOT {p} has no {RENDER_STATE}")
    for candidate in cache_candidates(home):
        if _holds_scripts(candidate):
            return candidate, f"plugin cache, cw {candidate.name}"
    checkout = checkout_candidate()
    if checkout:
        return checkout, "repository checkout"
    return None, "plugin not found: pass --plugin-root or set CW_PLUGIN_ROOT (the cw plugin's folder, the one holding scripts/render-state.js)"


def find_node() -> str | None:
    return shutil.which("node")
