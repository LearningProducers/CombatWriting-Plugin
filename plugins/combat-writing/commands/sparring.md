---
description: Sparring. Every seat reads the draft on the same snapshot and gives its own critique with the rating line first (1 to 10, never 7). Optional context brief, optional focus question for every seat (`question:`) or for one seat (`seat-2:`), `cold` for a read with no brief, `debate` to show the seats each other's answers and rate again. A question with no keyword, or a bare command, opens a picker.
argument-hint: [cold|debate] <draft path or pasted draft> [brief: ...] [question: ...] [seat-N: ...] [run: <folder>]
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
Run one Sparring round of Combat Writing on the draft in `$ARGUMENTS`. The rules that hold across every round are in the `combat-writing` skill; read `${CLAUDE_PLUGIN_ROOT}/method/combat-writing.md` once per session.

## 1. Record the paste, then read the arguments

If `$ARGUMENTS` carries pasted text rather than only a path and options, write the whole of `$ARGUMENTS` first, unchanged, to `combat-writing/inbox/<slug>.paste.md` in the project (the folder created if missing; the slug from the first words of the draft). Parse only after that file exists, and cut the pieces from it: the draft to `combat-writing/inbox/<slug>.md`, the brief to `<slug>.brief.md`, each per-seat question to `<slug>.<seat>.question.md`. Nothing the person pasted is dropped before it is on disk.

- The first word may be a mode: `cold` (the cold read of step 4: the draft alone, no brief, no questions) or `debate` (every seat is shown the other seats' latest answers from this run and rates again, the rating line first). Anything else is a normal sparring round.
- The draft: a file path, or pasted text. Everything that is not a mode word, a `brief:` block, a `seat-N:` line or a `question:` line is the draft.
- `brief:` followed by text, or `brief: <path>`, is the context brief (step 3: who you are, your purpose, what you are attempting, the stakes).
- `question:` followed by text is a focus question (FQ) put to every seat; `fq:` and `focus:` mean the same. `seat-1:`, `seat-2:` ... followed by text is a focus question for that seat alone (a seat line); `seat 2:`, `seat2:` and the short name shown beside it in the seat key address the same seat, and the file and the record carry the seat id. Keywords match case-insensitively. A seat with no question gets the default prompt from step 4. Navigation (`n:`, `nav:`), synthesis navigation (`sn:`) and the synthesis focus question (`sfq:`) are battle rounds; point at `/combat-writing:battle` if one is given here.
- `run: <folder>` continues an existing run (required for `debate`, used when the person wants a second read of the same draft).
- The crew is one fresh reader plus one seat per outside model the add-on has a key for; nothing is padded. `seats: N` seats N fresh readers instead of one, only when the person asks for that by name.

### No keyword: the picker

A missing keyword is never an error. Two cases open a one-keypress picker with the AskUserQuestion tool, one question ending with "/combat-writing:help for the full guide.":

- **A bare command** (no draft, no run to continue): ask what to do, best guess first: a draft to spar (then ask for its path or paste in one line, stop, and run with the next message as the draft); a cold read of a draft; `debate` on the newest run; a question to every seat or to one seat on the newest run's draft, as a second sparring round on that run. Never run an empty round.
- **Text that is not clearly the draft** and carries no `question:`, `brief:` or seat line: a single question-like line beside a draft path or paste, or a line naming a model or a seat. Ask which it is: a question to every seat (FQ), a question to one seat (then which, offering the seat key), part of the draft, or the brief. A plain question defaults to FQ; a line naming a model or a seat to that seat. Once chosen, treat the text as if it had carried the keyword.

A draft alone, as a path or a multi-paragraph paste, needs no picker: it is a plain sparring round with the default prompt.

## 2. Decide where you are running

Fresh readers if you can start a separate agent and run `node`; otherwise one seat, the host. See the skill. In the one-seat case, skip to step 6.

## 3. Create or continue the run

New run, with the draft and brief files from step 1 (or the paths the person gave):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/new-run.js --draft <draft file> [--brief <brief file>] [--seats N] --model "<the model you know you are running, or omit>"
```

It prints the run folder and seats one fresh reader, `seat-1`. Continuing: use the folder given.

If the add-on is present (a `crew_list` tool from the `combat-writing-crew` server), call `crew_register` with the new run folder now, before any packet: every available outside seat joins `seats.json` after the fresh reader, one seat per model the person holds a key for (with one Groq key, `seat-2` and `seat-3`: a crew of three). Without the add-on, skip this; the crew is the one fresh reader, one company's models, and the result says so. The round name is the next two-digit number plus the kind: `01-sparring`, `02-debate`, `02-sparring` for a second plain round, `01-cold` for a cold read. List `rounds/` to find the next number.

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

For a `debate` round, also run `check-flip.js --run <folder> --round <round> --seat <seat id>` for each seat, as a rerate round of battle does. Then:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-record.js --run <folder> --short
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-board.js --run <folder>
```

Show what the first prints as it is (the credit line, the crew line, the scoreboard), then the board (`board.html` in the run folder) as an artifact or preview where you have a tool for that, else its path in one line; then every critique in full with its rating line first, then your one paragraph on where the seats agree and split, quoting them by model name. Point at `record.md` in the run folder. In the one-seat case there is no run folder: write the credit line, the crew line "one seat, the host", a one-row board, and your critique under the same contract: rating line first, under 500 words, no 7.

Show the short form up to its "Record:" line; its last line, the seat key, closes your result. Close with the Next line, in these terms: `/combat-writing:sparring debate` (the seats read each other and rate again); `/combat-writing:battle fq: <question>` (FQ, focus question: the same question put to every seat, nothing shared); `/combat-writing:battle n: <guidance>` (N, navigation: the same new guidance put to every seat individually); `/combat-writing:battle sn: <prompt>` (SN, synthesis navigation: each seat's synthesis shared with the others plus your new prompt, everyone answers and everyone reads each other); `/combat-writing:battle sfq: <question>` (SFQ, synthesis focus question: the crew's answers shared plus a new question); `/combat-writing:battle seat-2: <note>` (one seat only); add `rerate` to any battle round for a new rating; `/combat-writing:battle final` (the S/N ratio and red-flag reads on the draft alone). With one seat in the run, say that SN and SFQ have no other seat to share, and offer FQ, N or the add-on. Then, as the last line of the result, the seat key exactly as the short form printed it (`Seat key: seat-1 <short name> · seat-2 <short name> · ...`), from the live crew; in the one-seat case, `Seat key: seat-1 <short name>` for the host.
