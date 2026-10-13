---
description: Strategy. The first stage. Your draft, written by you, and your context brief (who you are, your purpose, what you are attempting, the stakes), pasted together or in two messages. Writes the snapshot and the brief into a new run folder, reads nothing, and ends with one line naming the next move, `/combat-writing:sparring`, which then reads them with no repaste. A bare command asks for the draft; it never errors.
argument-hint: <draft path or pasted draft> [brief: ...]
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
Run the Strategy stage of Combat Writing on `$ARGUMENTS` (ruled 2026-10-13: every stage in the help has a command). Strategy is steps 1 to 3 of the method: the person writes the draft, then the context brief. This command stores both and reads nothing: no packet is built, no seat starts, no rating is given. The rules that hold across every command are in the `combat-writing` skill; read `${CLAUDE_PLUGIN_ROOT}/method/combat-writing.md` once per session.

## 1. Record the paste, then read the arguments

If `$ARGUMENTS` carries pasted text rather than only a path and options, write the whole of `$ARGUMENTS` first, unchanged, to `combat-writing/inbox/<slug>.paste.md` in the project (the folder created if missing; the slug from the first words of the draft). Parse only after that file exists, and cut the pieces from it: the draft to `combat-writing/inbox/<slug>.md`, the brief to `<slug>.brief.md`. The same cut as sparring's. Nothing the person pasted is dropped before it is on disk.

- The draft: a file path, or pasted text. Everything that is not a `brief:` block is the draft. `draft:` may mark it when the brief comes first. The draft is the person's own writing (step 2): never write it, never edit it, never trim it. If the person asks you to write the draft, say step 2 asks for a draft written by the person, and wait for it.
- `brief:` followed by text, or `brief: <path>`, is the context brief (step 3: who you are, your purpose, what you are attempting, the stakes); `context:` means the same. A brief given as a path is read from where it is.
- Keywords match case-insensitively, with or without the space after the colon.
- A `question:` (or `fq:`, `focus:`) or a seat line (`seat-2:`) given here belongs to sparring. Keep it in the inbox cut (`<slug>.fq.md`, `<slug>.<seat>.question.md`), do not send it, and carry it in the Next line at the end so the person can run it with one keypress.
- `n:`, `sn:`, `sfq:`, `rerate` and `final` are battle terms; say so in one line and point at `/combat-writing:battle` after sparring.
- Strategy always starts a new run. It takes no `run:`; a second strategy on the same draft makes a second run.

### Two messages, the bare command and the picker

A missing piece is never an error. The draft and the brief may arrive in one paste or in two messages:

- **A bare command** (no draft, no path): ask for the draft in one line, "Paste the draft, or give its path. /combat-writing:help for the full guide.", stop, and run this command with the next message as the draft. Never create a run with no draft; never refuse.
- **A draft with no brief**: write the draft to the inbox, then ask for the brief in one line, "Now the context brief: who you are, your purpose, what you are attempting, the stakes. /combat-writing:help for the full guide.", stop, and take the next message as the brief, written whole to `<slug>.brief.md` (nothing is cut from it). If the person says there is no brief, create the run with the draft alone and say in the Next line that sparring will read it cold.
- **Text that is not clearly the draft**: a single short paragraph that reads as a brief (it says who the writer is, the purpose, the stakes) with no `brief:` keyword. Open the picker with the AskUserQuestion tool, one stage, one keypress, no "Other": **Draft** (the text is the draft) or **Brief** (the text is the brief). Mark the best guess with "(best guess)" on its label without moving it: a paragraph about the writer and the stakes is Brief; anything addressed to a reader is Draft. The question ends with "/combat-writing:help for the full guide." If Brief, store it and ask for the draft as above.

A draft alone, as a path or a multi-paragraph paste, needs no picker: it is the draft, and the brief is asked for next.

## 2. Decide where you are running

Fresh readers if you can start a separate agent and run `node`; otherwise one seat, the host. See the skill. In the one-seat case there is no run folder: say the draft and the brief stay in this conversation and that sparring will read them from here, then skip to step 4.

## 3. Create the run

With the draft and brief files from step 1 (or the paths the person gave):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/new-run.js --draft <draft file> --brief <brief file> --name "<slug>" --model "<the model you know you are running, or omit>"
```

It prints the run folder, copies the draft to `draft.md` (the snapshot, never changed) and the brief to `brief.md`, and seats one fresh reader, `seat-1`. `--brief` is left out only when the person said there is no brief.

If the add-on is present (a `crew_list` tool from the `combat-writing-crew` server), call `crew_register` with the run folder now, so the crew line below names every seat; it adds no seat twice, and sparring calls it again harmlessly. Without the add-on's tools, the crew is the one fresh reader, one company's models: tell installed-but-down from absent with `claude plugin list` and record it with `crew-state.js --run <folder> --state down|absent` (the skill's three states), so the result names the state and the next command. Build no packet and start no seat: strategy reads nothing.

## 4. Render and show the result

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-record.js --run <folder> --short
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-board.js --run <folder>
```

Show what the first prints as it is: the crew line, the "No rounds yet" line and the seat key. Then one line each for the run folder, the draft (its word count) and the brief (that it is stored, or that there is none). No critique, no verdict, no reading of the draft: the seats read it in sparring, and you are not a seat. Point at `record.md` in the run folder.

End with one line, the Next line, and nothing after it (ruled 2026-10-13; strategy is the one result that closes with the Next line, not the seat key, which stands above it in the short form):

```
Next: /combat-writing:sparring, bare, sends the stored draft and brief to every seat with no repaste; add question: <your focus question> to put one question to every seat.
```

When a question or seat line came with the paste, the Next line carries it ready to run: `Next: /combat-writing:sparring question: <the question>`. When there is no brief, the Next line says `/combat-writing:sparring cold`.
