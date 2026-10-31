// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// reader_check.js: the reader rides in the run, not in the project brief (Part 84, 2026-10-31).
// The gap, measured on the prospect run of 2026-10-28: the per-prospect context was pasted into
// the brief, the brief typed is the project's (issue 72), so the next prospect's run inherited
// him. The brief is the standing rules of the project; the reader is who this one piece is for.
//
// What it pins, with the REAL scripts in a temporary project:
//   - new-run.js --reader <file> writes reader.md into the run (trimmed, one trailing newline),
//     logs it in run.created (file, sha256, words), and writes nothing of it into
//     combat-writing/brief.md: the project brief is the brief given, byte for byte.
//   - packet.js carries it under lib.READER_HEADING after the Context brief and before the draft,
//     logs reader_included, marks a reader part in the packet's size, and reads an address in it as
//     a link (links_unread); a cold read and a final read leave it out; a run with no reader.md has
//     no heading and reader_included false.
//   - add-draft.js --reader with --file writes reader.md beside the new draft and logs reader.set
//     naming the draft; --reader alone writes it with no draft added and prints reader.md; the newest
//     stands; an empty file is refused; the next packet carries the new text.
//   - record.md shows the reader under the brief; board.html shows it in Run details under the
//     brief, escaped; state.json carries reader {present, file, text, line}; the short form adds no
//     line.
//   - The budget line names the reader part; a run with no reader still renders.
//   - The skills: THE PASTE RULE lists `reader:` (`prospect:`) in its three equal copies; battle,
//     sparring and strategy carry the reader bullet with the two-lifetimes sentence and the --reader
//     flag; the help, the rules skill, the plugin README and CLAUDE.md name it.
//
// Run from the repo root:   node tests/reader_check.js
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
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-reader-'));
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).trim().split('\n').map(function(l){return JSON.parse(l);}); }
function packetLine(run,round,seat){ var l=logOf(run).filter(function(e){return e.event==='packet.built'&&e.round===round&&e.seat===seat;}); return l[l.length-1]; }

var draftText='Hi,\n\nYour June post on the warehouse says the stock looked worth more on paper.\n\nhttps://example.com/the-tool\n';
var briefText='Rules. A greeting, then at most five sentences, then one ask.\n';
var readerText='The prospect, co-founder of the prospect company <b>&amp;</b> partners. From their site: a warehouse firm; https://example.com/june-post is the post the draft answers.';
fs.writeFileSync(path.join(proj,'draft.md'),draftText);
fs.writeFileSync(path.join(proj,'brief.md'),briefText);
fs.writeFileSync(path.join(proj,'reader.md'),'\n'+readerText+'\n\n');

// 1. new-run.js --reader: reader.md in the run, logged, never in the project brief.
var r=node('new-run.js',['--draft','draft.md','--brief','brief.md','--reader','reader.md','--name','reader','--stage','battle','--model','Test Model']);
check(r.status===0,'new-run --reader: exit '+r.status+' '+r.stderr);
var run=r.stdout.trim();
check(fs.existsSync(path.join(run,'reader.md'))&&read(path.join(run,'reader.md'))===readerText+'\n','new-run: reader.md must hold the text trimmed with one trailing newline');
var created=logOf(run).filter(function(e){return e.event==='run.created';})[0];
check(created&&created.reader&&created.reader.file==='reader.md'&&/^[0-9a-f]{64}$/.test(created.reader.sha256)&&created.reader.words===lib.wordCount(readerText),'run.created: reader {file, sha256, words} wrong: '+JSON.stringify(created&&created.reader));
check(read(lib.projectBriefPath(proj))===briefText,'the project brief must be the brief given, byte for byte, with nothing of the reader in it');
check(read(path.join(run,'brief.md'))===briefText,'the run brief must be the brief given, nothing of the reader in it');
check(lib.readReader(run)===readerText,'lib.readReader returns the trimmed text');
check(lib.readerWords('a  b\nc')==='a b c'&&lib.readerWords('')===null&&lib.readerWords(new Array(40).join('word ')).length<=lib.READER_SHOWN+1&&/…$/.test(lib.readerWords(new Array(40).join('word '))),'lib.readerWords: one line, cut on a word at READER_SHOWN with an ellipsis');
var bad=node('new-run.js',['--draft','draft.md','--reader','missing.md','--name','x']);
check(bad.status===2&&/reader not found/.test(bad.stderr),'new-run: a missing reader file is refused with exit 2');
fs.writeFileSync(path.join(proj,'empty.md'),'  \n');
var bad2=node('new-run.js',['--draft','draft.md','--reader','empty.md','--name','x']);
check(bad2.status===2&&/reader file is empty/.test(bad2.stderr),'new-run: an empty reader file is refused');

// 2. packet.js: the reader under its heading after the brief, before the draft; logged; the link in it read as unread.
var p=node('packet.js',['--run',run,'--round','01-battle','--seat','seat-1']);
check(p.status===0,'packet: exit '+p.status+' '+p.stderr);
var t=read(p.stdout.trim());
var iBrief=t.indexOf('## Context brief'), iReader=t.indexOf(lib.READER_HEADING), iDraft=t.indexOf('## The draft');
check(iBrief>=0&&iReader>iBrief&&iDraft>iReader,'packet: the reader heading must sit after the Context brief and before the draft, got brief '+iBrief+' reader '+iReader+' draft '+iDraft);
check(t.indexOf(readerText)>iReader&&t.indexOf(readerText)<iDraft,'packet: the reader text must be under its heading');
check(/Judge the draft as a piece written for this reader\. The brief above is the author's standing rules; this is who this one piece is for, in the author's words\./.test(t),'packet: the reader heading carries the one-line instruction');
check(t.indexOf(lib.LINKS_UNREAD_LINE)>=0,'packet: an address in the reader makes the Contract carry LINKS_UNREAD_LINE');
var pl=packetLine(run,'01-battle','seat-1');
check(pl.reader_included===true&&pl.brief_included===true&&pl.links_unread===true,'packet.built: reader_included, brief_included and links_unread must be true: '+JSON.stringify({r:pl.reader_included,b:pl.brief_included,l:pl.links_unread}));
check(pl.size&&pl.size.parts.reader&&pl.size.parts.reader.chars>readerText.length&&pl.size.parts.brief&&pl.size.parts.draft,'packet.built: the size has a reader part between brief and draft: '+JSON.stringify(pl.size&&Object.keys(pl.size.parts)));
check(lib.PACKET_PARTS.indexOf('reader')===lib.PACKET_PARTS.indexOf('brief')+1,'lib.PACKET_PARTS lists reader right after brief');
// The budget line names the reader part.
var b=node('budget.js',['--run',run,'--round','01-battle']);
check(b.status===0,'budget: exit '+b.status+' '+b.stderr);
var bl=lib.budgetLines(run,logOf(run));
check(bl.length===1&&/the brief \d+, the reader \d+, the draft \d+/.test(bl[0]),'the budget line names the reader part after the brief: '+bl[0]);
// A reader with no link: links_unread false unless the draft or brief has one (the draft here has one, so test with a plain draft below).
// Cold and final leave it out.
fs.writeFileSync(path.join(run,'rounds','01-battle','seat-1.answer.md'),'Not send-ready. The ask comes after the link.\n');
node('check-answer.js',[path.join(run,'rounds','01-battle','seat-1.answer.md'),'--run',run]);
var pc=node('packet.js',['--run',run,'--round','02-sparring','--seat','seat-1','--cold']);
check(pc.status===0&&read(pc.stdout.trim()).indexOf(lib.READER_HEADING)<0&&packetLine(run,'02-sparring','seat-1').reader_included===false,'a cold read leaves the reader out and logs reader_included false');
var pf=node('packet.js',['--run',run,'--round','03-final','--seat','seat-1','--final','sn']);
check(pf.status===0&&read(pf.stdout.trim()).indexOf(lib.READER_HEADING)<0&&packetLine(run,'03-final','seat-1').reader_included===false,'a final read leaves the reader out');

// 3. The record, the board, the state, the short form.
var s=node('render-record.js',['--run',run,'--short']);
check(s.status===0&&s.stdout.indexOf('Reader')<0&&s.stdout.indexOf(readerText.slice(0,20))<0,'the short form adds no reader line');
var rec=read(path.join(run,'record.md'));
var rBrief=rec.indexOf('**Brief:**'), rReader=rec.indexOf('**Reader**'), rScore=rec.indexOf('## Scoreboard');
check(rBrief>=0&&rReader>rBrief&&rScore>rReader&&rec.indexOf(readerText)>rReader&&rec.indexOf(readerText)<rScore,'record.md: the Reader block sits under the brief and above the scoreboard');
check(/\*\*Reader\*\* \(who this piece is for, from the author; this run's own, carried in every packet after the brief\):/.test(rec),'record.md: the Reader label says whose it is');
var bd=node('render-board.js',['--run',run]);
check(bd.status===0,'board: exit '+bd.status+' '+bd.stderr);
var board=read(path.join(run,'board.html'));
var m=/<p class="meta reader"><strong>Reader:<\/strong> ([^<]*)<span class="note">\(who this piece is for, from the author; this run's own, carried in every packet after the brief\)<\/span><\/p>/.exec(board);
check(!!m,'board.html: the Reader line sits in Run details with its note');
check(m&&m[1].indexOf('&lt;b&gt;&amp;amp;&lt;/b&gt;')>=0&&board.indexOf(readerText)<0,'board.html: the reader text is escaped, never raw');
var bBrief=board.indexOf('<strong>Brief:</strong>'), bReader=board.indexOf('<p class="meta reader">'), bStarted=board.indexOf('<strong>Started at:</strong>');
check(bBrief>=0&&bReader>bBrief&&bStarted>bReader,'board.html: the Reader line sits after the Brief and before Started at');
var st=JSON.parse(node('render-state.js',['--run',run]).stdout);
check(st.reader&&st.reader.present===true&&st.reader.file==='reader.md'&&st.reader.text===readerText&&st.reader.line===lib.readerWords(readerText),'state: reader {present, file, text, line}: '+JSON.stringify(st.reader));

// 4. add-draft.js --reader: with a draft, and alone; the newest stands; the next packet carries it.
fs.writeFileSync(path.join(proj,'rev.md'),'Hi,\n\nThe stock looked worth more on paper, you wrote.\n');
fs.writeFileSync(path.join(proj,'reader2.md'),'The same prospect, now named as the operations lead.\n');
var a=node('add-draft.js',['--run',run,'--file','rev.md','--reader','reader2.md','--stage','battle']);
check(a.status===0&&a.stdout.trim()==='draft-2.md','add-draft --file --reader: prints the draft name, got '+a.stdout+a.stderr);
check(read(path.join(run,'reader.md'))==='The same prospect, now named as the operations lead.\n','add-draft: reader.md is replaced by the newest');
var set=logOf(run).filter(function(e){return e.event==='reader.set';});
check(set.length===1&&set[0].with_draft==='draft-2.md'&&set[0].replaced===true&&set[0].stage==='battle'&&set[0].words===9,'reader.set logged with the draft, replaced true, the stage and the words: '+JSON.stringify(set[0]));
fs.writeFileSync(path.join(proj,'reader3.md'),'A third reader, alone.\n');
var a2=node('add-draft.js',['--run',run,'--reader','reader3.md']);
check(a2.status===0&&a2.stdout.trim()==='reader.md'&&lib.listDrafts(run).length===2,'add-draft --reader alone: prints reader.md and adds no draft, got '+a2.stdout+a2.stderr);
set=logOf(run).filter(function(e){return e.event==='reader.set';});
check(set.length===2&&set[1].with_draft===null,'reader.set alone logs with_draft null');
var a3=node('add-draft.js',['--run',run]);
check(a3.status===2&&/--file <path> is required/.test(a3.stderr),'add-draft with neither --file nor --reader is refused');
var a4=node('add-draft.js',['--run',run,'--reader','empty.md']);
check(a4.status===2&&/reader file is empty/.test(a4.stderr),'add-draft: an empty reader file is refused');
var p4=node('packet.js',['--run',run,'--round','04-battle','--seat','seat-1']);
var t4=read(p4.stdout.trim());
check(t4.indexOf('A third reader, alone.')>t4.indexOf(lib.READER_HEADING)&&t4.indexOf(readerText)<0,'the next packet carries the newest reader and not the old one');
check(packetLine(run,'04-battle','seat-1').links_unread===false,'with no address left in the reader, the brief or the draft, links_unread is false');

// 5. A run with no reader: no heading, reader_included false, the record and the board without the line, the state present false.
var r2=node('new-run.js',['--draft','draft.md','--name','plain','--stage','sparring','--model','Test Model']);
var run2=r2.stdout.trim();
check(!fs.existsSync(path.join(run2,'reader.md')),'a run made with no --reader has no reader.md');
var p2=node('packet.js',['--run',run2,'--round','01-sparring','--seat','seat-1']);
check(read(p2.stdout.trim()).indexOf(lib.READER_HEADING)<0&&packetLine(run2,'01-sparring','seat-1').reader_included===false&&!packetLine(run2,'01-sparring','seat-1').size.parts.reader,'no reader: no heading, reader_included false, no reader part');
node('render-record.js',['--run',run2]); node('render-board.js',['--run',run2]);
check(read(path.join(run2,'record.md')).indexOf('**Reader**')<0&&read(path.join(run2,'board.html')).indexOf('meta reader')<0,'no reader: the record and the board carry no Reader line');
var st2=JSON.parse(node('render-state.js',['--run',run2]).stdout);
check(st2.reader&&st2.reader.present===false&&st2.reader.file===null&&st2.reader.text===null&&st2.reader.line===null,'no reader: state.reader is present false');

// 6. The skills and the docs.
var battle=skill('battle'), sparring=skill('sparring'), strategy=skill('strategy'), rules=skill('combat-writing'), help=skill('help');
[['battle',battle],['sparring',sparring],['strategy',strategy]].forEach(function(p){
  check(/The keywords: `brief:`, `brief update:` \(or `update brief:`\), `reader:` \(`prospect:`\), `battle:`/.test(p[1]),p[0]+': THE PASTE RULE lists reader: (prospect:)');
  check(/^- `reader:` \(or `prospect:`\) followed by text is the reader \(Part 84, 2026-10-31\): who this one piece is for, in the author's words/m.test(p[1]),p[0]+': carries the reader bullet');
  check(/The two have two lifetimes: `brief:` is the standing rules of the project, carried by every run; `reader:` is who this one piece is for and travels with the run\./.test(p[1]),p[0]+': the bullet says the two lifetimes');
  check(/`<slug>\.reader\.md`/.test(p[1])&&/\[--reader <reader file>\]/.test(p[1])&&/never written to `combat-writing\/brief\.md`/.test(p[1]),p[0]+': cuts the reader to <slug>.reader.md, passes --reader, and never writes the project brief');
  check(/argument-hint: .*\[reader: \.\.\.\]/.test(p[1]),p[0]+': the argument-hint shows reader:');
});
check(/`reader:` is the standing rules|`brief:` is the standing rules of the project and `reader:` \(or `prospect:`\) is who this one piece is for and travels with the run/.test(help)&&/the reader when you gave one \(`reader\.md`, this run's own\)/.test(help)&&/reader: the founder of a warehouse firm/.test(help),'help: the shortcuts line, the files list and the strategy example name the reader');
check(/\[--reader <file>\] --stage strategy/.test(rules)&&/`reader\.md` when a `reader:` came/.test(rules)&&/`--reader` writes the run's `reader\.md`/.test(rules),'the rules skill: new-run and add-draft take --reader, the run folder lists reader.md');
check(/`reader:` is who this one piece is for \(the person, their company, what their site says\): it travels with the run/.test(read(path.join(plugin,'README.md'))),'the plugin README names reader:');
check(/`reader\.md` when a `reader:` \(or `prospect:`\) came \(Part 84, 2026-10-31/.test(read(path.join(root,'CLAUDE.md')))&&/the reader to `<slug>\.reader\.md`/.test(read(path.join(root,'CLAUDE.md'))),'CLAUDE.md: the run folder and the inbox cut name the reader');

fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'reader_check: '+failures.length+' failure(s), ':'reader_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
