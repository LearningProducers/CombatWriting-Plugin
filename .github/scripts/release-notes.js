// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// release-notes.js: the notes for a GitHub Release, cut from the merged pull request.
//
// Reads one pull request as JSON on stdin (the shape the GitHub API returns: at least
// `number`, `title` and `body`) and prints the Release notes: the pull request title as a
// heading, then the body's "What changed" section. The section starts at a Markdown
// heading of any level whose text is "What changed" (any case, a colon allowed), or at a
// bold label line `**What changed**`, and runs to the next heading of the same or a higher
// level (for the bold form: to the next heading or the next line opening with a bold label) or the end.
//
// Exit 0 with the notes on stdout; exit 3 when the body has no "What changed" section, so
// the caller falls back to generated notes; exit 2 on empty or unreadable input.
// Used by the tag job in .github/workflows/checks.yml; pinned by tests/release_notes_check.js.
'use strict';
var fs = require('fs');

function section(body) {
  var lines = String(body || '').replace(/\r\n?/g, '\n').split('\n');
  var out = null, level = 0, bold = false;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (out === null) {
      var h = /^(#{1,6})\s+what changed\s*:?\s*#*\s*$/i.exec(line);
      var b = /^\*\*what changed\s*:?\*\*:?\s*(.*)$/i.exec(line);
      if (h) { out = []; level = h[1].length; }
      else if (b) { out = []; bold = true; if (b[1].trim()) out.push(b[1].trim()); }
      continue;
    }
    var hh = /^(#{1,6})\s+\S/.exec(line);
    if (hh && (bold || hh[1].length <= level)) break;
    if (bold && /^\*\*[^*]+\*\*:?(\s|$)/.test(line)) break;
    out.push(line);
  }
  if (out === null) return null;
  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out.join('\n');
}

function notes(pr) {
  var s = section(pr.body);
  if (s === null) return null;
  var title = String(pr.title || '').trim();
  var head = pr.number ? title + ' (#' + pr.number + ')' : title;
  return '## ' + head + '\n\n' + s + '\n';
}

if (require.main === module) {
  var raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch (e) { raw = ''; }
  if (!raw.trim()) { process.stderr.write('release-notes: no pull request on stdin\n'); process.exit(2); }
  var pr;
  try { pr = JSON.parse(raw); } catch (e) { process.stderr.write('release-notes: stdin is not JSON\n'); process.exit(2); }
  if (!pr || typeof pr !== 'object' || Array.isArray(pr)) { process.stderr.write('release-notes: expected one pull request object\n'); process.exit(2); }
  var n = notes(pr);
  if (n === null) { process.stderr.write('release-notes: no "What changed" section in the pull request body\n'); process.exit(3); }
  process.stdout.write(n);
}

module.exports = { section: section, notes: notes };
