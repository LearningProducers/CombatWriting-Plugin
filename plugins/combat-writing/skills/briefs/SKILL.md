---
name: briefs
description: Briefs. Lists your briefs, the unnamed default and every brief saved by name, each with its first line and the runs on it. One project, many kinds of writing: `brief cold-email: <the rules>` in any command saves a brief by name, `brief: cold-email` picks it for a run, `brief update cold-email: <a line>` adds to it. Use when the person asks which briefs exist, which brief a run used, or how to keep several kinds of writing in one project.
argument-hint: (nothing)
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
List the project's briefs (Part 86, 2026-10-31: one project, many briefs). The rules that hold across every command are in the `combat-writing` skill.

Run, from the person's project folder:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/briefs.js
```

Show what it prints, as it is: one line per brief, the unnamed default (`combat-writing/brief.md`) first when it exists and then every brief saved by name (`combat-writing/briefs/<name>.md`), each with its first line and its word count, and under each one line naming the runs on it, newest first, or "no run yet"; then the one line saying how a brief is picked, replaced and added to. With no brief at all it prints one line saying so and how to save one. Add nothing: no verdict on the briefs, no reading of them, no run started. It reads only and writes nothing.

`$ARGUMENTS` is ignored; a word after the command is not a brief name to pick. To pick a brief for a run, the person types `brief: <name>` on the paste of any stage command (strategy, sparring or battle), as THE PASTE RULE in those skills says; to save one, `brief <name>: <text>`; to add to one, `brief update <name>: <text>`. When the person asks here to pick, save or add, say the line to type and stop.

End with one line: `Next: /cw:battle brief: <name> reader: <who this piece is for> battle: <the draft>` when a saved brief exists, else `Next: brief <name>: <the rules> on any stage command saves a brief by name.`
