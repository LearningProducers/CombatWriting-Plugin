// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// runs_check.js: open runs, and the way back (Part 85, 2026-10-31). The founder's words: "There
// needs to be a clear way for a user to return to a run not finished whether it's an email or an
// article and it ought to be able to start fresh on a new one whenever also, i guess publishing or
// sending makes it complete?"
//
// What it pins, with the REAL scripts in a temporary project:
//   - runs.js lists every run newest first, one line each: the id, the brief by name (default, or
//     none), the reader's first words, the last round or "no round", the drafts, and OPEN or
//     SHIPPED <date> once champion.js froze a canon; then the closing line; with no run, one line.
//   - runs.js --match <word>: one match prints the folder alone (exit 0); several print the count
//     and their lines (exit 3); none prints "No run matches" and the listing (exit 1); the match is
//     case-insensitive on the id; it writes and logs nothing.
//   - lib.runSlug, lib.thisRunLine, lib.runSummary, lib.matchRuns.
//   - Every text Next line names the run and the line to leave it: render-record.js --next on a run
//     with rounds and on one without, record.md's Next line, and the state's next_line and run.slug.
//   - The skills: skills/runs/SKILL.md exists with its frontmatter and runs runs.js; the battle,
//     sparring and champion skills read `run:` as a folder or a word; the help has "Returning and
//     starting fresh", the command and the topic; the rules skill, both READMEs and CLAUDE.md name
//     the seventh command and the runs script.
//
// Run from the repo root:   node tests/runs_check.js
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
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-runs-'));
function node(script,args,cwd){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:cwd||proj,encoding:'utf8'}); }

// An empty project.
var e=node('runs.js',[]);
check(e.status===0&&e.stdout==='No run yet. Paste a draft with battle: or sparring: to start one.\n','runs.js with no run: one line, got '+JSON.stringify(e.stdout));

fs.writeFileSync(path.join(proj,'draft.md'),'Hi,\n\nA draft.\n');
fs.writeFileSync(path.join(proj,'cold.md'),'Cold email rules.\n');
fs.writeFileSync(path.join(proj,'reader.md'),'The prospect, a founder of a warehouse firm, whose June post the draft answers in one line.\n');
var r1=node('new-run.js',['--draft','draft.md','--brief','cold.md','--brief-name','cold-email','--reader','reader.md','--name','First Piece','--stage','battle','--model','Test Model']);
var run1=r1.stdout.trim();
var r2=node('new-run.js',['--draft','draft.md','--name','second','--stage','sparring','--model','Test Model']);
var run2=r2.stdout.trim();
check(r1.status===0&&r2.status===0,'two runs made');
// Round and ship the second.
node('packet.js',['--run',run2,'--round','01-sparring','--seat','seat-1']);
fs.writeFileSync(path.join(run2,'rounds','01-sparring','seat-1.answer.md'),'RATING: 8/10\nShips as is.\n');
fs.writeFileSync(path.join(proj,'ship.md'),'email to the board\n');
var sh=node('champion.js',['--run',run2,'--kind','shipped','--file','ship.md','--at','2026-10-31T12:00:00Z']);
check(sh.status===0&&fs.existsSync(path.join(run2,'canon.md')),'the second run is shipped: '+sh.stderr);
node('add-draft.js',['--run',run1,'--file','draft.md','--stage','battle']);

// 1. lib.
check(lib.runSlug('2026-10-31-2303-first-piece')==='first-piece'&&lib.runSlug('odd')==='odd','lib.runSlug: the id after its date and time');
check(lib.thisRunLine('2026-10-31-2303-first-piece')===' This run: 2026-10-31-2303-first-piece (run: first-piece returns to it). A new piece: paste it with battle: or sparring:.'&&lib.thisRunLine(null)==='','lib.thisRunLine: the sentence, empty with no id');
var s1=lib.runSummary(run1), s2=lib.runSummary(run2);
check(s1.id===path.basename(run1)&&s1.slug==='first-piece'&&s1.brief==='cold-email'&&s1.brief_name==='cold-email'&&/^The prospect, a founder of a warehouse firm/.test(s1.reader)&&s1.last_round===null&&s1.rounds===0&&s1.drafts===2&&s1.shipped===false&&s1.shipped_date===null,'runSummary of the open run: '+JSON.stringify(s1));
check(s2.brief==='none'&&s2.reader===null&&s2.last_round==='01-sparring'&&s2.drafts===1&&s2.shipped===true&&s2.shipped_date==='2026-10-31'&&s2.canon==='canon.md','runSummary of the shipped run: '+JSON.stringify(s2));
check(lib.runsLine(s1)===s1.id+' · brief: cold-email · reader: '+s1.reader+' · no round · 2 drafts · OPEN','lib.runsLine on the open run: '+lib.runsLine(s1));
check(lib.runsLine(s2)===s2.id+' · brief: none · reader: none · last round 01-sparring · 1 draft · SHIPPED 2026-10-31','lib.runsLine on the shipped run: '+lib.runsLine(s2));
check(lib.matchRuns(proj,'FIRST').length===1&&lib.matchRuns(proj,'2026').length===2&&lib.matchRuns(proj,'zzz').length===0&&lib.matchRuns(proj,'').length===0,'lib.matchRuns: case-insensitive on the id, nothing on an empty word');

// 2. runs.js.
var l=node('runs.js',[]);
var lines=l.stdout.trim().split('\n');
check(l.status===0&&lines.length===3&&lines[0]===lib.runsLine(s2)&&lines[1]===lib.runsLine(s1),'runs.js: newest first, one line each: '+l.stdout);
check(/^run: <word> on any stage command returns to a run \(a word of its id\); a new piece: paste it with battle: or sparring:\. A run is OPEN until \/cw:champion shipped freezes its canon\.$/.test(lines[2]),'runs.js: the closing line');
var m1=node('runs.js',['--match','first']);
check(m1.status===0&&m1.stdout===run1+'\n','runs.js --match one: the folder alone, exit 0: '+m1.stdout);
var m2=node('runs.js',['--match','2026']);
check(m2.status===3&&/^2 runs match 2026:\n/.test(m2.stdout)&&m2.stdout.indexOf(lib.runsLine(s2))>0&&m2.stdout.indexOf(lib.runsLine(s1))>0,'runs.js --match several: the count and the lines, exit 3: '+m2.stdout);
var m0=node('runs.js',['--match','zzz']);
check(m0.status===1&&/^No run matches zzz\.\n/.test(m0.stdout)&&m0.stdout.indexOf(lib.runsLine(s1))>0,'runs.js --match none: the line and the listing, exit 1');
check(node('runs.js',['--match']).status===2,'runs.js --match with no word is refused');
var before=read(path.join(run1,'log.jsonl')); node('runs.js',[]); node('runs.js',['--match','first']);
check(read(path.join(run1,'log.jsonl'))===before,'runs.js logs nothing');
var other=fs.mkdtempSync(path.join(os.tmpdir(),'cw-runs-root-'));
check(node('runs.js',['--root',proj],other).stdout===l.stdout,'runs.js --root reads another project');
fs.rmSync(other,{recursive:true,force:true});

// 3. The Next line names the run.
var n2=node('render-record.js',['--run',run2,'--next']);
check(n2.status===0&&n2.stdout.trim().split('\n').length===1&&/^Next: \/cw:battle fq:/.test(n2.stdout)&&n2.stdout.trim().slice(-lib.thisRunLine(s2.id).trim().length)===lib.thisRunLine(s2.id).trim(),'--next on a run with rounds ends with This run: '+n2.stdout);
var n1=node('render-record.js',['--run',run1,'--next']);
check(n1.status===0&&/^No rounds yet\./.test(n1.stdout)&&n1.stdout.indexOf('This run: '+s1.id+' (run: first-piece returns to it). A new piece: paste it with battle: or sparring:.')>0,'--next on a run with no round ends with This run: '+n1.stdout);
var rec=read(path.join(run2,'record.md'));
check(rec.indexOf('**Next:** /cw:battle fq:')>=0&&rec.indexOf('This run: '+s2.id+' (run: second returns to it).')>0,'record.md: the Next line names the run');
var st=JSON.parse(node('render-state.js',['--run',run2]).stdout);
check(st.run.slug==='second'&&st.next_line===lib.nextLine(st.seats,st.run.id)&&/This run: /.test(st.next_line),'state: run.slug and next_line with the run');
var st1=JSON.parse(node('render-state.js',['--run',run1]).stdout);
check(st1.next_line===st1.no_rounds_line+lib.thisRunLine(st1.run.id),'state on a run with no round: next_line is the no-rounds line plus This run');
// The short form does not carry the Next line (the picker does), so nothing moved there.
check(node('render-record.js',['--run',run2,'--short']).stdout.indexOf('This run:')<0,'the short form carries no This run line (the picker and the text Next line do)');

// 4. The skills and the docs.
var runs=skill('runs'), battle=skill('battle'), sparring=skill('sparring'), champion=skill('champion'), rules=skill('combat-writing'), help=skill('help');
check(runs.split('\n')[0]==='---'&&/^name: runs$/m.test(runs)&&/^argument-hint: \[<a word of the run id>\]$/m.test(runs)&&/scripts\/runs\.js$/m.test(runs)&&/scripts\/runs\.js --match <word>/.test(runs)&&/Two or more \(exit 3\)/.test(runs)&&/None \(exit 1\)/.test(runs)&&/Never pick for the person\./.test(runs),'skills/runs/SKILL.md: the frontmatter, both calls, the three outcomes');
[['battle',battle],['sparring',sparring]].forEach(function(p){
  check(/`run: <folder or word>` names the run \(Part 85, 2026-10-31\): a folder path, or a word of a run id matched by `runs\.js --match <word>`/.test(p[1])&&/argument-hint: .*\[run: <folder or word>\]/.test(p[1]),p[0]+': run: reads a folder or a word, in the bullet and the hint');
});
check(/`run: <folder or word>` names the run \(Part 85: a folder path, or a word of a run id matched by `runs\.js --match <word>`/.test(champion)&&/\[run: <folder or word>\]$/m.test(champion),'champion: run: reads a folder or a word');
check(/^## Returning and starting fresh$/m.test(help)&&/Any number of runs stay open at once\./.test(help)&&/a run is open until `\/cw:champion shipped` freezes its canon, and nothing else closes it/.test(help)&&/^- `\/cw:runs` — lists every run in the project/m.test(help)&&/champion, briefs, runs, voices, files/.test(help)&&/that line names the run you are on, the word that returns to it and the line that starts a new piece/.test(help),'help: the section, the command, the topic, the picker sentence');
check(/`\/cw:briefs` and `\/cw:runs` \(each a skill/.test(rules)&&/scripts\/runs\.js \[--match <word>\]/.test(rules)&&/that line names the run it is on, the word that returns to it \(`run: <word>`\) and the line that leaves it \(Part 85\)/.test(rules),'the rules skill: the seventh command, the script row, the Next line');
check(/^- `\/cw:runs` lists every run in the project/m.test(read(path.join(plugin,'README.md')))&&/`\/cw:briefs` and `\/cw:runs`, which list your briefs and your runs/.test(read(path.join(plugin,'README.md'))),'the plugin README names /cw:runs');
var claude=read(path.join(root,'CLAUDE.md'));
check(/`\/cw:help`, `\/cw:briefs` and `\/cw:runs`;/.test(claude)&&/The seven commands are skills/.test(claude)&&/briefs\.js, runs\.js,/.test(claude)&&/The runs and the way back \(Part 85, 2026-10-31/.test(claude),'CLAUDE.md: the seventh command, the script, the ruling');
check(/the seven commands/.test(read(path.join(root,'README.md'))),'the root README says seven commands');

fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'runs_check: '+failures.length+' failure(s), ':'runs_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
