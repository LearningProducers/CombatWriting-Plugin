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
- Word caps: 600 for synthesis packets, 250 for the final reads, 400 otherwise. An unreported model renders from its company, never a model name from code.
- Tests: flip_check.js, record_check.js, the battle cases in packet_check.js, the final contracts in rating_contract_check.js.

Status: delivered — 2026-10-08 — pull request open; battle, the flip check, the record and the final reads in; all six checks pass; `claude plugin validate --strict` passes on the plugin folder and the root.

## Part 4 — Presentation and directory readiness

Delivers:
- Output organized and easy on the eyes, with a visual element.
- The help text in final form.
- The plugin README's example prompts verified against the real commands.
- A pass over the directory pre-submission checklist. Nothing is submitted.
- Documentation under docs/.
- Eval cases if `claude plugin eval` fits.

Status: not started — 2026-10-08 — waits on part 3.

## Part 5 — The add-on

Delivers:
- plugins/combat-writing-crew/ as a local MCP server, shipped from this repository through LPI's own marketplace, not listed in the directory.
- Packets sent to other companies' models on the person's own keys. Seats named by model and company.
- The key route. Proposed: a masked prompt (`userConfig` with `sensitive: true`) first; an environment variable only when the prompt's value is empty; never a file. Israel rules at part 5.
- The marketplace entry completed. The listed plugin's "one company's models" notice replaced by the real crew when the add-on is present.
- Tests.

Status: not started — 2026-10-08 — waits on part 4.
