---
description: Sparring. Every seat reads the draft on the same snapshot and gives its own critique with the rating line first (1 to 10, never 7). Optional context brief, optional per-seat focus question or navigation note, `cold` for a read with no brief, `debate` to show the seats each other's answers.
argument-hint: [cold|debate] <draft path or pasted draft> [brief: ...] [seat-N: question]
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
Run one Sparring round of Combat Writing on the draft in `$ARGUMENTS`. The rules that hold across every round are in the `combat-writing` skill; read `${CLAUDE_PLUGIN_ROOT}/method/combat-writing.md` once per session.

## 1. Read the arguments

- The first word may be a mode: `cold` (the cold read of step 4: the draft alone, no brief, no questions) or `debate` (every seat is shown the other seats' latest answers from this run and rates again). Anything else is a normal sparring round.
- The draft: a file path, or pasted text. Everything that is not a mode word, a `brief:` block, a `seat-N:` line or a `question:` line is the draft.
- `brief:` followed by text, or `brief: <path>`, is the context brief (step 3: who you are, your purpose, what you are attempting, the stakes).
- `seat-1:`, `seat-2:` ... followed by text is that seat's focus question or navigation note. `question:` followed by text goes to every seat. A seat with no question gets the default prompt from step 4.
- `seats: N` sets the crew size (default 3). `run: <folder>` continues an existing run (required for `debate`, used when the person wants a second read of the same draft).

If there is no draft and no run to continue, ask for the draft and stop.

## 2. Decide where you are running

Fresh readers if you can start a separate agent and run `node`; otherwise one seat, the host. See the skill. In the one-seat case, skip to step 6.

## 3. Create or continue the run

New run: write the draft to a file if it was pasted (`combat-writing/inbox/<slug>.md` in the project, created if missing), the brief likewise, then:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/new-run.js --draft <draft file> [--brief <brief file>] [--seats N] --model "<the model you know you are running, or omit>"
```

It prints the run folder. Continuing: use the folder given. The round name is the next two-digit number plus the kind: `01-sparring`, `02-debate`, `02-sparring` for a second plain round, `01-cold` for a cold read. List `rounds/` to find the next number.

## 4. Build every packet, then start every seat at once

For each seat in `seats.json`: if it has a question or note, write it to `rounds/<round>/<seat>.question.md` first. Then:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/packet.js --run <folder> --round <round> --seat <seat id> [--question rounds/<round>/<seat>.question.md] [--cold]
```

Then start all seats in one go, in parallel, each as the `seat` agent from this plugin, with this and only this as its task:

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

On FAIL, start the same seat once more with the same packet and the check's reasons appended to its task ("Your previous answer failed the rating contract: <reasons>. Write it again."). If it fails twice, keep the failed file, record it, and show that seat as `FAILED READ` on the board with the reasons. Never edit a seat's answer. Never fill in a rating for it.

## 6. Show the result

As the skill says: the credit line, the crew line, the board (rating first, ten-block bar, seat label), every critique in full with its rating line first, then your one paragraph on where the seats agree and split, quoting them by model name. Add the run folder path at the end. In the one-seat case, the board has one row labeled `the host`, and the crew line reads "one seat, the host"; your critique follows the same contract: rating line first, under 400 words, no 7.

Close with what the person can do next: a `debate` round on this run, another sparring round with a different question per seat, or battle (a later part).
