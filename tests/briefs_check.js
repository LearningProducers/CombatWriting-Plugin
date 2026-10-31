// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// briefs_check.js: briefs by name, many kinds of writing in one project (Part 86, 2026-10-31).
// The founder's words: "what i want is for someone to use cw plugin for various writing projects
// at once which means various briefs. Simultaneous emails to different people, blogs, maybe even
// a speech, how does the user juggle different projects in the cw plugin?"
//
// What it pins, with the REAL scripts in a temporary project:
//   - new-run.js --brief <file> --brief-name <name> saves combat-writing/briefs/<name>.md byte for
//     byte, makes it the run's brief.md, logs run.created brief.name and brief.kept with the name
//     and the file, and leaves the unnamed default (combat-writing/brief.md) untouched; the kept
//     line names the brief and prints once.
//   - --brief-name <name> alone picks the saved brief (source named, no brief.kept); a name not
//     saved is refused with the saved names listed; a bad name and `update` are refused; a saved
//     brief's own file given as --brief reads as that name; --no-brief with --brief-name is refused.
//   - brief.js --update --name appends to the saved brief, creating it from the update alone when
//     there is none; with no --name on a run whose brief is named it appends to that brief and the
//     run's, the default untouched; with no name and no run, the default as before; the printed line
//     and brief.updated name the file.
//   - The short form, the Started-at line, record.md, board.html and the state name the brief.
//   - briefs.js lists the default and every saved brief with its first line, the word count and the
//     runs on each, newest first; --names prints the names alone; with nothing saved, one line.
//   - lib.isBriefName, lib.listBriefs, lib.briefFirstLine, lib.briefSourceOf on a named path.
//   - The skills: THE PASTE RULE lists `brief <name>:` in its three equal copies; each command skill
//     carries the briefs-by-name bullet and the --brief-name flag; skills/briefs/SKILL.md exists with
//     its frontmatter and runs briefs.js; the help has the "Many kinds of writing at once" section and
//     names /cw:briefs; the rules skill, the README and CLAUDE.md name the sixth write location.
//
// Run from the repo root:   node tests/briefs_check.js
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
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-briefs-'));
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).trim().split('\n').map(function(l){return JSON.parse(l);}); }
function created(run){ return logOf(run).filter(function(e){return e.event==='run.created';})[0]; }
function short(run){ return node('render-record.js',['--run',run,'--short']).stdout; }

var draft='Hi,\n\nA draft for the test.\n';
var dflt='Default rules: one ask.\n';
var cold='Cold email rules: a greeting, five sentences, one ask.\n';
var blog='Blog rules: 800 words, one idea, a title that names it.\n';
fs.writeFileSync(path.join(proj,'draft.md'),draft);
fs.writeFileSync(path.join(proj,'dflt.md'),dflt);
fs.writeFileSync(path.join(proj,'cold.md'),cold);
fs.writeFileSync(path.join(proj,'blog.md'),blog);

// 0. lib.
check(lib.isBriefName('cold-email')&&lib.isBriefName('blog_2')&&!lib.isBriefName('update')&&!lib.isBriefName('Two Words')&&!lib.isBriefName('')&&!lib.isBriefName(new Array(43).join('a')),'lib.isBriefName: one lower-case word, never update, 40 at most');
check(lib.listBriefs(proj).length===0,'lib.listBriefs: none before any is saved');
check(lib.briefFirstLine('\n\n  First line here.\nSecond.')==='First line here.','lib.briefFirstLine: the first non-empty line, trimmed');

// 1. The unnamed default, then a brief saved by name: the default untouched.
var r0=node('new-run.js',['--draft','draft.md','--brief','dflt.md','--name','d0','--stage','battle','--model','Test Model']);
check(r0.status===0&&read(lib.projectBriefPath(proj))===dflt&&created(r0.stdout.trim()).brief.name===null,'run d0: a brief with no name is the default and run.created brief.name is null');
var r1=node('new-run.js',['--draft','draft.md','--brief','cold.md','--brief-name','cold-email','--name','c1','--stage','battle','--model','Test Model']);
check(r1.status===0,'run c1: exit '+r1.status+' '+r1.stderr);
var run1=r1.stdout.trim();
check(read(lib.briefNamePath(proj,'cold-email'))===cold&&read(path.join(run1,'brief.md'))===cold,'run c1: combat-writing/briefs/cold-email.md and the run\'s brief.md hold the brief byte for byte');
check(read(lib.projectBriefPath(proj))===dflt,'run c1: the unnamed default is untouched by a named brief');
var c1=created(run1);
check(c1.brief&&c1.brief.name==='cold-email'&&c1.brief.source==='given'&&c1.brief.from===null,'run c1: run.created brief carries the name and the path\'s source: '+JSON.stringify(c1.brief));
var kept=logOf(run1).filter(function(e){return e.event==='brief.kept';})[0];
check(kept&&kept.name==='cold-email'&&kept.file==='combat-writing/briefs/cold-email.md'&&kept.replaced===null&&kept.sha256===lib.sha256(Buffer.from(cold)),'run c1: brief.kept names the brief and its file: '+JSON.stringify(kept));
var s1=short(run1), s1b=short(run1);
check(s1.indexOf(lib.briefNameKeptLine('cold-email'))>=0&&s1b.indexOf(lib.briefNameKeptLine('cold-email'))<0&&s1.indexOf(lib.PROJECT_BRIEF_KEPT_LINE)<0,'run c1: the named kept line prints once, never the default\'s');
check(/^Brief: cold-email \(combat-writing\/briefs\/cold-email\.md, saved from this paste\)\.$/m.test(s1)&&/\(the brief cold-email came with it\)/.test(s1),'run c1: the short form\'s Brief line and Started-at line name the brief: '+s1);

// 2. Pick by name; refusals.
var r2=node('new-run.js',['--draft','draft.md','--brief-name','cold-email','--name','c2','--stage','sparring','--model','Test Model']);
check(r2.status===0,'run c2: exit '+r2.status+' '+r2.stderr);
var run2=r2.stdout.trim();
var c2=created(run2);
check(read(path.join(run2,'brief.md'))===cold&&c2.brief.name==='cold-email'&&c2.brief.source==='named'&&!logOf(run2).some(function(e){return e.event==='brief.kept';}),'run c2: --brief-name alone picks the saved brief, source named, nothing kept: '+JSON.stringify(c2.brief));
check(/^Brief: cold-email \(combat-writing\/briefs\/cold-email\.md\)\.$/m.test(short(run2)),'run c2: the Brief line names the picked brief');
var bad=node('new-run.js',['--draft','draft.md','--brief-name','speech','--name','x']);
check(bad.status===2&&/no saved brief named speech \(saved: cold-email\); save one with brief speech: <text>/.test(bad.stderr),'a name not saved is refused with the saved names: '+bad.stderr);
check(node('new-run.js',['--draft','draft.md','--brief','cold.md','--brief-name','Two Words','--name','x']).status===2&&node('new-run.js',['--draft','draft.md','--brief','cold.md','--brief-name','update','--name','x']).status===2,'a bad name and update are refused');
check(node('new-run.js',['--draft','draft.md','--brief-name','cold-email','--no-brief','--name','x']).status===2,'--no-brief with --brief-name is refused');
var r3=node('new-run.js',['--draft','draft.md','--brief',path.join('combat-writing','briefs','cold-email.md'),'--name','c3','--stage','battle','--model','Test Model']);
check(r3.status===0&&created(r3.stdout.trim()).brief.source==='named'&&created(r3.stdout.trim()).brief.name==='cold-email'&&!logOf(r3.stdout.trim()).some(function(e){return e.event==='brief.kept';}),'a saved brief\'s own file as --brief reads as that name and keeps nothing');
check(lib.briefSourceOf(lib.briefNamePath(proj,'cold-email'),proj).source==='named'&&lib.briefSourceOf(lib.briefNamePath(proj,'cold-email'),proj).from==='cold-email','lib.briefSourceOf: a named path');
// Replacing a saved brief by name: kept logs the sha it replaced.
fs.writeFileSync(path.join(proj,'cold2.md'),cold+'Never a question in the closer.\n');
var r4=node('new-run.js',['--draft','draft.md','--brief','cold2.md','--brief-name','cold-email','--name','c4','--stage','battle','--model','Test Model']);
var kept4=logOf(r4.stdout.trim()).filter(function(e){return e.event==='brief.kept';})[0];
check(r4.status===0&&kept4&&kept4.replaced===lib.sha256(Buffer.from(cold))&&read(lib.briefNamePath(proj,'cold-email'))===cold+'Never a question in the closer.\n'&&read(lib.projectBriefPath(proj))===dflt,'brief <name>: replaces the saved brief, logs the sha replaced, the default untouched');

// 2b. A brief picked by name with no draft and no unnamed default makes a brief-only run (the watchman's catch,
// 2026-10-31: the guard read briefName before its declaration, so this very call was refused as "--draft or --brief
// is required"); with no draft, no brief and no name the refusal stands.
var fresh=fs.mkdtempSync(path.join(os.tmpdir(),'cw-briefs-fresh-'));
fs.writeFileSync(path.join(fresh,'cold.md'),cold);
function nodeIn(cwd,script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:cwd,encoding:'utf8'}); }
check(nodeIn(fresh,'new-run.js',['--brief','cold.md','--brief-name','cold-email','--name','save','--stage','strategy']).status===0,'fresh project: a brief saved by name with no draft makes a run');
var pick=nodeIn(fresh,'new-run.js',['--brief-name','cold-email','--name','pick','--stage','strategy']);
check(pick.status===0&&fs.existsSync(path.join(pick.stdout.trim(),'brief.md'))&&!fs.existsSync(path.join(pick.stdout.trim(),'draft.md'))&&!fs.existsSync(lib.projectBriefPath(fresh))&&created(pick.stdout.trim()).brief.name==='cold-email'&&created(pick.stdout.trim()).draft===null,'fresh project: brief: <name> alone, no draft, no unnamed default, makes a brief-only run on the named brief: '+pick.stderr);
var none=nodeIn(fresh,'new-run.js',['--name','none','--stage','strategy']);
check(none.status===2&&/--draft <file> or --brief <file> is required/.test(none.stderr),'fresh project: nothing at all is still refused');
fs.rmSync(fresh,{recursive:true,force:true});

// 3. brief.js --update by name, by the run's name, and the default.
fs.writeFileSync(path.join(proj,'up.md'),'Prospect of the day: a warehouse firm.\n');
var u1=node('brief.js',['--update','up.md','--name','blog','--at','2026-10-31T10:00:00Z']);
check(u1.status===0&&/^Brief updated 2026-10-31 in combat-writing\/briefs\/blog\.md \(created from this update\): Prospect of the day/.test(u1.stdout)&&read(lib.briefNamePath(proj,'blog'))==='Update 2026-10-31: Prospect of the day: a warehouse firm.\n','brief.js --name on no such brief creates it from the update: '+u1.stdout+u1.stderr);
var u2=node('brief.js',['--update','up.md','--run',run2,'--at','2026-10-31T11:00:00Z']);
var upd=logOf(run2).filter(function(e){return e.event==='brief.updated';})[0];
check(u2.status===0&&/in combat-writing\/briefs\/cold-email\.md and the run's/.test(u2.stdout)&&upd&&upd.name==='cold-email'&&upd.project.file==='combat-writing/briefs/cold-email.md'&&/Update 2026-10-31: Prospect of the day/.test(read(lib.briefNamePath(proj,'cold-email')))&&/Update 2026-10-31: Prospect of the day/.test(read(path.join(run2,'brief.md')))&&read(lib.projectBriefPath(proj))===dflt,'brief.js --run on a named run adds to that brief and the run\'s, the default untouched: '+u2.stdout+JSON.stringify(upd));
check(/newest update 2026-10-31: Prospect of the day/.test(short(run2)),'the Brief line names the update on the named brief');
var u3=node('brief.js',['--update','up.md','--at','2026-10-31T12:00:00Z']);
check(u3.status===0&&/in combat-writing\/brief\.md:/.test(u3.stdout)&&/Update 2026-10-31: Prospect of the day/.test(read(lib.projectBriefPath(proj))),'brief.js with no name and no run adds to the default as before');
check(node('brief.js',['--update','up.md','--name','Bad Name']).status===2,'brief.js refuses a bad name');

// 4. The record, the board, the state.
node('render-record.js',['--run',run2]); node('render-board.js',['--run',run2]);
var rec=read(path.join(run2,'record.md')), board=read(path.join(run2,'board.html'));
check(/^\*\*Brief\*\* \(cold-email, combat-writing\/briefs\/cold-email\.md\):$/m.test(rec)&&rec.indexOf(cold.trim())>rec.indexOf('**Brief**'),'record.md: the Brief label names the brief');
check(/\*\*Started at:\*\* sparring: the run was made from a pasted draft, with no strategy stage \(the brief cold-email came with it\)\./.test(rec),'record.md: the Started-at line names the brief');
check(board.indexOf('<strong>Brief (cold-email, combat-writing/briefs/cold-email.md):</strong>')>=0,'board.html: the Brief label names the brief');
node('render-record.js',['--run',r0.stdout.trim()]);
check(/^\*\*Brief:\*\*$/m.test(read(path.join(r0.stdout.trim(),'record.md'))),'record.md on the default: the plain Brief label');
var st=JSON.parse(node('render-state.js',['--run',run2]).stdout);
check(st.brief.present===true&&st.brief.name==='cold-email'&&st.brief.text.indexOf(cold.trim())===0,'state: brief.name: '+JSON.stringify(st.brief&&st.brief.name));
check(JSON.parse(node('render-state.js',['--run',r0.stdout.trim()]).stdout).brief.name===null,'state on the default: brief.name null');

// 5. briefs.js.
var l=node('briefs.js',[]);
check(l.status===0,'briefs.js: exit '+l.status+' '+l.stderr);
var lines=l.stdout.trim().split('\n');
check(/^default \(combat-writing\/brief\.md\): Default rules: one ask\. \(\d+ words\)$/.test(lines[0])&&lines[1]==='  runs: '+path.basename(r0.stdout.trim()),'briefs.js: the default first with its first line and its run: '+lines.slice(0,2).join(' | '));
check(/^blog \(combat-writing\/briefs\/blog\.md\): Update 2026-10-31: Prospect of the day: a warehouse firm\. \(\d+ words\)$/.test(lines[2])&&lines[3]==='  runs: no run yet','briefs.js: blog with no run yet: '+lines.slice(2,4).join(' | '));
check(/^cold-email \(combat-writing\/briefs\/cold-email\.md\): Cold email rules: a greeting, five sentences, one ask\. \(\d+ words\)$/.test(lines[4])&&lines[5]==='  runs: '+[r4,r3,r2,r1].map(function(r){return path.basename(r.stdout.trim());}).join(', '),'briefs.js: cold-email with its runs newest first: '+lines.slice(4,6).join(' | '));
check(/^brief: <name> picks a saved brief for the next run; brief <name>: <text> replaces it; brief update <name>: <text> adds a dated line; brief: <text> with no name is the default\.$/.test(lines[6])&&lines.length===7,'briefs.js: the closing line and nothing else');
check(node('briefs.js',['--names']).stdout==='blog\ncold-email\n','briefs.js --names: the saved names alone, sorted');
var empty=fs.mkdtempSync(path.join(os.tmpdir(),'cw-briefs-empty-'));
var le=cp.spawnSync(process.execPath,[path.join(scripts,'briefs.js')],{cwd:empty,encoding:'utf8'});
check(le.status===0&&/^No brief yet\. brief: <text> in any command saves the project's default; brief <name>: <text> saves one by name/.test(le.stdout),'briefs.js with no brief: one line');
fs.rmSync(empty,{recursive:true,force:true});
// The listing writes and logs nothing.
var logLen=logOf(run2).length; node('briefs.js',[]);
check(logOf(run2).length===logLen,'briefs.js logs nothing');

// 6. The skills and the docs.
var battle=skill('battle'), sparring=skill('sparring'), strategy=skill('strategy'), rules=skill('combat-writing'), help=skill('help'), briefs=skill('briefs');
[['battle',battle],['sparring',sparring],['strategy',strategy]].forEach(function(p){
  check(/The keywords: `brief:`, `brief <name>:` \(a brief saved by name\), `brief update:` \(or `update brief:`, with an optional name\), `reader:` \(`prospect:`\), `battle:`/.test(p[1]),p[0]+': THE PASTE RULE lists brief <name>:');
  check(/^- Briefs by name \(Part 86, 2026-10-31\): one project, many briefs\. `brief <name>: <text>`/m.test(p[1])&&/pass `--brief <that file> --brief-name <name>` to `new-run\.js`; the unnamed default, `combat-writing\/brief\.md`, is untouched/.test(p[1])&&/`brief: <name>` alone, one word that matches a saved name \(`briefs\.js --names` lists them\), picks it/.test(p[1])&&/`brief update <name>: <text>` adds a dated line to that saved brief \(`brief\.js --update <file> --name <name>`\)/.test(p[1]),p[0]+': carries the briefs-by-name bullet');
  check(/\[--brief-name <name>\]/.test(p[1])&&/argument-hint: .*\[brief: \.\.\.\|brief <name>: \.\.\.\|brief: <name>\]/.test(p[1]),p[0]+': the command line and the argument-hint show --brief-name and the three brief forms');
});
check(/^name: briefs$/m.test(briefs)&&/^argument-hint: \(nothing\)$/m.test(briefs)&&briefs.split('\n')[0]==='---'&&/scripts\/briefs\.js/.test(briefs)&&/It reads only and writes nothing\./.test(briefs)&&/`\$ARGUMENTS` is ignored/.test(briefs),'skills/briefs/SKILL.md: the frontmatter, the script, reads only, arguments ignored');
check(/^## Many kinds of writing at once$/m.test(help)&&/A brief is the rules for one kind of writing, saved by name once/.test(help)&&/^- `\/cw:briefs` — lists your briefs/m.test(help)&&/^- `combat-writing\/briefs\/<name>\.md` in your project/m.test(help)&&/\(stages, order, commands, next, rounds, champion, briefs, runs, voices, files/.test(help),'help: the section, the command, the file and the topic');
check(/`\/cw:briefs` and `\/cw:runs` \(each a skill/.test(rules)&&/\[--brief-name <name>\] \[--reader <file>\] --stage strategy/.test(rules)&&/scripts\/briefs\.js \[--names\]/.test(rules)&&/scripts\/brief\.js --update <file> \[--run <folder>\] \[--name <brief name>\]/.test(rules)&&/combat-writing\/briefs\/<name>\.md` \(Part 86/.test(rules),'the rules skill: the sixth command, the flags, the two script rows, the write location');
check(/^- `\/cw:briefs` lists your briefs/m.test(read(path.join(plugin,'README.md'))),'the plugin README names /cw:briefs and the named forms');
var claude=read(path.join(root,'CLAUDE.md'));
check(/The sixth and last \(Part 86, 2026-10-31/.test(claude)&&/`\/cw:help`, `\/cw:briefs` and `\/cw:runs`;/.test(claude)&&/The seven commands are skills/.test(claude)&&/brief\.js, briefs\.js,/.test(claude),'CLAUDE.md: the sixth write location, the sixth command, the script');
check(/the seven commands/.test(read(path.join(root,'README.md'))),'the root README says seven commands');

fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'briefs_check: '+failures.length+' failure(s), ':'briefs_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
