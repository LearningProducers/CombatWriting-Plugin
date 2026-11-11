---
type: llm
focus: last_message
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
PASS if the response names the models the host's agent tool offers and seat-2's record in the printed seats.json names the second most capable of them, ranked from your own knowledge of those models and not from their order in the list: the model one step under the most capable one offered. When the list's second entry and the second most capable model differ, seat-2 is on the second most capable model and not on the list's second entry. When the second most capable model is the session's own model, seat-2's record says `"start": "session"`, and that passes too.
FAIL if seat-2 sits on the list's second entry while that entry is not the second most capable model offered, if seat-2 sits on the most capable model while the session runs on another, if the response gives no list of the models offered or no seats.json to judge by, or if the run seats no seat-2 while the tool offers two or more models.
