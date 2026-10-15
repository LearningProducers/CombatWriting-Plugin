---
name: strategy
description: Strategy. Your draft, written by you, and your context brief (who you are, your purpose, what you are attempting, the stakes), pasted together or in two messages. Writes the snapshot and the brief into a new run folder, reads nothing, and ends with one line naming the next move, `/cw:sparring` or `/cw:battle`, which then read them with no repaste. A brief alone makes a run too; the draft joins it later. The order of the stages is yours: strategy may come first, or not at all. A bare command asks for the draft; it never errors.
argument-hint: <draft path or pasted draft> [brief: ...]
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
Run the Strategy stage of Combat Writing on `$ARGUMENTS` (ruled 2026-10-13: every stage in the help has a command). Strategy is steps 1 to 3 of the method: the person writes the draft, then the context brief. This command stores both and reads nothing: no packet is built, no seat starts, no rating is given. The order of the stages is the person's choice (2026-10-14): strategy may come first, after a sparring or battle round, or not at all; sparring and battle start a run from a pasted draft on their own. The rules that hold across every command are in the `combat-writing` skill; read `${CLAUDE_PLUGIN_ROOT}/method/combat-writing.md` once per session.

## 1. Record the paste, then read the arguments

If `$ARGUMENTS` carries pasted text rather than only a path and options, write the whole of `$ARGUMENTS` first, unchanged, to `combat-writing/inbox/<slug>.paste.md` in the project (the folder created if missing; the slug from the first words of the draft, or of the brief when there is no draft). Parse only after that file exists, and cut the pieces from it: the draft to `combat-writing/inbox/<slug>.md`, the brief to `<slug>.brief.md`. The same cut as sparring's. Nothing the person pasted is dropped before it is on disk.

- The draft: a file path, or pasted text. Everything that is not a `brief:` block is the draft. `draft:` may mark it when the brief comes first. The draft is the person's own writing (step 2): never write it, never edit it, never trim it. If the person asks you to write the draft, say step 2 asks for a draft written by the person, and wait for it.
- `brief:` followed by text, or `brief: <path>`, is the context brief (step 3: who you are, your purpose, what you are attempting, the stakes); `context:` means the same. A brief given as a path is read from where it is.
- Keywords match case-insensitively, with or without the space after the colon.
- A `question:` (or `fq:`, `focus:`) or a seat line (`seat-2:`) given here belongs to sparring. Keep it in the inbox cut (`<slug>.fq.md`, `<slug>.<seat>.question.md`), do not send it, and carry it in the Next line at the end so the person can run it with one keypress.
- `n:`, `sn:`, `sfq:`, `rerate` and `final` are battle terms; say so in one line and point at `/cw:battle`, which runs on the stored draft once it is there.
- Strategy starts a new run, with one exception: when the newest run under `combat-writing/runs/` has an empty `rounds/` and no `draft.md` (a run this command made from a brief alone), a draft given here joins that run through `add-draft.js --stage strategy`, which writes it as `draft.md`. Strategy takes no `run:`; a second strategy on a draft already stored makes a second run.

### Two messages, the bare command and the picker

A missing piece is never an error. The draft and the brief may arrive in one paste or in two messages:

- **A bare command** (no draft, no path, no brief): ask for the draft in one line, "Paste the draft, or give its path. /cw:help for the full guide.", stop, and run this command with the next message as the draft. Never create a run with nothing; never refuse.
- **A draft with no brief**: write the draft to the inbox, then ask for the brief in one line, "Now the context brief: who you are, your purpose, what you are attempting, the stakes. /cw:help for the full guide.", stop, and take the next message as the brief, written whole to `<slug>.brief.md` (nothing is cut from it). If the person says there is no brief, create the run with the draft alone and say in the Next line that sparring will read it cold.
- **A brief with no draft** (`brief:` or `context:` with nothing else, or a paragraph the picker below ruled a brief): create the run from the brief alone at once (step 3 below, `new-run.js --brief` with no `--draft`), so the brief is kept, and say in the Next line that the draft joins this run when it is pasted into `/cw:strategy`, `/cw:sparring` or `/cw:battle`. Do not ask for the draft and hold the brief in the conversation: the run is the memory.
- **Text that is not clearly the draft**: a single short paragraph that reads as a brief (it says who the writer is, the purpose, the stakes) with no `brief:` keyword. Open the picker with the AskUserQuestion tool, one stage, one keypress, no "Other": **Draft** (the text is the draft) or **Brief** (the text is the brief). Mark the best guess with "(best guess)" on its label without moving it: a paragraph about the writer and the stakes is Brief; anything addressed to a reader is Draft. The question ends with "/cw:help for the full guide." If Brief, store it as a run from the brief alone, as above.

A draft alone, as a path or a multi-paragraph paste, needs no picker: it is the draft, and the brief is asked for next.

## 2. Decide where you are running

Fresh readers if you can start a separate agent and run `node`; otherwise one seat, the host. See the skill. In the one-seat case there is no run folder: say the draft and the brief stay in this conversation and that sparring or battle will read them from here, then skip to step 4.

## 3. Create the run

With the draft and brief files from step 1 (or the paths the person gave):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/new-run.js --draft <draft file> --brief <brief file> --stage strategy --name "<slug>" --model "<the model you know you are running, or omit>"
```

It prints the run folder, copies the draft to `draft.md` (the snapshot, never changed) and the brief to `brief.md`, seats one fresh reader, `seat-1`, and logs the stage that made the run, so the record and the board say the run started at strategy. `--brief` is left out only when the person said there is no brief; `--draft` is left out when the person gave a brief alone (the run then holds `brief.md` and no draft, and the next draft pasted into strategy, sparring or battle joins it). A draft that joins a brief-only run goes in with `add-draft.js --run <folder> --file <draft file> --stage strategy` instead, which writes `draft.md`.

If the add-on is present (a `crew_list` tool from the `combat-writing-crew` server), call `crew_register` with the run folder now, so the crew line below names every seat; it adds no seat twice, and sparring calls it again harmlessly. Without the add-on's tools, the crew is the one fresh reader, one company's models: tell installed-but-down from absent with `claude plugin list` and record it with `crew-state.js --run <folder> --state down|absent` (the skill's three states), so the result names the state and the next command. Build no packet and start no seat: strategy reads nothing.

## 4. Render and show the result

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-record.js --run <folder> --short
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-board.js --run <folder>
```

Show what the first prints as it is: the crew line, the "No rounds yet" line, the Started-at line and the seat key. Then one line each for the run folder, the draft (its word count, or that there is none yet) and the brief (that it is stored, or that there is none). No critique, no verdict, no reading of the draft: the seats read it in sparring or battle, and you are not a seat. Point at `record.md` in the run folder.

End with one line, the Next line, and nothing after it (ruled 2026-10-13; strategy is the one result that closes with the text Next line, not the picker, and the seat key stands above it in the short form):

```
Next: /cw:sparring, bare, sends the stored draft and brief to every seat with no repaste; add question: <your focus question> to put one question to every seat. Or /cw:battle fq:, n:, sn: or sfq: to start with the discussion; a first battle round carries no other seat's answer.
```

When a question or seat line came with the paste, the Next line carries it ready to run: `Next: /cw:sparring question: <the question>`. When there is no brief, the Next line says `/cw:sparring cold`. When there is no draft yet, the Next line says: `Next: paste the draft into /cw:strategy, /cw:sparring or /cw:battle; it joins this run with the brief.`
