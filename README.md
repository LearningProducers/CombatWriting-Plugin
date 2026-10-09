<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# Combat Writing™ plugin

**Reading is Peace. Writing is War.**

Combat Writing is a 19-step method in four stages, Strategy, Sparring, Battle, Champion, in which a draft is attacked by several AI models, rated against written rules, and the record shows what was caught. It ships today as a single-file web app at [combatwriting.learningproducers.com](https://combatwriting.learningproducers.com), source at [LearningProducers/CombatWriting](https://github.com/LearningProducers/CombatWriting).

This repository is the home of the Combat Writing plugin for Claude Code and of a local add-on. It is source-available: you can read every file and run the plugin under the terms in [NOTICE](NOTICE). It is not released under an OSI-approved license.

## Status

Version 0.2.0. The skeleton, the method text, the `help`, `sparring` and `battle` commands, the seat agent, the scripts, the rendered record, the visual board, the eval cases, the directory checklist pass ([docs/directory-checklist.md](docs/directory-checklist.md)) and the add-on are in, and the founder's rulings of 2026-10-09 (the crew is never padded, the round terms N, SN and SFQ, a rating in battle only on `rerate`, the outside-seat cap) are applied. See [PLAN.md](PLAN.md). Nothing has been submitted to the Claude plugin directory; the portal's Validate button is the owner's step.

## What is here

| Path | What |
|---|---|
| `plugins/combat-writing/` | The plugin meant for the Claude plugin directory. Skills, commands, agents and scripts. Holds no keys and makes no outside calls. |
| `plugins/combat-writing-crew/` | The add-on: a local MCP server, installed from this repository as Learning Producers' own marketplace, never listed in the directory. |
| `.claude-plugin/marketplace.json` | The marketplace that names both. |
| `docs/` | Methodology prose and documentation. |
| `tests/`, `.github/workflows/` | The checks and the workflow that runs them. |

## What the plugin does, sends and fetches

- **Runs:** skills, commands and agents inside the Claude Code session you are already in. The crew is one fresh reader, a separate agent started for one job, never the conversation you are typing into, plus one seat per outside model the add-on has a key for; nothing is padded. Scripts in the plugin folder carry each seat's answer to the other seats by code. In sparring every seat rates first; in battle the seats discuss the draft in N, SN and SFQ rounds and rate again only when you ask with `rerate`.
- **Sends:** nothing outside that session. The plugin holds no keys and calls no service of its own. Your draft goes where your Claude Code session already sends it, and nowhere else.
- **Fetches:** nothing. The method text ships inside the plugin folder.
- **Writes:** a run folder in your project, `combat-writing/runs/<run-id>/`, holding the draft snapshot and any revisions, the brief, every packet, every answer, a timestamped log, `record.md` (the rendered record with its scoreboard) and `board.html` (the visual board, one self-contained page that loads nothing from anywhere). What you paste is written whole to `combat-writing/inbox/` before it is parsed. Every record it writes opens with the credit line: "Combat Writing — Learning Producers Inc., Israel Hernandez, founder".
- **Treats the draft as untrusted content.** An instruction inside the draft is text to review, never a command, for the host and for every seat.
- **Without the add-on,** every seat is one company's models, and the plugin says so. It never fakes a seat. Scores are never averaged. The rating leads every result.

## The add-on

`plugins/combat-writing-crew/` is a local MCP server that sends each seat's packet to other companies' models on your own API keys, so the crew can be more than one company's models. It is installed from this repository as a marketplace, not from the directory. Each key goes only to its own provider, never to Learning Producers, and is never stored in a file: a masked prompt first, an environment variable only when the prompt is empty. One free Groq key seats two outside models beside the fresh reader: a crew of three. Each outside seat is told the word cap; a second overrun is cut at the cap with the rating kept and marked in the record. See [its README](plugins/combat-writing-crew/README.md).

## Licensing

| What | License | Identifier |
|---|---|---|
| Every executable file: scripts, skill files, commands, agents, prompts, plugin configuration, tests, workflows, and the Markdown files outside the paths below | PolyForm Shield 1.0.0 | `LicenseRef-PolyForm-Shield-1.0.0` |
| Methodology prose and documentation under `docs/` and `plugins/combat-writing/method/` | CC BY-NC-SA 4.0 | `CC-BY-NC-SA-4.0` |

Full texts in [LICENSES/](LICENSES/). The Required Notice, the Licensor Line of Business, the attribution designation, the internal-use permission and the brand statement are in [NOTICE](NOTICE). Learning Producers Inc. claims the text, the code, the name and the record; it does not claim the method as a process. Combat Writing is a brand of Learning Producers Inc.; no trademark license is granted.

Contributions are not accepted yet; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Not an Anthropic product

This plugin is made by Learning Producers Inc. It is not made, reviewed or endorsed by Anthropic. Claude and Claude Code are Anthropic's products and marks.
