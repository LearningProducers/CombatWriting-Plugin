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

Status: delivered — 2026-10-08 — pull request open; method text, skill, help, sparring, seat agent, scripts and tests in; license_check, rating_contract_check and packet_check pass; `claude plugin validate --strict` passes on the plugin folder and the root.

## Part 3 — Battle

Delivers:
- The `battle` command: every seat reads the other seats' latest answers and gives a new critique and a new rating, quoting the others by model name. A focus question or navigation note may ride with the round.
- Flips: a seat that changes its rating carries an attributed quote and the reasoning.
- The rendered record (`record.md` in the run folder): the rating leads every result; a ship, revise or kill verdict never replaces it; scores are never averaged; the record opens with the credit line.
- Where the S/N ratio and red-flag reads live (in the app they are Battle's two automatic reads of the final draft). Israel rules.
- Tests: the flip record, the attribution, the headline rule.

Status: not started — 2026-10-08 — waits on part 2.

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
