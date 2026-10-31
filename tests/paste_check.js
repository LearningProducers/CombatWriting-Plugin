// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// paste_check.js: THE PASTE RULE (issue 76, 2026-10-26). The founder's words: "brief always ought
// to precede any stage"; "i want it to work with dash too and I also don't want the order to matter
// much, not so strict ... flexible to how the user wants to use it". No separator symbol: the stage
// word on the draft, battle: or sparring:, names the stage and starts the draft.
//
// What it pins, in the skill text (the cut is host-made; no script runs):
//   - The paragraph headed THE PASTE RULE stands in the battle, sparring and strategy skills, and
//     the three copies are equal word for word after their own "(the same words in ...)" clause.
//   - The paragraph says: any order; a keyword line opens a block to the next keyword line; the
//     keyword list; any case; dashes and bullets around a keyword and a lone closing dash dropped,
//     with the three glued forms named; the draft's three sources in order (the stage or draft:
//     block, the text before the first keyword line, the text after the brief that reads as the
//     draft, cut at the greeting line as the best guess with the result showing it); the stage word
//     names the stage, its block is the next piece, a new run, never a revision, the brief-only
//     exception kept, run whatever command carried the paste, said in one line; draft: unchanged;
//     nobody held to a keyword on the draft.
//   - help/SKILL.md routes a paste with a stage word to that stage, a brief alone to strategy,
//     draft-shaped text to battle; the rules skill, the help's shortcuts line, the plugin README and
//     CLAUDE.md name the rule.
//
// Run from the repo root:   node tests/paste_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path');
var root=path.join(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
function skill(name){ return read(path.join(plugin,'skills',name,'SKILL.md')); }

var battle=skill('battle'), sparring=skill('sparring'), strategy=skill('strategy'), rules=skill('combat-writing'), help=skill('help');
function ruleOf(text,name){
  var m=/^THE PASTE RULE \(issue 76, 2026-10-26; the same words in [a-z]+ and [a-z]+\): (.*)$/m.exec(text);
  check(!!m,name+': must carry the paragraph headed THE PASTE RULE with its same-words clause');
  return m?m[1]:'';
}
var rb=ruleOf(battle,'battle'), rs=ruleOf(sparring,'sparring'), rt=ruleOf(strategy,'strategy');
check(rb&&rb===rs&&rs===rt,'the three copies of THE PASTE RULE must be equal word for word');
check(/^the paste is cut by its words, in any order\. A keyword line opens a block, and a block runs to the next keyword line or the end\./.test(rb),'the rule opens with any order and the block rule');
check(/The keywords: `brief:`, `brief <name>:` \(a brief saved by name\), `brief update:` \(or `update brief:`, with an optional name\), `reader:` \(`prospect:`\), `battle:`, `sparring:`, `draft:`, `fq:` \(`question:`, `focus:`\), `n:` \(`nav:`\), `sn:`, `sfq:`, a seat line \(`seat-2:`\), `run:`; they match in any case, with or without the space after the colon/.test(rb),'the rule lists the keywords and any case');
check(/a dash or bullet before the keyword, a dash in place of its colon, and a lone dash closing the paste are dropped \(`brief-`, `-battle:` and `-Sn:` all read as the keyword\)/.test(rb),'the rule drops glued dashes and names the three forms');
check(/The draft is the `battle:`, `sparring:` or `draft:` block when there is one; else the text before the first keyword line \(the form of issue 65\); else, after a `brief:` block, the text that reads as the draft \(it opens with a greeting line, `Hi,` or `Dear <name>,`, or is addressed to a reader\), cut there as the best guess, the result's Brief and Draft lines showing what was taken as each, so a wrong cut is visible at once\./.test(rb),'the rule gives the draft\'s three sources in order with the visible best guess');
check(/A stage keyword, `battle:` or `sparring:`, names the stage as well: its block is the next piece, a new run, never a revision \(a draft pasted when the newest run holds a brief alone still joins that run\), and that stage runs on it whatever command carried the paste, said in one line \("Battle, as the paste says\."\); `draft:` keeps its meaning, a revised draft of the current run\./.test(rb),'the rule makes the stage word name the stage and the next piece, draft: unchanged');
check(/Nobody is held to a keyword on the draft: the words make the cut certain, and the order is the person's\.$/.test(rb),'the rule ends with nobody held to a keyword');
check(/found by THE PASTE RULE above \(the `sparring:` or `draft:` block; else everything that is not a mode word, a `brief:` block, a `seat-N:` line or a `question:` line; else the text after the brief that reads as the draft\)\. A `battle:` block here is battle's: run `\/cw:battle` on it, as the rule says\./.test(sparring),'sparring: its draft bullet reads the rule and hands a battle: block to battle');
check(/found by THE PASTE RULE above \(a `draft:` block; else everything that is not a `brief:` block or a `brief update:` line; else the text after the brief that reads as the draft\)\. A `battle:` or `sparring:` block here is that stage's: store nothing separately and run that command on the whole paste, as the rule says\./.test(strategy),'strategy: its draft bullet reads the rule and hands a stage block to its command');
check(/THE PASTE RULE below: the draft is the `battle:`, `sparring:` or `draft:` block, else the text before the first keyword line, the form of issue 65, else the text after the brief that reads as the draft/.test(battle),'battle: the cut line points at the rule');
check(/^\*\*A paste\*\* as `\$ARGUMENTS` \(the terminal's `\/cw` lands here, so a person may type `\/cw brief: \.\.\. battle: \.\.\.`; issue 76\): when it carries a `battle:` or `sparring:` block, run that stage's command with the whole paste, exactly as if `\/cw:<stage>` had been typed with it; a `brief:` or `brief update:` block with no stage word and no draft, `\/cw:strategy` the same way; draft-shaped text with no keyword, `\/cw:battle` with it\. Say which in one line \("Battle, as the paste says\."\) and nothing else here/m.test(help),'help: a paste is routed to its stage');
check(/^Shortcuts: the pieces of a paste go in any order, each found by its word, and `battle:` or `sparring:` on the draft names the stage and starts the draft \(brief first, then `battle: <the draft>`, then `sn:`, is one paste\); keywords match in any case, a dash before a keyword or in place of its colon is dropped \(`brief-`, `-battle:`, `-Sn:`\);/m.test(help),'help: the shortcuts line names any order, the stage word and the dashes');
check(/issue 76: the pieces of a paste go in any order, each found by its keyword, THE PASTE RULE in the three command skills, and a `battle:` or `sparring:` block is the draft of the next piece and names the stage that runs, whatever command carried the paste, `\/cw:help` included/.test(rules),'the rules skill names the rule');
var readme=read(path.join(plugin,'README.md'));
check(/^- The pieces of a paste go in any order, each found by its word: `brief:` first and `battle: <the draft>` after it, or the draft first, cut the same; `battle:` or `sparring:` on the draft names the stage that runs, whatever command carried the paste\. Keywords match in any case, a dash before a keyword or in place of its colon is dropped \(`brief-`, `-battle:`\),/m.test(readme),'the plugin README names the rule');
var claude=read(path.join(root,'CLAUDE.md'));
check(/by THE PASTE RULE \(issue 76, 2026-10-26, the founder's words: "i want it to work with dash too and I also don't want the order to matter much"; the same paragraph in the battle, sparring and strategy skills, pinned equal by `tests\/paste_check\.js`\)/.test(claude),'CLAUDE.md names the rule, the founder\'s words and this check');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'paste_check: '+failures.length+' failure(s), ':'paste_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
