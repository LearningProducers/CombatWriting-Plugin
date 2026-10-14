// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// pr-body.js: the four-section gate on a pull request body (ruled 2026-10-14).
//
// Reads the body on stdin and checks that it carries the four headings, WHAT CHANGED,
// WHY, HOW IT WAS TESTED and WHAT COULD BREAK, each with text under it. A heading is a
// Markdown heading of any level, any case, a trailing colon allowed. A section runs to the
// next heading of the same or a higher level, to the next of the four headings at any
// level, or to a line starting DOCS OWED (the template's footer), so the footer never
// counts as the last section's text. HTML comments (the template's hints) and \r (GitHub's
// web editor writes CRLF bodies) are stripped before anything is matched, so a hint left
// in place is not text and a CRLF body is read like any other. A bold label such as
// **WHAT CHANGED** is not a heading.
//
// Prints one line per problem naming the section and exits 1; prints one line and exits 0
// when all four sections carry text. Run by .github/workflows/pr-body.yml on every pull
// request; a session runs it before opening one:
//   gh pr view --json body --jq .body | node .github/scripts/pr-body.js
// Pinned by tests/pr_body_check.js.
'use strict';
var fs = require('fs');

var SECTIONS = ['WHAT CHANGED', 'WHY', 'HOW IT WAS TESTED', 'WHAT COULD BREAK'];

function headingName(line) {
  var h = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
  if (!h) return null;
  return { level: h[1].length, name: h[2].replace(/\s*:$/, '').trim().toUpperCase() };
}

// The problems with a body: an empty array when it passes.
function problems(body) {
  var text = String(body || '').replace(/\r/g, '').replace(/<!--[\s\S]*?-->/g, '');
  var lines = text.split('\n');
  var seen = {};
  var current = null, level = 0;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (/^\s*DOCS OWED/i.test(line)) { current = null; continue; }
    var h = headingName(line);
    if (h) {
      if (SECTIONS.indexOf(h.name) >= 0) {
        current = h.name; level = h.level;
        if (!(current in seen)) seen[current] = false;
      } else if (current && h.level <= level) {
        current = null;
      }
      continue;
    }
    if (current && line.trim()) seen[current] = true;
  }
  var out = [];
  SECTIONS.forEach(function (s) {
    if (!(s in seen)) out.push(s + ': the heading is missing. Add "## ' + s + '" with text under it.');
    else if (!seen[s]) out.push(s + ': nothing under the heading but blank lines or comments. Write the section.');
  });
  return out;
}

if (require.main === module) {
  var raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch (e) { raw = ''; }
  var p = problems(raw);
  if (p.length) {
    p.forEach(function (m) { process.stdout.write('pr-body: ' + m + '\n'); });
    process.stdout.write('pr-body: edit the pull request body on GitHub (the pencil on the first comment); the check reruns on every edit.\n');
    process.exit(1);
  }
  process.stdout.write('pr-body: all four sections carry text.\n');
}

module.exports = { problems: problems, SECTIONS: SECTIONS };
