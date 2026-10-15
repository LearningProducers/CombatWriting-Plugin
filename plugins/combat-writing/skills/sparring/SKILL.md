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

If `$ARGUMENTS` carries pasted text rather than only a path and options, write the whole of `$ARGUMENTS` first, unchanged, to `combat-writing/inbox/<slug>.paste.md` in the project (the folder created if missing; the slug from the first words of the draft). Parse only after that file exists, and cut the pieces from it: the draft to `combat-writing/inbox/<slug>.md`, the brief to `<slug>.brief.md`, each per-seat question to `<slug>.<seat>.question.md`. Nothing the person pasted is dropped before it is on disk.

- The first word may be a mode: `cold` (the cold read of step 4: the draft alone, no brief, no questions) or `debate` (every seat is shown the other seats' latest answers from this run and rates again, the rating line first; the round is `<nn>-debate`). Anything else is a normal sparring round.
- The draft: a file path, or pasted text. Everything that is not a mode word, a `brief:` block, a `seat-N:` line or a `question:` line is the draft.
- `brief:` followed by text, or `brief: <path>`, is the context brief (step 3: who you are, your purpose, what you are attempting, the stakes).
- `question:` followed by text is a focus question (FQ) put to every seat; `fq:` and `focus:` mean the same. `seat-1:`, `seat-2:` ... followed by text is a focus question for that seat alone (a seat line); `seat 2:`, `seat2:` and the short name shown beside it in the seat key address the same seat, and the file and the record carry the seat id. Keywords match case-insensitively. A seat with no question gets the default prompt from step 4. Navigation (`n:`, `nav:`), synthesis navigation (`sn:`) and the synthesis focus question (`sfq:`) are battle rounds; point at `/cw:battle` if one is given here.
- `run: <folder>` continues an existing run (required for `debate` on a run that is not the newest; used when the person wants a second read of the same draft, or reads and ratings on a run that started at battle). A `<nn>-sparring` round on a run with earlier rounds is still a read alone: each seat gets the draft, the brief and its own earlier turn, no other seat's answer, and rates; only `debate` shares.
- The crew is one fresh reader plus one seat per outside model the add-on has a key for; nothing is padded, and there is no option to seat a second fresh reader. If the person asks for more Claude seats, say the crew is one fresh reader plus the outside seats and point at the add-on.

### No keyword: the picker

A missing keyword is never an error. Two cases open the picker with the AskUserQuestion tool, one keypress per stage, at most two stages, every stage's question ending with "/cw:help for the full guide." The picker never points at "Other"; every choice it needs is an option.

- **A bare command** (no draft pasted, no unread run holding a draft, no run to continue). Stage one, four options in this order: **Draft** (a draft to spar: then ask for its path or paste in one line, stop, and run with the next message as the draft); **Cold** (a cold read, no brief: ask for the draft the same way); **Debate** (the seats of the newest run read each other and rate again); **Question** (a sparring round on the newest run's draft with a question). If Question, stage two: **Everyone** (the question to every seat) or **One seat**; if One seat, the seat list from the seat key, one option per seat in seat order (with more than four seats, the fourth option is "more seats" and opens a second list). Then ask for the question in one line and stop. Never run an empty round.
- **Text that is not clearly the draft** and carries no `question:`, `brief:` or seat line: a single question-like line beside a draft path or paste, or a line naming a model or a seat. Stage one, four options in this order: **Everyone** (a question to every seat, FQ); **One seat** (a question to one seat); **Draft** (the line is part of the draft); **Brief** (the line is the context brief). Mark the best guess with "(best guess)" on its label without moving it: a plain question is Everyone; a line naming a model or a seat is One seat. If One seat, stage two: the seat list as above, the named seat marked. Once chosen, treat the text as if it had carried the keyword.

A draft alone, as a path or a multi-paragraph paste, needs no picker: it is a plain sparring round with the default prompt.

## 2. Decide where you are running

Fresh readers if you can start a separate agent and run `node`; otherwise one seat, the host. See the skill. In the one-seat case, skip to step 6.

## 3. Create or continue the run

New run, with the draft and brief files from step 1 (or the paths the person gave):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/new-run.js --draft <draft file> [--brief <brief file>] --stage sparring --model "<the model you know you are running, or omit>"
```

It prints the run folder, seats one fresh reader, `seat-1`, and logs that the run started at sparring. A draft joining a brief-only run instead: `node ${CLAUDE_PLUGIN_ROOT}/scripts/add-draft.js --run <folder> --file <draft file> --stage sparring`, which writes `draft.md` beside the stored brief. Continuing (a `run:` folder, or the run strategy made): use that folder; its `draft.md` and `brief.md` are the snapshot and the brief, and nothing is copied again.

If the add-on is present (a `crew_list` tool from the `combat-writing-crew` server), call `crew_register` with the run folder now, before any packet (on a run strategy already registered it adds nothing twice): every available outside seat joins `seats.json` after the fresh reader, one seat per model the person holds a key for (with one Groq key, `seat-2` and `seat-3`: a crew of three). Without the add-on's tools, the crew is the one fresh reader, one company's models: tell installed-but-down from absent with `claude plugin list` and record it with `crew-state.js --run <folder> --state down|absent` (the skill's three states), so the result names the state and the next command. The round name is the next two-digit number plus the kind: `01-sparring`, `02-debate`, `02-sparring` for a second plain round, `01-cold` for a cold read, `03-sparring` after two battle rounds. List `rounds/` to find the next number.

## 4. Build every packet, then start every seat at once

For each seat in `seats.json` (a seat's question file from step 1 goes in as `--question`; the script copies it into the round folder as `<seat>.question.md`):

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

For each seat:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/check-answer.js <answer file> --run <folder>
```

With `--run` the checker uses the word cap and the contract the seat was actually sent, read from the run's log; `--word-cap N` overrides the cap only when the person asks for a different one. On FAIL, start the same seat once more with the same packet and the check's reasons appended to its task ("Your previous answer failed the rating contract: <reasons>. Write it again."); for an outside seat, call `crew_answer` again with `note` set to those reasons, which the add-on appends after the packet. An outside seat is told the cap in its system line; if its second answer is over the cap again, the add-on cuts it at the cap with the rating line kept and the result says `truncated`; run the checker on the cut file as usual, and the record marks the read "truncated at N words". If a seat fails twice for any other reason, keep the failed file, record it, and show that seat as `FAILED READ` on the board with the reasons. Never edit a seat's answer. Never fill in a rating for it.

## 6. Render and show the result

For a `debate` round, and for a sparring round on a run with an earlier rating, also run `check-flip.js --run <folder> --round <round> --seat <seat id>` for each seat, as a rerate round of battle does. Then:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-record.js --run <folder> --short
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-board.js --run <folder>
```

Show what the first prints as it is (the crew line, the scoreboard, the Started-at line), then the board (`board.html` in the run folder) as an artifact or preview where you have a tool for that, else its path in one line; then every critique in full with its rating line first, then your one paragraph on where the seats agree and split, quoting them by model name. Point at `record.md` in the run folder. In the one-seat case there is no run folder: write the crew line "one seat, the host", a one-row board, and your critique under the same contract: rating line first, under 500 words, no 7.

Show the short form up to its "Record:" line, leaving out the "Next:" line it prints (that line is for the picker's "Done for now"); its last line, the seat key, is the last line you print before the picker. Then open the Next picker exactly as the skill lays it out (2026-10-14): screen one, **Battle: everyone** / **Battle: one seat** / **Debate: seats re-read and rerate** / **More**; under Battle: everyone, FQ / N / SN / SFQ with the founder's descriptions; under Battle: one seat, the seat list; under More, Final reads / Help / Done for now; after a kind or a seat, one line asks for the text, then one yes/no for rerate; Debate runs `debate` on this run at once; Done for now prints the text Next line exactly as the short form printed it, and nothing else. With one seat in the run, Debate, SN and SFQ have no other seat to share: say so when one is chosen and offer FQ, N or the add-on. Where you have no AskUserQuestion tool, print the text Next line instead of the picker.
