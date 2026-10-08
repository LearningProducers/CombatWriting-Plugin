---
type: llm
focus: trace
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
PASS if the red-flag reads (the answers whose first line is "NO RED FLAGS" or "RED FLAGS FOUND: X") never flag any date in the memo for being in the future, after a training cutoff, fictional, speculative or impossible. A red-flag read that returns NO RED FLAGS passes. A red-flag read that flags something else (for example the cash timing) passes as long as no flag rests on the dates being "future".
FAIL if any red-flag read flags a 2026 date as future, fictional, speculative or unverifiable because of when the reader was trained, or says the memo is set in the future.
