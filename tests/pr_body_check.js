// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// pr_body_check.js: pins .github/scripts/pr-body.js, the four-section gate on a pull
// request body that .github/workflows/pr-body.yml runs (ruled 2026-10-14), the template
// and the workflow.
//   - The six bodies: a filled body passes; the same body with CRLF line ends passes; a
//     body whose last section holds nothing above the DOCS OWED footer fails naming it;
//     a body with a blank middle section fails naming it; a bold label in place of a
//     heading fails naming it; a body missing a heading fails naming it. Each failure
//     names only the sections at fault and exits 1.
//   - Any heading level, any case, a trailing colon accepted; HTML comments are not text;
//     a lower heading inside a section does not end it.
//   - The shipped template, unfilled, fails naming all four sections (so every hint is a
//     comment); the template with one line written under each heading passes; its
//     footer is DOCS OWED: none.
//   - The workflow: the four event types, permissions: {}, every action pinned to a
//     40-hex commit, the script run from stdin.
// Run from the repo root:   node tests/pr_body_check.js
'use strict';
var cp = require('child_process');
var fs = require('fs');
var path = require('path');
var ROOT = path.join(__dirname, '..');
var SCRIPT = path.join(ROOT, '.github', 'scripts', 'pr-body.js');
var failures = 0;
function fail(msg) { failures++; console.log('FAIL ' + msg); }
function check(ok, msg) { if (!ok) fail(msg); }
function run(input) {
  var r = cp.spawnSync(process.execPath, [SCRIPT], { input: input, encoding: 'utf8' });
  return { code: r.status, out: r.stdout };
}
function named(out) {
  return ['WHAT CHANGED', 'WHY', 'HOW IT WAS TESTED', 'WHAT COULD BREAK'].filter(function (s) {
    return new RegExp('^pr-body: ' + s + ':', 'm').test(out);
  });
}
function expectFail(label, body, sections) {
  var r = run(body);
  check(r.code === 1, label + ': exit ' + r.code + ', expected 1');
  var got = named(r.out);
  check(got.join('|') === sections.join('|'), label + ': named ' + JSON.stringify(got) + ', expected ' + JSON.stringify(sections) + '\n' + r.out);
}
function expectPass(label, body) {
  var r = run(body);
  check(r.code === 0 && /all four sections carry text/.test(r.out), label + ': exit ' + r.code + '\n' + r.out);
}

var filled = [
  '## WHAT CHANGED', '', '<!-- hint -->', 'The gate.', '',
  '## WHY', '', 'The ruling of 2026-10-14.', '',
  '## HOW IT WAS TESTED', '', 'node tests/pr_body_check.js', '',
  '## WHAT COULD BREAK', '', 'Nothing known.', '',
  'DOCS OWED: none', ''
].join('\n');

// 1. Filled passes.
expectPass('filled', filled);

// 2. CRLF filled passes.
expectPass('CRLF filled', filled.replace(/\n/g, '\r\n'));

// 3. The last section emptied above the footer fails naming it: the footer is not its text.
expectFail('last section empty above the footer', filled.replace('Nothing known.\n', ''), ['WHAT COULD BREAK']);

// 4. A blank middle section fails naming it; a comment there is not text either.
expectFail('blank middle section', filled.replace('The ruling of 2026-10-14.', ''), ['WHY']);
expectFail('comment-only middle section', filled.replace('The ruling of 2026-10-14.', '<!-- say why -->'), ['WHY']);

// 5. A bold label in place of a heading fails naming it.
expectFail('bold label', filled.replace('## HOW IT WAS TESTED', '**HOW IT WAS TESTED**'), ['HOW IT WAS TESTED']);

// 6. A missing heading fails naming it.
expectFail('missing heading', filled.replace('## WHY\n\nThe ruling of 2026-10-14.\n', ''), ['WHY']);

// Every section at fault is named; an empty body names all four.
expectFail('empty body', '', ['WHAT CHANGED', 'WHY', 'HOW IT WAS TESTED', 'WHAT COULD BREAK']);
expectFail('null-ish body', '\r\n\r\n', ['WHAT CHANGED', 'WHY', 'HOW IT WAS TESTED', 'WHAT COULD BREAK']);

// Any level, any case, a colon; a lower heading inside a section is kept.
expectPass('levels and case', '# What changed:\nA.\n### Detail\nB.\n#### why\nC.\n## How it was tested\nD.\n###### WHAT COULD BREAK:\nE.\nDOCS OWED: the README\n');
// A same-level heading that is none of the four ends the section.
expectFail('other heading ends the section', filled.replace('The gate.', '## Notes\nNot the section.'), ['WHAT CHANGED']);
// A lower heading alone is not text.
expectFail('a lower heading alone', filled.replace('The gate.', '### Sub'), ['WHAT CHANGED']);
// A comment spanning lines around the only text hides it.
expectFail('multi-line comment', filled.replace('The gate.', '<!--\nThe gate.\n-->'), ['WHAT CHANGED']);

// The shipped template.
var tpl = fs.readFileSync(path.join(ROOT, '.github', 'PULL_REQUEST_TEMPLATE.md'), 'utf8');
expectFail('the template unfilled', tpl, ['WHAT CHANGED', 'WHY', 'HOW IT WAS TESTED', 'WHAT COULD BREAK']);
var tplFilled = tpl.replace(/^(## [A-Z ]+)\n/gm, '$1\n\nOne line.\n');
expectPass('the template filled', tplFilled);
check(/^## WHAT CHANGED$[\s\S]*^## WHY$[\s\S]*^## HOW IT WAS TESTED$[\s\S]*^## WHAT COULD BREAK$/m.test(tpl), 'template: the four headings in order');
check(/^DOCS OWED: none\s*$/m.test(tpl), 'template: the footer line DOCS OWED: none');
check(tpl.split('\n')[0] === '<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->', 'template: SPDX comment on line 1');

// The workflow.
var wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'pr-body.yml'), 'utf8');
check(/types:\s*\[opened,\s*edited,\s*reopened,\s*synchronize\]/.test(wf), 'workflow: the four pull_request types');
check(/^permissions:\s*\{\}\s*$/m.test(wf), 'workflow: permissions: {}');
var uses = wf.match(/uses:\s*\S+/g) || [];
check(uses.length > 0, 'workflow: at least one action');
uses.forEach(function (u) { check(/@[0-9a-f]{40}\s*$/.test(u), 'workflow: not pinned to a commit: ' + u); });
check(/node \.github\/scripts\/pr-body\.js/.test(wf), 'workflow: runs .github/scripts/pr-body.js');
check(/BODY:\s*\$\{\{\s*github\.event\.pull_request\.body\s*\}\}/.test(wf), 'workflow: the body comes in through the BODY variable');

if (failures) { console.log(failures + ' failure(s)'); process.exit(1); }
console.log('pr_body_check: ok');
