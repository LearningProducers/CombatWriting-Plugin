// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// release_notes_check.js: pins .github/scripts/release-notes.js, the cut of Release notes
// from a merged pull request that the tag job in checks.yml makes.
//   - A `## What changed` heading: the notes are the title with the number as a heading,
//     then that section up to the next heading of the same or a higher level; a lower
//     heading inside the section is kept.
//   - The heading matches any level, any case, with or without a colon.
//   - The bold label form `**What changed**` works and ends at the next heading or the
//     next bold label line.
//   - No section: exit 3 and nothing on stdout (the job falls back to generated notes).
//   - Empty stdin, non-JSON or a JSON array: exit 2.
//   - CRLF bodies are read; blank lines around the section are trimmed.
//   - HTML comments (the template's hints) are dropped from the cut; a section holding
//     only comments is no section (exit 3). The uppercase template heading WHAT CHANGED
//     is cut like any other.
// Run from the repo root:   node tests/release_notes_check.js
'use strict';
var cp = require('child_process');
var path = require('path');
var SCRIPT = path.join(__dirname, '..', '.github', 'scripts', 'release-notes.js');
var failures = 0;
function fail(msg) { failures++; console.log('FAIL ' + msg); }
function check(ok, msg) { if (!ok) fail(msg); }
function run(input) {
  var r = cp.spawnSync(process.execPath, [SCRIPT], { input: input, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}
function pr(body, title, number) {
  return JSON.stringify({ number: number === undefined ? 12 : number, title: title || 'CI: a Release for every tag', body: body });
}

// 1. The heading form, with a lower heading kept and the next same-level heading cut.
var r = run(pr('Intro line.\n\n## What changed\n\nThe tag job creates a Release.\n\n### Detail\n\nNotes come from the pull request.\n\n## Verified\n\nNot in the notes.\n'));
check(r.code === 0, 'heading form: exit ' + r.code + ' ' + r.err);
check(r.out === '## CI: a Release for every tag (#12)\n\nThe tag job creates a Release.\n\n### Detail\n\nNotes come from the pull request.\n', 'heading form: notes were:\n' + r.out);

// 2. Any level, any case, a colon, and a higher heading cuts it.
r = run(pr('# Part\n\n### WHAT CHANGED:\n\nOne line.\n\n# Next part\n\nCut.\n'));
check(r.code === 0 && /^## .*\n\nOne line\.\n$/.test(r.out), 'level-3 upper-case heading with colon: ' + JSON.stringify(r.out));

// 3. Without a number the heading is the bare title.
r = run(JSON.stringify({ title: 'T', body: '## What changed\nX\n' }));
check(r.out === '## T\n\nX\n', 'no number: ' + JSON.stringify(r.out));

// 4. The bold label form, same line and following lines, ends at the next bold label.
r = run(pr('**Why.** Because.\n\n**What changed:** The gate.\nAnd the tag.\n\n**Verified:** locally.\n'));
check(r.code === 0 && r.out === '## CI: a Release for every tag (#12)\n\nThe gate.\nAnd the tag.\n', 'bold form: ' + JSON.stringify(r.out));

// 5. The bold form ends at a heading too.
r = run(pr('**What changed**\n\nA.\n\n## Checks\n\nB.\n'));
check(r.out === '## CI: a Release for every tag (#12)\n\nA.\n', 'bold form before heading: ' + JSON.stringify(r.out));

// 6. No section: exit 3, nothing on stdout.
r = run(pr('Two changes, one pull request.\n\n**1. The tag job.** Runs on push.\n'));
check(r.code === 3 && r.out === '', 'no section: exit ' + r.code + ' out ' + JSON.stringify(r.out));
r = run(pr(null));
check(r.code === 3 && r.out === '', 'null body: exit ' + r.code);

// 7. Bad input: exit 2.
check(run('').code === 2, 'empty stdin should exit 2');
check(run('not json').code === 2, 'non-JSON should exit 2');
check(run('[]').code === 2, 'an array should exit 2');

// 8. CRLF and padding.
r = run(pr('## What changed\r\n\r\n\r\nLine one.\r\nLine two.\r\n\r\n\r\n'));
check(r.out === '## CI: a Release for every tag (#12)\n\nLine one.\nLine two.\n', 'CRLF: ' + JSON.stringify(r.out));

// 9. The template body (ruled 2026-10-14): the uppercase heading is cut, the hint comments
//    are dropped, the next section ends it; a section left with only its hint is no section.
var tpl = '<!-- SPDX-License-Identifier: X -->\n## WHAT CHANGED\n\n<!-- What a reader sees differently. -->\nThe gate.\n<!-- multi\nline -->\n\n## WHY\n\nThe ruling.\n\nDOCS OWED: none\n';
r = run(pr(tpl));
check(r.code === 0 && r.out === '## CI: a Release for every tag (#12)\n\nThe gate.\n', 'template body: exit ' + r.code + ' ' + JSON.stringify(r.out));
r = run(pr('## WHAT CHANGED\n\n<!-- hint -->\n\n## WHY\n\nThe ruling.\n'));
check(r.code === 3 && r.out === '', 'comment-only section: exit ' + r.code + ' out ' + JSON.stringify(r.out));

if (failures) { console.log(failures + ' failure(s)'); process.exit(1); }
console.log('release_notes_check: ok');
