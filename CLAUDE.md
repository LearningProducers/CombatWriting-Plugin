<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# CLAUDE.md — working rules for this repository

This repository is the home of the Combat Writing™ plugin for the Claude plugin directory and of a local add-on that is not listed. Learning Producers Inc. (LPI) owns it. Israel Hernandez, LPI's founder, merges. A build session opens pull requests. PLAN.md is the only memory between sessions.

The motto is "Reading is Peace. Writing is War." It is brand. It is never softened.

## Standing rules

- Open a pull request; never merge. One pull request per part.
- Commit title at most 50 characters, a blank line, then the detail.
- No model name pinned in code. If a file needs one, write the choice in the session report instead.
- Method prose, skill text and prompts never name Claude as the host. Write "the host" and "the seat". Only agent files and the add-on name models.
- PLAN.md is the only memory between sessions. Update its status line for the current part before opening the pull request.
- Never soften the motto. Never say "open source" (this repository is source-available). Never imply Anthropic endorsement.
- Nothing is submitted to the directory by a build session.
- If a session runs in Plan mode, PLAN.md is the plan; stop for approval before any other file.
- The plugin holds no keys and makes no outside calls. Keys are never stored in a file.
- Nothing financial and nothing from private documents goes into this repository.

## Terms

- A **seat** is one model judging the draft.
- The **crew** is all seats.
- The **host** is the Claude the person talks to.
- A **fresh reader** is a separate Claude started for one job (an agent).
- A **packet** is everything one seat is sent for one round.
- A **flip** is a seat changing its rating after reading the others.
- The **credit line** is the Required Notice text: "Combat Writing — Learning Producers Inc., Israel Hernandez, founder". Every transcript the plugin writes opens with it.

## What is ruled about the method

- Every seat reads the draft and gives its own critique with a 1 to 10 rating on its first line. 7 is forbidden.
- The rating leads every result. A ship, revise or kill verdict never replaces it as the headline. Scores are never averaged.
- Sparring: each seat reads the draft alone; the person may put a different focus question or navigation note to each seat; seats may be shown each other's answers and debate the scores.
- Battle (the `battle` command): every seat reads the other seats' latest answers and gives a new critique and a new rating, quoting the others by model name. Most synthesis happens here.
- A flip carries an attributed quote and the reasoning.
- Every seat is named by model and company. No anonymous round.
- Claude's seat is a fresh reader, never the host's running conversation.
- Each seat's answer is carried to the other seats by code, never copied by hand.
- A crew with no paid keys is allowed. The plugin never fakes a seat. With no add-on it says the crew is one company's models.
- Output is organized and easy on the eyes, with a visual element. A help command explains the plugin.
- The method text ships inside the plugin folder. Nothing is fetched.

## Layout

```
.claude-plugin/marketplace.json        LPI's own marketplace: names both plugins
.github/workflows/checks.yml           CI: tests/*_check.js, then claude plugin validate
CLAUDE.md                              this file
PLAN.md                                the five parts and their status lines
README.md                              the repository README
CONTRIBUTING.md                        contributions are not accepted yet
NOTICE                                 the Shield notices, the CC attribution, the brand statement
LICENSES/                              the two full license texts, verbatim
docs/                                  CC-licensed prose
tests/                                 *_check.js, plain Node, no dependencies
plugins/combat-writing/                the listed plugin
  .claude-plugin/plugin.json           the manifest; its license field covers the manifest
  README.md                            the directory README (40+ words, three example prompts)
  LICENSE.md, NOTICE                   byte-identical copies of the root texts
  skills/                              the method as skills (part 2)
  commands/                            help, sparring, battle (parts 2 and 3)
  agents/                              seat agents, fresh readers (part 2)
  scripts/                             packet assembly, rating parsing, the record writer (parts 2 and 3)
  method/                              the methodology text, CC-licensed (part 2)
plugins/combat-writing-crew/           the add-on: a local MCP server (part 5)
```

Everything the listed plugin runs lives inside plugins/combat-writing/. The directory scans only that folder.

## Licensing by path

- **PolyForm Shield 1.0.0** (`LicenseRef-PolyForm-Shield-1.0.0`): every executable file: scripts, skill files, command files, agent definitions, prompts, plugin configuration, tests, workflows, and the Markdown files outside the CC paths (README, CONTRIBUTING, CLAUDE.md, PLAN.md). PolyForm Shield is not on the SPDX license list, so the identifier takes the SPDX form for an unlisted license. The text is verbatim from the PolyForm Project's repository (polyformproject/polyform-licenses, PolyForm-Shield-1.0.0.md, commit 76a278c).
- **CC BY-NC-SA 4.0** (`CC-BY-NC-SA-4.0`): methodology prose and documentation under `docs/` and under `plugins/combat-writing/method/`. The text is verbatim from the SPDX license-list-data repository (text/CC-BY-NC-SA-4.0.txt, commit 31ba1a5).
- Never both on one file.
- Header on every file that can carry a comment. JSON files get none; the `license` field in plugin.json covers that manifest. `NOTICE`, `LICENSES/`, `plugins/*/LICENSE*`, images and fonts carry none.

Header formats (the check accepts the header within the first 12 lines and requires exactly one per file):

```
JavaScript:  // SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
YAML:        # SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
Markdown:    <!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
```

A Markdown file with YAML frontmatter (skills, commands, agents) keeps the frontmatter on line 1, because the loader reads it only there, and puts the comment on the line after the closing `---`.

`tests/license_check.js` enforces all of this. Run it from the repository root: `node tests/license_check.js`.

## Directory constraints (verified 2026-10-08)

LICENSE file or `license` field in plugin.json. README in the plugin folder over 40 words outside code blocks with at least three working example prompts. Every non-image file under 256 KiB. No lockfile beside a package.json at the plugin root. No top-level bin/. No .pdf, .zip or binaries. Any package launcher pinned to an exact version or absent. The plugin may be a subfolder. Everything the plugin runs lives inside it. No implication of Anthropic endorsement. The method text ships inside the plugin, never fetched.

The manifest description follows the directory policy line "Descriptions must not include unexpected functionality or promise undelivered features" (Anthropic Software Directory Policy, support.claude.com). It promises only what parts 2 to 4 deliver.

## Test style

Plain Node, no dependencies, one file per concern named `*_check.js`, a header comment that says what the test pins and how to run it, run from the repository root, exit 0 on pass and 1 on any failure, one printed line per failure. CI runs every `tests/*_check.js` on each pull request and on main, then `claude plugin validate --strict` on the plugin folder and on the repository root.

## Rulings pending

- Part 2: how an agent file sets its model (inherit, or an alias). Israel rules at part 2.
- Part 2: the 19 steps are kept as written in the app. Only lines that name the host are reworded to "the host". Seat names stay, since every seat is named by model and company. Every departure from the app's text is listed for Israel's ruling.
- Part 5: the key route. Proposed: a masked prompt (`userConfig` with `sensitive: true`) first; an environment variable only when the prompt's value is empty; never a file.
