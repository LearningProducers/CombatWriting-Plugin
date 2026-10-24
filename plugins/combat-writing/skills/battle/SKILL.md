---
name: battle
description: Battle. The discussion of the structure and content of the draft. `fq:` puts the same question to every seat, nothing shared (FQ); `n:` the same guidance to every seat individually (N); `sn:` shares each seat's synthesis plus a new prompt, everyone reads each other (SN); `sfq:` shares the crew's answers plus a new question (SFQ); `seat-2:` a note or question to one seat only. No keyword opens a picker. No rating unless `rerate`, then RATING: X/10 first (never 7). `final` runs the S/N ratio and red-flag reads on the draft alone. Battle may come first: a pasted draft starts a run, and on a run nothing has read it is round 01-battle, with no other seat's answer to carry. A revised draft may be added first. Every result ends with a picker for the next round.
argument-hint: [final] [rerate] [run: <folder>] [draft: <path or pasted draft>] [fq: ...|n: ...|sn: ...|sfq: ...] [seat-N: ...]
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
Run one Battle round of Combat Writing on `$ARGUMENTS`. The rules that hold across every round are in the `combat-writing` skill; `${CLAUDE_PLUGIN_ROOT}/method/combat-writing.md` is the method. Battle is the discussion of the structure and content of the draft, and where most synthesis happens: every seat answers at once on the same snapshot. The order of the stages is the person's choice (2026-10-14): battle may follow sparring, follow strategy with nothing read yet, or be the first command typed with the draft pasted; its first round on an unread draft is `01-battle`, and the record says which stage the run started at.

## 1. Record the paste, then read the arguments

If `$ARGUMENTS` carries pasted text (an FQ, an N, an SN, an SFQ, a seat line, a draft), write the whole of it first, unchanged, to `combat-writing/inbox/<slug>.paste.md` in the project, then cut the pieces from that file: the FQ to `<slug>.fq.md`, the N to `<slug>.n.md`, the SN to `<slug>.sn.md`, the SFQ to `<slug>.sfq.md`, a pasted draft to `<slug>.draft.md`, a brief (`brief:` or `context:`, allowed beside a first draft) to `<slug>.brief.md`, each seat line to `<slug>.<seat>.question.md` (always by seat id: `seat-2`, never the model name). Cut the label off: each file holds the text itself, not the words "n:" or "Navigation:", because the packet adds its own label. Write it byte for byte: every line break and every blank line as pasted; never join lines or reflow a paragraph, because the seats read the draft as stored and a lost break changes what they judge. The seats judge by the brief as written: a rule it states is applied, and a format choice it does not state (where the link sits, whether the greeting names the reader, what the closer is) is judged as the seats read it, as a fault if a rule seems to cover it. Put every format rule the draft follows into the brief.

- `final` as the first word: the two final reads of step 14 (S/N ratio and red flags), on the draft alone. See step 6.
- `rerate`, anywhere in the arguments, any case: this round asks every seat it goes to for a new rating, the rating line first. Without it, no seat rates: each seat gives its critique and the record shows the round as a critique. Battle never rerates on its own, not even on a first round.
- `run: <folder>` names the run. Default: the newest folder under `combat-writing/runs/`. A run with no round yet (strategy made it, nothing has read it) is discussed as it is: this round is `01-battle`, the first round of the run, and the draft it reads is the one strategy stored. When there is no run at all, or the newest run holds a brief alone, battle needs a draft: with `draft:` given it starts the run (below); with none it asks for the draft in one line, "Paste the draft, or give its path. /cw:help for the full guide.", stops, and runs with the next message as the draft. It never errors and never points elsewhere.
- `draft: <path or pasted text>`: when the run already holds a draft, a revised draft added before the round (`draft-2.md`, `draft-3.md`); when the newest unread run holds a brief alone, the first draft, written into that run as `draft.md` beside the stored brief; when there is no run, the draft a new run is made from (`new-run.js --draft --stage battle`, with `brief:` if one came). Default: the newest draft already in the run.
- The round terms (ruled 2026-10-09), one or none, never two together:
  - `fq: <text>` is **FQ, focus question**: the same question put to every seat, nothing shared, the same as sparring's `question:`. No other seat's answer is carried; each seat has its own earlier turn.
  - `n: <text>` is **N, navigation**: the same new guidance put to every seat individually. No other seat's answer is carried; each seat has its own earlier turn.
  - `sn: <text>` is **SN, synthesis navigation**: each seat's synthesis is shared with the others plus your new prompt; everyone answers and everyone reads each other.
  - `sfq: <text>` is **SFQ, synthesis focus question**: the crew's answers are shared plus a new question.
  - With none of the four and no seat line, the seats read the others' latest answers and get the default synthesis prompt.
  - On a first round (`01-battle`, nothing read yet) there is no earlier answer: `sn:` and `sfq:` carry no other seat's answer, the packet says so in one line, and each seat answers the prompt or question on the draft alone; a plain first round is a first critique of the draft (a first rating with `rerate`); `fq:`, `n:` and seat lines work as in any round.
- `seat-N: <text>` is a **seat line**: a note or question to that one seat only. Seat lines may combine with `fq:` (or any other term). A round with only seat lines goes to the named seats; the others are not sent a packet and the record marks them "not asked". A seat line alone, or with `fq:` or `n:`, shares nothing; with `sn:` or `sfq:` the sharing those terms define applies.

### Synonyms and typos

Keywords match case-insensitively, with or without the space after the colon. `question:` and `focus:` mean `fq:`. `nav:` means `n:`. A seat is addressed by `seat-2:`, `seat 2:`, `seat2:`, or by the short name shown beside it in the seat key of the last result; whichever form is used, the file and the record carry the seat id. A short name that belongs to more than one seat is ambiguous: ask which with the picker below. `rerate` counts wherever it sits in the line.

### No keyword: the picker

A missing keyword is never an error. If the text after the command has no `fq:`, `n:`, `sn:`, `sfq:`, seat line or `draft:` (and is not `final`), or if the command came bare, open the picker with the AskUserQuestion tool: one keypress per stage, at most two stages, and every stage's question ends with "/cw:help for the full guide." The picker never points at "Other"; every choice it needs is an option.

1. **Who is this for?** Four options, always in this order: **Everyone** (every seat, one of the four round kinds); **One seat** (a note or question to one seat only); **Revised draft** (add the text to the run as the next draft, then run the round; on a run with no draft yet, or with no run, this is the first draft); **Final** (the S/N ratio and red-flag reads on the draft alone). Mark your best guess with "(best guess)" on its label without moving it: a question or an instruction is Everyone; a line naming a model or a seat is One seat; multi-paragraph text with a salutation, or a close to the last draft, is Revised draft.
2. **If Everyone: which round?** Four options, always in this order: **FQ** (the same question to every seat, nothing shared); **N** (the same guidance to every seat, nothing shared); **SN** (everyone reads each other plus this prompt); **SFQ** (everyone reads each other plus this question). Mark the best guess the same way: a plain question is FQ; an instruction is N; text that mentions "each other" or "the others" is SN when it reads as an instruction and SFQ when it reads as a question.
   **If One seat: which seat?** One option per seat from the seat key, `seat-1 <short name>`, in seat order; with more than four seats, the fourth option is "more seats" and opens a second list. Mark the seat the text names, if any, as the best guess.

With a bare command there is no text to guess from: mark nothing, and after the choice ask for the text in one line, stop, and run the round with the next message as that text (Final needs no text and runs at once). Once the kind is chosen, treat the text exactly as if it had carried the keyword, and continue below. The selection plus the text is the round (ruled 2026-10-19, issue 32): it fires to exactly the seats the selection names, and the text goes to them as written, whatever it asks for (a rewrite, a question, a judgment); you never answer it, interpret it, or write the rewrite it asks for yourself. The rerate question takes yes or no; anything else is no, and the round still fires.

## 2. Decide where you are running

Fresh readers if you can start a separate agent and run `node`; otherwise one seat, the host. The crew in a run is what `seats.json` holds: the fresh reader plus the outside seats the add-on registered. With one seat there is no other seat to read: SN and SFQ have nothing to share, so say so plainly and offer FQ or N (a question or guidance to the one seat, with its own earlier turn) and the add-on's next command from the Seats line (the skill's three states; if the run has no state recorded and no `crew_list` tool, record it with `crew-state.js` first); in chat, with no run folder, offer a solo re-read instead (the one seat reads its own earlier answer and the draft, answers the guidance, and rates only when asked with `rerate`, saying Stand or quoting its own earlier line and why). Do not pretend a second seat exists.

## 3. Count the rounds

List `rounds/` in the run. Battle rounds are named `<nn>-battle`; the next number continues from the last round of any kind, and a run nothing has read starts at `01-battle` (a revised draft does not restart the count; the record says which draft each round read). There is no round limit: the person decides when to stop. After every round, say which round this was and how many battle rounds the run now holds; the method says iterate until structure and insights emerge, then stop and publish.

## 4. Start the run, or add the draft, if any

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/new-run.js --draft <draft file> [--brief <brief file>] --stage battle --model "<the model you know you are running, or omit>"
node ${CLAUDE_PLUGIN_ROOT}/scripts/add-draft.js --run <folder> --file <draft file> --stage battle
```

The first makes a run from a pasted draft when there is none, seats one fresh reader and logs that the run started at battle; then call `crew_register` if the add-on is present, as sparring does. The second writes the draft into a run: `draft.md` when the run holds a brief alone, else the next revision (`draft-2.md`, ...); it prints the file name. `draft.md` is never changed once written.

## 5. Announce the round, build every packet, then start every seat at once

As soon as the kind and the seats are known, before any packet is built, print the forming line (issue 33, 2026-10-19), so the person sees the round start the moment it is chosen:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/announce.js --run <folder> --round <nn>-battle --kind FQ|N|SN|SFQ|seat|plain --to <seat ids, comma-separated> [--rerate]
```

It prints one line, "Round 03 forming: N to 3 seats (seat-1 <short>, seat-2 <short>, seat-3 <short>), rerate", and logs it; show that line as printed. `--to` lists exactly the seats the round goes to (every seat, or the named seats of a round of seat lines alone); `--kind seat` is a round of seat lines alone, `plain` the default prompt.

Then, for each seat the round goes to (every seat in `seats.json`, or only the named seats when the round is seat lines alone):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/packet.js --run <folder> --round <nn>-battle --seat <seat id> [--fq <fq file>] [--n <n file>] [--sn <sn file>] [--sfq <sfq file>] [--rerate] [--question <seat line file>]
```

`--question` takes the seat's own line from the inbox; the script copies it into the round folder as `<seat>.question.md`, where the record reads it. Pass `--rerate` only when the person asked for `rerate`; a `<nn>-battle` packet without it asks for no rating, and the checker holds the seat to that. Build all packets before any seat starts: every packet reads the same previous round, and no seat sees another's new answer before giving its own. An SN, SFQ or plain packet carries the draft (fenced as untrusted content), the brief, the seat's own earlier turn, its latest rating named, and the other seats' answers from the previous round labeled by model and company; a seat that gave no answer in that round is listed as missing, a seat the round was not put to as not asked, and nothing stands in for either. An FQ or N packet, and a seat line alone, carries the question or guidance, the draft, the brief and the seat's own earlier turn, and no other seat's answer. On a first round there is no previous round: the packet says in one line that no seat has read the draft yet and no other seat's answer is carried, and an SN or SFQ packet asks the seat to answer the prompt or question on the draft alone. The word cap is 600 when other seats' answers are carried, because seats quote others, and 500 otherwise. A seat not in the round gets no packet and no agent: do not build one to keep it company.

Then start all seats in one go. Each fresh reader (a seat in `seats.json` with no `provider` field) starts as the `seat` agent from this plugin, with this and only this as its task; each outside seat (a seat with a `provider` field, added by the add-on's `crew_register`) goes through the add-on instead: call `crew_answer` with `run`, `round` and `seat`, which reads the same packet and writes the same answer file. If a run has no outside seats and the add-on is present, `crew_register` may be called on it first.

```
Packet: <absolute packet path>
Answer file: <absolute path to rounds/<round>/<seat>.answer.md>
Read the packet, write your answer to the answer file, reply with one line.
```

Never paste the draft, a question, or any seat's words into the agent's task. The packet carries them.

## 6. The final reads (`final`)

The round is `<nn>-final`. First the forming line, `announce.js --run <folder> --round <nn>-final --kind final --to <every seat>`, shown as printed. Then for each seat, two packets and two seats started, one per read:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/packet.js --run <folder> --round <nn>-final --seat <seat id> --final sn
node ${CLAUDE_PLUGIN_ROOT}/scripts/packet.js --run <folder> --round <nn>-final --seat <seat id> --final redflag
```

The answer files are `<seat>.sn.answer.md` and `<seat>.redflag.answer.md`. For an outside seat, call `crew_answer` twice, with `read: sn` and `read: redflag`, instead of starting agents. These reads use the app's own first lines, `S/N RATIO: XX%` and `NO RED FLAGS` or `RED FLAGS FOUND: X`; they are not ratings and the 7 rule does not apply to them. No other seat's answer is carried. Both numbers go on the scoreboard per seat and are never averaged.

## 7. Check every answer

For each answer file (the seats the round went to; a seat not asked has none and is left alone), as soon as that seat's one-line reply or `crew_answer` result comes back, without waiting for the others:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/check-answer.js <answer file> --run <folder>
```

Print the checker's first line as printed, "seat-2 <short> finished round 03-battle: OK critique, no rating this round, 412 words" (or FAIL with the reasons), one line per seat as it finishes (issue 33); a seat that never answers gets no line and shows as missing on the board. With the forming line, every round shows at least two lines before the board opens.

The checker reads the contract the seat was sent from the packet: a rating line first in a `rerate` round, no rating line in a round without it, the app's lines in a final round; in a rating read it also holds the number to the words (2026-10-14): an 8 or more over "not send-ready", or a 6 or less over "ships as is", is a failed read. On FAIL, start the same seat once more with the same packet and the check's reasons appended to its task (an overrun's reason names the retry target, 80% of the cap, ruled 2026-10-15); for an outside seat, call `crew_answer` again with `note` set to those reasons, which the add-on appends after the packet with the same target. Then run the checker on the second answer too. One overrun rule for every seat: a second answer still over the cap is cut at the cap, at the last sentence end before it, with the first line kept, by the checker for a fresh reader (it writes the cut file back and reports OK with `truncated`) and by the add-on for an outside seat (the result says `truncated`; run the checker on the cut file as usual); the record marks the read "truncated at N words". If a seat fails twice for any other reason, keep the failed file and record it; the record shows that seat as a failed read. Never edit a seat's answer. Never fill in a number for it. A seat that never answered is shown as missing, never replaced.

Then, in a `rerate` round only, for every rating answer:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/check-flip.js --run <folder> --round <nn>-battle --seat <seat id>
```

It records whether the seat held (Stand) or flipped against its latest earlier rating, and whether a flip's quote matches the seat it names. An invalid flip stays in the record as invalid with the rating still shown; do not send the seat back for it. In an N round with `rerate`, no other seat was carried, so a changed rating has no quote to rest on and is recorded as a flip without one. On a first round with `rerate` every rating is a first rating. In a round without `rerate` the script answers "no rating" and there is nothing to check.

## 8. Render, open the board, show the result

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-record.js --run <folder> --short
node ${CLAUDE_PLUGIN_ROOT}/scripts/render-board.js --run <folder>
node ${CLAUDE_PLUGIN_ROOT}/scripts/open-board.js --run <folder>
```

The board is the result (2026-10-14). The first rebuilds `record.md` and prints the short form: the crew line, the Seats line when the crew is short, the scoreboard legend the first time this run prints it and never again, the scoreboard, the board's path, and the seat key. The second rebuilds `board.html`: the round strip at the top, the latest round's prompt in words with whether a rating was asked and how many seats answered (ruled 2026-10-15); the draft; then, only when the run holds a number, the box: SEND or BACK TO THE DRAWING BOARD from every seat's own latest rating with nothing averaged, or FINAL READS over each seat's own two numbers when the run holds final reads and no rating, and no box at all otherwise (a round that asked for no rating shows its prompt in the strip and the seats' words in the frames); then one framed quote per seat, its one-line verdict cited to the model by name and company, and its own note when that seat alone was asked something, with the full read folded under a click. The third opens it in the person's browser as a local file: never publish it, never show it through an artifact or preview tool, never post it anywhere. The forming line and the one line per seat were already printed while the round ran; nothing else comes before the short form. Show the short form exactly as printed, then one line with the round just run, its kind and its text in quotes (FQ, N, SN, SFQ with the prompt as typed; seat lines with the seat ids; plain; rerate or no rating; first round when it is; which seats it went to when not all) and the count of battle rounds in the run (for example "Round 04-battle, SN “...” with rerate; this run holds 3 battle rounds"), and nothing else: no seat's critique in the terminal, no paragraph of yours on where the seats moved, no verdict of yours, no rewrite or draft of yours, no answer of yours to the round's text (ruled 2026-10-19). If a fresh reader's one-line reply reports a scope refusal ("Combat Writing seat scope: ..."), print that reply under the crew line, so the person sees why the seat did what it did or is missing; the reason names the cause and the next step. If the opener prints that no browser opener is here, or that the opener failed, show that one line as printed (it carries the path, and on a failure the reason and the command to open the board by hand, which a sandboxed shell cannot run and the person can); otherwise show nothing from it. The latest rating stays visible in the scoreboard beside every flip. The seat key, `Seat key: seat-1 <short name> · seat-2 <short name> · ...`, is the last line the short form printed and the last line you print before the picker, so the person can address a seat by id or short name.

Close with the Next picker exactly as the skill lays it out (2026-10-14): screen one, **Battle: everyone** / **Battle: one seat** / **Debate: seats re-read and rerate** / **More**; under Battle: everyone, FQ / N / SN / SFQ with the founder's descriptions; under Battle: one seat, the seat list from the seat key; under More, **Final reads** / **Champion** / **Help** / **Done for now**, Champion opening one more screen, **Shipped** / **Result** / **Insight**, then one line for the text, then `/cw:champion` as if typed; after a kind or a seat, one line asks for the text, then one yes/no for rerate, and the selection plus the text is the next round, fired to exactly the seats it names as typed, never answered by you, a rerate reply that is not yes or no taken as no (ruled 2026-10-19); Debate runs `/cw:sparring debate` on this run at once; Final reads runs step 6 at once; Done for now prints the text Next line, as `render-record.js --run <folder> --next` prints it, and nothing else. With one seat, Debate, SN and SFQ have no other seat to share: say so when one is chosen and offer FQ, N or the add-on. Where you have no AskUserQuestion tool, print the text Next line instead of the picker.
