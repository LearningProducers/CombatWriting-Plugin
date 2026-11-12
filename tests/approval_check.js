// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// approval_check.js: THE APPROVAL STEP (issue 202). A round's text that a picker took as the
// person's next message is shown back in one dialog before anything is written to the inbox or
// any packet is built, and the rerate question that used to follow the text is gone.
//
// What it pins, in the skill text (the step is host-made; no script runs):
//   - The paragraph headed THE APPROVAL STEP stands in the rules skill, battle and sparring, the
//     three files that take a typed text, and the three copies are equal word for word.
//   - The paragraph says: the dialog opens after the text arrives and before anything is written
//     to the inbox file or any packet is built; it shows the typed text in full, unchanged; it
//     asks exactly "Is this the message you want to send to all AI crew members?"; the help line
//     follows the question; two options in this order, Send and Change it, and no third; Send
//     fires the round with the text as typed; Change it takes the next message as the new text,
//     shows that and asks again; a one-seat round names that seat in place of "all AI crew
//     members"; text typed into the dialog's own Other row is Change it, the new text, asked
//     again, and only Send sends; nothing is written and no packet is built until Send; the text is never read for
//     the word rerate; a command typed whole with its keyword is not asked; with no
//     AskUserQuestion tool there is no picker and nothing to ask.
//   - Each path that takes a typed text names the step between the text and the round: the
//     bare-command picker and the Next picker in battle, the question path and the Next picker
//     in sparring, the Next picker and the round-fires-as-chosen rule in the rules skill.
//   - None of the three files orders a rerate question: no yes/no, no "yes or no", no Rerate or
//     No rating option, no "rerate question", no "rerate reply".
//   - The copies outside the three: the help's picker section carries the question and the two
//     options and no rating question; the plugin README and the plugin map say the text is shown
//     back and carry no "yes or no for rerate".
//   - What stands: the word `rerate` in the command, and Debate on screen one of the Next picker.
//   - One eval case, picker-approval-before-packet, with its row in the evals README, the row
//     naming issue 204 (today's runner cannot pass the case).
//   - CLAUDE.md states the step with the question's exact words, no rerate question, the Other
//     row, and eight eval cases.
//
// Run from the repo root:   node tests/approval_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path');
var root=path.join(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
function skill(name){ return read(path.join(plugin,'skills',name,'SKILL.md')); }

var QUESTION='Is this the message you want to send to all AI crew members?';
var files=[['combat-writing',skill('combat-writing')],['battle',skill('battle')],['sparring',skill('sparring')]];
var rules=files[0][1], battle=files[1][1], sparring=files[2][1], help=skill('help');

// 1. The paragraph, in each of the three files, equal word for word.
function stepOf(text,name){
  var m=/^(?:- )?THE APPROVAL STEP \(issue 202; the same words in the rules skill, battle and sparring\): (.*)$/m.exec(text);
  check(!!m,name+': must carry the paragraph headed THE APPROVAL STEP with its same-words clause');
  return m?m[1]:'';
}
var steps=files.map(function(f){ return stepOf(f[1],f[0]); });
check(!!steps[0]&&steps[0]===steps[1]&&steps[1]===steps[2],'the three copies of THE APPROVAL STEP must be equal word for word');

// 2. What the paragraph says, checked in every copy so a missing copy names its file.
files.forEach(function(f,i){
  var name=f[0], p=steps[i];
  check(p.indexOf('"'+QUESTION+'"')>=0,name+': the step must ask exactly "'+QUESTION+'"');
  check(/After the text arrives and before anything is written to the inbox file or any packet is built/.test(p),name+': the step\'s place: after the text arrives and before anything is written to the inbox file or any packet is built');
  check(/shows the typed text in full, unchanged/.test(p),name+': the dialog shows the typed text in full, unchanged');
  check(/open one dialog with the AskUserQuestion tool/.test(p),name+': the step is one dialog opened with the AskUserQuestion tool');
  check(/Two options, in this order: \*\*Send\*\*[^*]*\*\*Change it\*\*/.test(p),name+': two options in this order, Send and Change it');
  var bold=p.match(/\*\*[^*]+\*\*/g)||[];
  check(bold.length===2&&bold[0]==='**Send**'&&bold[1]==='**Change it**',name+': the step names two options and no third; got '+bold.join(' '));
  check(/\*\*Send\*\* \(the round fires with the text as typed\)/.test(p),name+': Send fires the round with the text as typed');
  check(/\*\*Change it\*\* \(take the person's next message as the new text, show that, and ask again\)/.test(p),name+': Change it takes the next message as the new text, shows that and asks again');
  check(/names that seat in place of "all AI crew members"/.test(p),name+': a one-seat round names that seat in place of "all AI crew members"');
  check(/"\/cw:help for the full guide\."/.test(p),name+': the help line follows the question');
  check(/Text typed into the tool's own Other row is Change it: it is the new text, shown the same way, and the dialog asks again\. Only Send sends\./.test(p),name+': text typed into the dialog\'s own Other row is Change it, the new text, asked again; only Send sends');
  check(/Nothing is written and no packet is built until Send/.test(p),name+': nothing is written and no packet is built until Send');
  check(/never read for the word `rerate`/.test(p)&&/cannot turn a rating on/.test(p),name+': the typed text is never read for the word rerate');
  check(/the word `rerate` in the command's own arguments, and Debate on the Next picker, which always rates/.test(p),name+': a rating is asked for in two ways only, the word in the command and Debate');
  check(/A command typed whole with its keyword \(`\/cw:battle sn: <text>`\) is not asked/.test(p),name+': a command typed whole with its keyword is not asked');
  check(/Where you have no AskUserQuestion tool there is no picker, so no text is taken this way and there is nothing to ask/.test(p),name+': with no AskUserQuestion tool there is no picker and nothing to ask');
  var at=p.indexOf('After the text arrives'), q=p.indexOf(QUESTION), send=p.indexOf('**Send**');
  check(at>=0&&q>at&&send>q,name+': the step reads in order: the text arrives, the question, the options');
});

// 3. Each path names the step between the typed text and the round.
function between(text,re,name){ check(re.test(text),name); }
between(battle,/With a bare command there is no text to guess from: mark nothing, and after the choice ask for the text in one line, stop, take the next message as that text, and run THE APPROVAL STEP below before anything else/,'battle, the bare-command picker: the next message, then THE APPROVAL STEP, before anything else');
between(battle,/after a kind or a seat, one line asks for the text, the next message is the text, then THE APPROVAL STEP \(above\), and on Send the selection plus the text is the next round/,'battle, the Next picker: the text, then THE APPROVAL STEP, then the round on Send');
between(sparring,/Then ask for the question in one line, stop, take the next message as the question, and run THE APPROVAL STEP below before anything else/,'sparring, the question path: the next message, then THE APPROVAL STEP, before anything else');
between(sparring,/after a kind or a seat, one line asks for the text, the next message is the text, then THE APPROVAL STEP \(above\), and on Send the selection plus the text is the next round/,'sparring, the Next picker: the text, then THE APPROVAL STEP, then the round on Send');
between(rules,/stop, and take the next message as the text; then THE APPROVAL STEP \(below\); then, on Send, run the battle round as if typed with the keyword/,'the rules skill, the Next picker: the text, then THE APPROVAL STEP, then the round on Send');
between(rules,/the text goes into the inbox file and the packet as typed, after THE APPROVAL STEP when a picker took it as the next message/,'the rules skill, the round fires as chosen: the inbox write comes after THE APPROVAL STEP');
// The step stands before the first packet is built in each command skill: its paragraph sits in
// section 1, ahead of the section that builds the packets.
[['battle',battle,'## 5. Announce the round, build every packet'],['sparring',sparring,'## 4. Announce the round, build every packet']].forEach(function(t){
  var s=t[1].indexOf('THE APPROVAL STEP (issue 202'), b=t[1].indexOf(t[2]);
  check(s>=0&&b>s,t[0]+': the step\'s paragraph must stand before the section that builds the packets');
});

// 4. No rerate question in any of the three files.
var gone=[
  [/yes\/no/i,'a yes/no'],
  [/yes or no/i,'a "yes or no"'],
  [/rerate question/i,'a rerate question'],
  [/rerate reply/i,'a rerate reply'],
  [/rating question/i,'a rating question'],
  [/\*\*Rerate\*\*/,'a Rerate option'],
  [/\*\*No rating\*\*/,'a No rating option']
];
files.forEach(function(f){
  gone.forEach(function(g){
    var m=g[0].exec(f[1]);
    check(!m,f[0]+': still orders '+g[1]+' ("'+(m?f[1].slice(Math.max(0,m.index-60),m.index+60).replace(/\n/g,' '):'')+'")');
  });
});

// 5. The copies outside the three files.
var nextSection=(/^## What comes next: the picker\n\n([^\n]*)/m.exec(help)||['',''])[1];
check(!!nextSection,'help: the section "What comes next: the picker" must stand');
check(nextSection.indexOf('"'+QUESTION+'"')>=0&&/\*\*Send\*\*[^*]*\*\*Change it\*\*/.test(nextSection),'help, the picker section: must carry the question and the two options, Send and Change it');
check(!/yes or no/i.test(nextSection)&&!/rating question/i.test(nextSection),'help, the picker section: still carries the rating question');
check(/type the command with `rerate`, or pick Debate/.test(nextSection),'help, the picker section: must say how a rating is asked for now, the word in the command or Debate');
var readme=read(path.join(plugin,'README.md')), map=read(path.join(root,'docs','plugin-map.md'));
check(!/yes or no for rerate/i.test(readme)&&/then your text, shown back for you to send or change/.test(readme),'the plugin README: the Next picker ends with the text shown back, and no yes or no for rerate');
check(!/yes or no for rerate/i.test(map)&&/then one line for your text, shown back for you to send or change/.test(map),'the plugin map: the Next picker row ends with the text shown back, and no yes or no for rerate');

// 6. What stands.
check(/`rerate` counts wherever it sits in the line/.test(battle),'battle: the word `rerate` in the command still counts');
check(/Pass `--rerate` only when the person asked for `rerate`/.test(battle),'battle: packet.js --rerate is still passed when the person asked');
files.forEach(function(f){ check(/\*\*Debate: seats re-read and rerate\*\*/.test(f[1]),f[0]+': Debate stays on screen one of the Next picker'); });
check(/Debate runs `\/cw:sparring debate` on the run at once and asks nothing more \(it always rates\)/.test(rules),'the rules skill: Debate runs at once and always rates');

// 7. The eval case and its row.
var evalDir=path.join(plugin,'evals','picker-approval-before-packet');
var hasCase=fs.existsSync(path.join(evalDir,'prompt.md'))&&fs.existsSync(path.join(evalDir,'graders'));
check(hasCase&&fs.readdirSync(path.join(evalDir,'graders')).length>=2,'evals/picker-approval-before-packet: needs prompt.md and at least two graders');
if(hasCase){
  var graders=fs.readdirSync(path.join(evalDir,'graders')).map(function(g){ return read(path.join(evalDir,'graders',g)); }).join('\n');
  check(graders.indexOf('Is this the message you want to send')>=0&&/packet\\\.js/.test(graders),'evals/picker-approval-before-packet: a grader must hold the packet against the approval question');
}
var evalRow=(/^\| `picker-approval-before-packet` \|[^\n]*/m.exec(read(path.join(plugin,'evals','README.md')))||[''])[0];
check(!!evalRow,'evals/README.md: needs the row for picker-approval-before-packet');
check(/issue 204/.test(evalRow),'evals/README.md: the row for picker-approval-before-packet must name issue 204, the runner that cannot pass it');

// 8. CLAUDE.md states the same rule as the tree: the step, no rerate question, eight cases.
var claude=read(path.join(root,'CLAUDE.md'));
check(claude.indexOf('"'+QUESTION+'"')>=0&&/THE APPROVAL STEP \(issue 202/.test(claude)&&/pinned equal by `tests\/approval_check\.js`/.test(claude),'CLAUDE.md: must name THE APPROVAL STEP with the question\'s exact words and this check');
check(!/yes\/no for rerate where a rating is possible/.test(claude)&&!/a rerate reply that is not yes or no is no and the round still fires/.test(claude),'CLAUDE.md: still states the rerate question');
check(/text typed into the dialog's own Other row is Change it/.test(claude),'CLAUDE.md: must say text typed into the Other row is Change it');
check(/eight claude plugin eval cases/.test(claude)&&!/seven claude plugin eval cases/.test(claude),'CLAUDE.md: the layout must count eight eval cases');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'approval_check: '+failures.length+' failure(s), ':'approval_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
