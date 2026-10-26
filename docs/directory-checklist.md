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
| Every file a hook, MCP server or script uses inside the plugin folder; every `plugin.json` path inside it | pass | `plugin.json` declares no component paths; every script the skill and commands run is under `plugins/combat-writing/scripts/` and is referenced as `${CLAUDE_PLUGIN_ROOT}/scripts/<file>`; the three hooks run `hooks/session-start.js`, `hooks/seat-scope.js` and `hooks/host-output.js` inside the plugin |
| Regular files only: no symlinks, submodules or LFS pointers | pass | `git ls-files -s` shows mode 100644 for every file under the plugin folder; no `.gitmodules`, no `.gitattributes` |
| No `.DS_Store`, `Thumbs.db`, `desktop.ini`, `__MACOSX` | pass | none in the repository |
| File and folder names valid on Windows and macOS: no colon, trailing dot or space, device names, or names differing only by case | pass | every tracked name is letters, digits, hyphens, dots and underscores; no name holds a colon, a trailing dot or space, or a Windows device name; no two names differ only by case (`git ls-files` lowercased has no duplicate). Fourteen names carry uppercase letters (README.md, LICENSE.md, NOTICE, SKILL.md and the like), which the rule allows |
| Path to the plugin made of letters, digits, dots, hyphens, underscores | pass | `plugins/combat-writing` |
| No `export-ignore`, `export-subst`, `filter` or content-rewriting attributes in any `.gitattributes` | pass | no `.gitattributes` in the repository |
| Repository under 50 MiB archived and 256 MiB unpacked, fewer than 10,000 entries; every plugin file under 5 MiB | pass | the repository's tracked files total under 1 MiB (reproduce with `git ls-files -z \| xargs -0 wc -c`; the exact total moves with every commit, so it is not pinned here); the largest file in the repository is `tests/packet_check.js` at 26,578 bytes, and the largest in the plugin folder is `scripts/render-board.js` at 17,214 bytes, as of 2026-10-09 |

## Manifest and plugin name

| Item | Result | Satisfied by |
|---|---|---|
| `name` of lowercase letters, digits and hyphens, up to 64 characters, starting and ending with a letter or digit | pass | `"name": "cw"` (renamed from `combat-writing` on 2026-10-14; the marketplace's `renames` map moves an install's enabled entry from the old name, and the files under the new name take one install, as the plugin README says; the folder stays `plugins/combat-writing/`) |
| Not a reserved word or an Anthropic-reserved marketplace name; nothing that presents the plugin as official | pass | `cw` is Combat Writing's own initials and no reserved word; the `displayName` is "Combat Writing"; the READMEs say the plugin is not made, reviewed or endorsed by Anthropic |
| A name no other organization's plugin uses, including look-alikes | portal | **Name is taken** or **Name may be confused with an existing listing** can only come from the portal. `cw` is short; if the portal refuses it, the fallback is the brand's own name, dated in the app's provenance record |
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
| Every non-image, non-font file under 256 KiB | pass | `tests/license_check.js` fails any file at or over 262,144 bytes; the largest plugin file is `scripts/lib.js` at 36,727 bytes (2026-10-14) |
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
| No credential read from the user's environment and sent to a server | pass | the plugin's scripts make no outside call and read no credential; the one host-side fetch, the link given to `/cw:champion shipped`, carries nothing from the environment (`tests/champion_check.js` pins that `champion.js` fetches nothing); `tests/board_check.js` pins that the page `render-board.js` writes fetches nothing, the canon controls included |
| `.mcp.json` valid and matching the schema | n/a | no `.mcp.json` in the listed plugin |
| Remote MCP servers over `https://` or `wss://` | n/a | none |
| Local MCP servers started by running a file in the plugin with plain arguments | n/a | none |
| Hook and MCP commands with full `${CLAUDE_PLUGIN_ROOT}` paths and no other variable, substitution or inline program | pass | three hooks in `hooks/hooks.json`: the SessionStart command is `node "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js"`, the PreToolUse command on every tool (Read and Write for a seat) is `node "${CLAUDE_PLUGIN_ROOT}/hooks/seat-scope.js"`, and the PreToolUse command on the AskUserQuestion tool is `node "${CLAUDE_PLUGIN_ROOT}/hooks/host-output.js"`, no other variable, substitution or shell operator; `tests/hook_check.js`, `tests/seat_scope_check.js` and `tests/host_output_check.js` pin the exact strings. No MCP servers. The skill and commands name each script as `${CLAUDE_PLUGIN_ROOT}/scripts/<file>` |
| No launchers, installs, other variables, substitutions or calls to other files in scripts that hooks or MCP servers run | pass | `hooks/session-start.js` requires no module, reads no environment, file or argument, and prints one JSON line; `hooks/seat-scope.js` requires only `fs` and `path`, reads the hook input and the seat's transcript record, writes nothing, spawns nothing, fetches nothing and reads no environment; `hooks/host-output.js` requires only `fs` and `path`, reads the hook input and the session's transcript, writes nothing, spawns nothing, fetches nothing and reads no environment; `tests/hook_check.js`, `tests/seat_scope_check.js` and `tests/host_output_check.js` pin that. No MCP servers. The scripts the skill tells the host to run are not part of this check, as the checklist says |

## Choices a reviewer always checks

| Item | Result | Satisfied by |
|---|---|---|
| A package from a registry | n/a | none |
| A lockfile install (`package.json` beside a lockfile at the plugin root) | pass | no `package.json` in the plugin; `tests/license_check.js` fails a lockfile beside one |
| A program the validator cannot read through, in a subfolder plugin | pass | all three hook commands run `node` on a plain, commented file inside the plugin, `hooks/session-start.js`, `hooks/seat-scope.js` and `hooks/host-output.js`, that the validator and a reviewer can read through; no MCP or LSP command, and no `` !`…` `` line in any skill or command. The scripts are plain Node files the skill tells the host to run, which the checklist excludes from this check |

## Hooks, skills, commands and agents

| Item | Result | Satisfied by |
|---|---|---|
| `hooks/hooks.json` valid, with only documented events and types | pass | two events, `SessionStart` (matcher `startup|resume`, one entry) and `PreToolUse` (two entries: no matcher, every tool, the seat scope; matcher `AskUserQuestion`, the host's output), one `command` hook each; `claude plugin validate --strict plugins/combat-writing` reports "Validating hooks" and passes; `tests/hook_check.js`, `tests/seat_scope_check.js` and `tests/host_output_check.js` pin the shape |
| `hooks/hooks.json` left out of the `hooks` field | pass | `plugin.json` has no `hooks` field; the file loads from its default path; `tests/marketplace_check.js` fails if the field appears |
| Valid YAML front matter in each skill, command and agent file, with `description` as one text value | pass | `skills/combat-writing/SKILL.md`, `skills/help/SKILL.md`, `skills/strategy/SKILL.md`, `skills/sparring/SKILL.md`, `skills/battle/SKILL.md`, `agents/seat.md`. `claude plugin validate --strict` passes on `plugins/combat-writing` (the manifest), on the repository root (the marketplace), and on the component folders `plugins/combat-writing/commands`, `plugins/combat-writing/agents` and `plugins/combat-writing/skills`; `skills/combat-writing` on its own is not a validator target, the validator reads the `skills/` folder. `tests/license_check.js` requires front matter on line 1 of every component file |
| Component folders and files named exactly as Claude Code expects | pass | `skills/<name>/SKILL.md` (the four commands moved from `commands/*.md` to skills on 2026-10-14, the format the docs name for new plugins; they are still typed as `/cw:<name>`), `agents/*.md` |

## The security scan (after submission)

| Item | Result | Satisfied by |
|---|---|---|
| Describe in the README everything the plugin runs, sends or fetches | pass | `plugins/combat-writing/README.md`, "What it runs, sends and fetches"; `tests/readme_check.js` pins the disclosures |
| Readable source, not compiled, packed or minified | pass | every script under `scripts/` (`lib.js`, `new-run.js`, `add-draft.js`, `crew-state.js`, `announce.js`, `packet.js`, `check-answer.js`, `check-flip.js`, `champion.js`, `render-record.js`, `render-board.js`, `open-board.js`) is plain, commented JavaScript; `render-board.js` writes the page's own CSS and a few lines of inline script, all readable |
| No undisclosed destination, hidden code or change to Claude's permission settings | pass, scan is portal | the plugin's scripts make no outside call; the one host-side fetch (the link given to `/cw:champion shipped`, opened once by the host by its own route, a shell fetch or its web tool) is disclosed in the README and the description; the plugin runs three disclosed hooks (the session-start line, the seat-scope check and the host-output check, named in both READMEs; the second and third change no permission setting: the second answers one tool call at a time for the plugin's own seat agent and leaves every other caller untouched, the third answers the host's own Next picker call alone, from the session's transcript, and leaves every other tool untouched), and writes only inside `combat-writing/` in the person's project; the scan itself runs only after submission |

## Submit page: what the submitter does

| Item | Result | Who |
|---|---|---|
| A paid claude.ai plan and a role that can submit; the GitHub account connected on claude.ai with push access to the repository | portal | Israel |
| Repository public before the listing goes live | pass | the repository is public |
| **Source** step: repository `LearningProducers/CombatWriting-Plugin`, plugin path `plugins/combat-writing`, branch `main` | portal | Israel |
| **Validate**, fix any **Blocks** finding, re-validate | portal | Israel; this page is the preparation |
| **Listing details** read from `plugin.json` and the README | pass | both files are the listing; the description promises only what ships (help, strategy, sparring, battle, the record, the board) |
| **Data handling** answers: personal data read or stored, data sent to other services, retention, under-18 audience | portal, prepared | the plugin reads only the files the person gives it, stores the run folder in the person's own project, sends nothing to any service of its own, keeps nothing elsewhere, and is not aimed at people under 18 |
| **Compliance** step: contact email, four acknowledgements | portal | Israel |
| **Load the plugin on each surface** your users will use (Claude Code, Cowork, chat) and test its output there, as the submit page's "Test the plugin's behavior before you submit" asks | not done here | Israel. The build sessions ran the scripts and the seats in a cloud Claude Code session only; the plugin was not installed and exercised on each surface |
| One submission per repository and folder; at most 10 submissions per organization per 24 hours | portal | Israel |
| Raise `version` with every release | pass (to keep) | `plugin.json` |

## With the add-on present (part 5)

The add-on, `plugins/combat-writing-crew/`, is a separate plugin that is never submitted. Its presence changes nothing in the listed plugin's folder, and `tests/marketplace_check.js` pins the separation on every run:

| Item | Result | Satisfied by |
|---|---|---|
| The listed plugin holds no keys | pass | `plugins/combat-writing/.claude-plugin/plugin.json` declares no `userConfig`, no `mcpServers` and no `hooks` field; no `.mcp.json`; the check fails if any appears. Its session-start hook prints a fixed line and reads nothing (`tests/hook_check.js`); its two PreToolUse hooks read a transcript and the hook input, never a key or an environment variable (`tests/seat_scope_check.js`, `tests/host_output_check.js`) |
| The listed plugin makes no outside call | pass | no script under `plugins/combat-writing/scripts/` requires a network module, calls `fetch`, or holds a URL outside a comment; the check fails if one does (`champion.js` builds its address pattern from `lib.URL_RE` and never fetches; the page it measures is one the host saved). The host opens the one link given to `/cw:champion shipped`, once, by its own route (a shell fetch or its web tool, never a script), and the README and the description say so. Outside calls happen only in `plugins/combat-writing-crew/server.js`, a different plugin folder the directory never scans |
| The listed plugin's description stays scoped (policy 2.B) | pass | its `plugin.json` description names strategy, sparring, battle, champion, the final reads, the record and the board, all of which ship inside its folder, and discloses the one link the host opens for `shipped`; it does not promise other companies' models. The add-on's own manifest and README say the crew tools exist there |
| The add-on's keys | n/a for the directory | masked prompts with `sensitive: true`, each mapped to the server's environment as `${user_config.<option>}`; the environment-variable fallback the rulings allow would be a reviewer hold if the add-on were submitted, which it is not |

## Items that need a ruling

- **The description's scope.** `plugin.json` describes sparring, battle, the flip check, the record and the board. The add-on (part 5) ships as its own plugin, and the listed plugin's description describes only the listed plugin; `tests/marketplace_check.js` keeps the two apart.
- **The data handling answers** above are drafted from the code; Israel confirms them in the portal.

## Evals

The three cases under `plugins/combat-writing/evals/` load and are graded by `claude plugin eval` (checked on 2026-10-08), but the runs need a shell sandbox that the cloud build session does not have; `evals/README.md` says what to install and how to run them. Running them is Israel's step on a machine with the sandbox.

## The seat's reach, live (the founder's step, like the portal's Validate button)

| Item | Status | Where |
|---|---|---|
| One real seat on a scratch run, with the repository's `hooks/seat-scope.js` loaded through a throwaway plugin: a harmless file outside the run folder refused, Grep and Bash refused or absent, the packet read, the answer written with nothing from the outside file, no provider called | pass on Claude Code 2.1.301, 2026-10-16 | `node tests/seat_scope_live.js` from the repository root (`CLAUDE_BIN=<path>` picks the binary); not part of CI, it needs a running Claude Code and one short model call; rerun after every Claude Code update, then put the version it passed on here and in the `PROVED_ON` constant at the top of the hook |
| The host's output through the repository's `hooks/host-output.js`: after a real round, the short form, the opener's line and the seat key shown in the terminal before the Next picker; a picker opened without them refused with the lines named | harness pass 2026-10-26 (`tests/host_output_check.js`, the real hook on a fake transcript in the shape measured on Claude Code 2.1.310); the live pass is the first round in a real project after the merge | one sparring or battle round in a project with the plugin loaded; the terminal shows the Crew line, the scoreboard, `Board: <path>`, the Seat key line and, in a sandboxed shell, the opener's failed line with its `open` command, before the picker; rerun after every Claude Code update, then put the version it passed on here and in the `PROVED_ON` constant at the top of the hook |

## Fixed in this pass

- The `description` in `plugin.json` now names the record and the board, which ship, and nothing that does not.
- `evals/` carries a `.gitignore` for its `results/` folder, so no run output is ever committed into the plugin folder.
