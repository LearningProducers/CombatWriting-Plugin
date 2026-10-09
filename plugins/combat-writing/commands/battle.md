---
description: Battle. The discussion of the structure and content of the draft. `fq:` puts the same question to every seat, nothing shared (FQ); `n:` the same guidance to every seat individually (N); `sn:` shares each seat's synthesis plus a new prompt, everyone reads each other (SN); `sfq:` shares the crew's answers plus a new question (SFQ); `seat-2:` a note or question to one seat only. No keyword opens a picker. No rating unless `rerate`, then RATING: X/10 first (never 7). `final` runs the S/N ratio and red-flag reads on the draft alone. A revised draft may be added first.
argument-hint: [final] [rerate] [run: <folder>] [draft: <path>] [fq: ...|n: ...|sn: ...|sfq: ...] [seat-N: ...]
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
Run one Battle round of Combat Writing on `$ARGUMENTS`. The rules that hold across every round are in the `combat-writing` skill; `${CLAUDE_PLUGIN_ROOT}/method/combat-writing.md` is the method. Battle is the discussion of the structure and content of the draft, and where most synthesis happens: every seat answers at once on the same snapshot.

## 1. Record the paste, then read the arguments

If `$ARGUMENTS` carries pasted text (an FQ, an N, an SN, an SFQ, a seat line, a revised draft), write the whole of it first, unchanged, to `combat-writing/inbox/<slug>.paste.md` in the project, then cut the pieces from that file: the FQ to `<slug>.fq.md`, the N to `<slug>.n.md`, the SN to `<slug>.sn.md`, the SFQ to `<slug>.sfq.md`, a pasted revised draft to `<slug>.draft.md`, each seat line to `<slug>.<seat>.question.md` (always by seat id: `seat-2`, never the model name). Cut the label off: each file holds the text itself, not the words "n:" or "Navigation:", because the packet adds its own label.

- `final` as the first word: the two final reads of step 14 (S/N ratio and red flags), on the draft alone. See step 6.
- `rerate`, anywhere in the arguments, any case: this round asks every seat it goes to for a new rating, the rating line first. Without it, no seat rates: each seat gives its critique and the record shows the round as a critique. Battle never rerates on its own.
- `run: <folder>` names the run. Default: the newest folder under `combat-writing/runs/`. If there is none, say so and point at `/combat-writing:sparring`; battle never starts a run.
- `draft: <path>` adds a revised draft to the run before the round. Default: the newest draft already in the run.
- The round terms (ruled 2026-10-09), one or none, never two together:
  - `fq: <text>` is **FQ, focus question**: the same question put to every seat, nothing shared, the same as sparring's `question:`. No other seat's answer is carried; each seat has its own earlier turn.
  - `n: <text>` is **N, navigation**: the same new guidance put to every seat individually. No other seat's answer is carried; each seat has its own earlier turn.
  - `sn: <text>` is **SN, synthesis navigation**: each seat's synthesis is shared with the others plus your new prompt; everyone answers and everyone reads each other.
  - `sfq: <text>` is **SFQ, synthesis focus question**: the crew's answers are shared plus a new question.
  - With none of the four and no seat line, the seats read the others' latest answers and get the default synthesis prompt.
- `seat-N: <text>` is a **seat line**: a note or question to that one seat only. Seat lines may combine with `fq:` (or any other term). A round with only seat lines goes to the named seats; the others are not sent a packet and the record marks them "not asked". A seat line alone, or with `fq:` or `n:`, shares nothing; with `sn:` or `sfq:` the sharing those terms define applies.

### Synonyms and typos

Keywords match case-insensitively, with or without the space after the colon. `question:` and `focus:` mean `fq:`. `nav:` means `n:`. A seat is addressed by `seat-2:`, `seat 2:`, `seat2:`, or by the short name shown beside it in the seat key of the last result; whichever form is used, the file and the record carry the seat id. A short name that belongs to more than one seat is ambiguous: ask which with the picker below. `rerate` counts wherever it sits in the line.

### No keyword: the picker

A missing keyword is never an error. If the text after the command has no `fq:`, `n:`, `sn:`, `sfq:`, seat line or `draft:` (and is not `final`), or if the command came bare, open a one-keypress picker with the AskUserQuestion tool: one question, "Which round is this?", ending with "/combat-writing:help for the full guide." The kinds are FQ (the same question to every seat, nothing shared), N (the same guidance to every seat, nothing shared), SN (everyone reads each other plus this prompt), SFQ (everyone reads each other plus this question), one seat (then ask which, offering the seat key), and a revised draft. The tool holds four options, so show the four most likely with your best guess first; the other two are a word away under "Other". The best guess: a plain question is FQ; an instruction is N; text that mentions "each other" or "the others" is SN when it reads as an instruction and SFQ when it reads as a question; a line naming a model or a seat is that seat; multi-paragraph text with a salutation, or a close to the last draft, is a revised draft. With a bare command there is no text to guess from: offer FQ, N, SN and SFQ in that order, then ask for the text in one line, stop, and run the round with the next message as that text. Once the kind is chosen, treat the text exactly as if it had carried the keyword, and continue below.

## 2. Decide where you are running

Fresh readers if you can start a separate agent and run `node`; otherwise one seat, the host. The crew in a run is what `seats.json` holds: the fresh reader plus the outside seats the add-on registered. With one seat there is no other seat to read: SN and SFQ have nothing to share, so say so plainly and offer FQ or N (a question or guidance to the one seat, with its own earlier turn) or the add-on; in chat, with no run folder, offer a solo re-read instead (the one seat reads its own earlier answer and the draft, answers the guidance, and rates only when asked with `rerate`, saying Stand or quoting its own earlier line and why). Do not pretend a second seat exists.

## 3. Count the rounds

List `rounds/` in the run. Battle rounds are named `<nn>-battle`; the next number continues from the last round of any kind (a revised draft does not restart the count; the record says which draft each round read). There is no round limit: the person decides when to stop. After every round, say which round this was and how many battle rounds the run now holds; the method says iterate until structure and insights emerge, then stop and publish.

## 4. Add the revised draft, if any

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/add-draft.js --run <folder> --file <draft file>
```

It prints the new draft's name (`draft-2.md`, ...). `draft.md` is never changed.

## 5. Build every packet, then start every seat at once

For each seat the round goes to (every seat in `seats.json`, or only the named seats when the round is seat lines alone):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/packet.js --run <folder> --round <nn>-battle --seat <seat id> [--fq <fq file>] [--n <n file>] [--sn <sn file>] [--sfq <sfq file>] [--rerate] [--question <seat line file>]
```

`--question` takes the seat's own line from the inbox; the script copies it into the round folder as `<seat>.question.md`, where the record reads it. Pass `--rerate` only when the person asked for `rerate`; a `<nn>-battle` packet without it asks for no rating, and the checker holds the seat to that. Build all packets before any seat starts: every packet reads the same previous round, and no seat sees another's new answer before giving its own. An SN, SFQ or plain packet carries the draft (fenced as untrusted content), the brief, the seat's own earlier turn, its latest rating named, and the other seats' answers from the previous round labeled by model and company; a seat that gave no answer in that round is listed as missing, a seat the round was not put to as not asked, and nothing stands in for either. An FQ or N packet, and a seat line alone, carries the question or guidance, the draft, the brief and the seat's own earlier turn, and no other seat's answer. The word cap is 600 when other seats' answers are carried, because seats quote others, and 500 otherwise. A seat not in the round gets no packet and no agent: do not build one to keep it company.

Then start all seats in one go. Each fresh reader (a seat in `seats.json` with no `provider` field) starts as the `seat` agent from this plugin, with this and only this as its task; each outside seat (a seat with a `provider` field, added by the add-on's `crew_register`) goes through the add-on instead: call `crew_answer` with `run`, `round` and `seat`, which reads the same packet and writes the same answer file. If a run has no outside seats and the add-on is present, `crew_register` may be called on it first.

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

The answer files are `<seat>.sn.answer.md` and `<seat>.redflag.answer.md`. For an outside seat, call `crew_answer` twice, with `read: sn` and `read: redflag`, instead of starting agents. These reads use the app's own first lines, `S/N RATIO: XX%` and `NO RED FLAGS` or `RED FLAGS FOUND: X`; they are not ratings and the 7 rule does not apply to them. No other seat's answer is carried. Both numbers go on the scoreboard per seat and are never averaged.

## 7. Check every answer

For each answer file (the seats the round went to; a seat not asked has none and is left alone):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/check-answer.js <answer file> --run <folder>
```

The checker reads the contract the seat was sent from the packet: a rating line first in a `rerate` round, no rating line in a round without it, the app's lines in a final round. On FAIL, start the same seat once more with the same packet and the check's reasons appended to its task; for an outside seat, call `crew_answer` again with `note` set to those reasons, which the add-on appends after the packet. An outside seat is told the cap in its system line; if its second answer is over the cap again, the add-on cuts it at the cap with the first line kept and the result says `truncated`; run the checker on the cut file as usual, and the record marks the read "truncated at N words". If a seat fails twice for any other reason, keep the failed file and record it; the record shows that seat as a failed read. Never edit a seat's answer. Never fill in a number for it. A seat that never answered is shown as missing, never replaced.

Then, in a `rerate` round only, for every rating answer:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/check-flip.js --run <folder> --round <nn>-battle --seat <seat id>
```

It records whether the seat held (Stand) or flipped against its latest earlier rating, and whether a flip's quote matches the seat it names. An invalid flip stays in the record as invalid with the rating still shown; do not send the seat back for it. In an N round with `rerate`, no other seat was carried, so a changed rating has no quote to rest on and is recorded as a flip without one. In a round without `rerate` the script answers "no rating" and there is nothing to check.

## 8. Render and show the record

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-record.js --run <folder> --short
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-board.js --run <folder>
```

The first rebuilds `record.md` and prints the short form: the credit line, the crew line, the scoreboard. The second rebuilds `board.html`. Show the short form as it is, up to its "Record:" line (its last line, the seat key, is for the end of your result), then the board as an artifact or preview where you have a tool for that, else its path in one line; then one line with the round just run, its kind (FQ, N, SN, SFQ, seat lines or plain; rerate or no rating; which seats it went to when not all) and the count of battle rounds in the run (for example "Round 04-battle, SN with rerate; this run holds 3 battle rounds"), then each seat's new critique in full, rating line first where one was asked, a seat not asked this round named in one line, then one short paragraph of your own on where the seats moved and why, quoting them by model name. The latest rating stays visible in the scoreboard beside every flip. No verdict of yours above the scoreboard. Point at `record.md` for the full record.

Close with the Next line, in these terms: `fq: <question>` (FQ, focus question: the same question put to every seat, nothing shared); `n: <guidance>` (N, navigation: the same new guidance put to every seat individually); `sn: <prompt>` (SN, synthesis navigation: each seat's synthesis shared with the others plus your new prompt, everyone answers and everyone reads each other); `sfq: <question>` (SFQ, synthesis focus question: the crew's answers shared plus a new question); `seat-2: <note>` (one seat only); `rerate` with any of them for a new rating; `draft: <path>` for a revised draft; `final` for the S/N ratio and red-flag reads on the draft alone. Then, as the last line of the result, the seat key exactly as the short form printed it: `Seat key: seat-1 <short name> · seat-2 <short name> · ...`, from the live crew, so the person can address a seat by id or short name.
