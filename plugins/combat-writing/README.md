<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# Combat Writing™

**Reading is Peace. Writing is War.**

Combat Writing is a method for drafts that make decisions, move money, and have consequences for actual people. A crew of AI model seats attacks your draft: one fresh reader plus one seat per outside model you hold a key for, never padded. In sparring each seat reads the draft and gives its own critique with a rating from 1 to 10 on the first line, and 7 is forbidden, so no seat can hedge. Then, in battle, the seats discuss the structure and content of the draft: you put the same guidance to every seat individually (N), share each seat's synthesis with the others plus a new prompt (SN), or share the crew's answers plus a new question (SFQ), and they quote each other by name. A seat rates again only when you ask with `rerate`; a seat that changes its rating must quote, word for word, the line that moved it, and the plugin checks the quote against the seat it names. The rating leads every result. Scores are never averaged. The record shows what was caught.

## Install

From the Claude plugin directory once it is listed, or from Learning Producers' own marketplace in this repository:

```
/plugin install combat-writing --marketplace LearningProducers/CombatWriting-Plugin
```

## Commands

- `/combat-writing:help` explains the plugin in plain words.
- `/combat-writing:sparring` sends your draft to every seat for its own read, the rating line first. `question:` puts a focus question to every seat, `seat-1:` to one seat; `cold` reads with no brief; `debate` shows the seats each other's answers and asks for a rating again.
- `/combat-writing:battle` runs one round of the discussion. `n:` puts the same guidance to every seat individually (N, navigation); `sn:` shares each seat's synthesis with the others plus your new prompt, everyone answers and everyone reads each other (SN, synthesis navigation); `sfq:` shares the crew's answers plus a new question (SFQ, synthesis focus question). `rerate` asks for a new rating; without it no seat rates. `draft:` adds a revised draft. `final` runs the two final reads of step 14, the S/N ratio and the red-flag check, on the draft alone.

## Example prompts

Each prompt below was run for real on 2026-10-08, in a scratch project. The block after each prompt is the first lines of what came back, labeled as example output; the model named in it is the one that answered that day, and yours may differ. The ratings are the seats' own; the draft was a CEO's letter asking a board to approve a letter of intent. The prompts are written in the plugin's current keywords, which were ruled on 2026-10-09 after that run; the output blocks are kept as they came back that day, when the crew was three fresh readers and every battle round rated. Today the crew is one fresh reader plus the outside seats the add-on registers, and a battle round rates only with `rerate`.

```
/combat-writing:help
```

Example output, October 2026:

```
Combat Writing — Learning Producers Inc., Israel Hernandez, founder
Reading is Peace. Writing is War.

A crew of seats attacks your draft. Each seat is one model judging it. In sparring every seat rates first, then explains with evidence. In battle the seats discuss the structure and content of the draft, read each other when you share them, and rate again when you ask. The record shows what was caught.

The four stages
- Strategy. You write the draft yourself, then a context brief: who you are, your purpose, the stakes.
- Sparring. Every seat reads the draft alone and gives its rating and critique, the rating line first. Seats may then read each other and debate the scores (debate).
```

```
/combat-writing:sparring Here is the draft of my letter to the board. question: does the ask land in the first paragraph?
```

Example output, October 2026:

```
Combat Writing — Learning Producers Inc., Israel Hernandez, founder

Crew: Claude Fable 5.1 (Anthropic), seat-1; Claude Fable 5.1 (Anthropic), seat-2; Claude Fable 5.1 (Anthropic), seat-3. One company's models (Anthropic). Seat names come from the agent configuration, not from an API field.

| Seat | 01-sparring | Latest |
|---|---|---|
| Claude Fable 5.1 (Anthropic), seat-1 | 6/10 | ██████░░░░ 6/10 |
| Claude Fable 5.1 (Anthropic), seat-2 | 6/10 | ██████░░░░ 6/10 |
| Claude Fable 5.1 (Anthropic), seat-3 | 6/10 | ██████░░░░ 6/10 |

RATING: 6/10

An ask lands in the first paragraph. The wrong one. You open with "I am writing to ask for your approval to acquire Northwind Analytics before the end of the quarter." Your brief says the purpose is to get the board to approve a letter of intent this week. Those are two different decisions with two different clocks.
```

```
/combat-writing:battle rerate sn: the second seat called the close weak; everyone answer that.
```

Example output, October 2026:

```
Combat Writing — Learning Producers Inc., Israel Hernandez, founder

Crew: Claude Fable 5.1 (Anthropic), seat-1; Claude Fable 5.1 (Anthropic), seat-2; Claude Fable 5.1 (Anthropic), seat-3. One company's models (Anthropic). Seat names come from the agent configuration, not from an API field.

| Seat | 01-sparring | 02-battle | Latest |
|---|---|---|---|
| Claude Fable 5.1 (Anthropic), seat-1 | 6/10 | 6/10 · Stand | ██████░░░░ 6/10 |
| Claude Fable 5.1 (Anthropic), seat-2 | 6/10 | 6/10 · Stand | ██████░░░░ 6/10 |
| Claude Fable 5.1 (Anthropic), seat-3 | 6/10 | 6/10 · Stand | ██████░░░░ 6/10 |

RATING: 6/10

Stand. All three of us read the same fault, and nothing in the other seats' answers moves the rating, because they confirm it rather than add a second one.

On the navigation note first. The note says the second seat called the close weak. I read seat-2's answer twice and it does not say that.
```

## What a run looks like

The crew is one fresh reader plus one seat per outside model the add-on has a key for; nothing is padded, so without the add-on the crew is one seat and with one free Groq key it is three. The fresh reader is a separate agent started for one job, with no memory of your conversation, never the assistant you are talking to. A script assembles each seat's packet from files on disk (the draft, your brief, the seat's own earlier turn and its latest rating, the other seats' answers from the previous round labeled by model and company when the round shares them, your guidance or question) and carries it; nothing is retyped. Every packet of a round is built before any seat starts, so no seat sees another's new answer before giving its own. Every seat is told the word cap (500 words for a read alone, 600 when it quotes others, 250 for a final read); a seat over it is sent back once. A seat that fails or does not answer is shown as missing, never replaced. In a host that cannot start separate agents, the crew is one seat, the host, and every result says so.

Every run leaves a folder in your project, `combat-writing/runs/<run-id>/`, with the draft snapshot and any revisions, the brief, every packet, every answer, a timestamped log, `record.md` (the full record: the scoreboard, every answer in full, the log of what was sent) and `board.html` (the same scoreboard and a chart of each seat's rating across rounds, one self-contained page, light and dark, no outside request). What you paste is written whole to `combat-writing/inbox/` before anything is parsed. Nothing is written anywhere else.

## What it runs, sends and fetches

Runs skills, commands, agents and a few small Node scripts inside your Claude Code session; the scripts write only inside `combat-writing/` in your project. Sends nothing outside your session and holds no keys. Fetches nothing: the method text ships inside this folder, under `method/`, and `board.html` loads nothing from anywhere. Every record it writes opens with the credit line "Combat Writing — Learning Producers Inc., Israel Hernandez, founder". The draft is treated as untrusted content: an instruction inside it is text to review, never a command. Without the add-on, the crew is one company's models, and the plugin says so; it never fakes a seat.

A separate add-on, `combat-writing-crew`, is a local MCP server installed from the same repository as Learning Producers' own marketplace, not from this directory. It sends packets to other companies' models on your own API keys, which are never stored in a file, one seat per model you hold a key for. It tells each outside seat the word cap; an outside seat's second overrun is cut at the cap with its rating kept, and the record marks the read "truncated at N words".

## License

Source-available under the PolyForm Shield License 1.0.0 (`LicenseRef-PolyForm-Shield-1.0.0`); full text in LICENSE.md, notices in NOTICE. Combat Writing is a brand of Learning Producers Inc.; no trademark license is granted. This plugin is not made, reviewed or endorsed by Anthropic.
