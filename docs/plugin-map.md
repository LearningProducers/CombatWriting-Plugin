<!-- SPDX-License-Identifier: CC-BY-NC-SA-4.0 -->
# The Combat Writing™ plugin, on one page

**Reading is Peace. Writing is War.**

What the plugin holds, measured from the files in this repository on 2026-11-02 and pinned to them by `tests/map_check.js`: every row set below (the commands, the hooks, the add-on's tools, the scripts, the checks, the eval cases) is compared to the folder it describes on every pull request, so a row cannot go missing or stale without the check saying so. The words in each row are written by hand; the rows themselves are not.

The method has four stages. The plugin gives each a command, adds three more for finding things, and does everything else with scripts a person never types.

## 1. The seven commands

Typed as `/cw:<name>` in Claude Code. Each is a skill file at `plugins/combat-writing/skills/<name>/SKILL.md`. The terminal's bare `/cw` completes to `/cw:help`.

| Command | What it takes | What it does | How it ends |
|---|---|---|---|
| `/cw:strategy` | your draft, your brief (`brief:`), who the piece is for (`reader:`), together or in two messages; a brief alone is enough | stores them in a new run folder; reads nothing; a brief typed becomes the project's | one line naming the next move: `/cw:sparring` or `/cw:battle` |
| `/cw:sparring` | a draft (or nothing after strategy), optional `question:` for every seat or `seat-2:` for one, `cold` for no brief, `debate` to share the answers and rerate | every seat reads the draft alone and answers with `RATING: X/10` first, 7 forbidden, then its critique | the scoreboard, the board in your browser, a picker for the next round |
| `/cw:battle` | a draft, or one of the round words below with your text; `rerate` for a new rating; `draft:` for a revision; `final` for the two final reads | the seats discuss structure and content; they read each other only when you share (`sn:`, `sfq:`); no rating unless `rerate` | the scoreboard, the board, a picker |
| `/cw:champion` | `shipped <link or channel>`, `result: <what came back>`, `insight: <what you learned>` | freezes the shipped draft as canon; records each result; appends each insight to the project's vault | the script's line, the board's path, the text Next line |
| `/cw:briefs` | nothing | lists the unnamed default brief and every brief saved by name, with its first line and the runs on it | the list |
| `/cw:runs` | nothing, or a word of a run id | lists every run newest first (brief, reader, last round, drafts, OPEN or SHIPPED); the word finds one run | the list, or the one run |
| `/cw:help` | nothing, `all`, or a topic word | bare: the card and a picker to begin; `all`: the full guide; a topic word: one section | the card and a picker, or the guide |

## 2. The words the plugin reads

Any of these can sit anywhere in what you type or paste, in any order. A keyword line opens a block that runs to the next keyword line. They match in any case, with or without a space after the colon; a dash or bullet before one, or a dash for its colon, is dropped (`brief-`, `-battle:`). This is THE PASTE RULE, the same paragraph in the strategy, sparring and battle skills.

| Word | Also | Who reads it | What it does |
|---|---|---|---|
| `brief:` | `context:` | strategy, sparring, battle | the standing rules of the project; typed once, it serves every later run that brings none |
| `brief <name>:` | | the same three | saves a brief by name (`brief cold-email: ...`) and makes it this run's |
| `brief: <name>` | | the same three | one word matching a saved name picks that brief for the run |
| `brief update:` | `update brief:`, `brief update <name>:` | the same three | adds one dated line to the brief, never retyping the rest |
| `reader:` | `prospect:` | the same three | who this one piece is for; travels with the run, never into the project's brief |
| `battle:` | | any command | the draft of a new piece, and the stage that runs on it |
| `sparring:` | | any command | the same, for sparring |
| `draft:` | | battle | a revised draft of the current run (or its first draft when it has none) |
| `question:` | `fq:`, `focus:` | sparring, battle | FQ, focus question: the same question to every seat, nothing shared |
| `n:` | `nav:` | battle | N, navigation: the same guidance to every seat, nothing shared |
| `sn:` | | battle | SN, synthesis navigation: everyone reads each other plus your prompt |
| `sfq:` | | battle | SFQ, synthesis focus question: everyone reads each other plus your question |
| `seat-2:` | `seat 2:`, `seat2:`, the seat's short name | sparring, battle | a note or question to one seat only; combines with any round word |
| `rerate` | anywhere in the line | battle | this round asks for a new rating, the rating line first |
| `cold` | | sparring | a read with no brief |
| `debate` | | sparring | the seats read each other's answers and rate again |
| `final` | | battle | the two final reads on the draft alone: S/N ratio and red flags; not ratings |
| `run:` | | sparring, battle, champion | returns to a run by a word of its id, or a folder path |
| `shipped` | | champion | the piece went out: a link, `email to <whom>`, or any channel in words |
| `result:` | | champion | one dated line in your words; silence is a result; `at:` dates it |
| `insight:` | | champion | one dated, run-tagged line in the project's insight vault |

A paste with no keyword on the draft: the text before the first keyword line is the draft; after a `brief:` block, the text that opens with a greeting is the draft, taken as the best guess and shown on the result's Draft line.

## 3. The pickers

A missing keyword never errors. The host opens a one-keypress menu (the AskUserQuestion tool), at most two screens, never an "Other". Where the host has no such tool, the text Next line is printed instead.

| Where | Screen one | Screen two |
|---|---|---|
| bare `/cw:help` | Strategy / Sparring / Battle / Champion | one line asks for the text; that stage runs with it |
| bare `/cw:sparring` | Draft / Cold / Debate / Question | under Question: Everyone / One seat, then the seat list |
| sparring text with no keyword | Everyone / One seat / Draft / Brief, best guess marked | under One seat: the seat list |
| bare `/cw:battle`, or text with no keyword | Everyone / One seat / Revised draft / Final (New run in place of Final when the text is draft-shaped), best guess marked | under Everyone: FQ / N / SN / SFQ; under One seat: the seat list |
| bare `/cw:champion` | Shipped / Result / Insight, best guess marked | one line asks for the text |
| after every sparring and battle result | Battle: everyone / Battle: one seat / Debate: seats re-read and rerate / More | under Battle: everyone: FQ / N / SN / SFQ; under More: Final reads / Champion / Help / Done for now; then one line for your text and one yes or no for rerate |

Done for now prints the text Next line, which names the run, the word that returns to it (`run: <word>`), and the line that starts a new piece.

## 4. What is written where

Everything lands in your project, under `combat-writing/`, never in the plugin. Seven places, no more.

| Place | What | Written by |
|---|---|---|
| `combat-writing/runs/<date-time-slug>/` | one run: `draft.md` and any `draft-2.md`, `canon.md` once shipped, `brief.md`, `reader.md`, `seats.json`, `log.jsonl` (the source of truth), `record.md`, `board.html`, `state.json`, and `rounds/<nn>-<kind>/` with each seat's question, packet, answer and voice recordings | the scripts in section 6, and the add-on's two writing tools |
| `combat-writing/inbox/` | every paste, whole, then cut into the draft, the brief, the reader, the questions and the champion entries | the host, before any script runs |
| `combat-writing/insight-vault.md` | every `insight:` across all runs, one file | `champion.js` |
| `combat-writing/.gitignore` | two lines, `runs/` and `inbox/`, so the vault and the briefs stay with the project in git | `new-run.js`, once, inside a git repository |
| `combat-writing/brief.md` | the project's unnamed brief and its dated updates | `new-run.js` from a `brief:`, `brief.js --update` |
| `combat-writing/briefs/<name>.md` | the briefs saved by name | `new-run.js` with `--brief-name`, `brief.js --update --name` |
| `combat-writing/seats.json` and `combat-writing/voices.json` | your picks: a model for a fresh reader; a voice for a seat | `seats.js --set`, `speak.js --set` |

Nothing is fetched by any script. The one outside connection is the host opening the link given to `shipped`, once. The add-on sends packets to the providers you hold keys for and nowhere else.

## 5. What runs where

**The hooks**, three, declared in `plugins/combat-writing/hooks/hooks.json`. They run with the session's full access, outside the sandbox the host's shell runs in.

| Hook | When | What it does |
|---|---|---|
| `session-start.js` | every session start and resume | prints "Combat Writing ready. /cw:help for the guide."; on the first session only, says what the install still lacks (the crew add-on, the Mac's voices) and never again |
| `seat-scope.js` | before every tool call | for a fresh reader alone: allows Read inside its run folder and Write to its own answer file, denies the rest; touches nobody else |
| `show-result.js` | after every shell command | when the command printed the short form, puts it on your screen as the plugin's own line; when the opener failed in the sandbox, opens the board itself; when the speech engine was silenced, renders the voices itself |

**The seats.** Two fresh readers by default, seat-1 and seat-2: separate agents started for one job each, on the first and second model the host's own agent tool lists, with no memory of your conversation. The agent file is `plugins/combat-writing/agents/seat.md` (`model: inherit`, tools Read and Write). Where the host can start no agent, the host is the one seat and says so.

**The add-on**, `plugins/combat-writing-crew/`, a local MCP server (`server.js`) installed from this repository's marketplace, never listed in the directory. The moment it seats one outside model, the second chair is the outside seats' and the fresh seat-2 leaves.

| Tool | What it does |
|---|---|
| `crew_list` | which outside seats the keys present can seat; for each missing key, the configure command and the field name |
| `crew_register` | adds the available outside seats to a run's `seats.json`, numbered from 2 in the provider order below |
| `crew_answer` | sends one seat's packet for one round to its provider on your own key, waits out the per-minute window, writes the answer file beside the packet |

The seat each key gives, from `providers.json` (no model id is written anywhere; each seat resolves from the provider's live catalog when the run starts):

| Key field | Provider | The seat |
|---|---|---|
| `groq_api_key` | Groq | Alibaba's Qwen line as seat-2, OpenAI's open-weight line as seat-3 (the free tier) |
| `xai_api_key` | xAI | xAI's Grok line |
| `perplexity_api_key` | Perplexity | Perplexity's Sonar line |
| `openai_api_key` | OpenAI | OpenAI's GPT line |
| `mistral_api_key` | Mistral AI | Mistral's large line |
| `gemini_api_key` | Google | Google's Gemini line |
| `ollama_model` | Ollama, on your machine | the local model you name |

A key comes from the masked prompt (`/plugin configure combat-writing-crew`), else the provider's environment variable, else one line in your own owner-only file `~/.combat-writing/keys`. It goes to its provider and nowhere else.

## 6. The scripts

Nineteen files in `plugins/combat-writing/scripts/`, plain Node, no dependencies. The host runs them; a person never types them. They are the only writers inside a run folder.

| Script | Called when | What it writes |
|---|---|---|
| `lib.js` | by every other script | nothing; the shared rules (the contract lines, the paste keywords, the draft's counts, the word caps, the bands) |
| `new-run.js` | a run starts | the run folder, `draft.md`, `brief.md`, `reader.md`, `seats.json`; the project's brief; the gitignore on the first run |
| `add-draft.js` | `draft:` or `reader:` on an existing run | `draft-N.md`, `reader.md` |
| `brief.js` | `brief update:` | one dated line on the project's or the named brief, and on the run's |
| `briefs.js` | `/cw:briefs` | nothing; prints the list |
| `runs.js` | `/cw:runs`, `run:` | nothing; prints the list or the one folder |
| `seats.js` | "seat-2 on <model>", "seat-2 back to the list" | `combat-writing/seats.json` |
| `crew-state.js` | the add-on is absent or down | one log line saying which, for the Seats line |
| `announce.js` | the round's kind and seats are known | one log line; prints the forming line |
| `budget.js` | every packet of a round is built | one log line with each packet's size and each provider's room; prints a warning only when a packet is over a wall |
| `packet.js` | before any seat starts | each seat's `packet.md`, from files on disk only: the draft with its counts and parts, the brief, the reader, the previous round's answers, the seat's own earlier turn, the contract |
| `check-answer.js` | a seat's answer lands | the log line; on a second overrun, the answer cut at the cap |
| `check-flip.js` | after a rated round | the log line: Stand, flip valid, flip invalid |
| `champion.js` | `/cw:champion` | `canon.md`, the result line, the vault line |
| `render-record.js` | after every round; `--short` prints the terminal's short form | `record.md` |
| `render-board.js` | after every round | `board.html` |
| `render-state.js` | the screen, or anything reading the run | `state.json` with `--write`; else prints it |
| `open-board.js` | after every round and after `shipped` | one log line; opens the board in your browser |
| `speak.js` | after every round on a Mac | `rounds/<round>/<seat>.m4a` and the other quality voices, `voices.json`; with `--set`, the project's `voices.json` |

Beside the scripts: `skills/combat-writing/SKILL.md`, the method as the host runs it (the script table, the run steps, the short form); `method/combat-writing.md`, the 19 steps as written in the app, with where the plugin departs from them; `evals/`, six cases for `claude plugin eval`.

## 7. The checks

One command runs everything CI runs: `node tests/run_all.js` from the repository root (the plugin's tests, then the screen's through uv, then `claude plugin validate --strict` on three folders). Exit 0 is a pass. CI runs the same on every pull request and adds the version-bump gate; `pr-body.yml` holds every pull request to the four sections.

| Check | What it pins |
|---|---|
| `tests/announce_check.js` | the forming line and the per-seat line while a round runs |
| `tests/board_check.js` | the board: one page, the box, the frames, the read-aloud controls, no outside request |
| `tests/brief_check.js` | the brief travels: typed once, carried by later runs, grown by update |
| `tests/briefs_check.js` | briefs by name |
| `tests/budget_check.js` | the price of a round, measured before the seats run |
| `tests/champion_check.js` | shipped, result, insight: the script, the record, the board, the skill |
| `tests/crew_check.js` | the add-on's server against a fake provider on localhost: keys, catalog, budget, window, truncation |
| `tests/crew_state_check.js` | the Seats line when the crew is short, with the next command |
| `tests/draft_facts_check.js` | the draft's counts, measured by code |
| `tests/draft_parts_check.js` | the labeled draft: greeting, opening sentence, body, closer |
| `tests/flip_check.js` | a flip must quote who moved it |
| `tests/gitignore_check.js` | the two-line gitignore on the first run in a git repository |
| `tests/help_check.js` | the card, the picker, the README's copy of the card |
| `tests/hook_check.js` | the three hooks are declared as ruled |
| `tests/license_check.js` | the right license header on every file by path |
| `tests/links_check.js` | links are unread: the packet says so when one is present |
| `tests/map_check.js` | this page: every row set equals the folder it describes |
| `tests/marketplace_check.js` | the marketplace names both plugins and the add-on rides as cw's dependency |
| `tests/method_check.js` | the step text is the app's, with the departures listed |
| `tests/open_board_check.js` | the opener: its exit read, the failed line named |
| `tests/order_check.js` | any stage may be skipped |
| `tests/packet_check.js` | the packet from files only, the previous round carried, the contract |
| `tests/paste_check.js` | THE PASTE RULE, the same words in three skills |
| `tests/pr_body_check.js` | the four-section gate script |
| `tests/rating_contract_check.js` | `RATING: X/10`, 7 forbidden, the number against the words |
| `tests/reader_check.js` | the reader rides in the run, not in the project's brief |
| `tests/readers_check.js` | two fresh readers, the second chair the add-on's, the provider table in the help |
| `tests/readme_check.js` | the two READMEs say what the directory requires |
| `tests/record_check.js` | `record.md` from the files and the log |
| `tests/release_notes_check.js` | the Release notes cut from a merged pull request |
| `tests/rewrite_check.js` | the Contract follows the prompt; a rewrite fenced and framed |
| `tests/run_all.js` | not a check: the runner of the whole suite |
| `tests/runs_check.js` | open runs and the way back |
| `tests/seat_scope_check.js` | the seat's reach, the real hook on a real run |
| `tests/seat_scope_live.js` | not in CI: one real seat through a throwaway plugin, rerun after every Claude Code update |
| `tests/sections_check.js` | Answer, then To the crew, when the round shares |
| `tests/session_start_check.js` | the first-session line |
| `tests/show_result_check.js` | the result shown by the plugin itself |
| `tests/speak_check.js` | the Mac speaks the files |
| `tests/state_check.js` | the run as one JSON object |
| `tests/strategy_check.js` | strategy stores and names the next move |
| `tests/two_pass_check.js` | a first-round `sn:` or `sfq:` runs two passes |
| `screen/tests/_run.py` | not a check: builds a run with the real scripts for the four below |
| `screen/tests/no_method_text_check.py` | the screen holds no method text and computes nothing |
| `screen/tests/shell_check.py` | the screen's shell, headless |
| `screen/tests/state_check.py` | the screen reads the run through `render-state.js` |
| `screen/tests/sweep_check.py` | the screen sees a file land within one sweep |

The six eval cases, `plugins/combat-writing/evals/`, each one draft through the plugin and a grade: `buried-unsupported-claim`, `instruction-in-draft`, `date-after-cutoff`, `start-at-battle`, `n-rewrite-to-every-seat`, `one-seat-line-only`.

## What is not in the plugin

No key, ever, in any file the plugin writes. No model name in any file. No fetch by any script. No padding of the crew: a seat that fails is shown as missing. The credit line stands once, at the foot of `/cw:help all`, and in no run output.
