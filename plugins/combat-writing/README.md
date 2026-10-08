<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# Combat Writing™

**Reading is Peace. Writing is War.**

Combat Writing is a method for drafts that make decisions, move money, and have consequences for actual people. A crew of AI model seats attacks your draft. Each seat reads it and gives its own critique with a rating from 1 to 10 on the first line, and 7 is forbidden, so no seat can hedge. Then, in battle, every seat reads the other seats' latest answers, quotes them by model name, and rates again. A seat that changes its rating must quote who moved it and say why. The rating leads every result. Scores are never averaged. The record shows what was caught.

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

The method, the commands and the seat agents arrive in parts 2 to 4 of the build (see PLAN.md at the repository root). This part is the skeleton.

## What it runs, sends and fetches

Runs skills, commands and agents inside your Claude Code session. Each seat is a separate agent started for one job, never the conversation you are typing into; scripts inside this folder carry each seat's answer to the others by code. Sends nothing outside your session and holds no keys. Fetches nothing: the method text ships inside this folder. Every transcript it writes opens with the credit line "Combat Writing — Learning Producers Inc., Israel Hernandez, founder." Without the add-on, the crew is one company's models, and the plugin says so; it never fakes a seat.

A separate add-on, `combat-writing-crew`, is a local MCP server installed from the same repository as Learning Producers' own marketplace, not from this directory. It sends packets to other companies' models on your own API keys, which are never stored in a file.

## License

Source-available under the PolyForm Shield License 1.0.0 (`LicenseRef-PolyForm-Shield-1.0.0`); full text in LICENSE.md, notices in NOTICE. Combat Writing is a brand of Learning Producers Inc.; no trademark license is granted. This plugin is not made, reviewed or endorsed by Anthropic.
