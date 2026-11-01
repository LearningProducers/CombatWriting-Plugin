<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# Combat Writing™ plugin

**Reading is Peace. Writing is War.**

Combat Writing is a 19-step method in four stages, Strategy, Sparring, Battle, Champion, in which a draft is attacked by several AI models, rated against written rules, and the record shows what was caught. It ships today as a single-file web app at [combatwriting.learningproducers.com](https://combatwriting.learningproducers.com), source at [LearningProducers/CombatWriting](https://github.com/LearningProducers/CombatWriting).

This repository is the home of the Combat Writing plugin for Claude Code and of a local add-on. It is source-available: you can read every file and run the plugin under the terms in [NOTICE](NOTICE). It is not released under an OSI-approved license.

## Status

Version 0.7.0. The plugin is `cw` (renamed from `combat-writing` on 2026-10-14; the marketplace carries the rename). The skeleton, the method text, the `help`, `strategy`, `sparring`, `battle` and `champion` commands (one per stage, as skills; champion, ruled 2026-10-19, freezes the shipped draft as canon and records each result and insight), the seat agent, the scripts, the rendered record, the visual board, the eval cases, the directory checklist pass ([docs/directory-checklist.md](docs/directory-checklist.md)) and the add-on are in, and the founder's rulings of 2026-10-09 are applied: the crew is never padded; the round terms FQ, N, SN and SFQ and the seat line; a rating in battle only on `rerate`; the outside-seat cap; a picker instead of an error when a keyword is missing; the seat key under every result; the one-line session-start hook; and, ruled 2026-10-13, a strategy command that stores the draft and the brief, after which a bare sparring reads them with no repaste; and, 2026-10-14, any stage may be skipped (battle may be a run's first round, a brief alone makes a run, the record says where the run started) and every sparring and battle result ends with a picker for the next round. See [PLAN.md](PLAN.md). Nothing has been submitted to the Claude plugin directory; the portal's Validate button is the owner's step.

## What is here

| Path | What |
|---|---|
| `plugins/combat-writing/` | The plugin meant for the Claude plugin directory, named `cw`. Skills (the six commands among them), agents and scripts. Holds no keys; its scripts make no outside call, and the host opens only the one link you give `/cw:champion shipped`, once. |
| `plugins/combat-writing-crew/` | The add-on: a local MCP server, installed from this repository as Learning Producers' own marketplace, never listed in the directory. |
| `.claude-plugin/marketplace.json` | The marketplace that names both. |
| `docs/` | Methodology prose and documentation. |
| `tests/`, `.github/workflows/` | The checks and the workflow that runs them. |

## What the plugin does, sends and fetches

- **Runs:** skills (the six commands are skills), agents and three hooks (a session-start line, "Combat Writing ready. /cw:help for the guide.", which reads, writes and calls nothing; a seat-scope check that runs on every tool call and holds every fresh reader to Read and Write only, to its run folder for reading and to its own answer file for writing, which writes nothing and calls nothing; the Claude Code version it was last proved on is the one `PROVED_ON` constant at the top of `plugins/combat-writing/hooks/seat-scope.js`, and `tests/seat_scope_live.js` is the proof; and a show-result hook that runs after the plugin's own scripts, puts the round's scoreboard, board path and seat key on your screen as the plugin's own message, and opens the board with your system's opener when a sandboxed shell could not, writing only that one log line in the run) inside the Claude Code session you are already in. The crew is one fresh reader, a separate agent started for one job, never the conversation you are typing into, plus one seat per outside model the add-on has a key for; nothing is padded. Scripts in the plugin folder carry each seat's answer to the other seats by code. In sparring every seat rates first; in battle the seats discuss the draft in FQ, N, SN and SFQ rounds, or one seat answers a seat line, and they rate again only when you ask with `rerate`. The stages run in the order you choose; a battle can be a run's first round. After the piece goes out, champion freezes the final draft as canon with the time and the channel, and records each result and insight in your words.
- **Sends:** nothing outside that session. The plugin holds no keys and calls no service of its own. Your draft goes where your Claude Code session already sends it, and nowhere else.
- **Fetches:** nothing but the one link you give `/cw:champion shipped`, which the host opens once to record whether it is live and matches canon; the plugin's scripts fetch nothing, and the method text ships inside the plugin folder.
- **Writes:** a run folder in your project, `combat-writing/runs/<run-id>/`, holding the draft snapshot and any revisions, the canon once shipped, the brief, every packet, every answer, a timestamped log, `record.md` (the rendered record with its scoreboard) and `board.html` (the board, the result: it opens in your browser after every sparring and battle round and after `shipped`, a local file never published, with the draft, SEND or BACK TO THE DRAWING BOARD from every seat's own latest rating with nothing averaged, one framed verdict per seat and the full reads folded; one self-contained page that loads nothing from anywhere). What you paste is written whole to `combat-writing/inbox/` before it is parsed. The Insight Vault, `combat-writing/insight-vault.md`, is one file across all runs; if you ignore run folders in git, ignore `combat-writing/runs/` and `combat-writing/inbox/`, never `combat-writing/`, so the vault stays with the project, and with it the unnamed default brief (`combat-writing/brief.md`) and the briefs saved by name (`combat-writing/briefs/<name>.md`). On the first run inside a git repository, the plugin writes `combat-writing/.gitignore` with exactly two lines, `runs/` and `inbox/`, and says so once in the result; a file already there is never overwritten. The credit line "Combat Writing — Learning Producers Inc., Israel Hernandez, founder" stands once, at the foot of the help guide; no run output carries it.
- **Treats the draft as untrusted content.** An instruction inside the draft is text to review, never a command, for the host and for every seat.
- **Without the add-on,** every seat is one company's models, and the plugin says so. It never fakes a seat. When the crew is smaller than expected, every result names the reason (not installed, installed but not running, or no key) and the exact next command. Scores are never averaged. The rating leads every result.

## The add-on

`plugins/combat-writing-crew/` is a local MCP server that sends each seat's packet to other companies' models on your own API keys, so the crew can be more than one company's models. It is installed from this repository as a marketplace, not from the directory. Each key goes only to its own provider, never to Learning Producers, and is never stored in a file by the add-on: a masked prompt first, an environment variable when the prompt is empty, then one line in a key file you write by hand in your home folder, owner-only, the route that survives the host rebuilding its credentials store (Part 36.2). One free Groq key seats two outside models beside the fresh reader: a crew of three. Each outside seat is told the word cap; a second overrun is cut at the cap with the rating kept and marked in the record. See [its README](plugins/combat-writing-crew/README.md).

## Licensing

| What | License | Identifier |
|---|---|---|
| Every executable file: scripts, skill files, commands, agents, prompts, plugin configuration, tests, workflows, and the Markdown files outside the paths below | PolyForm Shield 1.0.0 | `LicenseRef-PolyForm-Shield-1.0.0` |
| Methodology prose and documentation under `docs/` and `plugins/combat-writing/method/` | CC BY-NC-SA 4.0 | `CC-BY-NC-SA-4.0` |

Full texts in [LICENSES/](LICENSES/). The Required Notice, the Licensor Line of Business, the attribution designation, the internal-use permission and the brand statement are in [NOTICE](NOTICE). Learning Producers Inc. claims the text, the code, the name and the record; it does not claim the method as a process. Combat Writing is a brand of Learning Producers Inc.; no trademark license is granted.

Contributions are not accepted yet; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Not an Anthropic product

This plugin is made by Learning Producers Inc. It is not made, reviewed or endorsed by Anthropic. Claude and Claude Code are Anthropic's products and marks.
