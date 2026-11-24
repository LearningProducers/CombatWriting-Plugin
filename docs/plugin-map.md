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
| `/cw:runs` | nothing, or a word of a run id | lists every run newest first (brief, reader, last round, drafts, OPEN or SHIPPED), then a picker of the four open runs touched last, any stage; the word finds one run | the list and the picker, or the one run |
| `/cw:help` | nothing, `all`, or a topic word | bare: the card and a picker to begin, no tool called and nothing between them; `all`: the guide, under 450 words, opening with the motto and the one-liner, in three tables, with no example and one live line under The crew naming the seats that sit; a topic word: one section of the full guide | the card and a picker, or the guide |

## 2. The words the plugin reads

Any of these can sit anywhere in what you type or paste, in any order. The first fourteen rows (`brief:` through `run:`; `brief: <name>` is a form of `brief:`, so thirteen keywords) are those of THE PASTE RULE, the same paragraph in the strategy, sparring and battle skills: a keyword line opens a block that runs to the next keyword line; they match in any case, with or without a space after the colon; a dash or bullet before one, or a dash for its colon, is dropped (`brief-`, `-battle:`). The last seven (`rerate` through `insight:`) are command words the sparring, battle and champion skills read.

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
| `run:` | | sparring, battle, champion | returns to a run by a word of its id, or a folder path |
| `rerate` | anywhere in the line | battle | this round asks for a new rating, the rating line first |
| `cold` | | sparring | a read with no brief |
| `debate` | | sparring | the seats read each other's answers and rate again |
| `final` | | battle | the two final reads on the draft alone: S/N ratio and red flags; not ratings |
| `picker on` | | battle, sparring | turns the picker that ends every round back on for this project; runs no round |
| `shipped` | | champion | the piece went out: a link, `email to <whom>`, or any channel in words |
| `result:` | | champion | one dated line in your words; silence is a result; `at:` dates it |
| `insight:` | | champion | one dated, run-tagged line in the project's insight vault |

A paste with no keyword on the draft: the text before the first keyword line is the draft; after a `brief:` block, the text that opens with a greeting is the draft, taken as the best guess and shown on the result's Draft line.

## 3. The pickers

A missing keyword never errors. The host opens a one-keypress menu (the AskUserQuestion tool), at most two screens, never an "Other". A round's text typed after a menu (an FQ, an N, an SN, an SFQ, a note to one seat, sparring's question) is shown back whole in one more dialog, "Is this the message you want to send to all AI crew members?", Send or Change it, before anything is stored or sent; a command typed whole with its keyword is not asked. Where the host has no such tool, the text Next line is printed instead.

| Where | Screen one | Screen two |
|---|---|---|
| bare `/cw:help` | Strategy / Sparring / Battle / Champion | one line asks for the text; that stage runs with it |
| bare `/cw:sparring` | Draft / Cold / Debate / Question | under Question: Everyone / One seat, then the seat list |
| sparring text with no keyword | Everyone / One seat / Draft / Brief, best guess marked | under One seat: the seat list |
| bare `/cw:battle`, or text with no keyword | Everyone / One seat / Revised draft / Final (New run in place of Final when the text is draft-shaped), best guess marked | under Everyone: FQ / N / SN / SFQ; under One seat: the seat list |
| bare `/cw:champion` | Shipped / Result / Insight, best guess marked | one line asks for the text |
| bare `/cw:runs`, after the listing | the four open runs touched last, any stage, by last activity (no picker when none is open) | the pick continues in that run's own stage: battle's or sparring's picker, or the first round on a strategy-made run |
| after every sparring and battle result | Battle: everyone / Battle: one seat / Debate: seats re-read and rerate / More | under Battle: everyone: FQ / N / SN / SFQ; under More: Final reads / Champion / I will type commands for this project / Done for now; then one line for your text, shown back for you to send or change (Send / Change it) before it reaches a seat; a rating takes `rerate` in the command, or Debate |

Done for now prints the text Next line, which names the run, the word that returns to it (`run: <word>`), and the line that starts a new piece.

The picker that ends every round has an off switch, kept per project. "I will type commands for this project" prints the text Next line at once and writes `combat-writing/picker.json`; from then on every round in that project ends with the text Next line and no picker, until `/cw:battle picker on` turns it back on. A picker closed with no choice stores nothing and opens again after the next round. The switch holds that picker alone: the menus a typed command asks for still open.

## 4. What is written where

Everything a run produces lands in your project, under `combat-writing/`, never in the plugin: the eight places the rulings count, the seventh holding your two pick files and the eighth the picker's off switch.

| Place | What | Written by |
|---|---|---|
| `combat-writing/runs/<date-time-slug>/` | one run: `draft.md` and any `draft-2.md`, `canon.md` once shipped, `brief.md`, `reader.md`, `seats.json`, `log.jsonl` (the source of truth), `record.md`, `board.html`, `state.json`, and `rounds/<nn>-<kind>/` with each seat's question, packet, answer and voice recordings | the scripts in section 6, and the add-on's two writing tools |
| `combat-writing/inbox/` | every paste, whole, then cut into the draft, the brief, the reader, the questions and the champion entries | the host, before any script runs |
| `combat-writing/insight-vault.md` | every `insight:` across all runs, one file | `champion.js` |
| `combat-writing/.gitignore` | two lines, `runs/` and `inbox/`, so the vault and the briefs stay with the project in git | `new-run.js`, once, inside a git repository |
| `combat-writing/brief.md` | the project's unnamed brief and its dated updates | `new-run.js` from a `brief:`, `brief.js --update` |
| `combat-writing/briefs/<name>.md` | the briefs saved by name | `new-run.js` with `--brief-name`, `brief.js --update --name` |
| `combat-writing/seats.json` and `combat-writing/voices.json` | your picks: a model for a fresh reader; a voice for a seat | `seats.js --set`, `speak.js --set` |
| `combat-writing/picker.json` | the picker's off switch: there only while you chose "I will type commands for this project" | `picker.js --off`; `picker.js --on` removes it |

Outside your project the plugin's scripts and hooks write in two places. One is the data folder the host keeps for it: the session-start hook's one file, which says its first-session check ran, and the seat hook's records of the fresh readers it started (`seat-scope/<session>/`: the seat's id, the run folder, the packet's path, the answer file's path and the time of the start; no text of a draft or a brief beyond what those paths carry, the run folder's own name in them being made from the first words of a pasted draft or brief, or from a file's name; a session's records are removed at a later start of a fresh reader, once 30 days have passed since a fresh reader was last started or first placed in that session, at most twenty sessions' records at one start, and stay until then). The other is the system's temporary folder, where `speak.js` writes each answered seat's text for the Mac's speech engine, one file a seat, and removes them once the voices are rendered; a render the result hook stops at its window is ended before that, and those files stay.

Nothing is fetched by any script. The one outside connection is the host opening the link given to `shipped`, once. The add-on sends packets to the providers you hold keys for and nowhere else.

## 5. What runs where

**The hooks**, three, declared in `plugins/combat-writing/hooks/hooks.json`. They run with the session's full access, outside the sandbox the host's shell runs in. Each command there asks the shell for `node` first. On a machine with no Node on the PATH none of the three runs: the session start prints `hooks/no-node.json` (a line for the person, the same fact for the host), the fence refuses the plugin's reader alone, and nothing of the person's own work is stopped.

| Hook | When | What it does |
|---|---|---|
| `session-start.js` | every session start and resume | prints nothing to the person: hands the host "Combat Writing ready. /cw:help for the guide." as context it reads and never shows (`hookSpecificOutput.additionalContext`, no `systemMessage`); on the first session only, adds what the install still lacks (the crew add-on, the Mac's voices) and never again; the data folder that holds its one sentinel is read from the hook's environment, and the check is skipped only when the hook can see that sentinel: a host that names no data folder, or one the hook cannot make, read or write, gets the lines at every start; the sentinel is written only when every measurement the start owed came back (the add-on, and on a Mac the voice list), so after a start where one did not, nothing is recorded and the next start measures again |
| `seat-scope.js` | before every Read, every Write and every start of an agent | for a fresh reader: allows Read of its own packet and its own answer file and Write to that answer file, denies the rest; for the call that starts a fresh reader: holds it to the seat's record (no model choice for a seat recorded on the session's own model, one for a seat recorded on a named model) and denies a start it cannot place; puts each start it allows on record in the plugin's data folder (`seat-scope/<session>/`: the seat's id, the run folder, the packet's path, the answer file's path, the time) and places the fresh reader by that record at its first call that names its packet or its answer file, opening no transcript; denies a start whose record it cannot keep; at a later start, removes the records of sessions in which no fresh reader was started or first placed for 30 days, at most twenty sessions at one start; touches nothing else; when the hook starts and fails, the host stops the call (`onFailure` `block` on its entry) |
| `show-result.js` | after every shell command and every start of an agent | when the command printed the short form, puts it on your screen as the plugin's own line; when the opener failed in the sandbox, opens the board itself: the run's own `board.html` and no other file, rendered again by the plugin's own script the moment before, for a real run folder the command names by a literal `--run` path (a folder holding the run's `seats.json` and `log.jsonl` as plain files and no link among its own entries, its rounds folder's or a round folder's; no other folder inside the run is entered), never a path read from a command's output; when the speech engine was silenced, renders the voices itself, in a real run folder and a round of it, the folder the one the script's own line names; hands the host its context for a real run folder alone, and nothing after a command that only mentions a script's name; when the host started a fresh reader, logs to the run the model the host resolved for it (`seat.model`), read from the start call it is handed and from no transcript, printing nothing; and when the project's picker is off (`combat-writing/picker.json`, which it reads and never writes), tells the host to end the round on the text Next line and open no picker |

**The seats.** Two fresh readers by default, seat-1 and seat-2: separate agents started for one job each, seat-1 on the session's own model and seat-2 on the second most capable model the host's agent tool offers, ranked by the host from what it knows of the models and never by the order of the list; when that is the session's own model, no model is passed (a result's Models line names a fresh reader that is not on the session's model, and one that fell back to another model, with the time and the reason; a reader's label is the name the host gave, and the model each fresh reader started on is measured from the start call and shown in the record and under Run details), with no memory of your conversation. The agent file is `plugins/combat-writing/agents/seat.md` (`model: inherit`, tools Read and Write). Where the host can start no agent, the host is the one seat and says so.

**The add-on**, `plugins/combat-writing-crew/`, a local MCP server (`server.js`) installed from this repository's marketplace and to be submitted to the Claude plugin directory as a second bundle from this repository. The moment it seats one outside model, the second chair is the outside seats' and the fresh seat-2 leaves.

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

A key comes from the masked prompt (`/plugin configure combat-writing-crew`), else one line in your own owner-only file `~/.combat-writing/keys`, and from no other place: a key that stands only in a provider's usual variable in your shell is not read. It goes to its provider and nowhere else.

## 6. The scripts

Twenty-one files in `plugins/combat-writing/scripts/`, plain Node, no dependencies. The host runs them; a person never types them. They are the only writers inside a run folder.

| Script | Called when | What it writes |
|---|---|---|
| `lib.js` | by every other script | nothing; the shared rules (the contract lines, the paste keywords, the draft's counts, the word caps, the bands) |
| `new-run.js` | a run starts | the run folder, `draft.md`, `brief.md`, `reader.md`, `seats.json`; the project's brief; the gitignore on the first run; nothing at all for a draft with no words, which it refuses |
| `add-draft.js` | `draft:` or `reader:` on an existing run | `draft-N.md`, `reader.md`; nothing for a draft with no words, which it refuses |
| `brief.js` | `brief update:` | one dated line on the project's or the named brief, and on the run's |
| `briefs.js` | `/cw:briefs` | nothing; prints the list |
| `runs.js` | `/cw:runs`, `run:` | nothing; prints the list, the one folder, or under `--pick` the JSON array the runs picker reads |
| `seats.js` | "seat-2 on <model>", "seat-2 back to the default" | `combat-writing/seats.json` |
| `picker.js` | before every Next picker; the More screen's "I will type commands for this project"; `picker on` | `combat-writing/picker.json` with `--off`, removed with `--on`; bare, nothing: prints `Picker: on`, or `Picker: off` and the text Next line |
| `seat-fallback.js` | the host's tool refused a fresh reader's start or does not offer its model | one log line, `seat.fallback` (from, to, the reason; its time is the when), and that seat's record in the run's `seats.json` |
| `crew-state.js` | the add-on is absent or down | one log line saying which, for the Seats line |
| `announce.js` | the round's kind and seats are known | one log line; prints the forming line |
| `budget.js` | every packet of a round is built | one log line with each packet's size and each provider's room; prints a line only when a packet is over a provider's wall, or a fresh reader's packet is over the size the plugin counts on for one read |
| `packet.js` | before any seat starts | each seat's `packet.md`, from files on disk only: the draft with its counts and parts, fenced on a mark drawn for that packet, the brief, the reader, the previous round's answers, the seat's own earlier turn, the contract |
| `check-answer.js` | a seat's answer lands | the log line, its reasons in the checker's own words with no word of the answer; on a second overrun, the answer cut at the cap |
| `check-flip.js` | after a rated round | the log line: Stand, flip valid, flip invalid |
| `champion.js` | `/cw:champion` | `canon.md`, the result line, the vault line; with `--next`, nothing: it prints the Next line |
| `render-record.js` | after every round; `--short` prints the terminal's short form | `record.md`, with a Log line when a line of the run's log could not be read |
| `render-board.js` | after every round | `board.html` (the four faces under `fonts/` embedded as data) |
| `render-state.js` | the screen, or anything reading the run | `state.json` with `--write`; else prints it |
| `open-board.js` | after every round and after `shipped` | one log line; opens the board in your browser |
| `speak.js` | after every round on a Mac | `rounds/<round>/<seat>.m4a` and the other quality voices, `voices.json`; with `--set`, the project's `voices.json` |

Beside the scripts: `skills/combat-writing/SKILL.md`, the method as the host runs it (the script table, the run steps, the short form); `method/combat-writing.md`, the 19 steps as written in the app, with where the plugin departs from them; `evals/`, six cases for `claude plugin eval`.

## 7. The checks

One command runs everything CI runs: `node tests/run_all.js` from the repository root (the plugin's tests, then the screen's through uv, then `claude plugin validate --strict` on three folders). Exit 0 is a pass. CI runs the same on every pull request and adds the version-bump gate; `pr-body.yml` holds every pull request to the four sections.

| Check | What it pins |
|---|---|
| `tests/announce_check.js` | the forming line and the per-seat line while a round runs |
| `tests/approval_check.js` | THE APPROVAL STEP, the same words in three skills: a text taken through a picker is shown back before it is sent, and no rerate question follows it |
| `tests/board_check.js` | the board: one screen, the tabs, the cards in their company identity, the embedded faces, no verdict box, the read-aloud controls, no outside request |
| `tests/brief_check.js` | the brief travels: typed once, carried by later runs, grown by update |
| `tests/briefs_check.js` | briefs by name |
| `tests/budget_check.js` | the price of a round, measured before the seats run |
| `tests/champion_check.js` | shipped, result, insight: the script, the record, the board, the skill |
| `tests/crew_check.js` | the add-on's server against a fake provider on localhost: keys, catalog, budget, window, truncation |
| `tests/crew_repairs_check.js` | the add-on's repairs before the submission, on a staged copy of the add-on started as the manifest starts it: a key from the prompt or the key file and from no other place, the key in use scrubbed from error text, the tools' annotations, the seat id's pattern, the provider table beside the server alone, a refused key said, the size refusal's words, what the README says is sent |
| `tests/crew_state_check.js` | the Seats line when the crew is short, with the next command |
| `tests/draft_facts_check.js` | the draft's counts, measured by code |
| `tests/draft_parts_check.js` | the labeled draft: greeting, opening sentence, body, closer |
| `tests/fallback_check.js` | a fresh reader's start that fell to another model: the log line, the seat record, the Models line naming when and why, the hook allowing the new start |
| `tests/flip_check.js` | a flip must quote who moved it |
| `tests/gitignore_check.js` | the two-line gitignore on the first run in a git repository |
| `tests/help_check.js` | the card, the bare rule with no tool call, the guide's opening and its one live line, the picker, the README's copy of the card |
| `tests/hook_check.js` | the three hooks are declared as ruled, each command asking for `node` first |
| `tests/key_route_check.js` | where a key comes from, as the shipped files and the public pages say it: a provider's key name stands beside the key file or a word that it is not read, a sentence on an environment variable names one the code reads, and the configure command is the bare one the add-on prints |
| `tests/license_check.js` | the right license header on every file by path |
| `tests/lists_check.js` | the board shows the numbers a seat wrote, blank lines between the items or not |
| `tests/links_check.js` | links are unread: the packet says so when one is present |
| `tests/map_check.js` | this page: every row set equals the folder it describes |
| `tests/marketplace_check.js` | the marketplace names both plugins and the add-on rides as cw's dependency |
| `tests/measured_check.js` | the model that answered, measured: the Models line from the log's `seat.model` lines, the change between two rounds, the record's and Run details' lines, the label never rewritten |
| `tests/method_check.js` | the step text is the app's, with the departures listed |
| `tests/no_node_check.js` | every hook command run through `sh` with and without `node` on the PATH: with none, the person's own calls pass, the plugin's reader is refused at its start and at each call, the session start says Node is missing, the result hooks say nothing; the fence's entry matched to the seat's two tools and the agent tool's two names |
| `tests/no_node_live.js` | not in CI: one real session on a PATH with no node, through a throwaway plugin that carries the repository's hooks as declared; the person's own Read, Write and shell command go through, the start of the plugin's reader is refused with a line that names Node; rerun after every Claude Code update |
| `tests/open_board_check.js` | the opener: its exit read, the failed line named |
| `tests/order_check.js` | any stage may be skipped |
| `tests/packet_check.js` | the packet from files only, the previous round carried, the contract |
| `tests/packet_run_check.js` | the packet and the run: every fence line on a mark drawn for the packet, so no line of a draft or of a carried answer closes a fence; a check's reason with no word of the answer; a draft with no words refused; a long packet said before the round; a line of the log that cannot be read counted and said; a run from a brief alone named; the Next line of champion printed by a script |
| `tests/paste_check.js` | THE PASTE RULE, the same words in three skills |
| `tests/picker_check.js` | THE PICKER RULE, the same words in three skills: the off switch per project, the text Next line at once, the way back, and a closed picker that remembers nothing |
| `tests/places_check.js` | the two lists that end "Nothing is written anywhere else", the help's "Where files land" and the listing README's paragraph, name every place section 4 names and no other |
| `tests/plan_check.js` | where each part of the plan is read: Parts 1 to 90 in the first archive file, Parts 91 to 140 in the second, held to a hash of the bytes that moved, Part 141 onward in the plan; no part in two files |
| `tests/provenance_check.js` | the shipped folders carry the rule, never the ruling: no "ruled", no "founder" outside the credit line |
| `tests/pr_body_check.js` | the four-section gate script |
| `tests/rating_contract_check.js` | `RATING: X/10`, 7 forbidden, the number against the words |
| `tests/reader_check.js` | the reader rides in the run, not in the project's brief |
| `tests/readers_check.js` | two fresh readers, seat-1 on the session's own model, seat-2 by rank and never by the list's order, the Models line, the second chair the add-on's, the provider table in the help |
| `tests/readme_check.js` | the two READMEs say what the directory requires |
| `tests/record_check.js` | `record.md` from the files and the log |
| `tests/release_notes_check.js` | the Release notes cut from a merged pull request |
| `tests/rewrite_check.js` | the Contract follows the prompt; a rewrite fenced and framed |
| `tests/run_all.js` | not a check: the runner of the whole suite |
| `tests/rulings_check.js` | CLAUDE.md's short wall and its record: the first 28 entries of RULINGS.md equal to their hashes, every bullet of "What is ruled about the method" closed by the tests that hold it or by its words, CLAUDE.md under one ceiling in characters |
| `tests/runs_check.js` | open runs and the way back |
| `tests/second_copy_check.js` | a fact with a home is never copied: no version string in the root README or docs/, the listing README's card equal to the skill's |
| `tests/seat_name_check.js` | a seat's name has one shape where it is stored and where it is read: the add-on against a stand-in provider whose list, maker, reply and error text hold line breaks and a heading; a seats file that already holds such a name; the add-on's copy of the model id pattern |
| `tests/seat_scope_check.js` | the seat's reach and the start of a seat held to its record, the real hook on a real run; a seat placed by the hook's own record and by no transcript, one start placing one seat, a seat's two calls at once on its own two files both allowed, no data folder starting none, a link or a file standing in for a folder of records never written or read through, the record holding no text of the draft beyond what its paths carry, the records removed at a later start once a session has stood 30 days, twenty sessions at a start at the most, a record left half written removed, the last look after the wait; the sentences a fresh read corrected, searched for in every `.md` and `.js` file at the root, under `docs/`, `plugins/` and `tests/`, the plan's archive excepted; the run the live proof builds held to a start the hook allows |
| `tests/seat_scope_live.js` | not in CI: one real seat through a throwaway plugin, placed by the hook's record in the plugin's data folder, and a second session whose hook cannot start, rerun after every Claude Code update |
| `tests/sections_check.js` | Answer, then To the crew, when the round shares |
| `tests/session_start_check.js` | the first-session line; the data folder from the environment alone; every start measured when the hook cannot see its sentinel (no folder named, or one that cannot be made); no sentinel after a start where a measurement did not come back, the start after it measuring again, and the sentinel written at the first start where both did; off a Mac the add-on alone decides |
| `tests/session_start_live.js` | not in CI: two real session starts through a throwaway plugin, the hook handed no argument and its data folder in the environment; rerun after every Claude Code update |
| `tests/show_result_check.js` | the result shown by the plugin itself; the hook's acts held to a real run folder (the command's literal path; for the voices the script's own line), a run folder with a link anywhere in it no run, the board opened the run's own and rendered first; the model a fresh reader started on read from the start call, with no transcript opened |
| `tests/show_result_live.js` | not in CI: two real sessions through a throwaway plugin, the result hook handed a real round's output and a command that only mentions the scripts; the run's own board opened, nothing a command's output names; rerun after every Claude Code update |
| `tests/speak_check.js` | the Mac speaks the files |
| `tests/start_model_live.js` | not in CI: one real start of a fresh reader through a throwaway plugin; the host hands the result hook the model it resolved, and the run's log holds that id on one `seat.model` line marked at start; rerun after every Claude Code update |
| `tests/state_check.js` | the run as one JSON object |
| `tests/strategy_check.js` | strategy stores and names the next move |
| `tests/truth_pages_check.js` | the pages that say what the two plugins are and do: the icon in each folder, the privacy and support links and their pages, the hosts each manifest declares, the checklist rows on the bundled fonts and the hooks, and a decision written as the decision |
| `tests/two_pass_check.js` | a first-round `sn:` or `sfq:` runs two passes |
| `screen/tests/_run.py` | not a check: builds a run with the real scripts for the four below |
| `screen/tests/no_method_text_check.py` | the screen holds no method text and computes nothing |
| `screen/tests/shell_check.py` | the screen's shell, headless |
| `screen/tests/state_check.py` | the screen reads the run through `render-state.js` |
| `screen/tests/sweep_check.py` | the screen sees a file land within one sweep |

The eight eval cases, `plugins/combat-writing/evals/`, each one draft through the plugin and a grade: `buried-unsupported-claim`, `instruction-in-draft`, `date-after-cutoff`, `start-at-battle`, `n-rewrite-to-every-seat`, `one-seat-line-only`, `seat-2-by-rank`, `picker-approval-before-packet`.

## What is not in the plugin

No key, ever, in any file the plugin writes. No model name in any file. No fetch by any script. No padding of the crew: a seat that fails is shown as missing. The credit line stands at the foot of the card and of the guide, `/cw:help` and `/cw:help all`, with the site, and in no run output.
