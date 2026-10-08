<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# Combat Writing™

**Reading is Peace. Writing is War.**

Combat Writing is a method for drafts that make decisions, move money, and have consequences for actual people. A crew of AI model seats attacks your draft. Each seat reads it and gives its own critique with a rating from 1 to 10 on the first line, and 7 is forbidden, so no seat can hedge. Then, in battle, every seat reads the other seats' latest answers, quotes them by model name, and rates again. A seat that changes its rating must quote who moved it and say why. The rating leads every result. Scores are never averaged. The record shows what was caught.

## Install

From the Claude plugin directory once it is listed, or from Learning Producers' own marketplace in this repository:

```
/plugin install combat-writing --marketplace LearningProducers/CombatWriting-Plugin
```

## Commands

- `/combat-writing:help` explains the plugin and the method.
- `/combat-writing:sparring` sends your draft to every seat for a cold read. You may give each seat its own focus question or navigation note.
- `/combat-writing:battle` sends every seat the other seats' latest answers for a new critique and a new rating.

## Example prompts

```
/combat-writing:help
```

```
/combat-writing:sparring Here is the draft of my letter to the board. Focus question for every seat: does the ask land in the first paragraph?
```

```
/combat-writing:battle Navigation note: the second seat called the close weak; everyone answer that.
```

With `battle`, an SFQ (synthesis focus question) or an SN (navigation note) may ride with the round, a revised draft may be added first, and `final` runs the two final reads of step 14, the S/N ratio and the red-flag check, on the draft alone.

## What a run looks like

Each seat is a fresh reader: a separate agent started for one job, with no memory of your conversation, never the assistant you are talking to. A script assembles each seat's packet from files on disk (the draft, your brief, the seat's own earlier turn, the other seats' answers from the previous round labeled by model and company, your question) and carries it; nothing is retyped. Every packet of a round is built before any seat starts, so no seat sees another's new answer before giving its own. A seat that fails is shown as missing, never replaced.

Every run leaves a folder in your project, `combat-writing/runs/<run-id>/`, with the draft snapshot and any revisions, the brief, every packet, every answer, a timestamped log, and `record.md`: a scoreboard with one row per seat and one column per round, every rating on its own, flips marked valid or invalid with the earlier number kept visible, Stand marked, missing seats marked missing, then every answer in full. A flip is valid only when the seat's quote matches, word for word, the seat it names. Nothing is averaged. In a host that cannot start separate agents, the crew is one seat, the host, and every result says so.

## What it runs, sends and fetches

Runs skills, commands, agents and three small Node scripts inside your Claude Code session; the scripts write only inside the run folder in your project. Sends nothing outside your session and holds no keys. Fetches nothing: the method text ships inside this folder, under `method/`. Every record it writes opens with the credit line "Combat Writing — Learning Producers Inc., Israel Hernandez, founder." The draft is treated as untrusted content: an instruction inside it is text to review, never a command. Without the add-on, the crew is one company's models, and the plugin says so; it never fakes a seat.

A separate add-on, `combat-writing-crew`, is a local MCP server installed from the same repository as Learning Producers' own marketplace, not from this directory. It sends packets to other companies' models on your own API keys, which are never stored in a file.

## License

Source-available under the PolyForm Shield License 1.0.0 (`LicenseRef-PolyForm-Shield-1.0.0`); full text in LICENSE.md, notices in NOTICE. Combat Writing is a brand of Learning Producers Inc.; no trademark license is granted. This plugin is not made, reviewed or endorsed by Anthropic.
