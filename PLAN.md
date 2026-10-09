<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# PLAN.md — the parts

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

## Part 6 — The founder's rulings of 2026-10-09

Rulings, from the second real run (`2026-10-09-1908-matthew-hotel-doc`, which seated three Claude seats beside the two Groq seats and failed qwen's read out at 597 words twice):

1. **Crew composition.** One host seat (Claude, the fresh reader) plus one seat per outside model the add-on has a key for. Never padded. With the Groq key alone the crew is three. `new-run.js` seats one fresh reader; `--seats` adds more only when the person asks by name.
2. **Round terms.** N, navigation (`n:`): the same new guidance put to every seat individually. SN, synthesis navigation (`sn:`): each seat's synthesis shared with the others plus a new prompt; everyone answers and everyone reads each other. SFQ, synthesis focus question (`sfq:`): the crew's answers shared plus a new question. Battle: the discussion of the structure and content of the draft. `final`: the S/N ratio and red-flag reads on the draft alone. Help, the command descriptions, the four-stages section and the Next line use these; wherever `sn:` is offered, `n:` is.
3. **Rating.** Sparring rates, the rating line first. Battle does not rerate on its own; it rates only on `rerate`, then the rating line is first. A battle round without `rerate` is a critique (no RATING line; the checker holds the seat to that; the record and board show "critique"). A new rating is held against the seat's latest earlier rating. The final reads keep the app's own first lines (`S/N RATIO: XX%`, `NO RED FLAGS` / `RED FLAGS FOUND: X`), as ruled 2026-10-08.
4. **Word cap for outside seats.** The add-on states the cap in the system prompt. On a second overrun it cuts the read at the cap, pulls the RATING line (or the final read's line) out of the reply wherever it sits and keeps it first, logs `truncated`, and the record and board mark "truncated at N words" with the rating shown.

Delivers: `new-run.js` default one seat; `packet.js` `--n`, `--rerate`, the critique contract for `<nn>-battle` without `--rerate`, `contract`, `shares`, `own_rating` and `n` in the packet.built line; `lib.js` `contractSent`, `roundContract`, `latestOwnRating`, the `critique` contract; `check-answer.js` reads the contract from the packet; `check-flip.js` flips against the latest earlier rating and says "no rating" in a critique round; the record and board show critique cells and truncation marks, the chart on rated rounds only; the add-on's `packetRules`, `truncateAnswer`, the cap in the system line, `truncated` in the log and the result; help, sparring, battle, the skill, the seat agent, both READMEs, the add-on README, the method departures 2, 3, 5, 6 and 12 (mirror kept identical), CLAUDE.md, both manifests and the marketplace at 0.2.0; the tests updated and extended (`crew_check.js`: three seats with one key, four with two, the cap in the system line, the truncation with the rating last; `packet_check.js`: one seat by default, the N packet, the critique contract; `flip_check.js`: a flip across a critique round; `record_check.js` and `board_check.js`: critique cells and the truncation mark).

Status: merged — 2026-10-09 — pull request 7 merged to main.

## Part 7 — The founder's rulings of 2026-10-09, second set: FQ, seat lines, the picker, the seat key, the hook

Rulings:

1. Battle gets `fq:` (the same question to every seat, nothing shared, the same as sparring's `question:`) and seat lines (`seat-N:`, a note or question to one seat only; a round of seat lines alone goes to the named seats and the record marks the others "not asked"; seat lines may combine with `fq:`).
2. A missing keyword never errors: text with no keyword opens the picker (AskUserQuestion). Ruled on pull request 8: two stages at most, one keypress each, no "Other"; battle first asks Everyone / One seat / Revised draft / Final, then FQ / N / SN / SFQ for Everyone or the seat list for One seat; sparring the same shape where it applies. The best guess is marked on its label, not moved.
3. Synonyms and typos map, case-insensitive: `question:` and `focus:` are FQ; `nav:` is N; `seat 2`, `seat2` and a seat's short name address a seat (logged by seat number); `rerate` counts anywhere.
4. Bare `battle` or `sparring` opens the same picker, which ends with "/combat-writing:help for the full guide."
5. Sparring gets the same picker for a question or seat note with no keyword.
6. Every round's result ends with a one-line seat key under the Next line, from the live crew; each command carries an argument hint.
7. A session-start hook prints one line when the plugin loads: "Combat Writing ready. /combat-writing:help for the guide."

Delivers: `packet.js` `--fq` (mode `focus`, nothing shared, cap 500), a seat line alone in battle shares nothing (mode `seat`), a `--question` file copied into the round folder as `<seat>.question.md`, `not_asked` in the packet.built line and "not asked" in the carried list; `lib.js` `seatShortName`, `seatKey`, `askedIn`, `wasAsked`, `notAsked` in `roundAnswers`; the record and board show "not asked" cells (no chart point) and the seat key, and `render-record.js --short` prints the seat key last; `hooks/hooks.json` and `hooks/session-start.js` (the systemMessage line, since a SessionStart hook's plain stdout reaches only the host); the battle and sparring commands rewritten for FQ, seat lines, synonyms, the two-stage picker and the seat key, with argument hints; help, the skill, both READMEs, the method departures 5, 6 and 11 (mirror kept identical), the checklist's hook rows, CLAUDE.md; both manifests and the marketplace at 0.3.0; tests: `hook_check.js` new, `marketplace_check.js` allows the one hook, `packet_check.js`, `record_check.js` and `board_check.js` extended. The picker's seat-key short name is derived from the model id in code, never written in a file.

Status: delivered — 2026-10-09 — pull request 8 open; all eleven checks pass; `claude plugin validate --strict` passes on both plugin folders and the root; the hook was seen firing at startup in a one-turn session on Claude Code 2.1.296.
