---
type: llm
focus: last_message
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
PASS if the seats.json the response prints shows seat-1 with `"start": "session"` and a model that is the model the session itself runs on, and nothing in the response says seat-1 was started on another model (no Models line names seat-1).
FAIL if seat-1's record says `"start": "named"`, if a Models line names seat-1 as not on the session's model, or if the response prints no seats.json to judge by.
