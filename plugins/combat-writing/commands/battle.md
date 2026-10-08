---
description: Battle. Every seat reads the other seats' latest answers, labeled by model and company, and gives a new critique with a new RATING: X/10 line first (never 7). Optional SFQ (synthesis focus question) or SN (navigation note). `final` runs the S/N ratio and red-flag reads on the draft alone. A revised draft may be added first.
argument-hint: [final] [run: <folder>] [draft: <path>] [sfq: ...|sn: ...] [seat-N: ...]
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
Run one Battle round of Combat Writing on `$ARGUMENTS`. The rules that hold across every round are in the `combat-writing` skill; `${CLAUDE_PLUGIN_ROOT}/method/combat-writing.md` is the method. Battle is where most synthesis happens: every seat reads the previous round and answers at once.

## 1. Record the paste, then read the arguments

If `$ARGUMENTS` carries pasted text (an SFQ, an SN, a revised draft), write the whole of it first, unchanged, to `combat-writing/inbox/<slug>.paste.md` in the project, then cut the pieces from that file: the SFQ to `<slug>.sfq.md`, the SN to `<slug>.sn.md`, a pasted revised draft to `<slug>.draft.md`, each per-seat line to `<slug>.<seat>.question.md`. Cut the label off: the SN file holds the note itself, not the words "Navigation note:", because the packet adds its own label.

- `final` as the first word: the two final reads of step 14 (S/N ratio and red flags), on the draft alone. See step 6.
- `run: <folder>` names the run. Default: the newest folder under `combat-writing/runs/`. If there is none, say so and point at `/combat-writing:sparring`; battle never starts a run.
- `draft: <path>` adds a revised draft to the run before the round. Default: the newest draft already in the run.
- `sfq: <text>` is a synthesis focus question; `sn: <text>` is a navigation note. One or neither, never both. With neither, the seats get the default synthesis prompt.
- `seat-N: <text>` is a question or note for that seat alone (an FQ or an N; they are not tied to a stage).

## 2. Decide where you are running

Fresh readers if you can start a separate agent and run `node`; otherwise one seat, the host. With one seat there are no other seats to read: say so plainly, and offer a solo re-read instead (the one seat reads its own earlier answer and the draft, rates again with the rating line first, and says Stand or quotes its own earlier line and why). Do not pretend a second seat exists.

## 3. Count the rounds

List `rounds/` in the run. Battle rounds are named `<nn>-battle`; the next number continues from the last round of any kind (a revised draft does not restart the count; the record says which draft each round read). There is no round limit: the person decides when to stop. After every round, say which round this was and how many battle rounds the run now holds; the method says iterate until structure and insights emerge, then stop and publish.

## 4. Add the revised draft, if any

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/add-draft.js --run <folder> --file <draft file>
```

It prints the new draft's name (`draft-2.md`, ...). `draft.md` is never changed.

## 5. Build every packet, then start every seat at once

For each seat in `seats.json`, write its own question file if it has one (`rounds/<round>/<seat>.question.md`), then:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/packet.js --run <folder> --round <nn>-battle --seat <seat id> [--sfq <sfq file>] [--sn <sn file>] [--question <question file>]
```

Build all packets before any seat starts: every packet reads the same previous round, and no seat sees another's new answer before giving its own. The packet carries the draft (fenced as untrusted content), the brief, the seat's own earlier turn, and the other seats' answers from the previous round labeled by model and company; a seat that gave no answer in that round is listed as missing, and nothing stands in for it. The word cap is 600 in battle because seats quote others.

Then start all seats in one go, in parallel, each as the `seat` agent from this plugin, with this and only this as its task:

```
Packet: <absolute packet path>
Answer file: <absolute path to rounds/<round>/<seat>.answer.md>
Read the packet, write your answer to the answer file, reply with one line.
```

Never paste the draft, a question, or any seat's words into the agent's task. The packet carries them.

## 6. The final reads (`final`)

The round is `<nn>-final`. For each seat, two packets and two seats started, one per read:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/packet.js --run <folder> --round <nn>-final --seat <seat id> --final sn
node ${CLAUDE_PLUGIN_ROOT}/scripts/packet.js --run <folder> --round <nn>-final --seat <seat id> --final redflag
```

The answer files are `<seat>.sn.answer.md` and `<seat>.redflag.answer.md`. These reads use the app's own first lines, `S/N RATIO: XX%` and `NO RED FLAGS` or `RED FLAGS FOUND: X`; they are not ratings and the 7 rule does not apply to them. No other seat's answer is carried. Both numbers go on the scoreboard per seat and are never averaged.

## 7. Check every answer

For each answer file:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/check-answer.js <answer file> --run <folder>
```

On FAIL, start the same seat once more with the same packet and the check's reasons appended to its task. If it fails twice, keep the failed file and record it; the record shows that seat as a failed read. Never edit a seat's answer. Never fill in a number for it. A seat that never answered is shown as missing, never replaced.

Then, for every rating answer in a battle round:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/check-flip.js --run <folder> --round <nn>-battle --seat <seat id>
```

It records whether the seat held (Stand) or flipped, and whether a flip's quote matches the seat it names. An invalid flip stays in the record as invalid with the rating still shown; do not send the seat back for it.

## 8. Render and show the record

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-record.js --run <folder> --short
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-board.js --run <folder>
```

The first rebuilds `record.md` and prints the short form: the credit line, the crew line, the scoreboard. The second rebuilds `board.html`. Show the short form as it is, then the board as an artifact or preview where you have a tool for that, else its path in one line; then one line with the round just run and the count of battle rounds in the run (for example "Round 04-battle; this run holds 3 battle rounds"), then each seat's new critique in full with its rating line first, then one short paragraph of your own on where the seats moved and why, quoting them by model name. The first rating stays visible in the scoreboard beside every flip. No verdict of yours above the scoreboard. Point at `record.md` for the full record.

Close with what the person can do next: another battle round with a new SFQ or SN, a revised draft, or `final`.
