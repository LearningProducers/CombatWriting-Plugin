---
name: runs
description: Runs. Lists every run in the project, newest first, one line each, with its brief by name, its reader, its last round, the drafts it holds and OPEN or SHIPPED with the date; a word after the command finds the run whose id holds it. Use when the person asks which runs are open, where a piece left off, how to return to a run or how to start fresh on a new one.
argument-hint: [<a word of the run id>]
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
List the project's runs, or find one (Part 85, 2026-10-31: open runs, and the way back). The rules that hold across every command are in the `combat-writing` skill.

Bare, from the person's project folder:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/runs.js
```

Show what it prints, as it is: one line per run, newest first, the run id, its brief by name (`default`, or `none`), its reader's first words, its last round or `no round`, the drafts it holds, and `OPEN` or `SHIPPED <date>` (a run is shipped once `/cw:champion shipped` froze its canon; nothing else closes one); then the one line saying how to return and how to start fresh. With no run it prints one line saying so. Add nothing: no verdict, no reading, no run started. It reads only and writes nothing.

With a word as `$ARGUMENTS`:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/runs.js --match <word>
```

One match: it prints the run folder; say the run's line (its id, brief, reader, last round and state) and the line to continue it, `/cw:battle run: <word> <your round>` or `/cw:sparring run: <word>`. Two or more (exit 3): show the lines it printed and ask which in one line, "Which run? /cw:help runs for the guide." None (exit 1): show the listing it printed. Never pick for the person.

End with one line: `Next: /cw:battle run: <word> ... returns to a run; a new piece: paste it with battle: or sparring:.`
