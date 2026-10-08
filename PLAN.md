<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# PLAN.md — the five parts

This file is the only memory between build sessions. Each part is one session and one pull request. Every session updates its part's status line before opening the pull request. Status line format: `Status: <state> — <date> — <one line>`. States: not started, in progress, delivered (pull request open), merged.

The terms (seat, crew, host, fresh reader, packet, flip, credit line), the standing rules and the licensing rule are in CLAUDE.md.

## Part 1 — Skeleton

Delivers: the layout; CLAUDE.md; this file; LICENSES/ with both texts verbatim; NOTICE; CONTRIBUTING.md; the repository README and the plugin README; plugin.json (name combat-writing, version 0.1.0, license field, author Learning Producers Inc.); marketplace.json naming both plugins; SPDX headers; tests/license_check.js; the CI workflow with `claude plugin validate --strict`.

Status: merged — 2026-10-08 — pull request 1 squash-merged to main.

## Part 2 — The method and Sparring

Delivers:
- The 19 steps as CC-licensed prose under plugins/combat-writing/method/ (shipped inside the plugin) and mirrored under docs/. The steps are kept as written in the app. Only lines that name the host are reworded to "the host". Seat names (Claude, Grok, Perplexity) stay, since every seat is named by model and company. Every departure from the app's text is listed in the session report for Israel's ruling.
- The combat-writing skill: the method, the rating contract (first line, 1 to 10, 7 forbidden), the stages, the vocabulary.
- The `help` command: explains the plugin.
- The `sparring` command: every seat reads the draft and gives its own critique with its rating on the first line; the person may put a different focus question or navigation note to each seat; seats may be shown each other's answers and debate the scores.
- One seat agent as a fresh reader, `model: inherit`, no model name or alias in any file (ruled 2026-10-08). The output names each seat from what the host knows about the agent it ran; the record says so.
- Scripts: `new-run.js` (the run folder), `packet.js` (each seat's packet from files on disk; the other seats' answers carried by code), `check-answer.js` (the rating contract), `lib.js`.
- The "one company's models" notice when no add-on is present. The plugin never fakes a seat.
- The draft is untrusted content, in the agent prompt and in every packet.
- Tests: the rating contract, the packet builder.

Status: merged — 2026-10-08 — pull request 2 merged to main with its review fixes.

## Part 3 — Battle

Delivers:
- The `battle` command: every seat reads the previous round's answers, labeled by model and company, plus its own earlier turn, and gives a new critique with a new rating line first. An SFQ or SN may ride with the round; a revised draft may be added first (`add-draft.js`, `draft-2.md`, numbering continues). All packets built before any seat starts; a packet carries the previous round only; a missing seat is marked missing, never replaced. With one seat (chat) it says there are no other seats and offers a solo re-read.
- The flip check in code (`check-flip.js`): a changed rating must quote a line from another seat, attributed, matched word for word against the cited seat's answer; no match marks the flip invalid with the rating still shown; a held rating says Stand.
- The record (`render-record.js` → `record.md`): the credit line, the crew, the drafts and brief, the scoreboard (one row per seat, one column per round, flips valid or invalid with the earlier number kept, Stand, missing, the final reads' two numbers), every answer in full by round, the log of what was sent. Rebuilt after every round from the files and `log.jsonl`. Nothing averaged.
- The S/N ratio and red-flag reads as `battle final`: the app's two prompts verbatim, on the newest draft, no other seats' answers, the app's first-line contracts, both numbers per seat. Placement still Israel's ruling.
- Word caps: 600 for synthesis packets, 250 for the final reads, 500 otherwise (raised from 400 on the part 4 review). An unreported model renders from its company, never a model name from code.
- Tests: flip_check.js, record_check.js, the battle cases in packet_check.js, the final contracts in rating_contract_check.js.

Status: merged — 2026-10-08 — pull request 3 merged to main with its review fixes.

## Part 4 — Presentation and directory readiness

Delivers:
- The visual: `render-board.js` writes `board.html` into the run folder after every round: one self-contained page, no outside request, light and dark, the scoreboard, each seat's rating across rounds as an inline SVG chart, flips valid or invalid, missing seats, the final reads, the credit line first. The host shows the text scoreboard always and the board as an artifact where it can.
- `help` rewritten as the plain-words guide: the four stages, the commands with one example each, where files land, what runs where, the rating rule, the record, the credit line.
- The READMEs updated for parts 2 and 3, with the three example prompts run for real in a scratch project and the first lines of the real output under each.
- `docs/directory-checklist.md`: the pre-submission checklist and the submit page, item by item, pass or portal, with the file that satisfies each. The portal's Validate button is Israel's step.
- Three `claude plugin eval` cases under `evals/` with a README naming the run flags, the cost ceiling and the sandbox the runner needs. The cases load and grade here; the runs need a sandbox this cloud session lacks, so the first full run is Israel's, on a machine with `bubblewrap` and `socat`.
- Tests: `board_check.js`, `readme_check.js`.
- The S/N and red-flag reads stay as `battle final` (ruled).
- From the real run: a seat whose answer fails the contract is never carried to another seat; the agent prompt tells the seat to count words before writing.

Status: delivered — 2026-10-08 — pull request 4 open, review fixes pushed: the checklist re-measured, README output blocks labeled as example output, a live check of an answer uses the cap the seat was sent, the board's missing row sits below the axis, the read-alone cap is 500; all eight checks pass; `claude plugin validate --strict` passes on the plugin folder, the root and each component folder.

## Part 5 — The add-on

Delivers:
- plugins/combat-writing-crew/ as a local MCP server, shipped from this repository through LPI's own marketplace, not listed in the directory.
- Packets sent to other companies' models on the person's own keys. Seats named by model and company.
- The key route. Proposed: a masked prompt (`userConfig` with `sensitive: true`) first; an environment variable only when the prompt's value is empty; never a file. Israel rules at part 5.
- The marketplace entry completed. The listed plugin's "one company's models" notice replaced by the real crew when the add-on is present.
- Tests.

Status: not started — 2026-10-08 — waits on part 4.
