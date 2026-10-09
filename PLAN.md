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
- `plugins/combat-writing-crew/`: a local MCP server over stdio (`server.js`, plain Node, no dependencies) with `crew_list`, `crew_register` and `crew_answer`; `crew-lib.js`; `providers.json` (Groq first; xAI, Perplexity, OpenAI, Mistral, Gemini's compatible endpoint and Ollama as entries; Anthropic as a stub); the manifest with masked key prompts and the server entry; README, LICENSE.md and NOTICE copies.
- The key route as ruled: the masked prompt first, an environment variable only when the prompt is empty, never a file. Each key goes only to its own provider.
- Outside seats named from the model field the API returns, by model and maker with the serving provider stated; models resolved from the live catalog by family (largest live gpt-oss, newest live Qwen), no id in code; the record carries the returned id.
- The app's call budget (8,000-token wall, 1,200 floor, 2,800 ceiling), "Too long to send" before sending, a per-provider window with a wait, one Retry-After retry on 429; a failed, refused or keyless seat is missing.
- The listed plugin's skill and commands use the crew tools when `crew_list` is present and say "one company's models" when it is not; the record and board name each seat's provider and both name sources.
- Tests: `crew_check.js` against a fake OpenAI-compatible server on localhost, `marketplace_check.js`; CI validates the add-on folder too; the checklist confirms the listed plugin still holds no keys and makes no outside call.

Status: merged — 2026-10-09 — pull request 5 merged to main.

First real run, 2026-10-09: Israel ran a cross-company round through the add-on on his machine (the build session never called a provider). The record and the board rendered with the outside seats beside the fresh readers. Seats, from the run's `log.jsonl`: claude-fable-5-1 (Anthropic, the fresh reader, named from the agent configuration); openai/gpt-oss-120b (OpenAI, served by Groq); qwen/qwen3.8-27b (Alibaba, served by Groq), the two outside ids as the provider's API returned them. The run surfaced four fixes, shipped in pull request 6: trailing whitespace on a returned rating line (the add-on now strips every line; the checker tolerates it), a blind retry for an outside seat (`crew_answer` takes a `note`), and the log showing only one id when the returned id differed from the requested one (both are logged, with `model_changed`).
