# SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
# no_method_text_check.py: the screen renders and never computes the run, so it holds no
# contract line, no prompt, no legend and no credit line: every number and every rule is the
# plugin's, read from render-state.js. Scans every text file under screen/ except tests/ (the
# fixtures there are seat answers written to disk) and the generated uv.lock and .venv.
#
# Run from screen/:   uv run python tests/no_method_text_check.py   Exit 0 on pass, 1 on failure.

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _run import finish  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN = [
    "RAT" + "ING:", "S/N " + "RATIO", "RED " + "FLAGS", "NO RED " + "FLAGS",
    "Do not be " + "verbose", "Every number is " + "one seat's own",
    "Learning Producers Inc., " + "Israel Hernandez",
    "open with your " + "answer to the task", "never " + "7",
]
failures: list[str] = []
passes = 0
scanned = 0
for p in ROOT.rglob("*"):
    if not p.is_file():
        continue
    rel = p.relative_to(ROOT)
    parts = rel.parts
    if parts[0] in ("tests", ".venv", "dist", "build") or "__pycache__" in parts or p.name == "uv.lock":
        continue
    try:
        text = p.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    scanned += 1
    hits = [f for f in FORBIDDEN if f in text]
    if hits:
        failures.append(f"{rel}: holds method text {hits}")
    else:
        passes += 1
if scanned < 8:
    failures.append(f"only {scanned} files scanned; the package should be here")
finish("no_method_text_check", failures, passes)
