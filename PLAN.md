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

Status: merged — 2026-10-09 — pull request 8 merged to main.

## Part 8 — The founder's rulings of 2026-10-12: one fresh reader enforced, the credit line in help only

Rulings:

1. **One fresh reader, enforced.** The crew is one host seat (Claude, the fresh reader) plus one seat per keyed outside model, never padded. The run `2026-10-09-1908-matthew-hotel-doc` seated three Claude seats because it was created at 19:08 UTC on 2026-10-09, before the one-seat default landed (pull request 7, 20:07 UTC), by the 0.1.0 `new-run.js` whose default was three fresh readers; its later battle rounds then carried that `seats.json` forward, since nothing checked the crew after creation. Now `new-run.js` seats exactly one and refuses `--seats`, and `packet.js` refuses a second fresh reader in any run, so an older run's padded seats get no packet and no agent.
2. **The credit line in help only.** No run output carries it: no packet, answer, `seats.json`, log line, `record.md`, `board.html`, short form, add-on tool result or server instruction. It stands once, at the foot of `/combat-writing:help`.

Delivers: `new-run.js` (one seat, `--seats` refused, no credit field in `seats.json` or the log), `lib.js` (`isFreshReader`, `isPaddedSeat`, the `CREDIT` constant removed), `packet.js` (the padded-seat refusal, no credit line), `render-record.js` and `render-board.js` (no credit line; the board opens with the motto), the add-on's `crew-lib.js`, `server.js` and `providers.json` (no credit anywhere), help (the motto at the top, the credit line as the last line), the skill, sparring, battle, both READMEs, the add-on README, the method terms and departure 3 (mirror kept identical), the three eval graders, CLAUDE.md; both manifests and the marketplace at 0.3.1; tests: `packet_check.js` pins the `--seats` refusal and the padded-seat refusal beside an outside seat that still builds, and every check that padded a crew now seats its fixtures as outside seats and sweeps the run folder for the credit line; `readme_check.js` pins that the output blocks carry no credit line.

Status: merged — 2026-10-12 — pull request 9 merged to main.

## Part 9 — CI on pull requests to main

Delivers: `.github/workflows/checks.yml` rewritten to the founder's spec of 2026-10-12: one job named `checks` on every pull request targeting main (and on each push to main, per the test-style rule in CLAUDE.md); check out, set up Node, install `@anthropic-ai/claude-code` globally from npm at an exact version, run all eleven `tests/*_check.js`, then `claude plugin validate --strict` on `plugins/combat-writing`, `plugins/combat-writing-crew` and the repository root. Any failing step fails the job. No other file changes.

Status: merged — 2026-10-12 — pull request 10 merged to main.

## Part 10 — Release tags and the version-bump gate

Delivers, to the founder's spec of 2026-10-12, in `.github/workflows/checks.yml` and one pull request:
- A second job, `tag`, on push to main only, after `checks` passes, with `contents: write`: for each of `plugins/combat-writing` and `plugins/combat-writing-crew` it reads the version from `.claude-plugin/plugin.json` and, when the tag `<plugin-name>--v<version>` is not on origin, creates an annotated tag with that exact name and the message `<plugin-name> <version>` and pushes it. The name and message are what `claude plugin tag` produces, so the two never diverge. An already-tagged version is a no-op.
- A version-bump gate in the `checks` job on pull requests only: if any file under a plugin folder differs from the pull request's base commit, that plugin's `plugin.json` version must differ from the base's; the job fails naming the plugin that needs a bump. Changes outside the two plugin folders need no bump. The marketplace entry must match each `plugin.json` version; the root validation and `tests/marketplace_check.js` already pin that and are kept.
- The two action pins moved to their v5 releases (checkout v5.1.0, setup-node v5.0.0), by commit.
- The bump rule in CLAUDE.md, so build sessions bump before opening a pull request. No plugin file changes, so this pull request needs no bump.

Status: merged — 2026-10-13 — pull request 11 merged to main.

## Part 11 — A GitHub Release for every release tag

Delivers, to the founder's ruling of 2026-10-13, in one pull request:
- The `tag` job in `.github/workflows/checks.yml` extended: after the tag loop, each plugin tag with no GitHub Release gets one, titled `<plugin-name> <version>`, with notes cut from the pull request merged at the tagged commit (found through the commits-to-pulls API): its title plus its "What changed" section. When no merged pull request is at that commit or its body has no such section, the Release gets GitHub's generated notes counted from the plugin's previous tag. A tag that already has a Release is a no-op, so a rerun after a failed Release step finishes without retagging.
- `.github/scripts/release-notes.js`, the cut, and `tests/release_notes_check.js`, which pins it (twelve checks now).
- CLAUDE.md: the Release rule beside the tag rule, the `## What changed` section every pull request body carries, the layout line.
- Hand-written notes take precedence: when `.github/release-notes/<tag>.md` is in the tree, the Release gets that file (its SPDX comment line dropped).
- The backfill: `.github/release-notes/combat-writing--v0.3.1.md` and `combat-writing-crew--v0.3.1.md`, one paragraph each describing 0.3.1 (one fresh reader crew, the credit line removed from run output, the CI gate). The founder asked for the Releases to be created now from the session, but the machine's GitHub token has no Contents write on the repository (HTTP 403 on the releases endpoint), so the tag job creates both Releases from these files on the merge of this pull request. No plugin file changes, so no bump.

Status: merged — 2026-10-13 — pull request 12 merged to main; the Release step exercised in a scratch clone with a fake `gh` over four cases (notes from the pull request; a full rerun is a no-op; a tag without a Release and a pull request with no section falls back to generated notes from the previous tag; no merged pull request falls back the same way); a hand-written notes file wins over the cut; all twelve checks and the three validations pass locally; the two 0.3.1 Releases are created by the tag job on merge, the token here being unable to.

## Part 12 — The founder's ruling of 2026-10-13: every stage gets a command

Ruling: the help listed four stages and three commands; a first-time user looking for a strategy command found none, which broke the never-stuck rule. Every stage in the help gets a command. Champion stays a stage with no command for now; its line says so, and an issue proposes what a champion command would record.

Delivers:
- `commands/strategy.md`: `/combat-writing:strategy` takes the draft and the brief, pasted together (`brief:`, or `context:`) or in two messages, with the same inbox cut as sparring (the whole paste to `<slug>.paste.md` first, then `<slug>.md` and `<slug>.brief.md`), runs `new-run.js --draft --brief` so the snapshot and the brief land in a new run folder, registers the crew when the add-on is present, builds no packet and starts no seat, shows the crew line and the stored files, and ends with one Next line: `/combat-writing:sparring`, bare, with an optional `question:`. The picker rule applies: a bare command asks for the draft in one line and never errors; a draft with no brief asks for the brief; a lone paragraph that reads as a brief gets a one-stage Draft / Brief picker with the best guess marked.
- `commands/sparring.md`: bare after strategy (the newest run whose `rounds/` is empty, or `run:`), it reads the stored draft and brief with no repaste and no picker; `question:`, seat lines and `cold` ride on that run; `crew_register` is called on the continued run (it adds nothing twice); a pasted draft still starts a new run; the draft slot in the argument hint is optional. `commands/battle.md`: a run with no round yet points at sparring.
- `commands/help.md`: the four stages and the four commands line up one to one, each stage naming its command on its own line; Champion says it has no command yet; a strategy entry with an example; `context:` in the shortcuts.
- `render-record.js` and `render-board.js`: the no-rounds line says what is stored and names the next move, so the record of a run strategy made is never a dead end.
- The skill (the four commands; strategy reads nothing; the Next line closes a strategy result), the method departure 13 (mirror kept identical; the pinned step span unchanged), both READMEs (the strategy example run on 2026-10-13 with the scripts in a scratch project), the checklist rows, CLAUDE.md (the ruling, the layout line), the manifest description; the plugin and its marketplace entry at 0.4.0, the add-on unchanged at 0.3.1.
- Tests: `tests/strategy_check.js` new (the four command files; the strategy, help and sparring text; the real scripts on a run with no rounds; the bare-sparring packet from the run folder alone; the cold packet; no credit line in the run), `tests/readme_check.js` requires a strategy example, the workflow comment counts thirteen checks.
- Issue 13, "A champion command: what it would record": the five entries (published, results, follow-through, roundtable, insight vault), what it would never do, and the three rulings it needs.

Status: merged — 2026-10-13 — pull request 14 merged to main; all thirteen checks and the six strict validations passed; the strategy example output in the plugin README comes from the real scripts on 2026-10-13; issue 13 opened for the champion command.
## Part 13 — The founder's ruling 2 of 2026-10-13: a short crew names its reason and the next command

Ruling: when the crew has fewer seats than the person expects, every result and the help name the reason and the exact next command. Three states: the add-on not installed (the install line); installed but its server not running (/mcp, and what to look for); running but no key for a provider (/plugin configure combat-writing-crew, naming the key field). crew_list already knew the third; the host must surface it instead of "exposed no crew tools".

Delivers:
- The add-on (0.4.0): providers.json carries each keyed provider's option id (key_option); crew-lib.js `keyField` reads the option's title from the add-on's own manifest and `keyHint` names the next command, the field, its title and the variable; every no-key entry of `crew_list` and `crew_register` carries `next`, `field`, `field_title` and `env`, and the `crew.registered` log line carries them under `unavailable` with the provider name and family; `crew.failed` on a keyless call carries `next` and `field`; the crew_list tool description says so. No value of a key anywhere.
- The listed plugin (0.4.1): `crew-state.js` (new) logs `addon.state` absent or down and prints the sentence; `lib.js` holds the two sentences (ADDON_STATE), the install and configure commands, and `crewStateLines`, which renders the Seats line from the latest addon.state or crew.registered line: the state's sentence, the no-key sentence naming the command and each field once (Groq first, the free-tier note, the variable route), a keyed provider that did not answer with its reason, or the unrecorded case pointing at `help crew`; nothing when an outside seat is seated and only unkeyed providers are left. `render-record.js` prints it under the crew line in record.md and in the short form; `render-board.js` on the board.
- The help: a "Fewer seats than you expected" section (topic `crew`) with the three states and their commands, and the where-you-are line asks for the state; the skill: the three-state rule (crew_list present: call it; absent: `claude plugin list` tells down from absent, then `crew-state.js`; if that cannot run, give both commands; never say only that no crew tools were found), crew-state.js in the scripts table, the Seats line in the shown result; sparring, strategy and battle point at it where the add-on is absent; both READMEs; the add-on README's "When a seat you expected is missing"; CLAUDE.md (the ruling, the writers, the layout, the add-on line); the marketplace at 0.4.1 with both entries bumped.
- Tests: `tests/crew_state_check.js` new (the unrecorded line; absent and down through the real crew-state.js, record, board and short form; the latest state wins; the refusals; a crew.registered line superseding the state: no-key fields, a seated crew with no line, a failed keyed provider; no key value; the help and the skill carry the commands); `tests/crew_check.js` pins the third state against the real server (crew_list's next, field, field_title and env; crew_register on a keyless run; the Seats line the listed plugin renders from its log); the workflow comment counts fourteen checks.

Status: merged — 2026-10-13 — pull request 15 merged to main; all fourteen checks and the six strict validations passed locally; no provider was called.

## Part 14 — The founder's ruling of 2026-10-14: four sections in every pull request body

Ruling: every pull request body carries four filled sections, WHAT CHANGED, WHY, HOW IT WAS TESTED and WHAT COULD BREAK, in words a non-coder rules on, enforced by a check; one change per pull request.

Delivers, in one pull request, no plugin file touched so no bump:
- `.github/PULL_REQUEST_TEMPLATE.md`: the four headings, a hint under each as an HTML comment so an unfilled section reads empty, the footer `DOCS OWED: none`. It carries the SPDX comment on line 1 like every Markdown file (invisible when rendered; the check ignores comments and the Release cut starts at the heading).
- `.github/scripts/pr-body.js`: the check, body on stdin. \r stripped first (GitHub's web editor writes CRLF bodies); HTML comments stripped; a heading of any level, any case, a trailing colon allowed; a section ends at the next heading of the same or a higher level, at the next of the four at any level, or at a line starting DOCS OWED; a lower heading inside a section is kept; a bold label is not a heading. One line per fault naming the section, exit 1; a pass line, exit 0.
- `.github/workflows/pr-body.yml`: on pull_request opened, edited, reopened, synchronize to main; `permissions: {}`; checkout pinned by commit with credentials not persisted; the body enters through an environment variable; the runner's Node runs the script. After the merge the founder marks `pr-body` required beside `checks` by hand.
- `.github/scripts/release-notes.js`: its match already took WHAT CHANGED at any level, any case, colon optional (pinned since part 11), so no widening of the match; it now drops HTML comments before the cut, so hints left in the template are never in the Release notes, and a section holding only comments counts as no section (exit 3, the generated-notes fallback).
- CLAUDE.md: the standing rule names the four sections; a new section "The pull request" with the two paragraphs, the four sections and one change per pull request; the layout lines. The workflow comment counts fifteen checks.
- Tests: `tests/pr_body_check.js` new (the six bodies through the real script: filled, CRLF filled, the last section emptied above the footer, a blank middle section, a bold label, a missing heading, each failure naming the section; levels, case, colon, lower headings, multi-line comments; the shipped template unfilled fails on all four and filled passes; the workflow's events, permissions, pins and body route); `tests/release_notes_check.js` adds the template body and the comment-only section.

Status: merged — 2026-10-14 — pull request 16 merged to main.

## Part 15 — The founder's request of 2026-10-14: the plugin is cw, any stage may be skipped, the Next line is a picker

Request: three changes in one pull request, at the founder's word (the one-change rule stands; the three ride together because they rewrite the same lines). Measured first against the files and the Claude Code docs: main was at 0.4.1, not 0.3.1; `cw` is a valid name, a renamed plugin loses installs unless the marketplace carries a `renames` map, and the CI tag job tagged by folder name; the docs name skills as the format for new plugins, with `commands/` the older one; on a run with no round, an `sn:`, `sfq:` or plain battle packet fell through to the rating prompt under a no-rating contract; AskUserQuestion holds four options and always adds its own "Other" row.

Delivers:
- The rename (0.5.0; the add-on 0.4.1 for its README): the manifest name `cw`, so the commands are `/cw:strategy`, `/cw:sparring`, `/cw:battle` and `/cw:help`; the marketplace entry `cw` with `"renames": {"combat-writing": "cw"}`; the four command files moved to `skills/<name>/SKILL.md` with `name:` in the frontmatter (same `argument-hint`, same `$ARGUMENTS`); the install line, the hook line, every `/cw:` reference in the skills, the READMEs, the eval prompts, the checklist, CLAUDE.md and the tests; the tag job reads the plugin name from the manifest, never the folder, so the next tag is `cw--v0.5.0`; the folder stays `plugins/combat-writing/`.
- Any stage may be skipped: `new-run.js` takes `--brief` alone and `--stage strategy|sparring|battle`; `add-draft.js` writes `draft.md` on a run with none and logs `first: true` with the stage; `packet.js` on a first battle round carries `lib.FIRST_ROUND_LINE`, asks an SN or SFQ seat to answer on the draft alone, asks a plain seat for a first critique (`DEFAULT_FIRST_CRITIQUE_PROMPT`, or the step-4 prompt with `--rerate`), logs `first_round`, and makes a `<nn>-sparring` round a read alone; `render-record.js` and `render-board.js` carry the Started-at line (`lib.startedAtLine`) and the no-rounds line names both commands or says the draft is still to come; strategy keeps a brief-only run; sparring and battle start a run from a pasted draft and join a brief-only run; battle runs `01-battle` on an unread run; the skill, the help (`help order`), departure 14 (mirror identical, the pinned step span unchanged) and the four command skills say the order is the person's choice; the eval case `start-at-battle`.
- The Next picker: `lib.nextLine` renders the text Next line into `record.md` and the short form; the rules skill lays out the picker (screen one Battle: everyone / Battle: one seat / Debate: seats re-read and rerate / More; the four round labels with the founder's words as descriptions; the seat list; Final reads / Help / Done for now; the text line; the rerate yes/no; Done for now prints the text Next line and nothing else); sparring and battle close with it, strategy keeps its single Next line, and a host without the tool prints the text line; the help's `help next` section.
- Tests: `tests/order_check.js` new (the refusals, the brief-only run, the draft joining it, every first-round packet kind, sparring after battle alone and debate sharing, the Started-at and Next lines in the record, the board and the short form, the text of the skills and the method, the eval case); `strategy_check.js`, `readme_check.js`, `hook_check.js`, `crew_state_check.js`, `license_check.js` and `marketplace_check.js` updated for the name and the skills; the workflow comment counts sixteen checks.

Status: merged — 2026-10-14 — pull request 17 merged to main; the `/cw:` skills were confirmed in a child session before the merge.

## Part 16 — What the renames map does, measured on the founder's Mac

Request (2026-10-14, after pull request 17): the founder's Mac still answered "Unknown command: /cw:strategy" in a fresh session, `cwu` failed with "Plugin combat-writing not found", and no "Renamed to cw" line appeared. Measured before changing anything, on Claude Code 2.1.300: the marketplace refresh had already moved the enabled entry and the install record from `combat-writing@learning-producers` to `cw@learning-producers`, pointing at a cache folder `cw/0.5.0` that did not exist, so a session loaded nothing under either name; the files arrived only when the plugin CLI next ran on the machine, and a child session in the founder's project then listed the five `cw:` skills and the three crew tools. The Claude Code docs say the same in one line: for a marketplace added by its GitHub address, a renamed plugin reports "not cached" until the person runs the install line once in a session.

- The plugin README (0.5.1) and the checklist row say what the map does and does not do, and name the one install and the new update line; the add-on is untouched.
- Outside the repository, on the founder's Mac: `cwu` in `~/.zshrc` now updates `cw@learning-producers` (a backup sits beside it); `cwb` and `cwt` needed no change because they name the folder, not the plugin; the add-on moved from 0.4.0 to 0.4.1 by the new `cwu` steps.

Status: merged — 2026-10-15 — pull request 18 merged to main.

## Part 17 — The founder's request of 2026-10-14: the board is the result

Request: four changes in one pull request, at the founder's word (they rewrite the same result path). Measured first on the first real three-seat run (2026-10-15, in the founder's project): one outside seat rated 9/10 and wrote "The draft is not send-ready" two lines later, its retry ran to 1,181 words of rule-parsing and was cut at 500, and the checker passed it; the fresh reader wrote "Not send-ready" under an 8/10 and passed too; the scoreboard legend printed with every round; every read printed in full in the terminal; `board.html` was written and never opened.

Delivers (cw 0.6.0; the add-on untouched, the packet carries the new line and the add-on sends the packet whole):
- `lib.SIGNAL_LINE`, the founder's words hardwired into every packet's Contract section by `packet.js`; a rating or critique packet also asks for the verdict in the first sentence after the first line (`VERDICT_SENTENCE_LINE`), and a rating packet states the agreement rule.
- `lib.checkAnswer` fails a rating read whose number contradicts its words (`verdictOf`: the phrase list, negation and conditional handling, the first phrase in reading order), with the reason the seat is sent back with; `check-answer.js`, the record, the board and every live check inherit it. Sparring and battle say the retry covers it.
- `render-record.js --short` prints the legend once per run (`legend.printed`), the scoreboard, `Board: <path>` and the seat key; no Started-at, Next or Record line after a round; `--next` prints the text Next line for "Done for now". `lib.SCOREBOARD_LEGEND` is shared with `record.md`.
- `render-board.js` rewritten: the draft, the verdict band (SEND / BACK TO THE DRAWING BOARD / NO RATING YET, from the latest ratings, naming the seat that sends it back, listing every rated seat's number), one frame per seat (`lib.verdictLine`, the badge with the rating or state and the flip mark, the citation with the round, the final numbers, the full read in a `<details>`), the scoreboard and final reads folded, the run details folded; no chart; every seat's words escaped.
- `open-board.js` new: the system's opener on the local file, `--opener` and `--dry-run` for the tests, exit 0 with the path when no opener is there, `board.opened` logged.
- The skills (sparring §6, battle §8, the rules skill's "Showing a result" and scripts table), the seat agent, the help, departure 15 in the method (mirror identical, the pinned step span unchanged), both READMEs (the example blocks end at their scoreboards), the checklist row, CLAUDE.md.
- Tests: `open_board_check.js` new; `board_check.js` rewritten; `rating_contract_check.js`, `packet_check.js`, `record_check.js`, `order_check.js`, `marketplace_check.js` extended; the workflow comment counts seventeen checks.

Ruling on the bands (2026-10-14, on the open pull request): 8 and above is SEND, 1 to 6 is BACK TO THE DRAWING BOARD, 7 stays forbidden; the contradiction check fails a 6 over "ships as is" too, the board's verdict band reads the same bands (it already did), and the numbers stay under the word.

Status: delivered — 2026-10-14 — pull request 19 open; all seventeen checks pass locally; no provider was called and no seat was started; the opener was exercised with a dry run and a fake, never a browser, in the tests.
