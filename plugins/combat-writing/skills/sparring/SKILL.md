---
name: sparring
description: Sparring. Every seat reads the draft on the same snapshot and gives its own critique with the rating line first (1 to 10, never 7). Optional context brief, optional focus question for every seat (`question:`) or for one seat (`seat-2:`), `cold` for a read with no brief, `debate` to show the seats each other's answers and rate again. Bare after strategy, it reads the stored draft and brief with no repaste; a pasted draft starts a run on its own, so strategy may be skipped, and sparring may follow battle. A question with no keyword, or a bare command with no stored draft, opens a picker; every result ends with a picker for the next round.
argument-hint: [cold|debate] [<draft path or pasted draft>] [brief: ...] [question: ...] [seat-N: ...] [run: <folder>]
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
Run one Sparring round of Combat Writing on the draft in `$ARGUMENTS`, or on the draft a run already holds. The rules that hold across every round are in the `combat-writing` skill; read `${CLAUDE_PLUGIN_ROOT}/method/combat-writing.md` once per session. The order of the stages is the person's choice (2026-10-14): sparring may be the first command typed, with the draft pasted here; it may follow strategy, reading what strategy stored; and it may follow battle, as a round of reads and ratings on a run the discussion started. The round continues the run's numbering either way, and the record says which stage the run started at.

## 1. Record the paste, then read the arguments

### The draft a run already holds

When `$ARGUMENTS` carries no draft (the command is bare, or holds only `cold`, a `question:`, seat lines or `run:`), look for the run to read: the `run:` folder if given, else the newest folder under `combat-writing/runs/` whose `rounds/` is empty and that holds a `draft.md` (the run strategy made). That run holds the draft and the brief already (`draft.md`, `brief.md`): use them with no repaste (ruled 2026-10-13). A bare command then runs the plain round on that draft with the default prompt and no picker; `question:` and seat lines go to the round as usual; `cold` leaves the brief out. Only when there is no such run does a bare command, or a question with no draft, open the picker below. A draft pasted or given as a path always starts a new run, with one exception: when the newest run under `combat-writing/runs/` has an empty `rounds/` and no `draft.md` (strategy stored a brief alone), the pasted draft joins that run and carries its brief (`add-draft.js --stage sparring` writes it as `draft.md`).

If `$ARGUMENTS` carries pasted text rather than only a path and options, write the whole of `$ARGUMENTS` first, unchanged, to `combat-writing/inbox/<slug>.paste.md` in the project (the folder created if missing; the slug from the first words of the draft). Write it byte for byte: every line break and every blank line as pasted; never join lines or reflow a paragraph, because the seats read the draft as stored and a lost break changes what they judge. Parse only after that file exists, and cut the pieces from it: the draft to `combat-writing/inbox/<slug>.md`, the brief to `<slug>.brief.md`, each per-seat question to `<slug>.<seat>.question.md`. Nothing the person pasted is dropped before it is on disk.

- The first word may be a mode: `cold` (the cold read of step 4: the draft alone, no brief, no questions) or `debate` (every seat is shown the other seats' latest answers from this run and rates again, the rating line first; the round is `<nn>-debate`). Anything else is a normal sparring round.
- The draft: a file path, or pasted text. Everything that is not a mode word, a `brief:` block, a `seat-N:` line or a `question:` line is the draft.
- `brief:` followed by text, or `brief: <path>`, is the context brief (step 3: who you are, your purpose, what you are attempting, the stakes). The seats judge by the brief as written: a rule it states is applied, and a format choice it does not state (where the link sits, whether the greeting names the reader, what the closer is) is judged as the seats read it, as a fault if a rule seems to cover it. Put every format rule the draft follows into the brief. The brief travels (issue 65): `brief: same` or `brief: last` means the newest run's `brief.md`, which you pass by path; `keep` on the brief line is cut off the brief and becomes `--keep`, which makes that brief the project's (`combat-writing/brief.md`), served to every later run in the project that brings no brief; with no `brief:` at all the project's brief serves when it exists, and `--no-brief` is passed only when the person said there is none. The short form's Brief line says which brief the run has; show it as printed.
- `question:` followed by text is a focus question (FQ) put to every seat; `fq:` and `focus:` mean the same. `seat-1:`, `seat-2:` ... followed by text is a focus question for that seat alone (a seat line); `seat 2:`, `seat2:` and the short name shown beside it in the seat key address the same seat, and the file and the record carry the seat id. Keywords match case-insensitively. A seat with no question gets the default prompt from step 4. Navigation (`n:`, `nav:`), synthesis navigation (`sn:`) and the synthesis focus question (`sfq:`) are battle rounds; point at `/cw:battle` if one is given here.
- `run: <folder>` continues an existing run (required for `debate` on a run that is not the newest; used when the person wants a second read of the same draft, or reads and ratings on a run that started at battle). A `<nn>-sparring` round on a run with earlier rounds is still a read alone: each seat gets the draft, the brief and its own earlier turn, no other seat's answer, and rates; only `debate` shares.
- The crew is one fresh reader plus one seat per outside model the add-on has a key for; nothing is padded, and there is no option to seat a second fresh reader. If the person asks for more Claude seats, say the crew is one fresh reader plus the outside seats and point at the add-on.

### No keyword: the picker

A missing keyword is never an error. Two cases open the picker with the AskUserQuestion tool, one keypress per stage, at most two stages, every stage's question ending with "/cw:help for the full guide." The picker never points at "Other"; every choice it needs is an option.

- **A bare command** (no draft pasted, no unread run holding a draft, no run to continue). Stage one, four options in this order: **Draft** (a draft to spar: then ask for its path or paste in one line, stop, and run with the next message as the draft); **Cold** (a cold read, no brief: ask for the draft the same way); **Debate** (the seats of the newest run read each other and rate again); **Question** (a sparring round on the newest run's draft with a question). If Question, stage two: **Everyone** (the question to every seat) or **One seat**; if One seat, the seat list from the seat key, one option per seat in seat order (with more than four seats, the fourth option is "more seats" and opens a second list). Then ask for the question in one line and stop. Never run an empty round.
- **Text that is not clearly the draft** and carries no `question:`, `brief:` or seat line: a single question-like line beside a draft path or paste, or a line naming a model or a seat. Stage one, four options in this order: **Everyone** (a question to every seat, FQ); **One seat** (a question to one seat); **Draft** (the line is part of the draft); **Brief** (the line is the context brief). Mark the best guess with "(best guess)" on its label without moving it: a plain question is Everyone; a line naming a model or a seat is One seat. If One seat, stage two: the seat list as above, the named seat marked. Once chosen, treat the text as if it had carried the keyword. The selection plus the text is the round (ruled 2026-10-19, issue 32): it fires to exactly the seats the selection names, and the text goes to them as written, whatever it asks for (a rewrite, a question, a judgment); you never answer it, interpret it, or write the rewrite it asks for yourself. The rerate question takes yes or no; anything else is no, and the round still fires.

A draft alone, as a path or a multi-paragraph paste, needs no picker: it is a plain sparring round with the default prompt.

## 2. Decide where you are running

Fresh readers if you can start a separate agent and run `node`; otherwise one seat, the host. See the skill. In the one-seat case, skip to step 6.

## 3. Create or continue the run

New run, with the draft and brief files from step 1 (or the paths the person gave):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/new-run.js --draft <draft file> [--brief <brief file>] --stage sparring --name "<slug>" [--no-brief] [--keep] --model "<the model you know you are running, or omit>"
```

It prints the run folder, seats one fresh reader, `seat-1`, and logs that the run started at sparring and which brief it has (the pasted one, the newest run's for `brief: same`, the project's `combat-writing/brief.md` when nothing came and it exists, or none). A draft joining a brief-only run instead: `node ${CLAUDE_PLUGIN_ROOT}/scripts/add-draft.js --run <folder> --file <draft file> --stage sparring`, which writes `draft.md` beside the stored brief. Continuing (a `run:` folder, or the run strategy made): use that folder; its `draft.md` and `brief.md` are the snapshot and the brief, and nothing is copied again.

If the add-on is present (a `crew_list` tool from the `combat-writing-crew` server), call `crew_register` with the run folder now, before any packet (on a run strategy already registered it adds nothing twice): every available outside seat joins `seats.json` after the fresh reader, one seat per model the person holds a key for (with one Groq key, `seat-2` and `seat-3`: a crew of three). Without the add-on's tools, the crew is the one fresh reader, one company's models: tell installed-but-down from absent with `claude plugin list` and record it with `crew-state.js --run <folder> --state down|absent` (the skill's three states), so the result names the state and the next command. The round name is the next two-digit number plus the kind: `01-sparring`, `02-debate`, `02-sparring` for a second plain round, `01-cold` for a cold read, `03-sparring` after two battle rounds. List `rounds/` to find the next number.

## 4. Announce the round, build every packet, then start every seat at once

As soon as the kind and the seats are known, before any packet is built, print the forming line (issue 33, 2026-10-19):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/announce.js --run <folder> --round <round> --kind plain|cold|FQ|seat|debate --to <seat ids, comma-separated> --rerate
```

It prints one line, "Round 01 forming: the default prompt to 3 seats (seat-1 <short>, seat-2 <short>, seat-3 <short>), rerate", and logs it; show that line as printed. Every sparring round rates, so pass `--rerate`; `--kind FQ` for a `question:` to every seat, `seat` for seat lines, `cold` for a cold read, `debate` for a debate round, `plain` otherwise.

Then, for each seat in `seats.json` (a seat's question file from step 1 goes in as `--question`; the script copies it into the round folder as `<seat>.question.md`):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/packet.js --run <folder> --round <round> --seat <seat id> [--question rounds/<round>/<seat>.question.md] [--cold]
```

Every sparring packet asks for a rating. Then start all seats in one go. Each fresh reader (a seat in `seats.json` with no `provider` field) starts as the `seat` agent from this plugin, with this and only this as its task; each outside seat (a seat with a `provider` field) goes through the add-on instead: call `crew_answer` with `run`, `round` and `seat`, which reads the same packet and writes the same answer file.

```
Packet: <absolute packet path>
Answer file: <absolute path to rounds/<round>/<seat>.answer.md>
Read the packet, write your answer to the answer file, reply with one line.
```

Never paste the draft, the brief or another seat's words into the agent's task. The packet carries them. Every seat reads the same snapshot: do not change draft.md after the run is created.

## 5. Check every answer

For each seat, as soon as its one-line reply or `crew_answer` result comes back, without waiting for the others:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/check-answer.js <answer file> --run <folder>
```

Print the checker's first line as printed, "seat-2 <short> finished round 01-sparring: OK rating 6/10, 412 words" (or FAIL with the reasons), one line per seat as it finishes (issue 33), so every round shows at least two lines, the forming line and one per seat, before the board opens.

With `--run` the checker uses the word cap and the contract the seat was actually sent, read from the run's log; `--word-cap N` overrides the cap only when the person asks for a different one. On FAIL, whatever the reason (the rating line, the cap, or a number that contradicts the verdict: an 8 or more over "not send-ready", a 6 or less over "ships as is", ruled 2026-10-14), start the same seat once more with the same packet and the check's reasons appended to its task ("Your previous answer failed the rating contract: <reasons>. Write it again."; an overrun's reason names the retry target, 80% of the cap, ruled 2026-10-15); for an outside seat, call `crew_answer` again with `note` set to those reasons, which the add-on appends after the packet with the same target. Then run the checker on the second answer too. One overrun rule for every seat: a second answer still over the cap is cut at the cap, at the last sentence end before it, with the rating line kept, by the checker for a fresh reader (it writes the cut file back and reports OK with `truncated`) and by the add-on for an outside seat (the result says `truncated`; run the checker on the cut file as usual); the record marks the read "truncated at N words". If a seat fails twice for any other reason, keep the failed file, record it, and show that seat as `FAILED READ` on the board with the reasons. Never edit a seat's answer. Never fill in a rating for it.

## 6. Render, open the board, show the result

For a `debate` round, and for a sparring round on a run with an earlier rating, also run `check-flip.js --run <folder> --round <round> --seat <seat id>` for each seat, as a rerate round of battle does. Then:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-record.js --run <folder> --short
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-board.js --run <folder>
node ${CLAUDE_PLUGIN_ROOT}/scripts/open-board.js --run <folder>
```

The board is the result (2026-10-14). The first prints the short form: the crew line, the Seats line when the crew is short, the scoreboard legend the first time this run prints it and never again, the scoreboard, the board's path, and the seat key. The plugin's own hook puts it on the person's screen the moment the script returns (issue 70, `hooks/show-result.js`, PostToolUse on Bash), so you print nothing from it (a second copy doubles it); print one line naming the round just run and its question in quotes when one was put (for example "Round 03-sparring, question: “...”"), and nothing else: no seat's read in the terminal, no paragraph of yours on where the seats agree, no verdict of yours. The second rebuilds `board.html`: the round strip at the top, the latest round's prompt in words with whether a rating was asked and how many seats answered (ruled 2026-10-15); the draft; then, only when the run holds a number, the box: SEND or BACK TO THE DRAWING BOARD from every seat's own latest rating with nothing averaged, or FINAL READS over each seat's own two numbers when the run holds final reads and no rating, and no box at all otherwise; then one framed quote per seat, its one-line verdict cited to the model by name and company, with the full read folded under a click. The third opens it in the person's browser as a local file: never publish it, never show it through an artifact or preview tool, never post it anywhere. If a fresh reader's one-line reply reports a scope refusal ("Combat Writing seat scope: ..."), print that reply under the crew line, so the person sees why the seat did what it did or is missing; the reason names the cause and the next step. The opener's line is shown by the same hook, as printed or as the plugin's own line after it opened the board outside the sandbox; show nothing from it yourself. In the one-seat case there is no run folder: write the crew line "one seat, the host", a one-row scoreboard, and your critique under the same contract: rating line first, your verdict in the next sentence, the number and the verdict agreeing, under 500 words, no 7, no thinking out loud.

The seat key is the last line of the short form the plugin showed; your round line follows it, and the picker follows the round line. (The hook that refused the picker until you printed, issues 60 and 68, is retired by issue 70: the screen no longer depends on you.) Then open the Next picker exactly as the skill lays it out (2026-10-14): screen one, **Battle: everyone** / **Battle: one seat** / **Debate: seats re-read and rerate** / **More**; under Battle: everyone, FQ / N / SN / SFQ with the founder's descriptions; under Battle: one seat, the seat list; under More, **Final reads** / **Champion** / **Help** / **Done for now**, Champion opening one more screen, **Shipped** / **Result** / **Insight**, then one line for the text, then `/cw:champion` as if typed; after a kind or a seat, one line asks for the text, then one yes/no for rerate, and the selection plus the text is the next round, fired to exactly the seats it names as typed, never answered by you, a rerate reply that is not yes or no taken as no (ruled 2026-10-19); Debate runs `debate` on this run at once; Done for now prints the text Next line, as `render-record.js --run <folder> --next` prints it, and nothing else. With one seat in the run, Debate, SN and SFQ have no other seat to share: say so when one is chosen and offer FQ, N or the add-on. Where you have no AskUserQuestion tool, print the text Next line instead of the picker.
