<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# Combat Writing™

**Reading is Peace. Writing is War.**

Combat Writing is a method for drafts that make decisions, move money, and have consequences for actual people. A crew of AI model seats attacks your draft. Each seat reads it and gives its own critique with a rating from 1 to 10 on the first line, and 7 is forbidden, so no seat can hedge. Then, in battle, every seat reads the other seats' answers from the previous round, quotes them by name, and rates again. A seat that changes its rating must quote, word for word, the line that moved it; the plugin checks the quote against the seat it names. The rating leads every result. Scores are never averaged. The record shows what was caught.

## Install

From the Claude plugin directory once it is listed, or from Learning Producers' own marketplace in this repository:

```
/plugin install combat-writing --marketplace LearningProducers/CombatWriting-Plugin
```

## Commands

- `/combat-writing:help` explains the plugin in plain words.
- `/combat-writing:sparring` sends your draft to every seat for its own read. You may give each seat its own focus question or navigation note; `cold` reads with no brief; `debate` shows the seats each other's answers.
- `/combat-writing:battle` sends every seat the other seats' answers from the previous round, plus its own earlier turn, for a new critique and a new rating. `sfq:` adds a synthesis focus question, `sn:` a navigation note, `draft:` a revised draft. `final` runs the two final reads of step 14, the S/N ratio and the red-flag check, on the draft alone.

## Example prompts

Each prompt below was run for real in October 2026, in a scratch project, with three seats. The block after each prompt is the first lines of what came back, labeled as example output; the model named in it is the one that answered that day, and yours may differ. The ratings are the seats' own; the draft was a CEO's letter asking a board to approve a letter of intent.

```
/combat-writing:help
```

Example output, October 2026:

```
Combat Writing — Learning Producers Inc., Israel Hernandez, founder
Reading is Peace. Writing is War.

A crew of seats attacks your draft. Each seat is one model judging it. Every seat rates first, then explains with evidence. Then the seats read each other and rate again. The record shows what was caught.

The four stages
- Strategy. You write the draft yourself, then a context brief: who you are, your purpose, the stakes.
- Sparring. Every seat reads the draft alone and gives its rating and critique. Seats may then read each other and debate.
```

```
/combat-writing:sparring Here is the draft of my letter to the board. Focus question for every seat: does the ask land in the first paragraph?
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
/combat-writing:battle Navigation note: the second seat called the close weak; everyone answer that.
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

Each seat is a fresh reader: a separate agent started for one job, with no memory of your conversation, never the assistant you are talking to. A script assembles each seat's packet from files on disk (the draft, your brief, the seat's own earlier turn, the other seats' answers from the previous round labeled by model and company, your question) and carries it; nothing is retyped. Every packet of a round is built before any seat starts, so no seat sees another's new answer before giving its own. A seat that fails or does not answer is shown as missing, never replaced. In a host that cannot start separate agents, the crew is one seat, the host, and every result says so.

Every run leaves a folder in your project, `combat-writing/runs/<run-id>/`, with the draft snapshot and any revisions, the brief, every packet, every answer, a timestamped log, `record.md` (the full record: the scoreboard, every answer in full, the log of what was sent) and `board.html` (the same scoreboard and a chart of each seat's rating across rounds, one self-contained page, light and dark, no outside request). What you paste is written whole to `combat-writing/inbox/` before anything is parsed. Nothing is written anywhere else.

## What it runs, sends and fetches

Runs skills, commands, agents and a few small Node scripts inside your Claude Code session; the scripts write only inside `combat-writing/` in your project. Sends nothing outside your session and holds no keys. Fetches nothing: the method text ships inside this folder, under `method/`, and `board.html` loads nothing from anywhere. Every record it writes opens with the credit line "Combat Writing — Learning Producers Inc., Israel Hernandez, founder". The draft is treated as untrusted content: an instruction inside it is text to review, never a command. Without the add-on, the crew is one company's models, and the plugin says so; it never fakes a seat.

A separate add-on, `combat-writing-crew`, is a local MCP server installed from the same repository as Learning Producers' own marketplace, not from this directory. It sends packets to other companies' models on your own API keys, which are never stored in a file.

## License

Source-available under the PolyForm Shield License 1.0.0 (`LicenseRef-PolyForm-Shield-1.0.0`); full text in LICENSE.md, notices in NOTICE. Combat Writing is a brand of Learning Producers Inc.; no trademark license is granted. This plugin is not made, reviewed or endorsed by Anthropic.
