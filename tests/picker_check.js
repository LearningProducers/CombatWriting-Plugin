// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// picker_check.js: THE PICKER RULE (issue 215). The Next picker, the one that ends every sparring
// and battle round, has an off switch kept per project, and three cases: a round picked runs as
// it always has; "I will type commands for this project", on the More screen, prints the text
// Next line at once and keeps the picker off in that project until one command turns it back
// on; a picker closed with no choice stores nothing, and the picker opens again after the next
// round. The default, the picker on, never changes unless the person chooses the option.
//
// What it pins, on the script (plugins/combat-writing/scripts/picker.js, the one writer of
// <project>/combat-writing/picker.json):
//   - Case 1, the default: a project nobody chose in reads `Picker: on`, one line, and the read
//     writes nothing.
//   - Case 2, the choice: `--off --run <folder>` prints two lines, the text Next line exactly as
//     `render-record.js --run <folder> --next` prints it and the line naming the way back
//     (`/cw:battle picker on`), and writes the file; from then on the bare read prints a first
//     line starting `Picker: off`, which says to open no picker, and the text Next line under
//     it; a second `--off` leaves the file's bytes as they were.
//   - That project only: a second project reads `Picker: on` while the first is off.
//   - The way back: `--on` removes the file and the read is `Picker: on` again; `--on` on a
//     project already on writes nothing and says so.
//   - Case 3, the closed picker: nothing is remembered. A whole round run through the real
//     scripts (the run, the packets, the answers, the checks, the record, the board, the state)
//     leaves no picker.json and the read is `Picker: on`; no script but picker.js and lib.js,
//     which holds the rule, and no hook but the result hook, names the file or lib's picker
//     functions, so nothing
//     else can write the choice; the result hook alone reads it too, and never writes it
//     (issue 216).
//   - A picker.json that is not JSON, or that says anything but off, reads as on: the default.
// And on the text:
//   - The paragraph headed THE PICKER RULE stands in the rules skill, battle and sparring, the
//     three copies equal word for word, and says the three cases, the two script calls, that a
//     closed picker is no choice and never puts the text Next line in the picker's place, that
//     the switch holds the Next picker alone, and the one command that turns it back on.
//   - The More screen reads Final reads / Champion / I will type commands for this project /
//     Done for now in the rules skill, battle, sparring and the help, and Help is no longer on it;
//     screen one is unchanged (tests/order_check.js pins its four options).
//   - Battle and sparring read `picker on` as the whole of the arguments and run no round.
//   - The help's picker section names the option, the file and the way back; the guide's files
//     line names picker.json and its word tables carry `picker on`.
//   - The script's own lines match lib's constants, so the skill, the script and this test read
//     one option label and one way back.
//   - CLAUDE.md and the plugin map carry the new More screen, the file as the eighth place and
//     the way back; the listing README carries the new More screen, the file and the way back.
//   - Every passage that says what the terminal shows after a round (the method's departure 15
//     and its mirror, the help's record section, the listing README, CLAUDE.md) names the text
//     Next line for a project with the picker off.
//
// Run from the repo root:   node tests/picker_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.join(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var scripts=path.join(plugin,'scripts');
var lib=require(path.join(scripts,'lib.js'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
function skill(name){ return read(path.join(plugin,'skills',name,'SKILL.md')); }
function nodeIn(dir,script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args||[]),{cwd:dir,encoding:'utf8'}); }
function lines(r){ return r.stdout.replace(/\n$/,'').split('\n'); }
// lib's read, guarded so this file reports its failures on a tree that has no picker rule yet.
function picker(dir){ return typeof lib.readPicker==='function'?lib.readPicker(dir):{}; }

var OPTION='I will type commands for this project';
var BACK='/cw:battle picker on';
var REL='combat-writing/picker.json';

// The constants the script, the skills and this test share.
check(lib.PICKER_OPTION===OPTION,'lib.PICKER_OPTION must be "'+OPTION+'"; got '+JSON.stringify(lib.PICKER_OPTION));
check(lib.PICKER_ON_CMD===BACK,'lib.PICKER_ON_CMD must be "'+BACK+'"; got '+JSON.stringify(lib.PICKER_ON_CMD));
check(typeof lib.pickerPath==='function'&&typeof lib.readPicker==='function','lib must export pickerPath and readPicker');
check(fs.existsSync(path.join(scripts,'picker.js')),'plugins/combat-writing/scripts/picker.js must exist');

// A project with one round run through the real scripts. Invented text, invented names.
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-picker-'));
var other=fs.mkdtempSync(path.join(os.tmpdir(),'cw-picker-other-'));
function node(script,args){ return nodeIn(proj,script,args); }
fs.writeFileSync(path.join(proj,'draft.md'),'Dear board,\n\nPlease approve the letter of intent this week.\n\nDana\n');
fs.writeFileSync(path.join(proj,'brief.md'),'I am the CEO. Purpose: a yes on the LOI this week. Stakes: the deal.\n');
var r=node('new-run.js',['--draft','draft.md','--brief','brief.md','--stage','sparring','--name','board letter','--session-model','Test Model 1.0','--model-2','Test Model 0.5']);
check(r.status===0,'new-run: exit '+r.status+' '+r.stderr);
var run=r.stdout.trim();
var file=path.join(proj,'combat-writing','picker.json');
var round='01-sparring';
['seat-1','seat-2'].forEach(function(id,i){
  var p=node('packet.js',['--run',run,'--round',round,'--seat',id]);
  check(p.status===0,'packet '+id+': exit '+p.status+' '+p.stderr);
  var answer=path.join(run,'rounds',round,id+'.answer.md');
  fs.writeFileSync(answer,'RATING: '+(i?8:6)+'/10\n\nThe ask is clear and the close is thin. "Please approve the letter of intent this week." carries the whole letter, and nothing under it says why this week.\n');
  var c=node('check-answer.js',[answer,'--run',run]);
  check(c.status===0,'check-answer '+id+': exit '+c.status+' '+c.stdout+c.stderr);
});
var short=node('render-record.js',['--run',run,'--short']);
check(short.status===0,'render-record --short: exit '+short.status+' '+short.stderr);
check(node('render-board.js',['--run',run]).status===0,'render-board: must exit 0');
check(node('render-state.js',['--run',run]).status===0,'render-state: must exit 0');
var next=node('render-record.js',['--run',run,'--next']);
var nextLine=next.stdout.replace(/\n$/,'');
check(next.status===0&&nextLine.indexOf('Next: /cw:battle fq:')===0&&nextLine.indexOf('\n')<0,'render-record --next: the text Next line, one line; got '+JSON.stringify(next.stdout));

// Case 3, the closed picker: a whole round leaves nothing remembered, and the read is on.
check(!fs.existsSync(file),'case 3: a round run through the real scripts must leave no '+REL);
var on0=node('picker.js',['--run',run]);
check(on0.status===0&&on0.stdout==='Picker: on\n','case 1 and 3: with no choice made the read must print exactly "Picker: on"; got '+JSON.stringify(on0.stdout+on0.stderr));
check(!fs.existsSync(file),'the read must write nothing');
var onRoot=node('picker.js',[]);
check(onRoot.status===0&&onRoot.stdout==='Picker: on\n','the read with no --run (the project is the working folder) must print "Picker: on"; got '+JSON.stringify(onRoot.stdout+onRoot.stderr));
// Nothing but picker.js (and lib, which holds the rule) names the file or lib's picker functions.
var others=fs.readdirSync(scripts).filter(function(f){return /\.js$/.test(f)&&f!=='picker.js'&&f!=='lib.js';}).map(function(f){return path.join(scripts,f);})
  .concat(fs.readdirSync(path.join(plugin,'hooks')).filter(function(f){return /\.js$/.test(f);}).map(function(f){return path.join(plugin,'hooks',f);}));
others.forEach(function(p){
  if(path.basename(p)==='show-result.js')return; // the one hook that reads the choice (issue 216), held below
  check(!/picker\.json|PICKER_FILE|PICKER_REL|pickerPath|readPicker|writePicker/.test(read(p)),path.relative(root,p)+': only picker.js may write the stored choice, and only it and the result hook may read it');
});
// The result hook reads the choice and never writes it (issue 216): its one function that names
// the file holds no write, no append, no unlink and no mkdir.
var hookSrc=read(path.join(plugin,'hooks','show-result.js'));
var offFn=(/\nfunction pickerOff\(runDir\)\{[\s\S]*?\n\}\n/.exec(hookSrc)||[''])[0];
check(!!offFn&&/picker\.json/.test(offFn),'hooks/show-result.js: must hold a pickerOff(runDir) function that names picker.json');
check(!!offFn&&!/write|append|unlink|mkdir|rmSync|rename/i.test(offFn),'hooks/show-result.js: pickerOff must read only');
check(others.length>=20,'the sweep of the other scripts and hooks must read them; got '+others.length);

// Case 2, the choice: the text Next line at once, the way back named, the file written.
var off=node('picker.js',['--run',run,'--off']);
var offLines=lines(off);
check(off.status===0&&offLines.length===2,'case 2: --off --run must print two lines; got '+JSON.stringify(off.stdout+off.stderr));
check(offLines[0]===nextLine,'case 2: the first line must be the text Next line as render-record.js --next prints it; got '+JSON.stringify(offLines[0]));
check(/^Picker off for this project/.test(offLines[1]||'')&&(offLines[1]||'').indexOf(BACK+' turns it back on')>=0&&(offLines[1]||'').indexOf(REL)>=0,'case 2: the second line must say the picker is off for this project, name '+REL+' and say "'+BACK+' turns it back on"; got '+JSON.stringify(offLines[1]));
check(fs.existsSync(file),'case 2: --off must write '+REL);
var kept=fs.existsSync(file)?read(file):'';
var j=null; try{ j=JSON.parse(kept); }catch(e){}
check(!!j&&j.picker==='off'&&/^\d{4}-\d\d-\d\dT/.test(j.at||'')&&j.run===path.basename(run),'case 2: the file must hold {picker: "off", at, run}; got '+kept);
check(fs.readdirSync(path.join(proj,'combat-writing')).indexOf('picker.json')>=0&&!fs.existsSync(path.join(run,'picker.json')),'case 2: the choice is the project\'s, never inside the run folder');
check(picker(proj).off===true&&picker(other).off===false,'lib.readPicker: off in the project that chose, on in another');

// From then on: no picker; the read says so and carries the text Next line.
var st=node('picker.js',['--run',run]);
var stLines=lines(st);
check(st.status===0&&stLines.length===2&&/^Picker: off for this project/.test(stLines[0]),'off: the read must print a first line starting "Picker: off for this project"; got '+JSON.stringify(st.stdout+st.stderr));
check(/Open no picker/.test(stLines[0]||'')&&(stLines[0]||'').indexOf(BACK+' turns it back on')>=0,'off: the first line must say to open no picker and name the way back; got '+JSON.stringify(stLines[0]));
check(stLines[1]===nextLine,'off: the second line must be the text Next line; got '+JSON.stringify(stLines[1]));
var stRoot=node('picker.js',[]);
check(stRoot.status===0&&lines(stRoot).length===1&&/^Picker: off for this project/.test(stRoot.stdout),'off, no --run: one line, the state; got '+JSON.stringify(stRoot.stdout+stRoot.stderr));
// A later round in the same project still reads off; a second --off rewrites nothing.
var off2=node('picker.js',['--run',run,'--off']);
check(off2.status===0&&lines(off2)[0]===nextLine&&/^Picker already off for this project/.test(lines(off2)[1]||''),'a second --off: the text Next line, then "Picker already off for this project"; got '+JSON.stringify(off2.stdout+off2.stderr));
check(fs.existsSync(file)&&read(file)===kept,'a second --off must leave the file\'s bytes as they were');

// That project only.
var o=nodeIn(other,'picker.js',[]);
check(o.status===0&&o.stdout==='Picker: on\n'&&!fs.existsSync(path.join(other,'combat-writing','picker.json')),'that project only: a second project must read "Picker: on" and hold no file; got '+JSON.stringify(o.stdout+o.stderr));

// The way back.
var back=node('picker.js',['--on']);
check(back.status===0&&/^Picker on for this project/.test(back.stdout)&&lines(back).length===1,'the way back: --on must print one line, "Picker on for this project..."; got '+JSON.stringify(back.stdout+back.stderr));
check(!fs.existsSync(file),'the way back: --on must remove '+REL+', so nothing is remembered');
var on1=node('picker.js',['--run',run]);
check(on1.stdout==='Picker: on\n','the way back: the read must print "Picker: on" again; got '+JSON.stringify(on1.stdout));
var back2=node('picker.js',['--on']);
check(back2.status===0&&/^Picker already on for this project/.test(back2.stdout)&&!fs.existsSync(file),'--on on a project already on: says so and writes nothing; got '+JSON.stringify(back2.stdout+back2.stderr));

// The default holds against a file nobody chose through the option.
fs.mkdirSync(path.join(other,'combat-writing'),{recursive:true});
fs.writeFileSync(path.join(other,'combat-writing','picker.json'),'{not json');
var broken=nodeIn(other,'picker.js',[]);
check(broken.status===0&&/^Picker: on\b/.test(broken.stdout)&&/not JSON/.test(broken.stdout),'a picker.json that is not JSON reads as on and the line says so; got '+JSON.stringify(broken.stdout+broken.stderr));
fs.writeFileSync(path.join(other,'combat-writing','picker.json'),'{"picker":"maybe"}\n');
check(nodeIn(other,'picker.js',[]).stdout==='Picker: on\n'&&picker(other).off===false,'a picker.json that says anything but off reads as on');
// Usage: the two words never ride together, and --off outside a run still works from the project.
var both=node('picker.js',['--on','--off']);
check(both.status===2&&/--on or --off, never both/.test(both.stderr),'--on with --off must be refused; got '+both.status+' '+both.stderr);
var offRoot=nodeIn(other,'picker.js',['--off']);
check(offRoot.status===0&&lines(offRoot).length===1&&/^Picker off for this project/.test(offRoot.stdout)&&picker(other).off===true,'--off with no --run: the one line, and the file written in the working folder\'s project; got '+JSON.stringify(offRoot.stdout+offRoot.stderr));

// The text.
var rules=skill('combat-writing'), battle=skill('battle'), sparring=skill('sparring'), help=skill('help');
var files=[['combat-writing',rules],['battle',battle],['sparring',sparring]];
function ruleOf(text,name){
  var m=/^(?:- )?THE PICKER RULE \(issue 215; the same words in the rules skill, battle and sparring\): (.*)$/m.exec(text);
  check(!!m,name+': must carry the paragraph headed THE PICKER RULE with its same-words clause');
  return m?m[1]:'';
}
var paras=files.map(function(f){ return ruleOf(f[1],f[0]); });
check(!!paras[0]&&paras[0]===paras[1]&&paras[1]===paras[2],'the three copies of THE PICKER RULE must be equal word for word');
files.forEach(function(f,i){
  var name=f[0], p=paras[i];
  check(p.indexOf('**'+OPTION+'**')>=0,name+': the rule must name the option **'+OPTION+'**');
  check(/One: the person picks a round, and it runs as it always has/.test(p),name+': case 1, a picked round runs as it always has');
  check(/scripts\/picker\.js --run <folder> --off` at once, in the same turn/.test(p)&&/print its two lines as printed, the text Next line and the line naming the way back, and nothing else/.test(p),name+': case 2, run picker.js --off in the same turn and print its two lines');
  check(/kept in `combat-writing\/picker\.json` in the person's project, for that project only/.test(p),name+': case 2, the choice is kept in the project\'s picker.json, for that project only');
  check(/Three: the person closes the picker without choosing/.test(p)&&/that is no choice: run nothing, write nothing, remember nothing/.test(p),name+': case 3, a closed picker is no choice and nothing is remembered');
  check(/after the next round open the Next picker again as after any round/.test(p)&&/never put the text Next line in its place because a picker was closed/.test(p),name+': case 3, the picker opens again after the next round and the text Next line never stands in for a closed one');
  check(/Before you open the Next picker after a round, run `node \$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/picker\.js --run <folder>`/.test(p)&&/`Picker: on` means open it/.test(p)&&/a first line starting `Picker: off` means open no picker in this project/.test(p),name+': the read before every Next picker, and what its two answers mean');
  check(/the way a round ends where you have no AskUserQuestion tool/.test(p),name+': with the picker off a round ends as where there is no picker tool');
  check(/the plugin's result hook reads the same file and tells you the same/.test(p)&&!/does not hold there/.test(p),name+': the rule must say the result hook reads the same file and says the same (issue 216)');
  check(/The switch holds the Next picker alone/.test(p),name+': the switch holds the Next picker alone');
  check(p.indexOf('`'+BACK+'`')>=0&&/run `picker\.js --on`, print its line, and run no round/.test(p),name+': the way back, '+BACK+', runs picker.js --on and no round');
  check(/never changes unless the person chooses the option/.test(p),name+': the default never changes unless the person chooses the option');
  var a=p.indexOf('One:'), b=p.indexOf('Two:'), c=p.indexOf('Three:');
  check(a>=0&&b>a&&c>b,name+': the three cases read in order');
});
// The More screen, in the four files that lay it out; Help is off it; screen one stands.
var more=/\*\*Final reads\*\*[^\n*]*\*\*Champion\*\*[^\n]*\*\*I will type commands for this project\*\*[^\n*]*\*\*Done for now\*\*/;
var oldMore=/\*\*Champion\*\*[^\n]*\*\*Help\*\*[^\n]*\*\*Done for now\*\*/;
var screenOne=/\*\*Battle: everyone\*\*[^\n]*\*\*Battle: one seat\*\*[^\n]*\*\*Debate: seats re-read and rerate\*\*[^\n]*\*\*More\*\*/;
[['combat-writing',rules],['battle',battle],['sparring',sparring],['help',help]].forEach(function(p){
  check(more.test(p[1]),p[0]+': the More screen must read Final reads / Champion / '+OPTION+' / Done for now');
  check(!oldMore.test(p[1]),p[0]+': Help must be off the More screen');
  check(screenOne.test(p[1]),p[0]+': screen one must stand: Battle: everyone / Battle: one seat / Debate: seats re-read and rerate / More');
});
check(/Under More, four options in this order/.test(rules),'the rules skill: More holds four options in order');
check(!/Help shows the guide\./.test(rules),'the rules skill: no "Help shows the guide." sentence for a More option that is gone');
// The typed way back, in the two stage commands.
[['battle',battle],['sparring',sparring]].forEach(function(p){
  check(/`picker on` as the whole of the arguments/.test(p[1])&&/run no round/.test(p[1]),p[0]+': must read `picker on` as the whole of the arguments and run no round');
  check(/^argument-hint: .*\[picker on\]/m.test(p[1]),p[0]+': the argument hint must show [picker on]');
  check(/THE PICKER RULE \((?:above|below)\)/.test(p[1]),p[0]+': the close of the round must point at THE PICKER RULE');
});
check(/THE PICKER RULE \(below\)/.test(rules),'the rules skill: the Next picker bullet must point at THE PICKER RULE');
// The help.
var guide=(/<!-- THE GUIDE BEGIN -->([\s\S]*?)<!-- THE GUIDE END -->/.exec(help)||['',''])[1];
check(/picker\.json/.test(guide),'help all: the files line must name picker.json');
check(/`picker on`/.test(guide),'help all: the word tables must carry `picker on`');
var nextSection=(/^## What comes next: the picker$([\s\S]*?)^## /m.exec(help)||['',''])[1];
check(nextSection.indexOf('**'+OPTION+'**')>=0&&nextSection.indexOf('`'+BACK+'`')>=0&&/combat-writing\/picker\.json/.test(nextSection),'help next: must name the option, the way back and the file');
check(/Close the picker without choosing and nothing is remembered/.test(nextSection),'help next: must say a closed picker remembers nothing');
var filesSection=(/^## Where files land$(?![\s\S]*^## Where files land$)([\s\S]*?)^## /m.exec(help)||['',''])[1];
check(/combat-writing\/picker\.json/.test(filesSection),'help files: the full section must name combat-writing/picker.json');
// The script table in the rules skill.
check(/scripts\/picker\.js \[--run <folder>\] \[--off\\\|--on\]/.test(rules),'the rules skill: the script table must carry picker.js');
// The documents the ruling stands in.
var claude=read(path.join(root,'CLAUDE.md')), rulings=read(path.join(root,'RULINGS.md')), map=read(path.join(root,'docs','plugin-map.md'));
check(/Under More: Final reads \/ Champion \/ I will type commands for this project \/ Done for now/.test(claude)&&/THE PICKER RULE \(/.test(claude)&&/THE PICKER RULE \(issue 215/.test(rulings),'CLAUDE.md: the Next picker bullet must carry the new More screen and THE PICKER RULE; RULINGS.md (issue 224): the rule with its issue');
check(/The eighth and last \(issue 215/.test(claude)&&/`combat-writing\/picker\.json`/.test(claude)&&/`scripts\/picker\.js --off`/.test(claude),'CLAUDE.md: picker.json is the eighth write location, written by scripts/picker.js');
check(!/The seventh and last/.test(claude)&&!/The seventh and last/.test(rulings),'CLAUDE.md and RULINGS.md: the seventh write location is no longer the last');
check(claude.indexOf('`'+BACK+'`')>=0,'CLAUDE.md: must name the way back, '+BACK);
check(/no hook but `show-result\.js`, which reads it and never writes it/.test(claude)&&/issue 216/.test(claude)&&!/Named and not held by code: the result hook/.test(claude)&&!/Named and not held by code: the result hook/.test(rulings),'CLAUDE.md: the result hook reads the switch (issue 216) and the named gap is closed, in it and in RULINGS.md');
check(/under More: Final reads \/ Champion \/ I will type commands for this project \/ Done for now/.test(map)&&!/Final reads \/ Champion \/ Help \/ Done for now/.test(map),'plugin map: the picker row must carry the new More screen and not the old one');
check(/`combat-writing\/picker\.json`/.test(map)&&/the eight places/.test(map)&&!/the seven places/.test(map),'plugin map: picker.json among the eight places written');
check(map.indexOf(BACK)>=0&&/`picker\.js`/.test(map),'plugin map: must name the way back and picker.js');
// The listing README, which lays out the same picker for a reader of the directory.
var readme=read(path.join(plugin,'README.md'));
check(/or More \(final reads, champion, I will type commands for this project, done for now\)/.test(readme)&&!/champion, help, done for now/.test(readme),'the plugin README: More must read final reads, champion, I will type commands for this project, done for now');
check(readme.indexOf('`'+BACK+'`')>=0&&/`combat-writing\/picker\.json`/.test(readme)&&/a picker closed with no choice stores nothing and returns after the next round/.test(readme),'the plugin README: must name the way back, the file and the closed picker');
// No passage says a round ends on "the picker, and nothing else" without the switch beside it:
// the method's departure 15 and its docs/ mirror, the help's record section, the listing README
// and CLAUDE.md's board bullet each carry the text Next line for a project with the picker off.
var method=read(path.join(plugin,'method','combat-writing.md')), mirror=read(path.join(root,'docs','combat-writing.md'));
[['the method',method],['the method\'s docs/ mirror',mirror],['the help',help],['the plugin README',readme],['CLAUDE.md',claude],['RULINGS.md',rulings]].forEach(function(p){
  check(!/the picker, and nothing else/.test(p[1]),p[0]+': "the picker, and nothing else" must carry the switch: the text Next line where the picker is off');
  check(/the picker \((?:the text Next line|the one line of text)[^)]*picker (?:is )?off[^)]*\), and nothing else/.test(p[1]),p[0]+': the sentence on what the terminal shows must name the text Next line for a project with the picker off');
});
// The three skills: no sentence says the reply after a round is the picker without the switch
// beside it (the rules skill's seat-key bullet, its round-fires-as-chosen bullet, which reaches
// a keyword typed by hand, and its Showing a result line; battle's and sparring's closing lines).
check(/the round line and the picker \(the text Next line where the project's picker is off, THE PICKER RULE below\)/.test(rules)&&!/the round line and the picker,/.test(rules),'the rules skill: the round-fires-as-chosen bullet must carry the switch after "the round line and the picker"');
check(/then the Next picker \(the text Next line where the project's picker is off, THE PICKER RULE below\)/.test(rules)&&!/then the Next picker;/.test(rules),'the rules skill: the seat-key bullet must carry the switch after "then the Next picker"');
check(/then the Next picker \(above\), or the text Next line where the project's picker is off \(THE PICKER RULE\)/.test(rules),'the rules skill: Showing a result must carry the switch after "then the Next picker (above)"');
[['battle',battle],['sparring',sparring]].forEach(function(p){
  check(/the picker follows the round line \(the text Next line does, where the project's picker is off\)\./.test(p[1])&&!/the picker follows the round line\./.test(p[1]),p[0]+': "the picker follows the round line" must carry the switch');
});

failures.forEach(function(f){console.log('FAIL '+f);});
console.log('picker_check: '+passes+' passed, '+failures.length+' failed');
process.exit(failures.length?1:0);
