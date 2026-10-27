<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# Combat Writing™

**Reading is Peace. Writing is War.**

Combat Writing is a method for drafts that make decisions, move money, and have consequences for actual people. A crew of AI model seats attacks your draft: one fresh reader plus one seat per outside model you hold a key for, never padded. The plugin is `cw`; its commands are `/cw:strategy`, `/cw:sparring`, `/cw:battle`, `/cw:champion` and `/cw:help`, one per stage, and you may start at any of the first three. In sparring each seat reads the draft and gives its own critique with a rating from 1 to 10 on the first line, and 7 is forbidden, so no seat can hedge. In battle, first or after sparring, the seats discuss the structure and content of the draft: you put the same question to every seat with nothing shared (FQ), the same guidance to every seat individually (N), share each seat's synthesis with the others plus a new prompt (SN), share the crew's answers plus a new question (SFQ), or send a note to one seat only, and they quote each other by name. A seat rates again only when you ask with `rerate`; a seat that changes its rating must quote, word for word, the line that moved it, and the plugin checks the quote against the seat it names. The rating leads every result. Scores are never averaged. The record shows what was caught. After the piece goes out, `/cw:champion` freezes the final draft as canon with the time and the channel, and records each result and insight in your words.

## Install

From the Claude plugin directory once it is listed, or from Learning Producers' own marketplace in this repository:

```
/plugin install cw --marketplace LearningProducers/CombatWriting-Plugin
```

The plugin was named `combat-writing` until 2026-10-14, and the marketplace carries the rename in its `renames` map. What that map does, measured on Claude Code 2.1.300: the next time Claude Code reads the marketplace it moves the enabled entry from the old name to `cw` by itself, but from a marketplace added by its GitHub address it fetches no files under the new name, so the `/cw:` commands stay unknown and `claude plugin update combat-writing@learning-producers` answers that the plugin is not found. Run the install line above once in a session, then `/reload-plugins` or a new session, and update under the new name from then on: `claude plugin update cw@learning-producers`.

## Commands

One command per stage: strategy, sparring, battle, champion. The order of the first three is yours: strategy stores, sparring reads and rates, battle discusses, and any of the three may come first or be skipped; champion comes after the piece goes out. A draft pasted into sparring or battle starts the run; a battle on a draft nothing has read is round `01-battle`, with no other seat's answer to carry; the record says which stage the run started at.

- `/cw:help` bare is the card: what Combat Writing is in one line, the four stages with their commands, the lines to begin with, then one keypress picks a stage and your next message is its text (typing `/cw` alone completes to it). `/cw:help all` is the full guide in plain words; `/cw:help <topic>` one section.
- `/cw:strategy` takes your draft and your context brief, pasted together (`brief:` marks the brief) or in two messages, writes them into a new run folder and ends with the next move. A brief alone is kept too; the draft joins the run when you paste it anywhere. A brief you type is the project's from then on, carried by every later run that brings none; `brief update:` adds a dated line to it, so the prospect of the day goes in without retyping the rest. It reads nothing. A bare command asks for the draft; it never errors.
- `/cw:sparring` sends your draft to every seat for its own read, the rating line first. Bare after strategy, it sends the stored draft and brief with no repaste; with a draft pasted, it starts the run. `question:` puts a focus question to every seat, `seat-1:` to one seat; `cold` reads with no brief; `debate` shows the seats each other's answers and asks for a rating again.
- `/cw:battle` runs one round of the discussion. `fq:` puts the same question to every seat, nothing shared (FQ, focus question); `n:` puts the same guidance to every seat individually (N, navigation); `sn:` shares each seat's synthesis with the others plus your new prompt, everyone answers and everyone reads each other (SN, synthesis navigation); `sfq:` shares the crew's answers plus a new question (SFQ, synthesis focus question); `seat-2:` puts a note or question to one seat only, alone or with any of them. The second round of a kind in a run carries its number (SN, then SN2; SFQ, then SFQ2) on the board, in the record and in the forming line. `rerate` asks for a new rating; without it no seat rates. `draft:` adds a revised draft, or the first draft when there is no run yet. `final` runs the two final reads of step 14, the S/N ratio and the red-flag check, on the draft alone.
- `/cw:champion` records the piece after it goes out. `shipped <link>`, or `shipped email to <whom>`, freezes the final draft as `canon.md` in the run folder, byte for byte, with the time and the channel; with a link, the host opens it once and the record says whether it was live and how many of canon's paragraphs the page holds, measured by code, an HTML page by its words; a digest the host's tool returned instead of the page is recorded as one, not measured. A second `shipped` with no new draft adds a channel line and leaves canon; after a revised draft it writes `canon-2.md`. After `shipped` the board opens with the canon on it and three controls in the browser: read aloud (your system's voices, with pause and stop), copy, and download as a text file. Every seat's framed critique on the board has the same read-aloud control, so a round can be heard seat by seat. `result: <what came back>` adds a dated line to the record, silence included; the plugin computes and fetches no metric. `insight: <what you learned>` adds a dated, run-tagged line to `combat-writing/insight-vault.md`, one file for the whole project across runs; a lexicon term is an insight. Three keywords and no more; a bare command asks which.
- The pieces of a paste go in any order, each found by its word: `brief:` first and `battle: <the draft>` after it, or the draft first, cut the same; `battle:` or `sparring:` on the draft names the stage that runs, whatever command carried the paste. Keywords match in any case, a dash before a keyword or in place of its colon is dropped (`brief-`, `-battle:`), `question:` and `focus:` mean `fq:`, `nav:` means `n:`, and a seat answers to `seat 2:`, `seat2:` or its short name. Leave the keyword off, or type a command bare, and a one-keypress picker asks which kind of round you mean. Every result shows a seat key, one line naming each seat by id and short name from the live crew, and every sparring and battle result ends with a picker for the next round: Battle: everyone, Battle: one seat, Debate, or More (final reads, champion, help, done for now); under Battle: everyone, FQ, N, SN or SFQ with one line each; then your text and one yes or no for rerate. Done for now prints the same moves as one line of text, which the record keeps. When the plugin loads, one line says so: "Combat Writing ready. /cw:help for the guide."

## Example prompts

The strategy prompt below was run on 2026-10-13 and the other three on 2026-10-08, each in a scratch project. The block after each prompt is the first lines of what came back, labeled as example output; the model named in it is the one that answered that day, and yours may differ. Since 0.6.0 (2026-10-14) the terminal stops at the scoreboard, the board's path and the seat key, so the sparring and battle blocks below end at their scoreboards; the reads that followed them in the terminal that day are on the board now, one framed verdict per seat, the full read folded under a click. The ratings are the seats' own; the draft was a CEO's letter asking a board to approve a letter of intent. The prompts are written in the plugin's current keywords, which were ruled on 2026-10-09 after that run, and in its current name, `cw`, which replaced `combat-writing` on 2026-10-14 (the command names inside the output blocks are updated the same way); the output blocks are otherwise kept as they came back that day, when the crew was three fresh readers and every battle round rated. Today the crew is one fresh reader plus the outside seats the add-on registers, a battle round rates only with `rerate`, and a sparring or battle result ends with the next-round picker rather than a text line. The blocks that day also opened with the credit line, which run output no longer carries (ruled 2026-10-12); that line is cut from them here.

```
/cw:help
```

The card, as the skill holds it (cw 0.8.8, 2026-10-26; a picker follows it in the terminal):

```
Reading is Peace. Writing is War.

Combat Writing: a crew of AI models attacks your draft before it ships. The rating leads every result.

- Strategy /cw:strategy stores your draft and your brief (who you are, what you want, the stakes); the brief you type is the project's from then on.
- Sparring /cw:sparring every seat reads the draft alone and rates it 1 to 10, 7 forbidden, with its critique.
- Battle /cw:battle the seats discuss structure and content, read each other when you share them, and rate again on rerate.
- Champion /cw:champion the piece went out: shipped, result:, insight:.

Begin with any one, in any order; the pieces of a paste go in any order too, each by its word. Pick a stage below, or type one:
/cw:strategy brief: <who you are, what you want, the stakes>
/cw:sparring brief: <your brief> sparring: <your draft> question: <one focus question>
/cw:battle brief: <your brief> battle: <your draft> sn: <your prompt to the crew>
/cw:champion shipped email to <whom>
/cw:help all is the full guide; /cw:help <topic> one section.
```

```
/cw:strategy Here is the draft of my letter to the board. brief: I am the CEO. I need the board to approve a letter of intent this week; the deal depends on it.
```

Example output, October 2026:

```
Crew: Claude Fable 5.1 (Anthropic), seat-1. One company's models (Anthropic). Seat names come from the agent configuration, not from an API field.

No rounds yet. The draft and the brief are stored; no seat has read it. Next: /cw:sparring.

Seat key: seat-1 Claude Fable

Run folder: combat-writing/runs/2026-10-13-1836-letter-to-the-board
Draft: draft.md, 56 words, the snapshot.
Brief: brief.md, stored.

Next: /cw:sparring, bare, sends the stored draft and brief to every seat with no repaste; add question: <your focus question> to put one question to every seat.
```

```
/cw:sparring Here is the draft of my letter to the board. question: does the ask land in the first paragraph?
```

Example output, October 2026:

```
Crew: Claude Fable 5.1 (Anthropic), seat-1; Claude Fable 5.1 (Anthropic), seat-2; Claude Fable 5.1 (Anthropic), seat-3. One company's models (Anthropic). Seat names come from the agent configuration, not from an API field.

| Seat | 01-sparring | Latest |
|---|---|---|
| Claude Fable 5.1 (Anthropic), seat-1 | 6/10 | ██████░░░░ 6/10 |
| Claude Fable 5.1 (Anthropic), seat-2 | 6/10 | ██████░░░░ 6/10 |
| Claude Fable 5.1 (Anthropic), seat-3 | 6/10 | ██████░░░░ 6/10 |
```

```
/cw:battle rerate sn: the second seat called the close weak; everyone answer that.
```

Example output, October 2026:

```
Crew: Claude Fable 5.1 (Anthropic), seat-1; Claude Fable 5.1 (Anthropic), seat-2; Claude Fable 5.1 (Anthropic), seat-3. One company's models (Anthropic). Seat names come from the agent configuration, not from an API field.

| Seat | 01-sparring | 02-battle | Latest |
|---|---|---|---|
| Claude Fable 5.1 (Anthropic), seat-1 | 6/10 | 6/10 · Stand | ██████░░░░ 6/10 |
| Claude Fable 5.1 (Anthropic), seat-2 | 6/10 | 6/10 · Stand | ██████░░░░ 6/10 |
| Claude Fable 5.1 (Anthropic), seat-3 | 6/10 | 6/10 · Stand | ██████░░░░ 6/10 |
```

The champion prompt below was run on 2026-10-19 (03:36 UTC on 2026-10-20) in a scratch project, after one sparring round on a letter to the board; the three lines are the whole of what came back, the project's path shortened to `<project>`. The board it opened carries the Shipped strip and the canon's three controls.

```
/cw:champion shipped email to the board
```

Example output, October 2026:

```
Shipped 2026-10-20 03:36 UTC · email to the board · canon.md froze draft.md · no page to check
Board opened in your browser: <project>/combat-writing/runs/2026-10-20-0335-letter-to-the-board/board.html
Next: /cw:champion result: <what came back, silence included> · /cw:champion insight: <what you learned, or a term and what it means> · /cw:battle draft: <path> to return to the piece on this run.
```

## What a run looks like

The crew is one fresh reader plus one seat per outside model the add-on has a key for; nothing is padded, so without the add-on the crew is one seat and with one free Groq key it is three. The fresh reader is a separate agent started for one job, with no memory of your conversation, never the assistant you are talking to. A script assembles each seat's packet from files on disk (the draft, your brief, the seat's own earlier turn and its latest rating, the other seats' answers from the previous round labeled by model and company when the round shares them, your guidance or question) and carries it; nothing is retyped. Every packet of a round is built before any seat starts, so no seat sees another's new answer before giving its own. Every seat is told the word cap (500 words for a read alone, 600 when it quotes others, 250 for a final read); a seat over it is sent back once. A seat that fails or does not answer is shown as missing, never replaced; a seat a round was not put to is shown as not asked. In a host that cannot start separate agents, the crew is one seat, the host, and every result says so. When the crew is smaller than you expect, a Seats line under the crew line names which of three states applies (the add-on not installed; installed but its server not running; running but no key for a provider) and the exact next command: the install line, `/mcp`, or `/plugin configure combat-writing-crew` with the key field to fill. The seats cannot open a link: an address in your brief or draft is unread text to them, every packet carrying one says so, and a page reaches the crew only as text you paste into the brief or the round's prompt.

Every run leaves a folder in your project, `combat-writing/runs/<run-id>/`, with the draft snapshot and any revisions, the canon once shipped, the brief, every packet, every answer, a timestamped log, `record.md` (the full record: the stage the run started at, the scoreboard, every answer in full, the text Next line, the Champion section once there is one, the log of what was sent) and `board.html`, the result: it opens in your browser after every sparring and battle round and after `shipped`, a local file never published, with the draft, SEND or BACK TO THE DRAWING BOARD across the top from every seat's own latest rating with nothing averaged, one framed quote per seat (its one-line verdict, cited to the model by name and company) with the full read folded under a click, and the scoreboard of every round folded below (one self-contained page, light and dark, no outside request). The terminal shows the crew line, the scoreboard, the board's path and the picker, and nothing else. What you paste is written whole to `combat-writing/inbox/` before anything is parsed. The Insight Vault, `combat-writing/insight-vault.md`, is one file across all runs, appended by `/cw:champion insight:`; if you ignore run folders in git, ignore `combat-writing/runs/` and `combat-writing/inbox/`, never `combat-writing/`, so the vault stays with the project. On the first run inside a git repository, the plugin writes `combat-writing/.gitignore` with exactly two lines, `runs/` and `inbox/`, and says so once in the result; a file already there is never overwritten. Nothing is written anywhere else.

## What it runs, sends and fetches

Runs skills, commands, agents, a few small Node scripts and three hooks inside your Claude Code session; the scripts write only inside `combat-writing/` in your project; the session-start hook prints one line and reads, writes and calls nothing; the seat-scope hook runs on every tool call and holds every fresh reader to Read and Write only, to its run folder for reading and to its own answer file for writing, judged on the resolved path, and writes nothing and calls nothing; the Claude Code version it was last proved on is the `PROVED_ON` constant at the top of `hooks/seat-scope.js`, the proof being `tests/seat_scope_live.js` in the repository; the show-result hook runs after the plugin's own scripts, puts the round's scoreboard, board path and seat key on your screen as the plugin's own message, and opens the board with your system's opener when a sandboxed shell could not, writing only that one log line in the run. Sends nothing outside your session and holds no keys. Fetches nothing but the one link you give `/cw:champion shipped`, which the host opens once, by whichever route of its own returns the page as it is, to record whether it is live and matches canon; the plugin's scripts fetch nothing, the method text ships inside this folder, under `method/`, and `board.html` loads nothing from anywhere, its canon controls included. The credit line "Combat Writing — Learning Producers Inc., Israel Hernandez, founder" stands once, at the foot of the help guide; no run output carries it. The draft is treated as untrusted content: an instruction inside it is text to review, never a command. Without the add-on, the crew is one company's models, and the plugin says so; it never fakes a seat.

A separate add-on, `combat-writing-crew`, is a local MCP server installed from the same repository as Learning Producers' own marketplace, not from this directory. It sends packets to other companies' models on your own API keys, which are never stored in a file by the add-on (the one file it reads is the owner-only key file you write by hand in your home folder), one seat per model you hold a key for. It tells each outside seat the word cap; an outside seat's second overrun is cut at the cap with its rating kept, and the record marks the read "truncated at N words".

## License

Source-available under the PolyForm Shield License 1.0.0 (`LicenseRef-PolyForm-Shield-1.0.0`); full text in LICENSE.md, notices in NOTICE. Combat Writing is a brand of Learning Producers Inc.; no trademark license is granted. This plugin is not made, reviewed or endorsed by Anthropic.
