<!-- SPDX-License-Identifier: CC-BY-NC-SA-4.0 -->
# Directory checklist for plugins/combat-writing

A pass over the Claude plugin directory's pre-submission checklist (claude.com/docs/plugins/pre-submission-checklist) and the submit page (claude.com/docs/plugins/submit), item by item, against `plugins/combat-writing/`. The plugin folder is a subfolder of the repository; the directory reads and scans only that folder.

**Re-passed 2026-11-04.** This is the page's one date: it moves only when the whole pass is re-run against the repository, row by row, never when one row changes. No row carries a number a test measures (a file count, a file size, a version, a date of measurement): each row names the test or the file that holds the item, and the number lives there. The plugin's version is in `plugins/combat-writing/.claude-plugin/plugin.json`; the record of every part is `PLAN.md` from Part 91 on, with Parts 1 to 90 frozen in `PLAN_ARCHIVE.md`.

Two kinds of check exist, and this page keeps them apart:

- **Checked here:** verified in this repository with `claude plugin validate --strict` and `tests/*_check.js`, which CI runs on every pull request, and by `node tests/run_all.js`, which runs the same set in one command.
- **Portal only:** the developer portal's **Validate** button at claude.ai/directory/manage runs the directory's own checks (name taken, look-alike names, the security scan). That button is the founder's step. Nothing in this repository can run it, and nothing has been submitted to the directory.

Results: **pass** means the item holds and names the test or file that satisfies it; **portal** means only the portal can confirm it, with what this repository does to prepare; **n/a** means the item does not apply because the plugin has no such component.

## Repository and folder layout

| Item | Result | Satisfied by |
|---|---|---|
| A folder that contains `.claude-plugin/plugin.json` | pass | `plugins/combat-writing/.claude-plugin/plugin.json` |
| One plugin at a time in a marketplace repository; validate and submit each plugin folder on its own | pass (to do at submission) | `.claude-plugin/marketplace.json` lists `cw` and `combat-writing-crew`; only `plugins/combat-writing` is submitted, as its own submission with plugin path `plugins/combat-writing`; `tests/marketplace_check.js` pins the two apart |
| Every file a hook, MCP server or script uses inside the plugin folder; every `plugin.json` path inside it | pass | `plugin.json` declares no component paths; every script the skills run is under `plugins/combat-writing/scripts/` and is named as `${CLAUDE_PLUGIN_ROOT}/scripts/<file>`; the three hooks run files under `plugins/combat-writing/hooks/`; `tests/hook_check.js` pins the hook commands and `tests/map_check.js` pins the script set against `docs/plugin-map.md` |
| Regular files only: no symlinks, submodules or LFS pointers | pass | `git ls-files -s plugins/combat-writing` shows one mode, regular file, for every entry; no `.gitmodules`, no `.gitattributes` in the repository |
| No `.DS_Store`, `Thumbs.db`, `desktop.ini`, `__MACOSX` | pass | none tracked; `git ls-files` is the measure |
| File and folder names valid on Windows and macOS: no colon, trailing dot or space, device names, or names differing only by case | pass | every tracked name is letters, digits, hyphens, dots and underscores; `git ls-files` lowercased has no duplicate; the names with uppercase letters (README.md, LICENSE.md, NOTICE, SKILL.md, PLAN.md and the like) are what the rule allows |
| Path to the plugin made of letters, digits, dots, hyphens, underscores | pass | `plugins/combat-writing` |
| No `export-ignore`, `export-subst`, `filter` or content-rewriting attributes in any `.gitattributes` | pass | no `.gitattributes` in the repository |
| Repository under 50 MiB archived and 256 MiB unpacked, fewer than 10,000 entries; every plugin file under 5 MiB | pass | `tests/license_check.js` fails any non-image, non-font file at or over 256 KiB, a bound well under the 5 MiB; the repository's size is measured by `git count-objects -vH` and its entries by `git ls-files`, and neither number is written here |

## Manifest and plugin name

| Item | Result | Satisfied by |
|---|---|---|
| `name` of lowercase letters, digits and hyphens, up to 64 characters, starting and ending with a letter or digit | pass | `"name": "cw"` in `plugin.json`; the plugin was `combat-writing` before, the marketplace's `renames` map moves an install's enabled entry from the old name, and the folder stays `plugins/combat-writing/`; `tests/marketplace_check.js` pins the rename entry |
| Not a reserved word or an Anthropic-reserved marketplace name; nothing that presents the plugin as official | pass | `cw` is Combat Writing's own initials and no reserved word; `displayName` is "Combat Writing"; both READMEs say the plugin is not made, reviewed or endorsed by Anthropic, pinned by `tests/readme_check.js` |
| A name no other organization's plugin uses, including look-alikes | portal | **Name is taken** or **Name may be confused with an existing listing** can only come from the portal. `cw` is short; if the portal refuses it, the fallback is the brand's own name |
| `name`, `displayName`, `author.name` not mistakable for an existing plugin, publisher, connector or brand | portal | `displayName` "Combat Writing", `author.name` "Learning Producers Inc.", both in `plugin.json` |
| Not a fork using the upstream project's name | pass | the repository is not a fork |
| `displayName` and `author.name` in one writing system, no look-alike or invisible characters | pass | plain ASCII in `plugin.json` |
| Component keys spelled as the reference does and kept out of `experimental` | pass | `plugin.json` declares no component keys; `claude plugin validate --strict plugins/combat-writing` passes with no unknown-field warning |
| `description`, `author` and `version` set | pass | all three in `plugin.json`; the version is the one written there and rises with each release under the bump rule in `CLAUDE.md`, which CI's version-bump gate enforces on every pull request that touches the folder |

## README and license

| Item | Result | Satisfied by |
|---|---|---|
| A README of at least 40 words in the plugin folder, words in code blocks not counted | pass | `plugins/combat-writing/README.md`; `tests/license_check.js` counts the words outside code blocks and fails under 41 |
| A `LICENSE` file in the plugin folder, or `license` in `plugin.json` | pass | both: the `license` field in `plugin.json`, and `plugins/combat-writing/LICENSE.md` with the full text, pinned byte-identical to the root text by `tests/license_check.js` |

## Files in the plugin folder

| Item | Result | Satisfied by |
|---|---|---|
| Every non-image, non-font file under 256 KiB | pass | `tests/license_check.js` fails any file at or over 262,144 bytes; the sizes live in the tree, not here |
| 512 files or fewer | pass | `git ls-files plugins/combat-writing` lists the folder, a few dozen files; the count is that command's, not this page's |
| Only text files, SVG, complete PNG, JPEG, GIF, WebP and fonts; no other binary | pass | every tracked file in the plugin folder is text: Markdown, JavaScript, JSON, and the one `.gitignore` under `evals/`; `git ls-files plugins/combat-writing` is the measure |
| Bundled images referenced only by Markdown image syntax, never from commands, hooks or scripts | n/a | the plugin bundles no image or font |
| MCP servers declared with `command` and `args` or `url`, not a `.mcpb` or `.dxt` bundle | n/a | the listed plugin declares no MCP server; the add-on is a separate, unlisted plugin |

## What the plugin runs and connects to

| Item | Result | Satisfied by |
|---|---|---|
| Every package a launcher runs pinned to an exact version | n/a | no `npx`, `bunx`, `pnpm dlx`, `yarn dlx`, `uvx`, `pipx run` or `uv run` anywhere in the plugin; the scripts run under the Node already on the machine with no package |
| No `.npmrc`, `bunfig.toml`, `uv.toml` or other package-source file | pass | none in the plugin folder; `tests/license_check.js` fails a lockfile beside a `package.json`, and the plugin has neither |
| No real credentials in any file; sensitive values through `userConfig` with `sensitive: true` | pass | the plugin holds no keys and asks for none: `plugin.json` declares no `userConfig`, pinned by `tests/marketplace_check.js`; the READMEs say so, pinned by `tests/readme_check.js` |
| No credential read from the user's environment and sent to a server | pass | the plugin's scripts make no outside call and read no credential; the one host-side fetch, the link given to `/cw:champion shipped`, carries nothing from the environment; `tests/champion_check.js` pins that `champion.js` fetches nothing and `tests/board_check.js` that the page `render-board.js` writes fetches nothing, the canon controls included |
| `.mcp.json` valid and matching the schema | n/a | no `.mcp.json` in the listed plugin |
| Remote MCP servers over `https://` or `wss://` | n/a | none |
| Local MCP servers started by running a file in the plugin with plain arguments | n/a | none |
| Hook and MCP commands with full `${CLAUDE_PLUGIN_ROOT}` paths and no other variable, substitution or inline program | pass | three hooks in `hooks/hooks.json`: SessionStart runs `hooks/session-start.js` with `${CLAUDE_PLUGIN_DATA}`, the plugin's own data folder, as its one argument; PreToolUse on every tool runs `hooks/seat-scope.js`; PostToolUse on the Bash tool runs `hooks/show-result.js`; each under `node "${CLAUDE_PLUGIN_ROOT}/hooks/<file>"`, no other variable, substitution or shell operator. `tests/hook_check.js`, `tests/seat_scope_check.js` and `tests/show_result_check.js` pin the exact strings. No MCP servers. The skills name each script as `${CLAUDE_PLUGIN_ROOT}/scripts/<file>` |
| No launchers, installs, other variables, substitutions or calls to other files in scripts that hooks or MCP servers run | pass | `hooks/session-start.js` requires `fs`, `path`, `child_process` and the plugin's own `scripts/lib.js`; on the first start alone it spawns `claude plugin list` and `say -v ?`, reads the plugin cache when the list cannot run, writes one sentinel file in the data folder, and never installs, downloads or fetches; every later start prints one JSON line and reads, writes and calls nothing; it reads the data folder from its argument or `CLAUDE_PLUGIN_DATA`, `HOME` for the cache fallback and `CW_SESSION_PROBE` for the tests' fakes. `hooks/seat-scope.js` requires `fs` and `path` only, reads the hook input, the seat's transcript record and, for the call that starts a seat, the run's `seats.json`, writes nothing, spawns nothing, fetches nothing and reads no environment. `hooks/show-result.js` requires `fs`, `path` and `child_process`, reads the hook input and, after a seat's answer is checked, the host's own transcript files for that session (to find a seat's transcript the hook opens up to 200 of the session's agent transcripts (every subagent's of that session, newest first, up to 5,000 asked their time before the list is cut), reads the first 64 KiB of each for the task's first lines, reads the match's replies for the model id field alone (from the end of the file, the whole of it under 8 MiB, so the id named is the last reply's), reads the small file beside it for the model passed at start, and reads the tail of the session's own transcript, its last 2 MiB, for its newest reply's model id; none of that text reaches any output; the line it writes holds ids and places; each of those reads goes through one bounded reader that opens without blocking and reads a regular file alone, with the caps named at the top of the file), spawns only the system opener on the run's board when the shell's opener failed and the plugin's own `speak.js` and `render-board.js` when the shell silenced the speech engine, writes only log lines in the run (a board it opened, the model a seat answered on), fetches nothing and reads one environment variable, `CW_OPENER`, the tests' fake opener. `tests/hook_check.js`, `tests/session_start_check.js`, `tests/seat_scope_check.js` and `tests/show_result_check.js` pin that. No MCP servers. The scripts the skills tell the host to run are not part of this check, as the checklist says |

## Choices a reviewer always checks

| Item | Result | Satisfied by |
|---|---|---|
| A package from a registry | n/a | none |
| A lockfile install (`package.json` beside a lockfile at the plugin root) | pass | no `package.json` in the plugin; `tests/license_check.js` fails a lockfile beside one |
| A program the validator cannot read through, in a subfolder plugin | pass | all three hook commands run `node` on a plain, commented file inside the plugin that the validator and a reviewer can read through; no MCP or LSP command, and no `` !`…` `` line in any skill. The scripts are plain Node files the skills tell the host to run, which the checklist excludes from this check |

## Hooks, skills, commands and agents

| Item | Result | Satisfied by |
|---|---|---|
| `hooks/hooks.json` valid, with only documented events and types | pass | three events, `SessionStart` (matcher `startup\|resume`), `PreToolUse` (no matcher: every tool, the seat scope) and `PostToolUse` (matcher `Bash`, the result shown), one entry with one `command` hook each; `claude plugin validate --strict plugins/combat-writing` passes; `tests/hook_check.js`, `tests/seat_scope_check.js` and `tests/show_result_check.js` pin the shape |
| `hooks/hooks.json` left out of the `hooks` field | pass | `plugin.json` has no `hooks` field; the file loads from its default path; `tests/marketplace_check.js` fails if the field appears |
| Valid YAML front matter in each skill, command and agent file, with `description` as one text value | pass | every `skills/<name>/SKILL.md` and `agents/seat.md`, the set `docs/plugin-map.md` lists and `tests/map_check.js` pins to the folder; `claude plugin validate --strict` passes on `plugins/combat-writing`, on `plugins/combat-writing-crew` and on the repository root (the marketplace), re-run for this pass; `tests/license_check.js` requires front matter on line 1 of every component file |
| Component folders and files named exactly as Claude Code expects | pass | `skills/<name>/SKILL.md`, the format the docs name for new plugins (the commands are skills, typed as `/cw:<name>`), and `agents/*.md` |

## The security scan (after submission)

| Item | Result | Satisfied by |
|---|---|---|
| Describe in the README everything the plugin runs, sends or fetches | pass | `plugins/combat-writing/README.md`, "What it runs, sends and fetches"; `tests/readme_check.js` pins the disclosures |
| Readable source, not compiled, packed or minified | pass | every script under `scripts/`, the set `docs/plugin-map.md` lists and `tests/map_check.js` pins, is plain, commented JavaScript; `render-board.js` writes the page's own CSS and a few lines of inline script, all readable |
| No undisclosed destination, hidden code or change to Claude's permission settings | pass, scan is portal | the plugin's scripts make no outside call; the one host-side fetch (the link given to `/cw:champion shipped`, opened once by the host by its own route, a shell fetch or its web tool) is disclosed in the README and the description; the plugin runs three disclosed hooks (the session-start hook, which prints nothing to the person and hands the host one line of context with, on the first session alone, what one install still lacks, measured and never installed; the seat-scope check, which answers one tool call at a time for the plugin's own seat agent and for the one call that starts it, held to the seat's record, and leaves every other call untouched; and the show-result hook, which acts after the plugin's own scripts have run, shows their output to the person, opens the board or renders the voices outside the sandbox when the shell could not, and reads the model id field and the task's first lines of the host's own transcript files for that session to log which model wrote a seat's replies), none of which changes a permission setting, and writes only inside `combat-writing/` in the person's project and, once, the `first-session` sentinel in the plugin's own data folder; the scan itself runs only after submission |

## Submit page: what the submitter does

| Item | Result | Who |
|---|---|---|
| A paid claude.ai plan and a role that can submit; the GitHub account connected on claude.ai with push access to the repository | portal | the founder |
| Repository public before the listing goes live | pass | the repository is public |
| **Source** step: repository `LearningProducers/CombatWriting-Plugin`, plugin path `plugins/combat-writing`, branch `main` | portal | the founder |
| **Validate**, fix any **Blocks** finding, re-validate | portal | the founder; this page is the preparation |
| **Listing details** read from `plugin.json` and the README | pass | both files are the listing; the description names what ships, the seven commands, the record and the board, and the one link the host opens; `tests/second_copy_check.js` pins the README's help card equal to the help skill's |
| **Data handling** answers: personal data read or stored, data sent to other services, retention, under-18 audience | portal, prepared | the plugin reads only the files the person gives it, stores the run folder in the person's own project, sends nothing to any service of its own, keeps nothing elsewhere, and is not aimed at people under 18 |
| **Compliance** step: contact email, four acknowledgements | portal | the founder |
| **Load the plugin on each surface** your users will use (Claude Code, Cowork, chat) and test its output there, as the submit page's "Test the plugin's behavior before you submit" asks | not done here | the founder. The build sessions ran the scripts and the seats in a cloud Claude Code session only; the plugin was not installed and exercised on each surface from a build session |
| One submission per repository and folder; at most 10 submissions per organization per 24 hours | portal | the founder |
| Raise `version` with every release | pass (to keep) | `plugin.json`; the bump rule in `CLAUDE.md` and CI's version-bump gate |

## With the add-on present

The add-on, `plugins/combat-writing-crew/`, is a separate plugin that is never submitted. Its presence changes nothing in the listed plugin's folder, and `tests/marketplace_check.js` pins the separation on every run:

| Item | Result | Satisfied by |
|---|---|---|
| The listed plugin holds no keys | pass | `plugins/combat-writing/.claude-plugin/plugin.json` declares no `userConfig`, no `mcpServers` and no `hooks` field; no `.mcp.json`; `tests/marketplace_check.js` fails if any appears. Its session-start hook reads no key (`tests/hook_check.js`, `tests/session_start_check.js`); its seat-scope hook reads a transcript, the hook input and a run's `seats.json`, never a key (`tests/seat_scope_check.js`); its show-result hook reads the hook input and one test-only variable, `CW_OPENER`, never a key (`tests/show_result_check.js`) |
| The listed plugin makes no outside call | pass | no script under `plugins/combat-writing/scripts/` requires a network module, calls `fetch`, or holds a URL outside a comment; `tests/marketplace_check.js` fails if one does (`champion.js` builds its address pattern from `lib.URL_RE` and never fetches; the page it measures is one the host saved). The host opens the one link given to `/cw:champion shipped`, once, by its own route, never a script, and the README and the description say so. Outside calls happen only in `plugins/combat-writing-crew/server.js`, a different plugin folder the directory never scans |
| The listed plugin's description stays scoped (policy 2.B) | pass | its `plugin.json` description names the seven commands, the final reads, the record and the board, all of which ship inside its folder, and discloses the one link the host opens for `shipped`; it does not promise other companies' models. The add-on's own manifest and README say the crew tools exist there |
| The add-on's keys | n/a for the directory | masked prompts with `sensitive: true`, an environment variable when the prompt is empty, then the owner-only key file the person writes by hand; the add-on is not submitted |

## Items that need a ruling

- **The data handling answers** above are drafted from the code; the founder confirms them in the portal.

## Evals

The cases under `plugins/combat-writing/evals/`, listed in `evals/README.md` and pinned to the folder by `tests/map_check.js`, load and are graded by `claude plugin eval`, but the runs need a shell sandbox that the cloud build session does not have; `evals/README.md` says what to install and how to run them. Running them is the founder's step on a machine with the sandbox.

## The live proofs (the founder's step, like the portal's Validate button)

| Item | Status | Where |
|---|---|---|
| One real seat on a scratch run, with the repository's `hooks/seat-scope.js` loaded through a throwaway plugin: a harmless file outside the run folder refused, Grep and Bash refused or absent, the packet read, the answer written with nothing from the outside file, no provider called | the Claude Code version it last passed on is the `PROVED_ON` constant at the top of `plugins/combat-writing/hooks/seat-scope.js`, the one home of that number | `node tests/seat_scope_live.js` from the repository root (`CLAUDE_BIN=<path>` picks the binary); not part of CI, it needs a running Claude Code and one short model call; rerun after every Claude Code update, then move the constant |
| The result shown by the plugin itself through the repository's `hooks/show-result.js`: after a real round, the short form (the Crew line through the Seat key line) appears on the screen as the plugin's own message the moment the script returns, and in a sandboxed shell the board opens by the hook with "Board opened by the plugin" | the harness proof is `tests/show_result_check.js`, the real hook around the real short form and opener lines with a fake opener; the Claude Code version whose input shape it reads is the `PROVED_ON` constant at the top of `plugins/combat-writing/hooks/show-result.js`; the live pass is a round in a project with the plugin loaded | one sparring or battle round with the plugin loaded; the terminal shows the short form as the plugin's line and the board opens; the run's `log.jsonl` then holds one `seat.model` line per fresh reader, the live proof of the measurement, whose transcript shape was read, not proved, on the versions in the `MODEL_READ_ON` constant beside `PROVED_ON`; rerun after every Claude Code update, then move the constants |

## What this re-pass changed

Only this page. Every row that carried a measured number, a version, a file count, a file size or a date of measurement now names the test or the file that holds it, so the page cannot go stale when the tree moves. No item's result changed.
