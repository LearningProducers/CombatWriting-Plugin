// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// help_check.js: a bare /cw:help is the card and a picker, not the whole guide (issue 74,
// 2026-10-26). The founder's shape: "A one line description of Combat writing, then one line
// describing what each step does, then instructions to begin by responding to one or more
// commands", with a prompt per stage. Measured the same day: the terminal's bare /cw completes
// to /cw:help, so the card lives there.
//
// What it pins, in the skill text and the README (no script runs: the card is host-printed):
//   - help/SKILL.md holds the card between <!-- THE CARD BEGIN --> and <!-- THE CARD END -->:
//     the motto first, one line what Combat Writing is, four stage bullets in order each naming
//     its command, the "Begin with any one" line, one typed line per stage, and the `all` line.
//   - The bare rule: print the card exactly, call no tool, then the picker with the four options
//     in order, then one text prompt per stage, then the stage's command as if typed; `all` is
//     the full guide, a topic one section; the argument-hint reads [all | topic].
//   - The commands section's /cw:help bullet says bare is the card and `help all` the guide.
//   - The plugin README's /cw:help example output is the card with its markdown stripped (bold
//     and code spans), line for line, and its /cw:help bullet names the card, all and a topic.
//   - The manifest description names the card; CLAUDE.md names issue 74 and the markers.
//
// Run from the repo root:   node tests/help_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path');
var root=path.join(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }

var help=read(path.join(plugin,'skills','help','SKILL.md'));
var BEGIN='<!-- THE CARD BEGIN -->', END='<!-- THE CARD END -->';
var b=help.indexOf(BEGIN), e=help.indexOf(END);
check(b>0&&e>b&&help.indexOf(BEGIN,b+1)<0&&help.indexOf(END,e+1)<0,'help: the card must stand once between its two markers');
var card=help.slice(b+BEGIN.length,e).replace(/^\n+|\n+$/g,'');
var lines=card.split('\n');
check(lines[0]==='**Reading is Peace. Writing is War.**','card: the first line is the motto, bold; got '+lines[0]);
check(/^\*\*Combat Writing:\*\* a crew of AI models attacks your draft before it ships\. The rating leads every result\.$/.test(lines[2]),'card: line 3 says what Combat Writing is in one line; got '+lines[2]);
var bullets=lines.filter(function(l){return /^- \*\*/.test(l);});
check(bullets.length===4,'card: four stage bullets, got '+bullets.length);
[['Strategy','strategy'],['Sparring','sparring'],['Battle','battle'],['Champion','champion']].forEach(function(p,i){
  var l=bullets[i]||'';
  check(l.indexOf('- **'+p[0]+'** `/cw:'+p[1]+'` ')===0,'card: bullet '+(i+1)+' is '+p[0]+' naming /cw:'+p[1]+' first; got '+l.slice(0,60));
});
check(/7 forbidden/.test(bullets[1])&&/`rerate`/.test(bullets[2])&&/`shipped`, `result:`, `insight:`/.test(bullets[3])&&/the brief you type is the project's from then on/.test(bullets[0]),'card: the stage bullets carry the rating rule, rerate, the three champion keywords and the brief rule');
var begin=lines.indexOf('Begin with any one, in any order; the pieces of a paste go in any order too, each by its word. Pick a stage below, or type one:');
check(begin>0,'card: the Begin line must stand, verbatim');
var typed=lines.slice(begin+1);
check(typed.length===5&&typed[0]==='`/cw:strategy brief: <who you are, what you want, the stakes>`'&&typed[1]==='`/cw:sparring brief: <your brief> sparring: <your draft> question: <one focus question>`'&&typed[2]==='`/cw:battle brief: <your brief> battle: <your draft> sn: <your prompt to the crew>`'&&typed[3]==='`/cw:champion shipped email to <whom>`'&&typed[4]==='`/cw:help all` is the full guide; `/cw:help <topic>` one section.','card: the five typed lines after Begin, verbatim (brief first, the stage word on the draft, issue 76); got '+JSON.stringify(typed));
check(lines.length===15,'card: fifteen lines (the motto, a blank, the one-liner, a blank, four bullets, a blank, Begin, five typed lines); got '+lines.length);
check(!/http/.test(card)&&!/Learning Producers/.test(card),'card: no address and no credit line');

// The bare rule, the picker, the text prompts, all and the topics.
var rule=help.slice(help.indexOf('<!-- SPDX'),b);
check(/^\*\*Bare\*\* \(no `\$ARGUMENTS`/m.test(rule)&&/print the card between the two marker comments below, exactly as it stands, every line/.test(rule)&&/call no tool and read nothing/.test(rule),'help: the bare rule prints the card exactly and calls no tool');
check(/open the picker with the AskUserQuestion tool: one screen, one keypress, the question "Which stage\? \/cw:help all for the full guide\.", four options in this order, \*\*Strategy\*\* \([^)]*\), \*\*Sparring\*\* \([^)]*\), \*\*Battle\*\* \([^)]*\), \*\*Champion\*\* \([^)]*\); mark nothing and point at no "Other"/.test(rule),'help: the picker with its four options in order, nothing marked, no Other');
['Strategy, "Paste the draft, the brief with brief:, or both."','Sparring, "Paste the draft; add question: <one question> to put it to every seat."','Battle, "Paste the draft; add sn:, n:, fq: or sfq: with your prompt, or nothing for a first critique."','Champion, "shipped <link, or email to whom>, result: <what came back>, or insight: <what you learned>."'].forEach(function(t){ check(rule.indexOf(t)>=0,'help: the text prompt must stand verbatim: '+t); });
check(/Run that stage's command with the next message as its text, exactly as if the person had typed `\/cw:<stage> <text>`/.test(rule)&&/never answer it, never shorten it/.test(rule),'help: the next message runs as the command\'s text, never answered by the host');
var after=help.slice(e);
check(/^\*\*`all`\*\* as `\$ARGUMENTS`: show the guide below the rule/m.test(after)&&/If `\$ARGUMENTS` names one topic \(stages, order, commands, next, rounds, champion, briefs, runs, voices, files, where, crew, rating, record, privacy, method\), show only that section/.test(after)&&/\(`all` and `where` only; the card calls nothing\)/.test(after),'help: all shows the guide, a topic one section, the live line only there');
check(/^argument-hint: \[all \| topic\]$/m.test(help)&&/^description: Bare, the card and a picker to begin/m.test(help),'help: the frontmatter names all | topic and the card');
check(/^- `\/cw:help` — bare, the card and a picker to begin \(the terminal's `\/cw` completes to it\); `help all` is this guide; `help rounds` shows one section\.$/m.test(help),'help: the commands section\'s own bullet');
check(/Combat Writing — Learning Producers Inc\., Israel Hernandez, founder\s*$/.test(help),'help: the credit line still closes the guide');

// The README: the example output is the card with its markdown stripped, line for line.
var readme=read(path.join(plugin,'README.md'));
var stripped=lines.map(function(l){return l.replace(/\*\*/g,'').replace(/`/g,'');}).join('\n');
var at=readme.indexOf('```\n/cw:help\n```');
var blockStart=readme.indexOf('```\n',readme.indexOf('The card, as the skill holds it',at))+4;
var blockEnd=readme.indexOf('\n```',blockStart);
check(at>0&&blockStart>at&&blockEnd>blockStart&&readme.slice(blockStart,blockEnd)===stripped,'README: the /cw:help example block must equal the card with bold and code spans stripped; got\n'+readme.slice(blockStart,blockEnd));
check(/^- `\/cw:help` bare is the card: what Combat Writing is in one line, the four stages with their commands, the lines to begin with, then one keypress picks a stage and your next message is its text \(typing `\/cw` alone completes to it\)\. `\/cw:help all` is the full guide in plain words; `\/cw:help <topic>` one section\.$/m.test(readme),'README: the /cw:help bullet');
var manifest=JSON.parse(read(path.join(plugin,'.claude-plugin','plugin.json')));
check(/\/cw:help, bare, is the card and a picker to begin; \/cw:help all explains the method\./.test(manifest.description),'manifest: the description names the card and all');
var claude=read(path.join(root,'CLAUDE.md'));
check(/issue 74, 2026-10-26/.test(claude)&&/between its two marker comments/.test(claude)&&/pinned equal by `tests\/help_check\.js`/.test(claude),'CLAUDE.md: names issue 74, the markers and this check');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'help_check: '+failures.length+' failure(s), ':'help_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
