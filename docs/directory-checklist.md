<!-- SPDX-License-Identifier: CC-BY-NC-SA-4.0 -->
# Directory checklist for plugins/combat-writing

A pass over the Claude plugin directory's pre-submission checklist (claude.com/docs/plugins/pre-submission-checklist) and the submit page (claude.com/docs/plugins/submit), item by item, against `plugins/combat-writing/` as of 2026-10-08. The plugin folder is a subfolder of the repository; the directory reads and scans only that folder. Two kinds of check exist, and this page keeps them apart:

- **Checked here:** verified in this repository with `claude plugin validate --strict` (Claude Code CLI 2.1.294) and `tests/*_check.js`, which CI runs on every pull request.
- **Portal only:** the developer portal's **Validate** button at claude.ai/directory/manage runs the directory's own checks (name taken, look-alike names, the security scan). That button is Israel's step. Nothing in this repository can run it, and nothing has been submitted.

Results: **pass** means the item holds and names the file that satisfies it; **portal** means only the portal can confirm it, with what this repository does to prepare; **n/a** means the item does not apply because the plugin has no such component.

## Repository and folder layout

| Item | Result | Satisfied by |
|---|---|---|
| A folder that contains `.claude-plugin/plugin.json` | pass | `plugins/combat-writing/.claude-plugin/plugin.json` |
| One plugin at a time in a marketplace repository; validate and submit each plugin folder on its own | pass (to do at submission) | The marketplace lists `combat-writing` and `combat-writing-crew`; only `plugins/combat-writing` is submitted, as its own submission with plugin path `plugins/combat-writing` |
| Every file a hook, MCP server or script uses inside the plugin folder; every `plugin.json` path inside it | pass | `plugin.json` declares no component paths; every script the skill and commands run is under `plugins/combat-writing/scripts/` and is referenced as `${CLAUDE_PLUGIN_ROOT}/scripts/<file>`; the one hook runs `hooks/session-start.js` inside the plugin |
| Regular files only: no symlinks, submodules or LFS pointers | pass | `git ls-files -s` shows mode 100644 for every file under the plugin folder; no `.gitmodules`, no `.gitattributes` |
| No `.DS_Store`, `Thumbs.db`, `desktop.ini`, `__MACOSX` | pass | none in the repository |
| File and folder names valid on Windows and macOS: no colon, trailing dot or space, device names, or names differing only by case | pass | every tracked name is letters, digits, hyphens, dots and underscores; no name holds a colon, a trailing dot or space, or a Windows device name; no two names differ only by case (`git ls-files` lowercased has no duplicate). Fourteen names carry uppercase letters (README.md, LICENSE.md, NOTICE, SKILL.md and the like), which the rule allows |
| Path to the plugin made of letters, digits, dots, hyphens, underscores | pass | `plugins/combat-writing` |
| No `export-ignore`, `export-subst`, `filter` or content-rewriting attributes in any `.gitattributes` | pass | no `.gitattributes` in the repository |
| Repository under 50 MiB archived and 256 MiB unpacked, fewer than 10,000 entries; every plugin file under 5 MiB | pass | the repository's tracked files total under 1 MiB (reproduce with `git ls-files -z \| xargs -0 wc -c`; the exact total moves with every commit, so it is not pinned here); the largest file in the repository is `tests/packet_check.js` at 26,578 bytes, and the largest in the plugin folder is `scripts/render-board.js` at 17,214 bytes, as of 2026-10-09 |

## Manifest and plugin name

| Item | Result | Satisfied by |
|---|---|---|
| `name` of lowercase letters, digits and hyphens, up to 64 characters, starting and ending with a letter or digit | pass | `"name": "combat-writing"` |
| Not a reserved word or an Anthropic-reserved marketplace name; nothing that presents the plugin as official | pass | `combat-writing` is the product's own name; the READMEs say the plugin is not made, reviewed or endorsed by Anthropic |
| A name no other organization's plugin uses, including look-alikes | portal | **Name is taken** or **Name may be confused with an existing listing** can only come from the portal. The name is Learning Producers' brand, dated in the app's provenance record |
| `name`, `displayName`, `author.name` not mistakable for an existing plugin, publisher, connector or brand | portal | `displayName` "Combat Writing", `author.name` "Learning Producers Inc." |
| Not a fork using the upstream project's name | pass | the repository is not a fork |
| `displayName` and `author.name` in one writing system, no look-alike or invisible characters | pass | plain ASCII in `plugin.json` |
| Component keys spelled as the reference does and kept out of `experimental` | pass | `plugin.json` declares no component keys; `claude plugin validate --strict` passes with no unknown-field warning |
| `description`, `author` and `version` set | pass | `plugin.json`; `version` is 0.1.0 and rises with each release |

## README and license

| Item | Result | Satisfied by |
|---|---|---|
| A README of at least 40 words in the plugin folder, words in code blocks not counted | pass | `plugins/combat-writing/README.md`; `tests/license_check.js` counts the words outside code blocks and fails under 41 |
| A `LICENSE` file in the plugin folder, or `license` in `plugin.json` | pass | both: `"license": "LicenseRef-PolyForm-Shield-1.0.0"` in `plugin.json`, and `plugins/combat-writing/LICENSE.md` with the full text |

## Files in the plugin folder

| Item | Result | Satisfied by |
|---|---|---|
| Every non-image, non-font file under 256 KiB | pass | `tests/license_check.js` fails any file at or over 262,144 bytes; the largest plugin file is `scripts/render-board.js` at 17,214 bytes (2026-10-09) |
| 512 files or fewer | pass | the plugin folder holds 32 tracked files (2026-10-08) |
| Only text files, SVG, complete PNG, JPEG, GIF, WebP and fonts; no other binary | pass | every file in the plugin folder is text (Markdown, JavaScript, JSON, YAML) |
| Bundled images referenced only by Markdown image syntax, never from commands, hooks or scripts | n/a | the plugin bundles no image or font |
| MCP servers declared with `command` and `args` or `url`, not a `.mcpb` or `.dxt` bundle | n/a | the listed plugin declares no MCP server; the add-on is a separate, unlisted plugin |

## What the plugin runs and connects to

| Item | Result | Satisfied by |
|---|---|---|
| Every package a launcher runs pinned to an exact version | n/a | no `npx`, `bunx`, `pnpm dlx`, `yarn dlx`, `uvx`, `pipx run` or `uv run` anywhere in the plugin; the scripts run under the Node already on the machine with no package |
| No `.npmrc`, `bunfig.toml`, `uv.toml` or other package-source file | pass | none in the plugin folder or the repository |
| No real credentials in any file; sensitive values through `userConfig` with `sensitive: true` | pass | the plugin holds no keys and asks for none; `tests/license_check.js` and the READMEs state it |
| No credential read from the user's environment and sent to a server | pass | the plugin makes no outside call; `tests/board_check.js` pins that the page `render-board.js` writes fetches nothing |
| `.mcp.json` valid and matching the schema | n/a | no `.mcp.json` in the listed plugin |
| Remote MCP servers over `https://` or `wss://` | n/a | none |
| Local MCP servers started by running a file in the plugin with plain arguments | n/a | none |
| Hook and MCP commands with full `${CLAUDE_PLUGIN_ROOT}` paths and no other variable, substitution or inline program | pass | one hook, `hooks/hooks.json`: the SessionStart command is `node "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js"`, no other variable, substitution or shell operator; `tests/hook_check.js` pins the exact string. No MCP servers. The skill and commands name each script as `${CLAUDE_PLUGIN_ROOT}/scripts/<file>` |
| No launchers, installs, other variables, substitutions or calls to other files in scripts that hooks or MCP servers run | pass | `hooks/session-start.js` requires no module, reads no environment, file or argument, and prints one JSON line; `tests/hook_check.js` pins that. No MCP servers. The scripts the skill tells the host to run are not part of this check, as the checklist says |

## Choices a reviewer always checks

| Item | Result | Satisfied by |
|---|---|---|
| A package from a registry | n/a | none |
| A lockfile install (`package.json` beside a lockfile at the plugin root) | pass | no `package.json` in the plugin; `tests/license_check.js` fails a lockfile beside one |
| A program the validator cannot read through, in a subfolder plugin | pass | the one hook command runs `node` on a plain, commented file inside the plugin, `hooks/session-start.js`, that the validator and a reviewer can read through; no MCP or LSP command, and no `` !`…` `` line in any skill or command. The scripts are plain Node files the skill tells the host to run, which the checklist excludes from this check |

## Hooks, skills, commands and agents

| Item | Result | Satisfied by |
|---|---|---|
| `hooks/hooks.json` valid, with only documented events and types | pass | one event, `SessionStart` (matcher `startup|resume`), one `command` hook; `claude plugin validate --strict plugins/combat-writing` reports "Validating hooks" and passes; `tests/hook_check.js` pins the shape |
| `hooks/hooks.json` left out of the `hooks` field | pass | `plugin.json` has no `hooks` field; the file loads from its default path; `tests/marketplace_check.js` fails if the field appears |
| Valid YAML front matter in each skill, command and agent file, with `description` as one text value | pass | `skills/combat-writing/SKILL.md`, `commands/help.md`, `commands/sparring.md`, `commands/battle.md`, `agents/seat.md`. `claude plugin validate --strict` passes on `plugins/combat-writing` (the manifest), on the repository root (the marketplace), and on the component folders `plugins/combat-writing/commands`, `plugins/combat-writing/agents` and `plugins/combat-writing/skills`; `skills/combat-writing` on its own is not a validator target, the validator reads the `skills/` folder. `tests/license_check.js` requires front matter on line 1 of every component file |
| Component folders and files named exactly as Claude Code expects | pass | `skills/<name>/SKILL.md`, `commands/*.md`, `agents/*.md` |

## The security scan (after submission)

| Item | Result | Satisfied by |
|---|---|---|
| Describe in the README everything the plugin runs, sends or fetches | pass | `plugins/combat-writing/README.md`, "What it runs, sends and fetches"; `tests/readme_check.js` pins the disclosures |
| Readable source, not compiled, packed or minified | pass | every script under `scripts/` (`lib.js`, `new-run.js`, `add-draft.js`, `packet.js`, `check-answer.js`, `check-flip.js`, `render-record.js`, `render-board.js`) is plain, commented JavaScript; `render-board.js` writes the page's own CSS and a few lines of inline script, all readable |
| No undisclosed destination, hidden code or change to Claude's permission settings | pass, scan is portal | the plugin makes no outside call, runs one disclosed hook (the session-start line, named in both READMEs), and writes only inside `combat-writing/` in the person's project; the scan itself runs only after submission |

## Submit page: what the submitter does

| Item | Result | Who |
|---|---|---|
| A paid claude.ai plan and a role that can submit; the GitHub account connected on claude.ai with push access to the repository | portal | Israel |
| Repository public before the listing goes live | pass | the repository is public |
| **Source** step: repository `LearningProducers/CombatWriting-Plugin`, plugin path `plugins/combat-writing`, branch `main` | portal | Israel |
| **Validate**, fix any **Blocks** finding, re-validate | portal | Israel; this page is the preparation |
| **Listing details** read from `plugin.json` and the README | pass | both files are the listing; the description promises only what ships (help, sparring, battle, the record, the board) |
| **Data handling** answers: personal data read or stored, data sent to other services, retention, under-18 audience | portal, prepared | the plugin reads only the files the person gives it, stores the run folder in the person's own project, sends nothing to any service of its own, keeps nothing elsewhere, and is not aimed at people under 18 |
| **Compliance** step: contact email, four acknowledgements | portal | Israel |
| **Load the plugin on each surface** your users will use (Claude Code, Cowork, chat) and test its output there, as the submit page's "Test the plugin's behavior before you submit" asks | not done here | Israel. The build sessions ran the scripts and the seats in a cloud Claude Code session only; the plugin was not installed and exercised on each surface |
| One submission per repository and folder; at most 10 submissions per organization per 24 hours | portal | Israel |
| Raise `version` with every release | pass (to keep) | `plugin.json` |

## With the add-on present (part 5)

The add-on, `plugins/combat-writing-crew/`, is a separate plugin that is never submitted. Its presence changes nothing in the listed plugin's folder, and `tests/marketplace_check.js` pins the separation on every run:

| Item | Result | Satisfied by |
|---|---|---|
| The listed plugin holds no keys | pass | `plugins/combat-writing/.claude-plugin/plugin.json` declares no `userConfig`, no `mcpServers` and no `hooks` field; no `.mcp.json`; the check fails if any appears. Its one hook file prints a fixed line and reads nothing (`tests/hook_check.js`) |
| The listed plugin makes no outside call | pass | no script under `plugins/combat-writing/scripts/` requires a network module, calls `fetch`, or holds a URL outside a comment; the check fails if one does. Outside calls happen only in `plugins/combat-writing-crew/server.js`, a different plugin folder the directory never scans |
| The listed plugin's description stays scoped (policy 2.B) | pass | its `plugin.json` description names sparring, battle, the final reads, the record and the board, all of which ship inside its folder; it does not promise other companies' models. The add-on's own manifest and README say the crew tools exist there |
| The add-on's keys | n/a for the directory | masked prompts with `sensitive: true`, each mapped to the server's environment as `${user_config.<option>}`; the environment-variable fallback the rulings allow would be a reviewer hold if the add-on were submitted, which it is not |

## Items that need a ruling

- **The description's scope.** `plugin.json` describes sparring, battle, the flip check, the record and the board. The add-on (part 5) ships as its own plugin, and the listed plugin's description describes only the listed plugin; `tests/marketplace_check.js` keeps the two apart.
- **The data handling answers** above are drafted from the code; Israel confirms them in the portal.

## Evals

The three cases under `plugins/combat-writing/evals/` load and are graded by `claude plugin eval` (checked on 2026-10-08), but the runs need a shell sandbox that the cloud build session does not have; `evals/README.md` says what to install and how to run them. Running them is Israel's step on a machine with the sandbox.

## Fixed in this pass

- The `description` in `plugin.json` now names the record and the board, which ship, and nothing that does not.
- `evals/` carries a `.gitignore` for its `results/` folder, so no run output is ever committed into the plugin folder.
