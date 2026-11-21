<!-- SPDX-License-Identifier: CC-BY-NC-SA-4.0 -->
# Directory checklist for plugins/combat-writing-crew

A pass over the Claude plugin directory's pre-submission checklist (claude.com/docs/plugins/pre-submission-checklist), row by row, against `plugins/combat-writing-crew/`, the Combat Writing add-on: a local MCP server that seats other companies' models in the crew of the `cw` plugin. The add-on is submitted to the directory as a second bundle from this repository, its folder a submission of its own, so that a directory install of `cw` can seat a real crew. The submit page (claude.com/docs/plugins/submit) was read the same day; what it adds for this bundle is at the foot of this page. The pass of `cw` itself is `docs/directory-checklist.md`.

**Passed 2026-11-17**, against the checklist as it read that day. This is the page's one date: it moves only when the whole pass is re-run, row by row, never when one row changes. No row carries a number a test measures (a count, a size, a version): each row names the file or the test that shows the item, and the number lives there. The add-on's version is in `plugins/combat-writing-crew/.claude-plugin/plugin.json`.

Each row carries one of three results:

- **pass:** the item holds, and the row names the file or the test that shows it. Where only the developer portal can confirm an item (a name another organization already uses, the security scan), the row reads pass on what this repository shows and says what the portal still has to say.
- **HELD:** the checklist's result for this item is "Held for a reviewer", and the add-on does the thing the row describes. A hold is not a block and not a rejection: the bundle can be submitted, and an Anthropic reviewer reads the held version before it goes live. Every HELD row says why the add-on does it.
- **n/a:** the add-on has no such component.

No row of this pass reads "Blocks". The portal's **Validate** button at claude.ai/directory/manage runs the directory's own checks; it is the founder's step, nothing in this repository can run it, and no build session submits anything.

## The holds this pass expects

Two things about the add-on are held for a reviewer, by the checklist's own rules:

1. **The key file.** A key reaches the add-on from two places and no other: the masked prompt, then the owner-only key file. The masked prompt is the shape the directory asks for. The key file is a credential on the person's machine, read and sent to its provider, which this pass expects the checklist to hold; the page's own example is a token already set in the person's shell, which the add-on does not read (issue 233). The key file is kept and the hold is accepted, because it is the place that survives a host update; the add-on's README says so. The rows are under "What the plugin runs and connects to" and "The two places a key comes from".
2. **The server is a Node file.** The validator follows plain shell scripts only, and the add-on's MCP server is `server.js`, started with `node`, which loads `crew-lib.js` and `providers.json` from the same folder. The checklist holds a non-shell file an MCP server command runs, whatever it does. The rows are under "What the plugin runs and connects to" and "Choices a reviewer always checks". This hold follows from what the add-on is, and was found by this pass.

## Repository and folder layout

| Item | Result | Shown by |
|---|---|---|
| A folder that contains `.claude-plugin/plugin.json` | pass | `plugins/combat-writing-crew/.claude-plugin/plugin.json` |
| One plugin at a time; in a marketplace repository with several plugins, validate and submit each plugin folder on its own | pass | `.claude-plugin/marketplace.json` lists `cw` and `combat-writing-crew`, each under its own folder; this folder is submitted with plugin path `plugins/combat-writing-crew`; `tests/marketplace_check.js` pins that each folder holds its own manifest and that neither loads a file from the other |
| Every file a hook, an MCP server command or a script uses inside the plugin folder; every component path in `plugin.json` inside it | pass | the manifest's one path is `${CLAUDE_PLUGIN_ROOT}/server.js`; `server.js` loads `crew-lib.js`, and `crew-lib.js` reads `providers.json`, all in the folder; no path climbs out with `..`, and `tests/marketplace_check.js` fails a relative `require` that leaves the folder. What the server reads and writes at run time is the person's own data, never a file of the plugin: the run folder in the person's project and, as the third key route, the key file in the person's home folder, found from the home folder's path and not by climbing out of the plugin |
| Regular files and folders only: no symbolic links, Git submodules or Git LFS pointer files | pass | `git ls-files -s plugins/combat-writing-crew` shows one mode, regular file, for every entry; the repository has no `.gitmodules` |
| No `.DS_Store`, `Thumbs.db`, `desktop.ini` or `__MACOSX` in the plugin folder | pass | none tracked; `git ls-files plugins/combat-writing-crew` is the measure |
| File and folder names valid on Windows and macOS: no colon, no trailing dot or space, no Windows device name, no two names differing only by capitalization | pass | every tracked name in the folder is letters, digits, hyphens, dots and underscores; `git ls-files` lowercased has no duplicate |
| Each folder on the path to the plugin named with letters, digits, dots, hyphens and underscores, and the plugin path entered with the repository's capitalization | pass | `plugins/combat-writing-crew`, all lowercase |
| No `export-ignore` or `export-subst` in any `.gitattributes`; no `filter` or other content-rewriting attribute at the root, above the plugin folder or inside it | pass | the repository has no `.gitattributes` |
| Repository under 50 MiB archived and 256 MiB unpacked, fewer than 10,000 files and folders; every file in the plugin folder under 5 MiB | pass | `tests/license_check.js` fails any non-image, non-font file at or over 256 KiB, a bound well under the 5 MiB; the repository's size is measured by `git count-objects -vH` and its entries by `git ls-files`, and neither number is written here |

## Manifest and plugin name

| Item | Result | Shown by |
|---|---|---|
| `name` of lowercase letters, digits and hyphens, up to 64 characters, starting and ending with a letter or digit | pass | `"name": "combat-writing-crew"` in `plugin.json`; `tests/marketplace_check.js` pins the manifest's name equal to the marketplace entry's |
| A name built around the publisher's own product name: no reserved word as the whole name, no marketplace name reserved for Anthropic, nothing that presents the plugin as official | pass | the name is the brand's own, Combat Writing, with the word for what the add-on brings; the README says the add-on is not made, reviewed or endorsed by Anthropic |
| A name no other organization's plugin uses, a difference in capitalization or punctuation counting as the same name | pass (the portal confirms) | nothing in this repository can see the directory's other names; **Name is taken** or **Name may be confused with an existing listing** can only come from the portal's Validate |
| `name`, `displayName` and `author.name` not mistakable for an existing plugin, publisher, connector or well-known brand that is not the publisher's | pass (the portal confirms) | `displayName` "Combat Writing Crew (add-on)", `author.name` "Learning Producers Inc.", both in `plugin.json`; Combat Writing is a brand of Learning Producers Inc. |
| In a fork, a name of its own | n/a | the repository is not a fork |
| `displayName` and `author.name` in one writing system, no look-alike letters or invisible characters | pass | plain ASCII in `plugin.json` |
| The keys that declare components spelled as the plugins reference spells them, and kept out of the `experimental` object | pass | `plugin.json` declares `mcpServers` and `userConfig` at the top level and has no `experimental` object; `claude plugin validate --strict plugins/combat-writing-crew` passes, run by `tests/marketplace_check.js` and by CI |
| `description`, `author` and `version` set | pass | all three in `plugin.json`; the version rises with every change to the folder under the bump rule in `CLAUDE.md`, which CI's version-bump gate enforces, and `tests/marketplace_check.js` pins it equal to the marketplace entry's |

## README and license

| Item | Result | Shown by |
|---|---|---|
| A README of at least 40 words in the plugin folder, words inside code blocks not counted | pass | `plugins/combat-writing-crew/README.md`; `tests/marketplace_check.js` counts the words outside code blocks and fails at 40 or fewer |
| A `LICENSE` file in the plugin folder, or `license` in `plugin.json` | pass | both: the `license` field in `plugin.json`, and `plugins/combat-writing-crew/LICENSE.md` with the full text, pinned byte-identical to the root text by `tests/license_check.js` |

## Files in the plugin folder

| Item | Result | Shown by |
|---|---|---|
| Every file that is not an image or a font under 256 KiB | pass | `tests/license_check.js` fails any such file at or over that size; the sizes live in the tree, not here |
| 512 files or fewer in the plugin | pass | `git ls-files plugins/combat-writing-crew` lists the folder; the count is that command's, not this page's |
| Only text files, SVG included, complete PNG, JPEG, GIF and WebP images, and font files; no other binary | pass | every tracked file in the folder is text: Markdown, JavaScript, JSON and the NOTICE; `git ls-files plugins/combat-writing-crew` is the measure |
| A bundled image shown in the README by Markdown image syntax; no bundled image or font referred to from a command, hook or script, or written as a path in backticks or a code block | n/a | the add-on bundles no image and no font |
| Each MCP server declared with `command` and `args` or with `url`, not a `.mcpb` or `.dxt` bundle | pass | `mcpServers` in `plugin.json` declares one server with `command` and `args`; `tests/marketplace_check.js` pins the entry |

## What the plugin runs and connects to

| Item | Result | Shown by |
|---|---|---|
| Every package a launcher runs pinned to an exact version; `uv run` with `--locked` or `--frozen` | n/a | no `npx`, `bunx`, `pnpm dlx`, `yarn dlx`, `uvx`, `pipx run` or `uv run` anywhere in the folder; the server runs under the Node already on the machine and loads no package; `tests/marketplace_check.js` fails a launcher in the server entry |
| No package-manager configuration file that sets a registry, index, proxy or other package source, in a plugin that uses a launcher or runs a package install | n/a | the add-on uses no launcher and installs no package; the folder holds no `.npmrc`, `bunfig.toml` or `uv.toml` and no `package.json` |
| Real credentials out of every file, documentation and examples included; each value asked for through a `userConfig` entry with `sensitive: true` and referred to as `${user_config.KEY}` | pass | every key option in `plugin.json` is a `userConfig` string with `sensitive: true` and no default, and the server's `env` refers to each as `${user_config.<option>}`; `tests/marketplace_check.js` pins both and fails anything shaped like a credential in any file of the folder; the README's examples show a variable's name and never a value |
| No credential that is already set in the user's environment read and sent to a server, even in a README example; asked for through `userConfig` instead | HELD | the add-on asks through `userConfig` first; when the prompt's value is empty it reads the person's own key file, and a key found there is sent to its own provider and nowhere else (`crew-lib.js`, `keyFor` and `keyFilePath`; the README, "Keys and where the prompt appears"). A provider's usual variable in the person's shell, the row's own example, is not read: `tests/crew_repairs_check.js` sets each of the six alone and the server seats nothing and sends nothing. The key file is kept and the hold is accepted: see "The two places a key comes from" below |
| `.mcp.json` valid JSON, every server entry matching the schema in the MCP documentation | n/a | the folder has no `.mcp.json`; the server is declared in `plugin.json`, which `claude plugin validate --strict` reads |
| Each remote MCP server with a `type` of `http`, `sse` or `ws` and an absolute `https://` or `wss://` URL, a `${user_config.KEY}` reference, or an empty string | n/a | the add-on declares no remote MCP server; `tests/marketplace_check.js` fails a `url` in the server entry |
| Each local MCP server started by running a file in the plugin with plain arguments, not through a shell or a package-manager script | pass | `node` with the one argument `${CLAUDE_PLUGIN_ROOT}/server.js`; `tests/marketplace_check.js` pins the command and the argument and fails a shell, a launcher or `npm` in the entry |
| In the command of a hook or an MCP server, each path written in full from `${CLAUDE_PLUGIN_ROOT}`, with no other variable, command substitution, wildcard or inline program | pass | the command is `node` and its one argument is `${CLAUDE_PLUGIN_ROOT}/server.js`, pinned by `tests/marketplace_check.js`; the `${user_config.<option>}` references sit in the entry's `env`, not in the command, and are the form the checklist asks for |
| No launcher, package install, shell variable other than `${CLAUDE_PLUGIN_ROOT}`, command substitution or call to another file in the plugin in a script that a hook or an MCP server runs | HELD | the script the server command runs is `server.js`, a Node file and not a shell script, and it loads another file of the plugin, `crew-lib.js`, which reads `providers.json`; the validator cannot follow it, so the finding to expect is **Scripts the validator couldn't follow**. It uses no launcher, installs nothing and starts no other process: both files load Node's own modules and each other and nothing else, which a reviewer can read in the two files' first lines |

## Choices a reviewer always checks

| Item | Result | Shown by |
|---|---|---|
| A package from a registry: a launcher running a pinned package is held all the same | n/a | no launcher and no package |
| A lockfile install: `package.json` beside a lockfile in the root of the plugin folder | n/a | the folder has no `package.json` and no lockfile; `tests/license_check.js` fails a lockfile beside one |
| A program the validator cannot read through: a non-shell file from the plugin run by a hook, an MCP or LSP server command, or a `` !`…` `` line | HELD | the MCP server command runs `server.js`, a non-shell file, and the checklist holds that file for a reviewer whatever it does; the way the checklist gives to avoid the hold is to keep the logic in shell scripts, and the add-on's server stays the Node file it is. `server.js` and `crew-lib.js` are plain, commented JavaScript a reviewer can read through, and `tests/crew_check.js` runs the real server against a fake provider on localhost |

## Hooks, skills, commands and agents

| Item | Result | Shown by |
|---|---|---|
| `hooks/hooks.json` valid, with only documented hook events and hook types | n/a | the add-on has no hook and no `hooks/` folder |
| `hooks/hooks.json` left out of the `hooks` field in `plugin.json` | pass | `plugin.json` has no `hooks` field; `tests/marketplace_check.js` fails if one appears |
| Valid YAML front matter in each skill, command and agent file, with `description` as a single text value | n/a | the add-on has no skill, command or agent file; `tests/marketplace_check.js` fails if the manifest declares a command or an agent |
| Component folders and files named with the spelling and capitalization Claude Code expects | n/a | the add-on has no component folder; its one component, the MCP server, is declared in `plugin.json` |

## The security scan

The scan runs after submission and only the portal shows its result; these rows are what this repository does to prepare.

| Item | Result | Shown by |
|---|---|---|
| Everything the plugin runs, sends or fetches described in the README | pass | `plugins/combat-writing-crew/README.md`: "What it does" names the three tools, "Keys and where the prompt appears" the two places a key comes from and why the key file exists, "What it sends where" what goes to each provider, what is written into the person's project, that nothing goes to Learning Producers, and the two settings the server takes from its surroundings, "Rate limits and size" the waits and the resend |
| Readable source, not compiled, packed or minified | pass | `server.js` and `crew-lib.js` are plain, commented JavaScript; `providers.json` is a readable table of addresses and key names that holds no model id |
| No undisclosed destination, hidden code or change to Claude's permission settings | pass (the scan itself is the portal's) | the only addresses the server calls are the `base_url` of each provider in `providers.json`, each named in the README's table and in the key option that feeds it, plus a local Ollama on the person's own machine when they name a model; each key goes only to its own provider; the add-on runs no hook, changes no setting, and writes only into the run folder the person names; `tests/crew_check.js` holds the key route, the scrub of account ids from error text and the files written |

## The two places a key comes from

The places a key comes from, in the order the server reads them, and no other.

| Place | Result | Shown by |
|---|---|---|
| The masked prompt | pass | each key option is a `userConfig` string with `sensitive: true`, the shape the directory asks for; `tests/marketplace_check.js` pins it |
| A provider's usual variable in the person's shell | pass | not read: `keyFor` looks up the manifest's own variable and the key file and nothing else; `tests/crew_repairs_check.js` sets each of the six alone, and all six together, and the server seats no provider, adds no seat and sends no request |
| The owner-only key file, read only when the prompt's value is empty | HELD | a credential read from the person's machine and sent to its own provider alone; expected to be held, not measured at the portal. The hold is accepted, because the key file is the place that survives a host update: the host's credentials store has been rebuilt by an update with the key gone, and nothing rebuilds a file. The server reads it only when it is a regular file only its owner can read, in a folder only its owner can open, and refuses it whole otherwise; the README says why it exists and how to write it; `tests/crew_check.js` holds the refusals |

## What is not a row

**Testing the plugin's behavior.** The checklist's last section asks for two things no check runs: comparing output with and without the plugin, and loading the plugin on each surface its users will use. The add-on has no skill whose output can be compared. Loading it is not done from a build session; it is the founder's step. The listing says Claude Code plainly, because of what the directory's platform-support page (claude.com/docs/plugins/platform-support) says of a local MCP server: chat ignores it, Cowork loads it only when the session runs on the person's own computer, and Claude Code loads it. The same page says Cowork does not prompt for values and ignores a server that refers to an option with no default, which is every key option here; that is read from the page and not measured.

**What the submit page adds.** Each plugin folder is its own submission, so this bundle is entered with repository `LearningProducers/CombatWriting-Plugin`, plugin path `plugins/combat-writing-crew` and branch `main`, after `cw` or before it. The **Listing details** step reads `plugin.json` and the README. The **Data handling** answers, drafted from the code for the founder to confirm in the portal: the add-on reads the packet the `cw` plugin built from the draft and the brief the person gave it; it sends that packet to each provider the person holds a key for, which is data sent to services other than declared connectors; it stores each answer in the person's own project and nothing anywhere else, and what a provider keeps is under that provider's terms; it is not aimed at people under 18.
