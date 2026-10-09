// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// session-start.js: the one line the plugin prints when it loads (ruled 2026-10-09).
//
// Run by the SessionStart hook in hooks.json at session start and resume. It reads nothing,
// writes nothing, calls nothing: it prints one JSON object. The systemMessage field is the
// line the person sees in the terminal; additionalContext gives the host the same line, so
// it knows the plugin is loaded. Plain stdout from a SessionStart hook reaches only the
// host, which is why the line goes through systemMessage.

var LINE='Combat Writing ready. /combat-writing:help for the guide.';
process.stdout.write(JSON.stringify({
  systemMessage:LINE,
  hookSpecificOutput:{hookEventName:'SessionStart',additionalContext:LINE}
})+'\n');
