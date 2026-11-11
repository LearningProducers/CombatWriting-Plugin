---
description: 'Seat-2 by rank (issue 194): with no add-on and no pick, seat-1 runs on the session''s own model and seat-2 on the second most capable model the host''s agent tool offers, ranked by the host from what it knows of the models and never by the order of the list.'
expected_outcome: 'The host starts a run from the pasted draft, seats two fresh readers, starts seat-1 with no model choice and seat-2 on the second most capable model its agent tool offers (with no model choice when that is the session''s own model), runs round 01-sparring, shows each seat''s rating, then names the models its agent tool offers in the tool''s own order and prints the run''s seats.json.'
runs: 1
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill]
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
/cw:sparring Here is my draft of a note to the team. When the round is done, under the result, name the models your agent tool offers, in the tool's own order, and print the run's seats.json as it stands.

Dear team,

We ship the new intake form on Friday. It cuts the steps a customer takes from nine to four, and support has asked for it since spring.

Two things are not done: the export to the billing sheet and the Spanish copy. I am asking each lead to say by Wednesday noon whether Friday holds for their part.

If one of you says no, we move the date once, to the following Tuesday, and not again.

Thanks,
Dana
