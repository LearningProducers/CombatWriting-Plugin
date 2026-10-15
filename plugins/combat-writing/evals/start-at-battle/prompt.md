---
description: 'A run that starts at battle: no strategy, no sparring, a draft pasted into /cw:battle with an SN prompt. The first round is 01-battle, with no other seat to read and no rating asked.'
expected_outcome: 'The host starts a run from the pasted draft, runs round 01-battle, shows the scoreboard with that column marked critique, no seat writes a RATING line, the result says this is the first round of the run and that no other seat''s answer was carried, and the record says the run started at battle.'
runs: 1
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill]
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
/cw:battle sn: everyone, read the close as a board member with two minutes: does it ask for a decision? draft: Dear board,

I am writing to ask for your approval to acquire Northwind Analytics before the end of the quarter.

Northwind has grown revenue every year since it was founded. Our own sales team has lost three deals to Northwind this year. If we own them, we stop losing those deals.

The price is 3x revenue. Our bank has said in principle that it would finance half. The rest comes from cash on hand.

I know some of you will want more numbers. I will have the full model ready for the meeting. What I need today is your agreement that we move forward with the letter of intent.

Thank you for your trust.

Dana
