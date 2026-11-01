// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// lib.js: what the Combat Writing scripts share. Plain Node, no dependencies.
//
// The run folder (created by new-run.js, in the person's project, never in the plugin):
//   <root>/combat-writing/runs/<run-id>/
//     draft.md                 the draft snapshot, copied once, never changed
//     draft-2.md, draft-3.md   revised drafts added later by add-draft.js; the newest is the default
//     canon.md, canon-2.md     the draft as shipped, byte for byte, written by champion.js (ruled 2026-10-19):
//                              canon.md once, canon-2.md only after a revised draft is shipped
//     brief.md                 the context brief, when the person gave one
//     seats.json               the crew: id, model, company, and where the name came from
//     log.jsonl                one JSON object per line, timestamped; the source of truth for what was sent
//                              and checked
//     record.md                the rendered record, rebuilt by render-record.js after every round
//     rounds/<nn>-<kind>/      one folder per round, nn two digits, kind a word (sparring, debate, battle, final)
//       <seat>.question.md     the focus question or navigation note for that seat, when given
//       <seat>.packet.md       what the seat was sent, built by packet.js from files only
//       <seat>.answer.md       what the seat wrote; its first line is the rating line
//       <seat>.sn.packet.md / <seat>.sn.answer.md             the final mode's S/N read
//       <seat>.redflag.packet.md / <seat>.redflag.answer.md   the final mode's red-flag read
//
// No file in the run carries the credit line (ruled 2026-10-12): it stands once, at the foot of
// the help guide. A seat's answer is the seat's writing and opens with its contract's first line.

var fs=require('fs'), path=require('path'), crypto=require('crypto');

var RUNS_DIR=path.join('combat-writing','runs');
var DEFAULT_WORD_CAP=500;            // a read with no other seats' answers
var DEFAULT_SYNTHESIS_WORD_CAP=600;  // a read that quotes other seats
var DEFAULT_FINAL_WORD_CAP=250;      // the S/N and red-flag reads (the app's S/N prompt says under 250)
var DEFAULT_CREW_WORD_CAP=300;       // the second pass of a first-round SN or SFQ: To the crew alone (issue 88)
// The second pass of a first round (issue 88, 2026-10-27, the founder's words: "if a user was to use sn
// on round 1 it ought to not be denied the double run to include what the ai crew has to say about each
// other"): after every seat has answered on the draft alone, each gets one more packet carrying the
// others' answers to the same round and writes To the crew alone, into <seat>.crew.answer.md. The
// record prints it under the answer, the board shows it under the read, and the next round's packets
// carry it with the answer it belongs to (roundAnswers appends it), so a quote from it counts.
var CREW_PASS_LINE='This is the second pass of this round. Every seat answered on the draft alone first; those answers are below. Write To the crew alone: where you agree or disagree with the other seats, each named by its model as the packet labels it (never by seat number alone), quoted word for word, or put a question to them. No new critique of the draft and no rating.';
var CREW_PASS_HEADING='To the crew (second pass)';
var DEFAULT_COMPANY='Anthropic';
var MODEL_UNREPORTED='model unreported';

// The app's two final prompts, verbatim (Battle, step 14).
var SN_PROMPT='Evaluate the signal-to-noise ratio of this final draft. Your first line must be: S/N RATIO: XX%';
var REDFLAG_PROMPT='Check this final draft for red flags. Your first line must be exactly: NO RED FLAGS or RED FLAGS FOUND: X';
var DEFAULT_READ_PROMPT='Read this rough draft and rate it on a scale from 1–10, you cannot use 7. Explain your reasoning with evidence.';
// Battle (ruled 2026-10-09): a battle round asks for no rating unless the person asks with
// `rerate`. The synthesis prompt has one form for each case.
var DEFAULT_SYNTHESIS_PROMPT='Read the other seats\' latest answers. Where do your interpretations overlap and where do they diverge? Give a new critique of the structure and content of the draft.';
var DEFAULT_SYNTHESIS_RERATE_PROMPT='Read the other seats\' latest answers. Where do your interpretations overlap and where do they diverge? Give a new critique and a new rating of the draft.';
// A battle round on a run nothing has read (2026-10-14: the order of the stages is the person's
// choice): there is no other seat's answer to share and, without `rerate`, no rating to ask for.
var DEFAULT_FIRST_CRITIQUE_PROMPT='Read this rough draft. Give your critique of its structure and content, with specific evidence from it.';
var FIRST_ROUND_LINE='This is the first round of the run: no seat has read the draft yet, so no other seat\'s answer is carried. Answer on the draft alone.';
// Fewer seats than the person expects (ruled 2026-10-13): every result names the reason and the
// exact next command. Three states. The host records `absent` and `down` with crew-state.js (no
// add-on tool is there to do it); the add-on records the third, running with no key, in the
// crew.registered log line it writes, naming the key field to fill. crewStateLines renders
// whichever the log holds, and the record, the board and the short form print it under the crew line.
var ADDON_INSTALL='/plugin install combat-writing-crew --marketplace LearningProducers/CombatWriting-Plugin';
var ADDON_CONFIGURE='/plugin configure combat-writing-crew';
var ADDON_STATE={
  absent:'The crew add-on is not installed, so the crew is one seat. Next: '+ADDON_INSTALL+', then /reload-plugins or a new session, then '+ADDON_CONFIGURE+' to enter a key.',
  down:'The crew add-on is installed but its server is not running in this session (no crew_list tool), so the crew is one seat. Next: /mcp, find combat-writing-crew: if it shows failed or disconnected, reconnect it there and run the command again; if it is not listed, /plugin to check the add-on is enabled, then /reload-plugins.'
};

// The commands, for the lines the record prints (the plugin is `cw`; the commands are /cw:<name>).
var CMD={strategy:'/cw:strategy',sparring:'/cw:sparring',battle:'/cw:battle',champion:'/cw:champion',help:'/cw:help'};

// Champion (ruled 2026-10-19, issue 13): one command, three keywords, each writing to a
// different place. `shipped` freezes the newest draft as canon in the run folder with the time
// and the channel; `result:` is one dated line in the run's log and record; `insight:` is one
// dated, run-tagged line in the project's vault, one file across all runs, kept beside the runs
// folder so it outlives them. champion.js is the only writer of the three.
var VAULT_FILE='insight-vault.md';
var VAULT_REL=path.join('combat-writing',VAULT_FILE);
var VAULT_HEADING='# Insight Vault';
var VAULT_INTRO='What the Combat Writing runs in this project revealed: insights and lexicon, one dated line per entry, tagged with the run that produced it (step 19). Appended by '+CMD.champion+' insight; nothing already here is changed by the plugin.';
// The vault's place is read from the run folder alone: <project>/combat-writing/runs/<run-id>/
// puts it at <project>/combat-writing/insight-vault.md. A run folder anywhere else has no vault.
function vaultPath(runDir){
  var parent=path.dirname(path.resolve(runDir)), grand=path.dirname(parent);
  if(path.basename(parent)!=='runs'||path.basename(grand)!=='combat-writing')return null;
  return path.join(grand,VAULT_FILE);
}
// The ignore file (issue 36, ruled 2026-10-19): on the first run inside a git repository the
// plugin writes <project>/combat-writing/.gitignore with exactly two lines, runs/ and inbox/,
// so the runs and the inbox stay out of git and the vault stays with the project, and the
// result says so once. A file already there is never overwritten; outside a git repository
// nothing is written. A repository is found by walking up from the project root to a .git
// entry (a folder or a file); no command is run.
var GITIGNORE_FILE='.gitignore';
var GITIGNORE_LINES=['runs/','inbox/'];
var GITIGNORE_LINE='Wrote combat-writing/.gitignore with two lines, runs/ and inbox/, so the runs and the inbox stay out of git and the vault stays with the project; a file already there is never overwritten.';
function inGitRepo(dir){
  var d=path.resolve(dir);
  for(;;){
    if(fs.existsSync(path.join(d,'.git')))return true;
    var up=path.dirname(d);
    if(up===d)return false;
    d=up;
  }
}
function writeGitignore(root){
  if(!inGitRepo(root))return {state:'not-a-repo',file:null};
  var p=path.join(root,'combat-writing',GITIGNORE_FILE);
  if(fs.existsSync(p))return {state:'kept',file:p};
  fs.writeFileSync(p,GITIGNORE_LINES.join('\n')+'\n');
  return {state:'written',file:p};
}
// The project brief (issue 65, 2026-10-26; issue 72, the same day): <project>/combat-writing/
// brief.md, beside the vault, the one brief of the project. A brief given to new-run.js
// (--brief <file>, any path but that file itself) is the run's brief AND the project's: the file
// is overwritten, so the brief typed last is the brief every new run that brings none carries
// (the founder's rule, 2026-10-26: "anytime I type in brief: it overrides the previous brief").
// brief.js --update appends one dated paragraph, "Update YYYY-MM-DD: <text>", to the project's
// brief and to a run's, so the prospect of the day lives in the brief where the seats read
// ("brief update: followed by a line just adds to the brief"); the newest such line is named on
// the short form's Brief line. It rides with the project in git as the vault does. A run's brief
// has a measured source, read from the path new-run.js was handed: 'project' (that file), 'last'
// (another run's brief.md under combat-writing/runs/, the run id kept), 'pasted' (a file in
// combat-writing/inbox/), 'given' (any other path); none means no brief (--no-brief, or nothing
// and no project brief).
// The reader (Part 84, 2026-10-31): who this one piece is for, from the author, as the brief is the
// standing rules of the project. The two have two lifetimes: the brief is the project's and serves
// every run; the reader is one run's and travels with it (reader.md in the run folder, written by
// new-run.js --reader and add-draft.js --reader, the newest standing), never written to the project's
// brief. Every packet carries it under its own heading after the brief, so every seat judges by it;
// the record and the board show it under the brief. Origin: the prospect run of 2026-10-28, where
// the per-prospect context was pasted into the brief and the next prospect's run inherited it.
var READER_FILE='reader.md';
var READER_HEADING='## The reader (who this piece is for, from the author)';
var READER_SHOWN=120;
function readerPath(runDir){ return path.join(path.resolve(runDir),READER_FILE); }
function readReader(runDir){ var p=readerPath(runDir); return fs.existsSync(p)?readText(p).replace(/\r\n/g,'\n').trim():null; }
// One line naming the reader, cut at READER_SHOWN characters on a word, for the record's and the board's Reader line.
function readerWords(text){ var t=String(text||'').replace(/\s+/g,' ').trim(); if(!t)return null; return t.length>READER_SHOWN?t.slice(0,READER_SHOWN).replace(/\s+\S*$/,'')+'…':t; }
// Briefs by name (Part 86, 2026-10-31; the founder: "someone [uses the] cw plugin for various writing
// projects at once which means various briefs"): one project, many briefs. A named brief lives at
// <project>/combat-writing/briefs/<name>.md, saved by `brief <name>: <text>` (new-run.js --brief <file>
// --brief-name <name>), picked by `brief: <name>` (new-run.js --brief-name <name> alone), added to by
// `brief update <name>:` (brief.js --update --name <name>). The unnamed default, combat-writing/brief.md,
// keeps today's meaning and is untouched by a named brief. A run's brief name rides in run.created
// (brief.name), and the record, the board and the short form name it ("Brief: cold-email").
var BRIEFS_DIR='briefs';
var BRIEFS_DIR_REL=path.join('combat-writing',BRIEFS_DIR);
var BRIEF_NAME_RE=/^[a-z0-9][a-z0-9_-]{0,39}$/;
function briefsDir(root){ return path.join(path.resolve(root),'combat-writing',BRIEFS_DIR); }
function briefNamePath(root,name){ return path.join(briefsDir(root),name+'.md'); }
// A brief name: one word, lower case letters, digits, dashes and underscores, 40 characters at most;
// `update` is never one, because `brief update:` is its own keyword.
function isBriefName(s){ s=String(s||'').trim(); return BRIEF_NAME_RE.test(s)&&s!=='update'; }
// The saved briefs, by name, with each one's first non-empty line cut at BRIEF_UPDATE_SHOWN characters.
function listBriefs(root){
  var dir=briefsDir(root);
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir).filter(function(f){return /\.md$/.test(f)&&isBriefName(f.replace(/\.md$/,''));}).sort().map(function(f){
    var text=readText(path.join(dir,f));
    return {name:f.replace(/\.md$/,''),file:BRIEFS_DIR_REL.split(path.sep).join('/')+'/'+f,first_line:briefFirstLine(text),words:wordCount(text)};
  });
}
function briefFirstLine(text){
  var l=String(text||'').replace(/\r\n/g,'\n').split('\n').map(function(x){return x.trim();}).filter(Boolean)[0]||'';
  return l.length>BRIEF_UPDATE_SHOWN?l.slice(0,BRIEF_UPDATE_SHOWN).replace(/\s+\S*$/,'')+'…':l;
}
var PROJECT_BRIEF_FILE='brief.md';
var PROJECT_BRIEF_REL=path.join('combat-writing',PROJECT_BRIEF_FILE);
function briefNameKeptLine(name){ return 'This brief is saved as '+name+' (combat-writing/briefs/'+name+'.md): brief: '+name+' picks it for a run, brief '+name+': replaces it and brief update '+name+': adds to it. The unnamed default, combat-writing/brief.md, is untouched. /cw:briefs lists every saved brief.'; }
var PROJECT_BRIEF_KEPT_LINE='This brief is now the project\'s: combat-writing/brief.md serves every new run in this project that brings none, until the next brief: replaces it or brief update: adds to it (cold leaves it out of a read). It rides with the project in git, as the vault does; add brief.md to combat-writing/.gitignore if it must not.';
var BRIEF_UPDATE_RE=/^Update (\d{4}-\d{2}-\d{2}): (.*)$/;
var BRIEF_UPDATE_SHOWN=120;
function projectBriefPath(root){ return path.join(path.resolve(root),'combat-writing',PROJECT_BRIEF_FILE); }
// The dated update paragraph brief.js appends: the first line carries the date, a multi-line update keeps its lines.
function briefUpdateParagraph(text,date){ return 'Update '+date+': '+String(text||'').replace(/\r\n/g,'\n').trim(); }
// The newest dated update in a brief's text, read from the text itself (one source, however the file got there), or null.
function newestBriefUpdate(text){
  var found=null;
  String(text||'').replace(/\r\n/g,'\n').split('\n').forEach(function(l){ var m=BRIEF_UPDATE_RE.exec(l); if(m)found={date:m[1],text:m[2].trim()}; });
  return found;
}
function briefUpdateWords(text){
  var u=newestBriefUpdate(text);
  if(!u)return '';
  var t=u.text.length>BRIEF_UPDATE_SHOWN?u.text.slice(0,BRIEF_UPDATE_SHOWN).replace(/\s+\S*$/,'')+'…':u.text;
  return '; newest update '+u.date+': '+t;
}
function under(p,dir){ var rel=path.relative(dir,p); return rel&&!rel.startsWith('..')&&!path.isAbsolute(rel)?rel:null; }
// Real paths on both sides, so a project reached through a symlink (macOS's /var is one) still measures.
function realOr(p){ p=path.resolve(p); try{ return fs.realpathSync(p); }catch(e){ var d=path.dirname(p); return d===p?p:path.join(realOr(d),path.basename(p)); } }
function briefSourceOf(briefFile,root){
  var p=realOr(briefFile), r=realOr(root);
  if(p===projectBriefPath(r))return {source:'project',from:null};
  var named=under(p,briefsDir(r));
  if(named&&named.indexOf(path.sep)<0&&/\.md$/.test(named)&&isBriefName(named.replace(/\.md$/,'')))return {source:'named',from:named.replace(/\.md$/,'')};
  var rel=under(p,path.join(r,RUNS_DIR));
  if(rel){ var parts=rel.split(path.sep); if(parts.length===2&&parts[1]==='brief.md')return {source:'last',from:parts[0]}; }
  if(under(p,path.join(r,'combat-writing','inbox')))return {source:'pasted',from:null};
  return {source:'given',from:null};
}
// The words for a run's brief, from run.created: the Started-at line and the short form's Brief line.
function briefWords(created,dflt){
  var b=created&&created.brief;
  if(!b)return null;
  if(b.name)return 'the brief '+b.name;
  if(b.source==='project')return 'the project\'s brief';
  if(b.source==='last')return 'the brief from run '+(b.from||'?');
  if(b.source==='pasted')return 'the brief pasted';
  return dflt;
}
// The short form's Brief line, printed on every short form (issue 72: a round's too, so the hook's
// message names the brief): the source from run.created, then the newest dated update read from
// the run's brief text when one is given.
function briefLine(created,text){
  var b=created&&created.brief;
  if(!b)return 'Brief: none.';
  var s;
  if(b.name)s='Brief: '+b.name+' (combat-writing/briefs/'+b.name+'.md'+(b.source==='named'?'':', saved from this paste')+')';
  else if(b.source==='project')s='Brief: the project\'s (combat-writing/brief.md)';
  else if(b.source==='last')s='Brief: from run '+(b.from||'?');
  else if(b.source==='pasted')s='Brief: stored, pasted with the draft';
  else s='Brief: brief.md, stored';
  return s+briefUpdateWords(text)+'.';
}
// The host name of an address, by string cut: the scheme and a leading www. dropped, cut at the
// first slash, query or fragment. stripScheme drops the scheme and the // only, for the board,
// which shows an address as text and never as a link.
function stripScheme(url){ return String(url||'').replace(/^https?:\/\//i,''); }
function hostOf(url){ return stripScheme(url).replace(/^www\./i,'').split(/[\/?#]/)[0]; }
// The match of a canon against a page's text (shipped with a link): paragraphs, not sentences.
// Each canon paragraph and the whole page go through normalizeQuote, the flip check's normalizer
// (curly quotes to straight, whitespace runs to one space, edge punctuation trimmed), and a
// paragraph is found when the page holds it word for word. One definition of "word for word"
// in the plugin: the one that judges a seat's quote. The marks are measured against the page
// text the host saved, nothing more.
function canonMatch(canon,page){
  var paras=String(canon||'').replace(/\r\n/g,'\n').split(/\n\s*\n/).map(function(p){return normalizeQuote(p);}).filter(Boolean);
  var hay=normalizeQuote(String(page||''));
  var found=paras.filter(function(p){return hay.indexOf(p)>=0;}).length;
  return {found:found,of:paras.length,status:found&&found===paras.length?'matches':found?'partial':'not-found'};
}
// The page's text (issue 40, ruled 2026-10-19): a page the host saved whole is HTML on most
// channels, so before the match the markup is dropped: scripts, styles and comments go, block
// ends become paragraph breaks, every other tag goes, the common entities are decoded. A page
// with no markup is measured as it is. Returns {kind: 'html' | 'text', text}.
function pageText(raw){
  var s=String(raw||'').replace(/^﻿/,'');
  if(!/<(?:html|head|body|p|div|article|section|br|h[1-6]|li|span)[\s>\/]/i.test(s))return {kind:'text',text:s};
  s=s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ');
  s=s.replace(/<\/(?:p|div|li|h[1-6]|tr|blockquote|section|article|header|footer|pre)>/gi,'\n\n').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'');
  s=s.replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(parseInt(n,10));}).replace(/&#x([0-9a-f]+);/gi,function(_,h){return String.fromCharCode(parseInt(h,16));})
    .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  return {kind:'html',text:s};
}
function matchWords(m){
  if(!m)return 'not checked';
  if(m.status==='matches')return 'matches canon';
  if(m.status==='partial')return m.found+' of '+m.of+' paragraphs found';
  return 'not found';
}
// A time in words, UTC, to the minute: 2026-10-19 14:02 UTC.
function whenUtc(iso){ var d=new Date(iso); return d.toISOString().slice(0,10)+' '+d.toISOString().slice(11,16)+' UTC'; }
function dateUtc(iso){ return new Date(iso).toISOString().slice(0,10); }
// The Shipped line, one function for the script, the record and the board, from a
// champion.shipped log line: the time, the channel (the host of the address with the channel
// words in parentheses, or the words alone, or the host alone), which canon froze which draft
// (or that an existing canon shipped again), and the live mark.
function shippedLine(e){
  var channel=e.host?e.host+(e.channel?' ('+e.channel+')':''):(e.channel||'');
  var canon=e.canon_new?e.canon+' froze '+e.draft:e.canon+' again ('+e.draft+')';
  var live=!e.url?'no page to check':e.digest?'live: a digest came back, not the page; not measured':e.live===true?'live: '+matchWords(e.match):e.live===false?'not live: the address gave no page':'not checked: no page text reached the script';
  return 'Shipped '+whenUtc(e.at)+' · '+channel+' · '+canon+' · '+live;
}
function championEvents(log){ return log.filter(function(e){return /^champion\./.test(e.event||'');}); }
// The text Next line after a champion call (champion closes like strategy, with a line, not the
// picker): the remaining entries, and step 19's return to the piece on the same run.
function championNextLine(runDir){
  var hasCanon=!!latestCanon(runDir);
  return 'Next: '+(hasCanon?'':CMD.champion+' shipped <link, or email to whom> (freezes the final draft as canon with the time and the channel) · ')+CMD.champion+' result: <what came back, silence included> · '+CMD.champion+' insight: <what you learned, or a term and what it means> · '+CMD.battle+' draft: <path> to return to the piece on this run.';
}

// Where the run started (2026-10-14: any stage may be skipped, the order is the person's choice).
// new-run.js logs the stage whose command made the run in run.created; the line names it, what
// was stored first, and the first round, so the record and the board say where the run began.
// The caller adds the label ("Started at:").
function startedAtLine(runDir,log,rounds){
  log=log||readLog(runDir); rounds=rounds||listRounds(runDir);
  var created=null, firstDraft=null; log.forEach(function(e){ if(e.event==='run.created'&&!created)created=e; if(e.event==='draft.added'&&e.first&&!firstDraft)firstDraft=e; });
  var stage=created&&created.stage?created.stage:null;
  var s;
  if(stage==='strategy')s='strategy: '+(created.draft?'the draft and '+(created.brief?briefWords(created,'the brief'):'no brief')+' stored first':briefWords(created,'the brief')+' stored first, the draft brought later by '+(firstDraft&&firstDraft.stage?firstDraft.stage:'sparring or battle'));
  else if(stage)s=stage+': the run was made from a pasted draft, with no strategy stage'+(created.brief?' ('+briefWords(created,'a brief')+' came with it)':'');
  else s='a stage not recorded (the run was made before the stage was logged)';
  var first=rounds.length?rounds[0]:null;
  s+='. '+(first?'First round: '+first+(roundKind(first)==='battle'?' (battle before sparring)':'')+'.':'No round yet.');
  return s;
}

// The text Next line (2026-10-14): what the person can type after a round. The record keeps it;
// the short form prints it so the host has it for the picker's "Done for now". One line.
function nextLine(seats){
  var one=seats.length<2;
  var s='Next: '+CMD.battle+' fq: <question> (FQ, the same question to every seat, nothing shared) · n: <guidance> (N, the same new guidance to every seat individually) · sn: <prompt> (SN, each seat\'s synthesis shared with the others plus your new prompt) · sfq: <question> (SFQ, the crew\'s answers shared plus a new question) · seat-2: <note> (one seat only) · add rerate to any of them for a new rating · draft: <path> for a revised draft · final for the S/N ratio and red-flag reads on the draft alone · '+CMD.sparring+' debate (the seats read each other and rate again).';
  if(one)s+=' With one seat, SN, SFQ and debate have no other seat to share: use fq: or n:, or seat the add-on.';
  return s;
}

// The line a packet carries when the round asks for no rating; the checker and the add-on read it.
var NO_RATING_LINE='No rating this round: do not write a RATING line. Open with your answer to the task.';
// The two sections of a battle answer that shares (issue 80, 2026-10-26, the founder's words: "the
// first section is open ended response by the LLM responding directly to the prompt. Then a response
// to the AI crew or question to the ai crew"): a packet that carries the other seats' answers asks
// for them in its Contract (SECTIONS_LINE, mirrored word for word in the add-on's crew-lib.js, which
// reads it to tell an outside seat the same). A label is a line holding only the label, in any case,
// with or without markdown marks or a colon (sectionLabelOf); answerSections cuts the answer by them;
// checkAnswer holds a seat to both when asked (opts.sections), and check-answer.js turns the faults
// into notes on the second check, so a read is never lost over a label; verdictLine frames the Answer.
var SECTIONS_LINE='Two sections, each opened by a line holding only its label: `Answer`, your reply to the task, the verdict line first; then `To the crew`, where you agree or disagree with the other seats, each named by its model as the packet labels it (never by seat number alone), quoted word for word, or put a question to them. Nothing before the Answer label but the rating line when one is asked.';
var SECTION_LABELS={answer:'Answer',crew:'To the crew'};
// The Contract follows the prompt (issue 103, 2026-10-27, the founder's words: "it also ought to pay
// attention to what the prompt is saying. If it asks: Who was queen elizabeth? it ought to respond to
// the question and not begin with 'verdict', or 'not ready', or some other glitchy robotic response"):
// on a round with the person's prompt and no rating, the packet asks for the answer as it asks and no
// verdict on the draft; the verdict line stays where a number needs it (a rated round) and on a plain
// round with no prompt. The sharing form of the sections line drops the verdict clause the same way.
// A prompt that asks for a rewrite (asksRewrite) gets REWRITE_LINE: the rewrite first, in full, inside
// a fence the checker holds the seat to (rewriteReasons, sent back once like a label, then noted); the
// board frames the rewrite's opening and shows it whole under a Rewrite badge; the record prints it.
var PROMPT_FIRST_LINE='Answer the task above as it asks, first and in its own shape: a question gets the answer, guidance gets what it asks for, a judgment gets the judgment. No verdict on the draft unless the task asks for one. Evidence from the draft where the task calls for it.';
var SECTIONS_LINE_PROMPTED=SECTIONS_LINE.replace('your reply to the task, the verdict line first','your reply to the task as it asks, first');
var REWRITE_BEGIN='=== REWRITE BEGIN ===', REWRITE_END='=== REWRITE END ===';
var REWRITE_LINE='The task asks for a rewrite: write it in full between a line holding only `'+REWRITE_BEGIN+'` and a line holding only `'+REWRITE_END+'`, before anything else in your answer but the rating line and the verdict line when they are asked; then your rationale, under 120 words. Your rewrite is your own: one that repeats another seat\'s rewrite is recorded as a copy.';
var REWRITE_WORDS=/\b(re-?writes?|re-?written|re-?drafts?|re-?works?|revise|revised|reword|rewording|write (it|me|us|a|the|one|this)|draft (me|us|a|the|one))\b/i;
function asksRewrite(text){ return REWRITE_WORDS.test(String(text||'')); }
// The rewrite in an answer: the text between the fence lines (each line holding only its fence, markdown
// marks around it dropped), or null when the answer carries none.
function rewriteOf(text){
  var lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/);
  var b=-1,e=-1;
  for(var i=0;i<lines.length;i++){ var l=lines[i].trim().replace(/^[`*_]+|[`*_]+$/g,'').trim(); if(b<0&&l===REWRITE_BEGIN)b=i; else if(b>=0&&l===REWRITE_END){e=i;break;} }
  if(b<0||e<0)return null;
  return {text:lines.slice(b+1,e).join('\n').trim(),begin_at:b,end_at:e};
}
// The faults against REWRITE_LINE, as the checker's reasons, listed with the section faults so a second
// check turns them into notes: no fence, an empty fence, text before it in the answer.
function rewriteReasons(text,contract){
  var r=rewriteOf(text), reasons=[];
  if(!r){ reasons.push('no rewrite: the task asked for one; write it in full between a line holding only "'+REWRITE_BEGIN+'" and a line holding only "'+REWRITE_END+'", first, then your rationale'); return reasons; }
  if(!r.text)reasons.push('the rewrite fence is empty');
  var sec=answerSections(text);
  var start=sec.answer_at>=0?sec.answer_at+1:0;
  var before=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).slice(start,r.begin_at).filter(function(l){return l.trim();});
  var allowed=contract==='rating'?(sec.answer_at>=0?1:2):0;
  if(before.length>allowed)reasons.push('text before the rewrite: '+(contract==='rating'?'only the rating line and the verdict line go before it':'nothing goes before it; the rewrite opens the answer'));
  return reasons;
}
// Links are unread (issue 90, 2026-10-27, the founder's question after a seat described a post it never
// opened: "Are you guys actually able to even pull and read the millionaire warehouse post I alluded
// to? Be honest if not."). No seat can open a link: a fresh reader has Read and Write inside its run
// folder, an outside seat is sent the packet text alone. A packet whose brief, draft or prompt carries
// an address says so in its Contract (LINKS_UNREAD_LINE, mirrored word for word in the add-on's
// crew-lib.js, which reads it to tell an outside seat the same); hasLink decides. A page reaches the
// crew only as text pasted into the brief or the round's prompt, where it rides in the packet.
var LINKS_UNREAD_LINE='No seat can open a link. Every address in the brief, the draft or the prompt is unread text: never state what its page says, and never charge the author with misreading a page you have not read. A claim about a page holds only when the page\'s text is in this packet; otherwise say the page is unread and ask for its text.';
function hasLink(text){ return new RegExp(URL_RE.source,'i').test(String(text||'')); }
function sectionLabelOf(line){
  var s=String(line||'').replace(/[#*_`>\s:.\-]+/g,' ').trim().toLowerCase();
  if(s==='answer')return 'answer';
  if(s==='to the crew')return 'crew';
  return null;
}
// {answer, crew, labeled, answer_at, crew_at}: the text under each label (null when the label is absent),
// labeled true when both stand, the line index of each label.
function answerSections(text){
  var lines=String(text||'').replace(/^﻿/,'').split(/\r?\n/);
  var a=-1, c=-1;
  lines.forEach(function(l,i){ var k=sectionLabelOf(l); if(k==='answer'&&a<0)a=i; else if(k==='crew'&&c<0)c=i; });
  var answer=a>=0?lines.slice(a+1,c>a?c:lines.length).join('\n').trim():null;
  var crew=c>=0?lines.slice(c+1,a>c?a:lines.length).join('\n').trim():null;
  return {answer:answer,crew:crew,labeled:a>=0&&c>=0,answer_at:a,crew_at:c};
}
// The packet's size (issue 95, 2026-10-27): characters and estimated tokens, whole and by part, so
// the budget line can say what a round costs before any seat starts. Tokens are estimated at four
// characters each, the add-on's own rule (crew-lib.js estimateTokens, pinned equal by crew_check.js),
// so the number on the screen is the number the add-on will count. packetSize reads the packet's
// lines and the index each part starts at (packet.js marks them: head, task, contract, brief, draft,
// own, carried); a part not in the packet is absent from the result.
function estimateTokens(s){ return s?Math.ceil(String(s).length/4):0; }
var PACKET_PARTS=['head','task','contract','brief','reader','draft','own','carried'];
function packetSize(lines,marks){
  var text=lines.join('\n');
  var starts=PACKET_PARTS.filter(function(k){return typeof marks[k]==='number';}).map(function(k){return {name:k,at:marks[k]};}).sort(function(a,b){return a.at-b.at;});
  var parts={};
  starts.forEach(function(st,i){
    var end=i+1<starts.length?starts[i+1].at:lines.length;
    var t=lines.slice(st.at,end).join('\n');
    parts[st.name]={chars:t.length,tokens:estimateTokens(t)};
  });
  return {chars:text.length,tokens:estimateTokens(text),parts:parts};
}
// The budget of a round (issue 95): every packet built for it (the latest per seat and mode; the
// second pass with pass 'crew'), the largest, and the wall each outside seat spends from, read from
// the budget crew_register wrote on its seat record (per_minute, reply_floor, reply_ceiling, the
// provider's numbers). A seat's room is the wall minus the floor minus its packet; under zero the
// add-on will refuse the packet before it is sent, and the line says by how much. The add-on's own
// system line rides on top of the packet, so the room is a ceiling, said as "about".
function roundBudget(runDir,round,opts){
  opts=opts||{};
  var log=readLog(runDir);
  var seats=readSeats(runDir).seats||[];
  var byKey={};
  log.forEach(function(e){
    if(e.event!=='packet.built'||e.round!==round||!e.size)return;
    if(opts.pass==='crew'?e.pass!=='crew':e.pass==='crew')return;
    byKey[e.seat+'|'+(e.mode||'')]=e;
  });
  var packets=Object.keys(byKey).map(function(k){var e=byKey[k];return {seat:e.seat,mode:e.mode,file:e.file,size:e.size};});
  packets.sort(function(a,b){return b.size.tokens-a.size.tokens||(a.seat<b.seat?-1:1);});
  var largest=packets[0]||null;
  var walls={};
  seats.forEach(function(s){
    if(!s.budget||!s.provider)return;
    var mine=packets.filter(function(p){return p.seat===s.id;});
    var biggest=mine.length?mine[0].size.tokens:null;
    var w=walls[s.provider]||(walls[s.provider]={provider:s.provider,provider_name:s.served_by||s.provider,per_minute:s.budget.per_minute,reply_floor:s.budget.reply_floor,reply_ceiling:s.budget.reply_ceiling,seats:[],room:null,over:[]});
    w.seats.push(s.id);
    if(biggest===null)return;
    var room=w.per_minute-w.reply_floor-biggest;
    if(room<0)w.over.push({seat:s.id,tokens:biggest,over_by:-room});
    else if(w.room===null||room<w.room)w.room=room;
  });
  return {round:round,pass:opts.pass||null,packets:packets,largest:largest,walls:Object.keys(walls).map(function(k){return walls[k];})};
}
var PART_WORDS={task:'the prompt',carried:'the other seats\' answers',own:'the seat\'s earlier turn',brief:'the brief',reader:'the reader',draft:'the draft',contract:'the contract',head:'the heading'};
function thousands(n){ return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,','); }
function budgetLine(b){
  var who='Round '+String(b.round).slice(0,2)+(b.pass==='crew'?', second pass,':isFinalRound(b.round)?' final-read':'')+' packets: ';
  if(!b.largest)return who+'none built.';
  var p=b.largest.size.parts;
  var order=['task','carried','own','brief','reader','draft','contract'];
  var parts=order.filter(function(k){return p[k];}).map(function(k){return PART_WORDS[k]+' '+thousands(p[k].tokens);});
  var line=who+'up to about '+thousands(b.largest.size.tokens)+' tokens ('+b.largest.seat+'): '+parts.join(', ')+'.';
  if(!b.walls.length)return line+' The fresh reader has no per-minute wall.';
  b.walls.forEach(function(w){
    line+=' '+w.provider_name+' allows '+thousands(w.per_minute)+' a minute per model with '+thousands(w.reply_floor)+' kept for the reply ('+w.seats.join(', ')+'): ';
    if(w.over.length){
      line+=w.over.map(function(o){return o.seat+'\'s packet, about '+thousands(o.tokens)+', is over the room by about '+thousands(o.over_by)+' tokens ('+thousands(o.over_by*4)+' characters)';}).join('; ')+'; the add-on will refuse it before it is sent. Cut that much from the prompt or the brief, or run the round with less carried.';
    }else line+='about '+thousands(w.room===null?w.per_minute-w.reply_floor:w.room)+' of room left.';
  });
  return line;
}
// The warning alone (the founder, 2026-10-27: the measurement is accessible, not presented; the
// terminal gets only what must be known before the send): null when every packet fits, else one line
// naming each seat whose packet the add-on will refuse and by how much.
function budgetWarning(b){
  var over=[];
  b.walls.forEach(function(w){ w.over.forEach(function(o){ over.push({w:w,o:o}); }); });
  if(!over.length)return null;
  return 'Round '+String(b.round).slice(0,2)+(b.pass==='crew'?', second pass':'')+': '+over.map(function(x){return x.o.seat+'\'s packet, about '+thousands(x.o.tokens)+' tokens, is over the room '+x.w.provider_name+' allows ('+thousands(x.w.per_minute)+' a minute per model with '+thousands(x.w.reply_floor)+' kept for the reply) by about '+thousands(x.o.over_by)+' tokens ('+thousands(x.o.over_by*4)+' characters)';}).join('; ')+'; the add-on will refuse it before it is sent. Cut that much from the prompt or the brief, or run the round with less carried.';
}
// Every round's budget line, for the record and the board: one per round, the second pass its own line.
function budgetLines(runDir,log){
  log=log||readLog(runDir);
  var seen={}, keys=[];
  log.forEach(function(e){ if(e.event!=='packet.built'||!e.size)return; var k=e.round+'|'+(e.pass==='crew'?'crew':''); if(!seen[k]){seen[k]=true;keys.push(k);} });
  return keys.map(function(k){ var p=k.split('|'); return budgetLine(roundBudget(runDir,p[0],{pass:p[1]||null})); });
}

// The faults against SECTIONS_LINE, as the checker's reasons: both labels, Answer first, the crew part after it.
function sectionReasons(text,contract){
  var s=answerSections(text), reasons=[];
  if(s.answer_at<0)reasons.push('no Answer section: open with a line holding only "Answer"'+(contract==='rating'?' after the rating line':'')+', then your reply to the task');
  if(s.crew_at<0)reasons.push('no To the crew section: after your answer, a line holding only "To the crew", then where you agree or disagree with the other seats, each named by its model, quoted, or your question to them');
  if(s.answer_at>=0&&s.crew_at>=0&&s.crew_at<s.answer_at)reasons.push('the To the crew section comes before the Answer section; the Answer comes first');
  if(s.answer_at>=0){
    var lines=String(text||'').replace(/^﻿/,'').split(/\r?\n/).slice(0,s.answer_at).filter(function(l){return l.trim();});
    var allowed=contract==='rating'?1:0;
    if(lines.length>allowed)reasons.push('text before the Answer label: '+(contract==='rating'?'only the rating line goes before it':'nothing goes before it'));
  }
  if(s.answer!==null&&!s.answer)reasons.push('the Answer section is empty');
  if(s.crew!==null&&!s.crew)reasons.push('the To the crew section is empty');
  return reasons;
}

// Every packet carries this line, hardwired, in its Contract section (the founder's words,
// 2026-10-14): a seat that thinks out loud in its answer is the wall of text the person reads.
var SIGNAL_LINE='Do not be verbose. Do not ramble. Only high signal-to-noise responses, no cosplay explanations, no thinking out loud in the answer.';
// The verdict sentence (2026-10-14): the first sentence after the first line is the seat's
// verdict on the draft, the line the board frames. The packet says so in these words.
var VERDICT_SENTENCE_LINE='Your first sentence after it is your verdict on the draft, in one line.';
var VERDICT_SENTENCE_LINE_CRITIQUE='Your first sentence is your verdict on the draft, in one line.';

// The scoreboard legend, one paragraph: record.md carries it, and the short form prints it
// once per run (2026-10-14), the first time it prints, never again in that run.
var SCOREBOARD_LEGEND='Every number is one seat\'s own. Nothing here is averaged. A flip shows the earlier number beside the new one; INVALID means the quote the seat gave does not match the seat it named. Missing means the seat gave no answer in that round. Not asked means the round was put to other seats only. Critique means the round asked for no rating (a battle round rates only on `rerate`). Failed read means the answer broke the contract it was sent, the rating line, the cap, or a number that contradicts the verdict. Truncated means the seat\'s second overrun was cut at the cap, at the last sentence end before it, with its first line kept. The bar is the seat\'s latest rating.';
var BOARD_FILE='board.html';

function parseArgs(argv){
  var out={_:[]};
  for(var i=0;i<argv.length;i++){
    var a=argv[i];
    if(a.indexOf('--')===0){
      var key=a.slice(2);
      if(i+1<argv.length&&argv[i+1].indexOf('--')!==0){out[key]=argv[++i];}
      else out[key]=true;
    }else out._.push(a);
  }
  return out;
}

function die(msg){ process.stderr.write('error: '+msg+'\n'); process.exit(2); }
function sha256(buf){ return crypto.createHash('sha256').update(buf).digest('hex'); }
function readText(p){ return fs.readFileSync(p,'utf8'); }

function appendLog(runDir,obj){
  var line=JSON.stringify(Object.assign({ts:new Date().toISOString()},obj));
  fs.appendFileSync(path.join(runDir,'log.jsonl'),line+'\n');
}
function readLog(runDir){
  var p=path.join(runDir,'log.jsonl');
  if(!fs.existsSync(p))return [];
  return readText(p).split('\n').filter(Boolean).map(function(l){try{return JSON.parse(l);}catch(e){return null;}}).filter(Boolean);
}

function readSeats(runDir){
  var p=path.join(runDir,'seats.json');
  if(!fs.existsSync(p))die('no seats.json in '+runDir);
  return JSON.parse(readText(p));
}
// The crew (ruled 2026-10-09, enforced 2026-10-12): one fresh reader plus one seat per outside
// model the add-on registers, never padded. A fresh reader is a seat with no provider field;
// the first one in seats.json is the crew's. isPaddedSeat says whether a seat is a second fresh
// reader, which packet.js refuses to seat in any round.
function isFreshReader(seat){ return !seat.provider; }
function isPaddedSeat(seats,seat){
  var first=seats.filter(isFreshReader)[0];
  return isFreshReader(seat)&&!!first&&first.id!==seat.id;
}

// A seat's label as it appears in every packet and every result: model and company, never anonymous.
// When the host could not tell the model, the company carries the name; no model name lives in this code.
// An outside seat (from the crew add-on) also names the provider that served it.
function seatLabel(seat){
  if(!seat.model||seat.model===MODEL_UNREPORTED)return seat.company+' model, name not reported, '+seat.id;
  return seat.model+' ('+seat.company+(seat.served_by?', served by '+seat.served_by:'')+'), '+seat.id;
}
// The seat key (ruled 2026-10-09): one line naming every seat by id and a short name, from the
// live crew, for the person to address a seat by id or short name. The short name is derived,
// never pinned: the model id without its maker prefix, cut before its first digit (an id of the
// form maker/name-120b gives "name"); an unreported model falls back to its company.
function seatShortName(seat){
  if(!seat.model||seat.model===MODEL_UNREPORTED)return seat.company;
  var id=String(seat.model).replace(/^[^\/]+\//,'');
  var m=/^[^0-9]+/.exec(id);
  var short=m?m[0].replace(/[\s._-]+$/,''):'';
  return short||id;
}
function seatKey(seats){
  return seats.map(function(s){return s.id+' '+seatShortName(s);}).join(' · ');
}

// Which seats a round was put to, from its packet.built lines. A round built by hand (no
// packet line at all) is taken as put to every seat.
function askedIn(runDir,round,log){
  log=log||readLog(runDir);
  var asked={}, any=false;
  log.forEach(function(e){ if(e.event==='packet.built'&&e.round===round){asked[e.seat]=true;any=true;} });
  return any?asked:null;
}
function wasAsked(runDir,round,seatId,log){
  var asked=askedIn(runDir,round,log);
  return !asked||!!asked[seatId];
}

// Where the seats' names come from, for the crew line: the agent configuration for fresh readers,
// the provider's API response for outside seats, or both.
function nameSources(seats){
  var fresh=seats.some(function(s){return !s.provider;}), outside=seats.some(function(s){return !!s.provider;});
  if(fresh&&outside)return 'Fresh readers are named from the agent configuration; outside seats from the model field their provider\'s API returned.';
  if(outside)return 'Seat names come from the model field each provider\'s API returned.';
  return 'Seat names come from the agent configuration, not from an API field.';
}

// The Seats lines for a run: why the crew has fewer seats than the person expects, with the next
// command, from the latest addon.state or crew.registered line in the log. Empty when nothing
// is missing. With no outside seat and nothing recorded, the line says so and points at the help.
function crewStateLines(runDir,seats,log){
  log=log||readLog(runDir);
  var outside=seats.filter(function(s){return !!s.provider;}).length;
  var last=null;
  log.forEach(function(e){ if(e.event==='addon.state'||e.event==='crew.registered')last=e; });
  var lines=[];
  if(last&&last.event==='crew.registered'){
    var un=last.unavailable||[];
    var noKey=un.filter(function(u){return /^no key/.test(u.reason||'');});
    var failed=un.filter(function(u){return !/^(no key|off:|not built)/.test(u.reason||'');});
    if(!outside&&noKey.length){
      var fields=[]; noKey.forEach(function(u){ var f=u.field||'the key field'; if(fields.indexOf(f)<0)fields.push(f); });
      var named=noKey.filter(function(u){return u.field;}).map(function(u){return u.field+' ('+(u.field_title||u.provider_name||u.provider)+')';}).filter(function(v,i,a){return a.indexOf(v)===i;});
      lines.push('The crew add-on is running and no provider has a key, so the crew is one seat: a key was never entered, or an update dropped it (the host rebuilt its credentials store). Next: '+(noKey[0].next||ADDON_CONFIGURE)+', type the key into a key field and save: '+(named.length?named.join(', '):fields.join(', '))+'; a save with nothing typed says No configuration changes and keeps nothing; a free Groq key seats two. Or set the provider\'s environment variable when the prompt is empty.');
    }
    failed.forEach(function(u){
      lines.push('Not seated: '+(u.provider_name||u.provider)+(u.family?' ('+u.family+')':'')+': '+u.reason+'. Next: run the command again; if it repeats, '+(u.next||ADDON_CONFIGURE)+' to check the '+(u.field||'key')+' field.');
    });
  }else if(last&&last.event==='addon.state'&&!outside){
    lines.push(ADDON_STATE[last.state]||('The add-on state recorded, '+last.state+', is not one the record knows.'));
  }else if(!outside){
    lines.push('No outside seat, and the add-on\'s state was not recorded in this run. Next: '+CMD.help+' crew for the three states and the command for each.');
  }
  return lines;
}

// Numbered files in order: <base>.md, <base>-2.md, <base>-3.md ... The last is the newest.
// Drafts (draft.md, draft-2.md) and canons (canon.md, canon-2.md) are numbered the same way.
function numberOf(name,base){ var m=new RegExp('^'+base+'-(\\d+)\\.md$').exec(name); return m?parseInt(m[1],10):1; }
function listNumbered(runDir,base){
  var re=new RegExp('^'+base+'(-\\d+)?\\.md$');
  return fs.readdirSync(runDir).filter(function(n){return re.test(n);})
    .sort(function(a,b){return numberOf(a,base)-numberOf(b,base);});
}
function listDrafts(runDir){ return listNumbered(runDir,'draft'); }
function draftNumber(name){ return numberOf(name,'draft'); }
function latestDraft(runDir){ var d=listDrafts(runDir); return d.length?d[d.length-1]:null; }
function listCanons(runDir){ return listNumbered(runDir,'canon'); }
function latestCanon(runDir){ var c=listCanons(runDir); return c.length?c[c.length-1]:null; }

// Rounds in order: rounds/01-sparring, rounds/02-debate, ... sorted by their two-digit prefix.
function listRounds(runDir){
  var dir=path.join(runDir,'rounds');
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir).filter(function(n){return /^\d\d-[a-z][a-z0-9-]*$/.test(n)&&fs.statSync(path.join(dir,n)).isDirectory();}).sort();
}
function roundKind(round){ return round.replace(/^\d\d-/,''); }
function isFinalRound(round){ return roundKind(round)==='final'; }

// The round a synthesis packet reads: the latest round before `beforeRound` that holds
// at least one answer (rated or not). Final rounds are never read back; they rate nothing.
function previousRound(runDir,beforeRound){
  var rounds=listRounds(runDir).filter(function(r){return (!beforeRound||r<beforeRound)&&!isFinalRound(r);});
  for(var i=rounds.length-1;i>=0;i--){
    var dir=path.join(runDir,'rounds',rounds[i]);
    if(fs.readdirSync(dir).some(function(n){return /^[^.]+\.answer\.md$/.test(n);}))return rounds[i];
  }
  return null;
}
// Note: previousRound counts any answer file, sound or failed, so a round where every
// seat failed is still the round read; its packets then list every seat as a failed read.

// The packet.built log line for one answer file, if any: the round's line for that packet.
function packetLine(runDir,round,answerFile,log){
  var packetName=path.basename(answerFile).replace(/\.answer\.md$/,'.packet.md');
  var seatId=path.basename(answerFile).replace(/(\.sn|\.redflag|\.crew)?\.answer\.md$/,'');
  log=log||readLog(runDir);
  for(var i=log.length-1;i>=0;i--){
    var e=log[i];
    if(e.event==='packet.built'&&e.round===round&&e.seat===seatId&&e.file==='rounds/'+round+'/'+packetName)return e;
  }
  return null;
}
function packetPathOf(runDir,round,answerFile){
  return path.join(runDir,'rounds',round,path.basename(answerFile).replace(/\.answer\.md$/,'.packet.md'));
}

// The word cap a seat was sent for one answer file: the round's packet.built log line for
// that packet, else the "Under N words." line of the packet file, else null. check-answer.js
// and roundAnswers use the same lookup, so a live check never applies a cap the seat was not sent.
function capSent(runDir,round,answerFile,log){
  var e=packetLine(runDir,round,answerFile,log);
  if(e&&typeof e.word_cap==='number')return e.word_cap;
  var packetPath=packetPathOf(runDir,round,answerFile);
  if(fs.existsSync(packetPath)){
    var m=/Under (\d+) words( in all)?\./.exec(readText(packetPath));
    if(m)return parseInt(m[1],10);
  }
  return null;
}

// The first-line contract a seat was sent for one answer file (ruled 2026-10-09: a battle
// round asks for no rating unless the person asks with `rerate`): the packet.built line's
// contract, else the packet file's no-rating line, else the contract the file name implies.
// Every live check of an answer file uses this, so a seat is never held to a contract it
// was not sent.
function contractSent(runDir,round,answerFile,log){
  var e=packetLine(runDir,round,answerFile,log);
  if(e&&e.contract)return e.contract;
  var packetPath=packetPathOf(runDir,round,answerFile);
  if(fs.existsSync(packetPath)&&readText(packetPath).indexOf(NO_RATING_LINE)>=0)return 'critique';
  return contractOf(answerFile);
}
// Whether the packet a seat was sent asked for the two sections (issue 80): the packet.built
// line's `sections`, else the packet file carrying SECTIONS_LINE; a packet built by hand, false.
function sectionsSent(runDir,round,answerFile,log){
  var e=packetLine(runDir,round,answerFile,log);
  if(e&&typeof e.sections==='boolean')return e.sections;
  var packetPath=packetPathOf(runDir,round,answerFile);
  if(!fs.existsSync(packetPath))return false;
  var t=readText(packetPath);
  return t.indexOf(SECTIONS_LINE)>=0||t.indexOf(SECTIONS_LINE_PROMPTED)>=0;
}
// The copy check (issue 107, 2026-10-27, the founder's words: "Why did qwen3 have an identical response
// to fable 5.1? Something went wrong there."): on a rewrite round the packet carries the other seats'
// answers, rewrites included, and a seat may hand one back as its own. The checker measures each
// rewrite against the rewrites carried in its packet (a carried answer's fenced rewrite, else its whole
// text): the share of the rewrite's three-word runs found in the carried text. At 60 in 100 or more it
// is a copy, named with the seat and model copied; the board's badge and the record say so. The seat's
// own earlier turn is never a copy: holding one's own rewrite is Stand, not theft.
var COPY_SHARE=0.6;
function wordRuns(text,n){
  var w=String(text||'').toLowerCase().replace(/[^a-z0-9$%']+/g,' ').trim().split(/\s+/).filter(Boolean);
  var runs=[]; for(var i=0;i+n<=w.length;i++)runs.push(w.slice(i,i+n).join(' '));
  return runs;
}
function copyShare(rewrite,source){
  var runs=wordRuns(rewrite,3); if(!runs.length)return 0;
  var have={}; wordRuns(source,3).forEach(function(r){have[r]=true;});
  var n=0; runs.forEach(function(r){if(have[r])n++;});
  return n/runs.length;
}
function rewriteCopy(runDir,round,seatId,text,seats,log){
  log=log||readLog(runDir);
  var rw=rewriteOf(text); if(!rw||!rw.text)return null;
  var e=null; for(var i=log.length-1;i>=0;i--){ var x=log[i]; if(x.event==='packet.built'&&x.round===round&&x.seat===seatId&&!x.pass){e=x;break;} }
  if(!e||!e.carried||!e.carried.length)return null;
  var byId={}; (seats||[]).forEach(function(s){byId[s.id]=s;});
  var best=null;
  e.carried.forEach(function(c){
    if(!c||!c.seat||c.seat===seatId)return;
    var p=path.join(runDir,'rounds',c.round||e.reads_round||'',c.seat+'.answer.md');
    if(!fs.existsSync(p))return;
    var src=readText(p); var srw=rewriteOf(src); var source=srw&&srw.text?srw.text:src;
    var share=copyShare(rw.text,source);
    if(share>=COPY_SHARE&&(!best||share>best.share))best={seat:c.seat,model:byId[c.seat]?byId[c.seat].model:c.seat,round:c.round||e.reads_round||null,share:Math.round(share*100)/100};
  });
  return best;
}
function copyMark(copy){ return copy?'copy of '+copy.model:''; }
// Whether the packet asked for a rewrite (issue 103): the packet.built line's `rewrite`, else the
// packet file carrying REWRITE_LINE; a packet built by hand, false.
function rewriteSent(runDir,round,answerFile,log){
  var e=packetLine(runDir,round,answerFile,log);
  if(e&&typeof e.rewrite==='boolean')return e.rewrite;
  var packetPath=packetPathOf(runDir,round,answerFile);
  return fs.existsSync(packetPath)&&readText(packetPath).indexOf(REWRITE_LINE)>=0;
}

// What one round asked of its seats, from its packet.built lines: 'final', 'critique' or
// 'rating'. With no packet line, 'rating' (the fallback for a round built by hand).
function roundContract(runDir,round,log){
  if(isFinalRound(round))return 'final';
  log=log||readLog(runDir);
  for(var i=0;i<log.length;i++){
    var e=log[i];
    if(e.event==='packet.built'&&e.round===round&&e.contract)return e.contract;
  }
  return 'rating';
}

// The round's task (2026-10-15: the board and the record show the round's prompt): what the
// round asked every seat, read from the round's first packet, which is what the seats were
// sent, so one source serves runs built before anything about the task was logged. Returns
// {kind, text, contract, rerate, first_round}: kind is SN, SFQ, N or FQ with the person's text;
// 'seat' for a round of seat lines alone (each seat's line is its own <seat>.question.md);
// 'cold' for the cold read; 'final' for the final reads; 'plain' with the default prompt the
// packet sent. A round with no packet at all is 'plain' with no text.
var TASK_LABELS=[['SFQ','Synthesis focus question (SFQ): '],['SN','Synthesis navigation (SN): '],['N','Navigation (N): '],['FQ','Focus question (FQ): ']];
var TASK_KINDS=TASK_LABELS.map(function(t){return t[0];});
// The task with its count within the run (issue 99, 2026-10-27, the founder's words: "it ought to
// say SFQ2 because it was the second one"): `n` is which of its kind this round is, counted per
// kind over the run's rounds in order for the four kinds the packet labels (FQ, N, SN, SFQ), and
// 0 for every other kind. The first of a kind keeps its bare name; the second is SN2, SFQ2. Read
// from the packets at render time, so a run already on disk reads the same way once updated.
function roundTask(runDir,round,log){
  log=log||readLog(runDir);
  var out=roundTaskBare(runDir,round,log);
  out.n=0;
  if(TASK_KINDS.indexOf(out.kind)>=0){
    var n=1;
    listRounds(runDir).forEach(function(r){ if(r<round&&roundTaskBare(runDir,r,log).kind===out.kind)n++; });
    out.n=n;
  }
  return out;
}
// The kind with its count: SN, SN2, SFQ2; the other kinds as they are.
function kindLabel(task){ return task.kind+(task.n>1?String(task.n):''); }
// The same count before any packet exists, for the forming line (announce.js): one more than the
// rounds before this one whose last announcement was of this kind. A round announced and never
// built counts here and not in roundTask; the two agree on every round that ran. The second pass of
// a first round announces kind `crew` on the same round (issue 105: it hid round 01's SN, so the
// forming line said SN2 where the board said SN3); it is not a kind of round and is skipped.
function announcedOrdinal(log,kind,round){
  if(TASK_KINDS.indexOf(kind)<0)return 0;
  var last={};
  log.forEach(function(e){ if(e.event==='round.announced'&&e.round&&e.round<round&&e.kind!=='crew')last[e.round]=e.kind; });
  var n=1; Object.keys(last).forEach(function(r){ if(last[r]===kind)n++; });
  return n;
}
function roundTaskBare(runDir,round,log){
  var contract=roundContract(runDir,round,log);
  if(isFinalRound(round))return {kind:'final',text:null,contract:'final',rerate:false,first_round:false};
  var line=null; for(var i=0;i<log.length;i++){ var e=log[i]; if(e.event==='packet.built'&&e.round===round){line=e;break;} }
  var dir=path.join(runDir,'rounds',round);
  var file=line&&line.file?path.join(runDir,line.file):null;
  if(!file||!fs.existsSync(file)){
    var names=fs.existsSync(dir)?fs.readdirSync(dir).filter(function(n){return /^[^.]+\.packet\.md$/.test(n);}).sort():[];
    file=names.length?path.join(dir,names[0]):null;
  }
  var packet=file?readText(file):'';
  var m=/## Your task\n\n([\s\S]*?)\n## Contract/.exec(packet);
  var task=m?m[1].trim():'';
  var out={kind:'plain',text:null,contract:contract,rerate:line?!!line.rerate:contract==='rating',first_round:line?!!line.first_round:false};
  for(var j=0;j<TASK_LABELS.length;j++){
    var lab=TASK_LABELS[j][1];
    if(task.indexOf(lab)===0){ out.kind=TASK_LABELS[j][0]; out.text=task.slice(lab.length).split(/\n\s*\n/)[0].trim(); return out; }
  }
  var mode=line?line.mode:null;
  if(mode==='cold'||/^This is the cold read:/m.test(packet))out.kind='cold';
  else if(mode==='seat')out.kind='seat';
  else if(task)out.text=task.split(/\n\s*\n/)[0].trim();
  return out;
}
// One phrase for the task, for the round strip, the record and the round history:
// `SN: “text”` (`SN2: “text”` for the second SN of the run, issue 99), `seat lines`, `cold read,
// the draft alone`, `final reads: S/N ratio and red flags`, or `the default prompt: “text”`.
function taskLine(task){
  if(task.kind==='final')return 'final reads: S/N ratio and red flags';
  if(task.kind==='seat')return 'seat lines';
  if(task.kind==='cold')return 'cold read, the draft alone';
  if(task.kind==='plain')return task.text?'the default prompt: “'+task.text+'”':'no task recorded';
  return kindLabel(task)+': “'+task.text+'”';
}
// What the round asked for, in three words: no rating, a new rating, or a rating.
function ratingLine(task,round){
  if(task.contract==='final')return '';
  if(task.contract==='critique')return 'no rating asked';
  return task.rerate&&roundKind(round)==='battle'?'a new rating asked':'a rating asked';
}

// Every seat's answer in one round: {seat, file, text, contract} when present and sound,
// {seat, missing:true} when there is no file, {seat, missing:true, notAsked:true} when the
// round was put to other seats only (ruled 2026-10-09: a round of seat lines alone goes to the
// named seats; no packet was built for this one), and {seat, missing:true, failed:true, reasons}
// when the file is there but fails the contract it was sent (contractSent): by the log's last
// check of it, or by a live check at the cap the seat was sent (capSent), falling back to the
// default cap only when neither exists. A failed read is never carried to another seat and
// never cited: nothing stands in for it.
function roundAnswers(runDir,round,seats){
  var log=readLog(runDir);
  var asked=askedIn(runDir,round,log);
  return seats.map(function(seat){
    var p=path.join(runDir,'rounds',round,seat.id+'.answer.md');
    if(!fs.existsSync(p))return {seat:seat,round:round,missing:true,notAsked:!!asked&&!asked[seat.id]};
    var text=readText(p);
    var contract=contractSent(runDir,round,p,log);
    var logged=null;
    for(var i=log.length-1;i>=0;i--){var e=log[i];if(e.event==='answer.checked'&&e.round===round&&e.seat===seat.id&&(!e.contract||e.contract===contract)){logged=e;break;}}
    var cap=logged?logged.word_cap:capSent(runDir,round,p,log);
    var check=checkAnswer(text,cap,contract);
    if(!check.ok)return {seat:seat,round:round,file:p,missing:true,failed:true,reasons:check.reasons,contract:contract};
    // The second pass rides with the answer it belongs to (issue 88), so a later packet carries it and a quote from it counts.
    var crew=crewPassOf(runDir,round,seat.id,log);
    return {seat:seat,round:round,file:p,text:crew?text.replace(/\s+$/,'')+'\n\n'+CREW_PASS_HEADING+'\n\n'+crew.text:text,answer_text:text,crew_pass:crew?crew.text:null,contract:contract,rating:check.rating};
  });
}
// A seat's second pass in a round (issue 88): {text, words} when <seat>.crew.answer.md is there and sound, else null.
function crewPassOf(runDir,round,seatId,log){
  var p=path.join(runDir,'rounds',round,seatId+'.crew.answer.md');
  if(!fs.existsSync(p))return null;
  var text=readText(p);
  log=log||readLog(runDir);
  var logged=null;
  for(var i=log.length-1;i>=0;i--){var e=log[i];if(e.event==='answer.checked'&&e.round===round&&e.seat===seatId&&e.contract==='crew'){logged=e;break;}}
  var check=checkAnswer(text,logged?logged.word_cap:null,'crew');
  if(!check.ok)return null;
  return {text:text.replace(/\s+$/,''),words:wordCount(text),file:path.join('rounds',round,seatId+'.crew.answer.md')};
}

// The seat's own latest sound answer in any earlier non-final round, rated or not: its earlier turn.
function latestOwnAnswer(runDir,seat,beforeRound){
  var rounds=listRounds(runDir).filter(function(r){return (!beforeRound||r<beforeRound)&&!isFinalRound(r);});
  for(var i=rounds.length-1;i>=0;i--){
    var a=roundAnswers(runDir,rounds[i],[seat])[0];
    if(!a.missing)return a;
  }
  return null;
}
// The seat's own latest sound RATED answer in any earlier non-final round: the number a new
// rating is held against or flipped from.
function latestOwnRating(runDir,seat,beforeRound){
  var rounds=listRounds(runDir).filter(function(r){return (!beforeRound||r<beforeRound)&&!isFinalRound(r);});
  for(var i=rounds.length-1;i>=0;i--){
    var a=roundAnswers(runDir,rounds[i],[seat])[0];
    if(!a.missing&&a.contract==='rating')return a;
  }
  return null;
}

// What a seat's packet in `round` read, for the flip check and the record: the round it read
// (from the packet.built log line, else the previous round), the other seats' answers in that
// round, the seat's own earlier turn (from the log line, else its latest earlier answer), and
// the seat's latest earlier rating (from the log line's own_rating, else looked up), which is
// what a flip is measured from when the earlier turn carried no rating.
function flipInputs(runDir,seat,round,seats){
  var reads=null, ownRound=null, ratedRound=null, line=null;
  readLog(runDir).forEach(function(e){ if(e.event==='packet.built'&&e.round===round&&e.seat===seat.id&&e.mode!=='final-sn'&&e.mode!=='final-redflag'){line=e;reads=e.reads_round||null;ownRound=e.own_previous||null;ratedRound=e.own_rating||null;} });
  // A packet that shared no other seat (an N round) gives the flip check nothing to match:
  // the seat never saw those answers. Only a packet with no log line falls back to the previous round.
  var shared=line?line.shares!==false:true;
  if(!reads&&!line)reads=previousRound(runDir,round);
  var prevAnswers=(reads&&shared)?roundAnswers(runDir,reads,seats):[];
  var own=null;
  if(ownRound){var p=path.join(runDir,'rounds',ownRound,seat.id+'.answer.md');if(fs.existsSync(p))own={seat:seat,round:ownRound,file:p,text:readText(p)};}
  if(!own)own=latestOwnAnswer(runDir,seat,round);
  var ownRated=null;
  if(ratedRound){var q=path.join(runDir,'rounds',ratedRound,seat.id+'.answer.md');if(fs.existsSync(q)&&parseRating(readText(q))!==null)ownRated={seat:seat,round:ratedRound,file:q,text:readText(q)};}
  if(!ownRated)ownRated=latestOwnRating(runDir,seat,round);
  return {readsRound:reads,own:own,ownRated:ownRated,prevAnswers:prevAnswers};
}

function wordCount(text){ return text.split(/\s+/).filter(Boolean).length; }

// The draft's counts (2026-10-15, Part 22): words, lines and paragraphs, measured by code from the
// text as stored. A paragraph is a block separated by a blank line; a single newline inside one
// is a line, not a paragraph, so a paste whose breaks were lost shows as one paragraph of one line.
// draftFactsLine prints them; oneLineWarning says so when a long draft arrived as one line, before
// any seat reads it (the inbox paste, the earliest record, already held it that way on the run of
// 2026-10-15, so the warning is the guard).
// Part 21 (ruled 2026-10-15, no claims checker): the same counter also measures what the seats
// misread on the run of 2026-10-15, and every packet carries the result as facts, not a verdict:
//   sentences: an end mark (. ! ?) followed by a space or a line end ends a sentence; a line with
//     no end mark is not a sentence; addresses are taken out before counting. The count is exact
//     (sentences_exact true) when the text holds no abbreviation or decimal the rule miscounts
//     ("Dr.", "e.g.", "U.S.", "3.5"); else it is given as "about N" with that reason.
//   em_dashes (U+2014), en_dashes (U+2013), double_hyphens (" -- " or "--" inside a line).
//   links: each address with its paragraph and line number, whether it stands alone on its line,
//     whether it is the last thing in the draft, and whether it sits inside a sentence (text
//     follows it on its line or an end mark closes it); the address itself is never in the facts,
//     so no draft text leaves the fence.
var URL_RE=/\bhttps?:\/\/[^\s<>()"']+|\bwww\.[^\s<>()"']+/gi;
var ABBREV_RE=/\b(?:[A-Z][a-z]{0,3}|[A-Za-z]|e\.g|i\.e|etc|vs|cf|No|St|Mr|Mrs|Ms|Dr|Prof|Jr|Sr|Inc|Ltd|Co|Corp|Fig|approx|dept)\.(?=\s+[a-z0-9]|\s*[A-Z]\.|$)|\b[A-Z](?:\.[A-Z])+\.|\d\.\d/m;
function draftFacts(text){
  var src=String(text||'').replace(/\r\n/g,'\n').replace(/^\uFEFF/,'').replace(/\s+$/,'');
  var rawLines=src?src.split('\n'):[];
  var lines=rawLines.filter(function(l){return l.trim()!=='';}).length;
  var blocks=src?src.split(/\n\s*\n/).filter(function(b){return b.trim()!=='';}):[];
  var paragraphs=blocks.length;
  // Links, by position; the address is dropped from the text before sentences are counted.
  var links=[], lineNo=0, paraNo=0, lastNonBlank=-1;
  rawLines.forEach(function(l,i){ if(l.trim()!=='')lastNonBlank=i; });
  var prevBlank=true;
  rawLines.forEach(function(l,i){
    var blank=l.trim()==='';
    if(!blank){ lineNo++; if(prevBlank)paraNo++; }
    prevBlank=blank;
    var m, re=new RegExp(URL_RE.source,'gi');
    while((m=re.exec(l))){
      var before=l.slice(0,m.index).trim(), after=l.slice(m.index+m[0].length).trim();
      var alone=before===''&&(after===''||/^[.,;:!?)]+$/.test(after));
      links.push({paragraph:paraNo,line:lineNo,alone_on_line:alone,last_in_draft:i===lastNonBlank&&(after===''||/^[.,;:!?)]+$/.test(after)),in_sentence:!alone||/^[.!?]/.test(after)});
    }
  });
  var stripped=src.replace(new RegExp(URL_RE.source,'gi'),'LINK');
  var sentences=0;
  stripped.split('\n').forEach(function(l){
    var ms=l.match(/[.!?]+["\u201d\u2019')\]]*(?=\s|$)/g);
    sentences+=ms?ms.length:0;
  });
  var exact=!ABBREV_RE.test(stripped);
  var em=(src.match(/\u2014/g)||[]).length, en=(src.match(/\u2013/g)||[]).length, dh=(src.match(/--/g)||[]).length;
  return {words:wordCount(src),lines:lines,paragraphs:paragraphs,sentences:sentences,sentences_exact:exact,em_dashes:em,en_dashes:en,double_hyphens:dh,links:links};
}
// The facts in one line, for the packet, the record and the board: counts, dashes, and each
// link by position. No draft text.
function draftFactsFull(f){
  var parts=[draftFactsLine(f)];
  parts.push((f.sentences_exact?'':'about ')+f.sentences+' sentence'+(f.sentences===1?'':'s')+(f.sentences_exact?'':' (the rule may miscount abbreviations or decimals)'));
  parts.push(f.em_dashes+' em dash'+(f.em_dashes===1?'':'es')+', '+f.en_dashes+' en dash'+(f.en_dashes===1?'':'es')+', '+f.double_hyphens+' double hyphen'+(f.double_hyphens===1?'':'s'));
  if(!f.links.length)parts.push('no link');
  else parts.push(f.links.length+' link'+(f.links.length===1?'':'s')+': '+f.links.map(function(k,i){
    return 'link '+(i+1)+' in paragraph '+k.paragraph+', line '+k.line+(k.alone_on_line?', alone on its line':', inside a sentence')+(k.last_in_draft?', the last thing in the draft':'');
  }).join('; '));
  return parts.join(' · ');
}
var FACTS_HEADING='Measured by code (facts, not a judgment)';

// THE VOICE FLOOR, shared (Part 76, 76.1, 81): a voice is good when its name or identifier carries
// Premium or Enhanced; Premium ranks above Enhanced, then the founder's order, then the name. The
// board's page and speak.js (the Mac's own engine writing files) read the same rule.
var VOICE_ORDER=["Ava","Nathan","Allison","Zoe","Samantha","Evan","Joelle","Noelle","Tom","Susan","Nicky","Aaron"];
function voiceTier(nameOrId){ var n=String(nameOrId||''); return /\(Premium\)|\.premium\./i.test(n)?2:(/\(Enhanced\)|\.enhanced\./i.test(n)?1:0); }
function voiceBase(name){ var n=String(name||''); var p=n.indexOf(' ('); return (p>0?n.slice(0,p):n).trim(); }
function voiceRank(name){ var i=VOICE_ORDER.indexOf(voiceBase(name)); return i<0?VOICE_ORDER.length:i; }
// The answer as the words a voice should read (issue 82; Part 81 moved it here from the board):
// the rewrite fence lines and the bare Answer label dropped, then the markdown marks (bold, italic,
// code, headings, list bullets, quote marks); the second pass appended under its heading.
function isFenceLine(l){ var s=String(l).trim().replace(/^[`*_]+|[`*_]+$/g,'').trim(); return s===REWRITE_BEGIN||s===REWRITE_END; }
function plainSpoken(text){
  return String(text||'').replace(/\r\n/g,'\n').replace(/^﻿/,'').split('\n').map(function(l){
    return l.replace(/^\s*#{1,6}\s+/,'').replace(/^\s*>\s?/,'').replace(/^\s*(?:[*\-•]|\d+[.)])\s+/,'');
  }).join('\n').replace(/\*\*|__|`/g,'').replace(/(^|[^*\w])\*(\S(?:[^*\n]*?\S)?)\*(?![\w*])/g,'$1$2').replace(/\n{3,}/g,'\n\n').trim();
}
function spokenPlain(answer,crewText){
  var seen=false;
  var body=String(answer||'').split(/\r?\n/).filter(function(l){ if(isFenceLine(l))return false; if(!seen&&sectionLabelOf(l)==='answer'){seen=true;return false;} return true; }).join('\n');
  var out=plainSpoken(body);
  if(crewText)out+='\n\n'+CREW_PASS_HEADING+'.\n\n'+plainSpoken(crewText);
  return out;
}

// THE LABELED DRAFT (Part 79, issue 116, 2026-10-28). The founder's shape: greeting, opening
// sentence, body, closer (the signature is the mail client's, never in the draft). On the run of
// 2026-10-28 one seat rewrote the greeting, one the whole email and one the first body sentence
// under the same guidance ("rewrite the opening line"), because the draft's literal first line is
// the greeting and the packet named no parts. draftParts measures them by position:
//   greeting: the first block when it is one line of at most six words ending in a comma or a
//     colon and no question or exclamation mark ("Dana,", "Hi Dana,", "Dear Dr. Smith:"); else none.
//   opening: the first sentence of the first block after the greeting, by the facts' sentence rule
//     (an end mark followed by a space or the line end, addresses skipped); a block with no end
//     mark is one sentence.
//   closer: the last block after the greeting when two or more remain, a block that is only an
//     address folded into the block before it when three or more remain; with two remaining and
//     the last a bare address, the first block's last sentence (the call to action) with the
//     address; in a one-block draft, its last sentence when it has two or more; else none.
//   body: what lies between the opening and the closer; none when nothing does.
// Each part is given by paragraph and sentence number and its first eight words at most, so the
// packet names the parts without carrying the draft outside its fence. draftPartsLines renders
// them; PARTS_LINE is the Contract's sentence: "opening line" means the opening sentence.
var GREETING_RE=/^[^!?\n]{1,60}[,:]$/;
function sentenceSpans(block){
  var spans=[], urls=[], m, re=new RegExp(URL_RE.source,'gi');
  while((m=re.exec(block)))urls.push([m.index,m.index+m[0].length]);
  var inUrl=function(i){return urls.some(function(u){return i>=u[0]&&i<u[1];});};
  var endRe=/[.!?]+["”’')\]]*(?=\s|$)/g, start=0;
  while((m=endRe.exec(block))){
    if(inUrl(m.index))continue;
    var end=m.index+m[0].length;
    spans.push([start,end]); start=end;
    while(start<block.length&&/\s/.test(block[start]))start++;
  }
  if(start<block.length&&block.slice(start).trim())spans.push([start,block.length]);
  if(!spans.length&&block.trim())spans.push([0,block.length]);
  return spans;
}
function openingWords(text,n){
  var w=String(text||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean);
  return w.slice(0,n||8).join(' ')+(w.length>(n||8)?' …':'');
}
function draftParts(text){
  var src=String(text||'').replace(/\r\n/g,'\n').replace(/^﻿/,'').replace(/\s+$/,'');
  var blocks=src?src.split(/\n\s*\n/).map(function(b){return b.replace(/^\s+|\s+$/g,'');}).filter(Boolean):[];
  var out={greeting:null,opening:null,body:null,closer:null};
  if(!blocks.length)return out;
  var at=0;
  if(blocks[0].indexOf('\n')<0&&wordCount(blocks[0])<=6&&GREETING_RE.test(blocks[0])){out.greeting={paragraph:1,text:blocks[0]};at=1;}
  var rest=blocks.slice(at); if(!rest.length)return out;
  var para=function(i){return at+i+1;};
  var isLink=function(b){return b.replace(new RegExp(URL_RE.source,'gi'),'').replace(/[\s.,;:!?()]+/g,'')==='';};
  var closerFrom=-1;
  if(rest.length>=3&&isLink(rest[rest.length-1]))closerFrom=rest.length-2;
  else if(rest.length>=2)closerFrom=rest.length-1;
  var firstSpans=sentenceSpans(rest[0]);
  out.opening={paragraph:para(0),sentence:1,words:openingWords(rest[0].slice(firstSpans[0][0],firstSpans[0][1]))};
  if(rest.length===2&&isLink(rest[1])&&firstSpans.length>=2){
    // The run of 2026-10-28: a greeting, one paragraph of three sentences, a bare link. The closer
    // is the paragraph's last sentence (the call to action) with the link; the body the sentences
    // between it and the opening.
    var cta=firstSpans[firstSpans.length-1];
    out.closer={paragraph_from:para(0),sentence:firstSpans.length,paragraph_to:para(1),words:openingWords(rest[0].slice(cta[0],cta[1]))};
    if(firstSpans.length>=3)out.body={paragraph_from:para(0),sentence_from:2,paragraph_to:para(0),sentence_to:firstSpans.length-1};
    return out;
  }
  if(closerFrom>=0){
    out.closer={paragraph_from:para(closerFrom),paragraph_to:para(rest.length-1),words:openingWords(rest[closerFrom])};
    var bodyStart=firstSpans.length>1?{paragraph:para(0),sentence:2}:(closerFrom>1?{paragraph:para(1),sentence:1}:null);
    if(bodyStart)out.body={paragraph_from:bodyStart.paragraph,sentence_from:bodyStart.sentence,paragraph_to:para(closerFrom-1)};
  } else if(firstSpans.length>=2){
    var last=firstSpans[firstSpans.length-1];
    out.closer={paragraph_from:para(0),paragraph_to:para(0),sentence:firstSpans.length,words:openingWords(rest[0].slice(last[0],last[1]))};
    if(firstSpans.length>=3)out.body={paragraph_from:para(0),sentence_from:2,paragraph_to:para(0),sentence_to:firstSpans.length-1};
  }
  return out;
}
var PARTS_HEADING='The draft\'s parts (measured by code, by position; the first words only)';
var PARTS_LINE='Where the task says "opening line", "opening sentence", "first line" or "first sentence", it means the OPENING SENTENCE named under the draft heading, never the greeting; "body" and "closer" mean the parts named there.';
function draftPartsLines(p){
  var q=function(s){return '"'+String(s).replace(/"/g,'”')+'"';};
  var lines=[PARTS_HEADING+':'];
  lines.push('- GREETING: '+(p.greeting?'paragraph '+p.greeting.paragraph+', '+q(p.greeting.text):'none'));
  lines.push('- OPENING SENTENCE: '+(p.opening?'paragraph '+p.opening.paragraph+', sentence '+p.opening.sentence+', beginning '+q(p.opening.words):'none'));
  lines.push('- BODY: '+(p.body?('paragraph '+p.body.paragraph_from+(p.body.sentence_from?' from sentence '+p.body.sentence_from:'')+' through paragraph '+p.body.paragraph_to+(p.body.sentence_to?' sentence '+p.body.sentence_to:'')):'none (the opening sentence runs straight into the closer)'));
  lines.push('- CLOSER: '+(p.closer?((p.closer.paragraph_from===p.closer.paragraph_to?'paragraph '+p.closer.paragraph_from+(p.closer.sentence?', sentence '+p.closer.sentence:''):(p.closer.sentence?'paragraph '+p.closer.paragraph_from+' from sentence '+p.closer.sentence+' through paragraph '+p.closer.paragraph_to:'paragraphs '+p.closer.paragraph_from+' to '+p.closer.paragraph_to))+', beginning '+q(p.closer.words)):'none'));
  return lines;
}
function draftFactsLine(f){
  return f.words+' word'+(f.words===1?'':'s')+' · '+f.paragraphs+' paragraph'+(f.paragraphs===1?'':'s')+' · '+f.lines+' line'+(f.lines===1?'':'s');
}
var ONE_LINE_WORDS=60;
function oneLineWarning(f){
  if(f.lines===1&&f.words>ONE_LINE_WORDS)return 'The draft arrived as one line of '+f.words+' words; if it had paragraph breaks, paste it again.';
  return null;
}

// The retry target (ruled 2026-10-15): a seat sent back over the cap is asked for a target well
// under it, 80% (400 of 500, 480 of 600, 200 of 250), so the second answer has room; the cap
// itself still holds. The add-on mirrors retryTarget word for word; crew_check.js pins the two equal.
var RETRY_TARGET_RATIO=0.8;
function retryTarget(cap){ return Math.floor(cap*RETRY_TARGET_RATIO); }

// The cut (ruled 2026-10-09 for an outside seat, 2026-10-15 for every seat): on a seat's second
// overrun, the read is truncated at the cap, marked, and its rating kept. The contract's first
// line (RATING: X/10 for a rating read, the S/N or red-flag line for a final read) is pulled out
// of the reply wherever it sits before the cut, so it survives even when the seat put it last;
// the rest is cut at the last sentence end at or before the cap when one falls within the last
// SENTENCE_CUT_WINDOW words, else at the word, so that the whole file counts no more than the
// cap. A critique read has no such line; it is cut at the cap as it stands. Returns null when
// the reply is within the cap. The add-on mirrors this function word for word (it never reaches
// into the listed plugin's folder); crew_check.js pins the two equal.
var SENTENCE_CUT_WINDOW=60;
function truncateAnswer(text,cap,read,contract){
  if(!cap||wordCount(text)<=cap)return null;
  var returned=wordCount(text);
  var re=read==='sn'?/^S\/N RATIO: \d{1,3}%$/:read==='redflag'?/^(NO RED FLAGS|RED FLAGS FOUND: \d+)$/:(contract==='critique'||contract==='crew'||read==='crew')?null:/^RATING: \d{1,2}\/10$/;
  var lines=text.split('\n'), head=null, moved=false;
  if(re){
    for(var i=0;i<lines.length;i++){
      if(re.test(lines[i].trim())){head=lines[i].trim();moved=i>0;lines.splice(i,1);break;}
    }
  }
  var body=lines.join('\n').replace(/^\s+/,'');
  var budget=cap-(head?wordCount(head):0);
  var w=/\S+/g, n=0, end=0, m, sentenceEnd=0, sentenceWords=0;
  while(budget>0&&(m=w.exec(body))){
    n++;
    if(/[.!?]["\u201d\u2019')\]]*$/.test(m[0])&&!/^(https?:|www\.)/i.test(m[0])){sentenceEnd=w.lastIndex;sentenceWords=n;}
    if(n===budget){end=w.lastIndex;break;}
  }
  var cutAt='word';
  if(sentenceEnd&&budget-sentenceWords<=SENTENCE_CUT_WINDOW){end=sentenceEnd;cutAt='sentence';}
  var cut=body.slice(0,end).replace(/\s+$/,'');
  var out=(head?head+'\n\n':'')+cut;
  return {text:out,truncated:{at:cap,words_returned:returned,words_kept:wordCount(out),first_line_moved:moved,cut_at:cutAt}};
}

// The verdict in an answer (2026-10-14): a seat's number and its words must agree. 8 to 10 is a
// working document, 1 to 6 a problem document (the seat's own rule); an 8 to 10 that says the
// draft is not send-ready, or a 1 to 6 that says it ships as it is, is a failed read, and the
// seat is sent back once with the reason, like an overrun. The phrases are these and no others;
// the first one found, in reading order, is the verdict. A "ready" phrase with a negation in
// the same clause before it ("is not ready to send") reads as not ready; one in a conditional
// clause ("to make this ready to send", "until it is send-ready") is no verdict at all.
var NOT_READY_RE=/\b(?:not|isn[’']t|never|nowhere near)\s+(?:yet\s+)?send[- ]ready\b|\bnot\s+(?:yet\s+)?ready\s+(?:to\s+(?:send|ship|publish|go)|as\s+(?:it\s+)?is)\b|\b(?:do\s+not|don[’']t)\s+(?:send|ship|publish)\b|\bback\s+to\s+the\s+drawing\s+board\b/i;
var READY_RE=/\bships?\s+as[- ](?:it\s+)?is\b|\b(?:send|ship|publish)\s+(?:it\s+)?as[- ](?:it\s+)?is\b|\bready\s+to\s+(?:send|ship|publish)\b|\b(?:is|it[’']s|is\s+now|now)\s+send[- ]ready\b|\bsend[- ]ready\s+as[- ](?:it\s+)?is\b|\bships\s+(?:today|now)\b/i;
var NEGATION_RE=/\b(?:not|n[’']t|never|nor|far\s+from|hardly|without|isn[’']t|aren[’']t|wasn[’']t)\b|n[’']t\b/i;
var CONDITIONAL_RE=/\b(?:make|makes|making|made|until|before|once|if|unless|would\s+be|to\s+be|to\s+get|get|gets|become|becomes|becoming|so\s+(?:that\s+)?it|needs?\s+to\s+be|should\s+be|could\s+be|must\s+be|what\s+would)\b/i;
function verdictPhrases(text){
  var found=[];
  var flat=String(text||'').replace(/\s+/g,' ');
  function clauseBefore(idx){
    var start=idx;
    while(start>0&&!/[.!?;:\n]/.test(flat[start-1]))start--;
    return flat.slice(Math.max(start,idx-60),idx);
  }
  var re=new RegExp(NOT_READY_RE.source+'|'+READY_RE.source,'gi'), m;
  while((m=re.exec(flat))){
    var phrase=m[0];
    var notReady=NOT_READY_RE.test(phrase);
    NOT_READY_RE.lastIndex=0;
    var before=clauseBefore(m.index);
    if(!notReady){
      if(NEGATION_RE.test(before))notReady=true;
      else if(CONDITIONAL_RE.test(before))continue;
    }
    found.push({verdict:notReady?'not-ready':'ready',phrase:phrase,index:m.index});
  }
  return found;
}
function verdictOf(text){ var f=verdictPhrases(text); return f.length?f[0]:null; }

// HTML escaping for the board: every seat's words and every draft are text, never markup.
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
// A markdown subset for a seat's read on the board (2026-10-15: outside seats write markdown
// and it printed raw). Escaped first, then only: paragraphs (blank-line separated; a single
// newline inside one is a line break), bullet lines (* - •) and numbered lines (1. or 1))
// grouped into lists, **bold**, __bold__, *italic*, `code`, and a # heading line as a bold
// paragraph. No link is rendered (an address stays text, so the page keeps its one href), no
// image, no raw HTML, nothing else. The draft itself is not run through this: it is the
// author's text as pasted.
function renderLite(text){
  function inline(l){
    var e=escapeHtml(l);
    e=e.replace(/`([^`\n]+)`/g,'<code>$1</code>');
    e=e.replace(/\*\*([^\n]+?)\*\*/g,'<strong>$1</strong>').replace(/__([^\n]+?)__/g,'<strong>$1</strong>');
    e=e.replace(/(^|[^*\w])\*(\S(?:[^*\n]*?\S)?)\*(?![\w*])/g,'$1<em>$2</em>');
    return e;
  }
  var src=String(text||'').replace(/\r\n/g,'\n').replace(/^﻿/,'').trim();
  if(!src)return '';
  return src.split(/\n\s*\n/).map(function(block){
    var out=[], para=[], list=null;
    function flushPara(){ if(para.length){out.push('<p>'+para.map(inline).join('<br>')+'</p>');para=[];} }
    function flushList(){ if(list){out.push('<'+list.tag+'>'+list.items.map(function(i){return '<li>'+inline(i)+'</li>';}).join('')+'</'+list.tag+'>');list=null;} }
    block.split('\n').forEach(function(line){
      var bul=/^\s*[*\-•]\s+(.*)$/.exec(line), num=/^\s*\d+[.)]\s+(.*)$/.exec(line), head=/^\s*#{1,6}\s+(.*)$/.exec(line);
      if(bul||num){ var tag=num?'ol':'ul'; flushPara(); if(list&&list.tag!==tag)flushList(); if(!list)list={tag:tag,items:[]}; list.items.push((bul||num)[1]); return; }
      flushList();
      if(head){ flushPara(); out.push('<p><strong>'+inline(head[1])+'</strong></p>'); return; }
      para.push(line);
    });
    flushPara(); flushList();
    return out.join('');
  }).join('');
}

// The one-line verdict the board frames: the first sentence or two of the answer after its
// first line (the whole answer under the critique contract; the Answer section when the answer
// carries the two labels, issue 80), cut at a sentence end before 200 characters, else at a word
// with an ellipsis. Markdown list and heading marks are dropped.
var VERDICT_MAX=200;
function verdictLine(text,contract){
  var lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/);
  var sec=answerSections(text);
  // A rewrite (issue 103) is framed by its own opening, the greeting line skipped.
  var rw=rewriteOf(text);
  var body=rw&&rw.text?rw.text.split(/\r?\n/):sec.answer!==null?sec.answer.split(/\r?\n/):lines.slice(contract==='critique'?0:1);
  if(rw&&rw.text&&body.length>1&&body[0].trim().length<60&&/,\s*$/.test(body[0]))body=body.slice(1);
  var para='';
  for(var i=0;i<body.length;i++){
    var l=body[i].replace(/^[\s#>*\-]+/,'').trim();
    if(!l){ if(para)break; else continue; }
    para+=(para?' ':'')+l;
  }
  para=para.replace(/\*\*|__|`/g,'').replace(/(^|[^*\w])\*(\S(?:[^*\n]*?\S)?)\*(?![\w*])/g,'$1$2').replace(/\s+/g,' ').trim();
  if(para.length<=VERDICT_MAX)return para;
  var head=para.slice(0,VERDICT_MAX+1);
  var cut=Math.max(head.lastIndexOf('. '),head.lastIndexOf('! '),head.lastIndexOf('? '),head.lastIndexOf('." '),head.lastIndexOf('.” '));
  if(cut>=40)return para.slice(0,cut+1).replace(/[”"]$/,'').replace(/\.$/,'.');
  var sp=head.lastIndexOf(' ');
  return para.slice(0,sp>40?sp:VERDICT_MAX).replace(/[\s,;:]+$/,'')+'…';
}

// Which first-line contract an answer file is under, from its name alone. A battle answer
// in a round that asked for no rating is under the 'critique' contract instead; contractSent
// reads that from the packet, since the file name is the same.
function contractOf(file){
  var b=path.basename(file);
  if(/\.sn\.answer\.md$/.test(b))return 'sn';
  if(/\.redflag\.answer\.md$/.test(b))return 'redflag';
  if(/\.crew\.answer\.md$/.test(b))return 'crew';
  return 'rating';
}

// The first line's number under the rating contract, or null. Trailing whitespace is tolerated.
function parseRating(text){
  var first=((text||'').replace(/^﻿/,'').split(/\r?\n/)[0]||'').replace(/[ \t]+$/,'');
  var m=/^RATING: (\d{1,2})\/10$/.exec(first);
  return m?parseInt(m[1],10):null;
}

// The contracts, checked on a seat's answer. Returns {ok, contract, rating, value, words, reasons}.
//   rating:   RATING: X/10, uppercase, X 1 to 10, never 7, nothing else on the line.
//   critique: a battle round that asked for no rating (ruled 2026-10-09): no RATING line
//             anywhere on the first line; the critique opens the answer.
//   sn:       S/N RATIO: XX%, XX 0 to 100, nothing else on the line. (The app's; no 7 ban.)
//   redflag:  NO RED FLAGS, or RED FLAGS FOUND: X with X 1 or more, nothing else on the line. (The app's.)
//   Trailing spaces or tabs on the first line are tolerated on every contract; trailing text is not.
function checkAnswer(text,wordCap,contract,opts){
  contract=contract||'rating';
  opts=opts||{};
  var reasons=[];
  var cap=wordCap||(contract==='rating'||contract==='critique'?DEFAULT_WORD_CAP:contract==='crew'?DEFAULT_CREW_WORD_CAP:DEFAULT_FINAL_WORD_CAP);
  var lines=text.replace(/^﻿/,'').split(/\r?\n/);
  // Trailing spaces or tabs on the first line are tolerated; trailing text is not.
  var first=(lines[0]||'').replace(/[ \t]+$/,'');
  var rating=null, value=null, m;
  if(first.trim()===''){
    reasons.push(contract==='critique'?'first line is empty; open with your critique':contract==='crew'?'first line is empty; open with your reply to the other seats':'first line is empty; the '+(contract==='rating'?'rating':contract==='sn'?'S/N RATIO':'red-flag')+' line must come first');
  }else if(contract==='critique'||contract==='crew'){
    if(/^\s*rating\s*:/i.test(first))reasons.push(contract==='crew'?'the second pass asks for no rating; remove the RATING line and open with your reply to the other seats':'this round asked for no rating; remove the RATING line and open with your critique');
  }else if(contract==='rating'){
    m=/^RATING: (\d{1,2})\/10$/.exec(first);
    if(!m){
      if(/^\s*rating\s*:/i.test(first))reasons.push('first line is "'+first+'", must be exactly "RATING: X/10" in uppercase with nothing else on the line');
      else reasons.push('first line is not the rating line: "'+first.slice(0,80)+'"');
    }else{
      rating=parseInt(m[1],10);
      if(rating<1||rating>10)reasons.push('rating '+rating+' is outside 1 to 10');
      else if(rating===7)reasons.push('rating is 7; 7 is forbidden, commit to 6 or 8');
      else{
        var v=verdictOf(lines.slice(1).join('\n'));
        if(v&&rating>=8&&v.verdict==='not-ready')reasons.push('rating '+rating+'/10 calls the draft a working document (8 to 10), but the answer says "'+v.phrase+'"; make the number and the verdict agree');
        if(v&&rating<=6&&v.verdict==='ready')reasons.push('rating '+rating+'/10 calls the draft a problem document (1 to 6), but the answer says "'+v.phrase+'"; make the number and the verdict agree');
      }
    }
  }else if(contract==='sn'){
    m=/^S\/N RATIO: (\d{1,3})%$/.exec(first);
    if(!m)reasons.push('first line is "'+first.slice(0,80)+'", must be exactly "S/N RATIO: XX%" with nothing else on the line');
    else{value=parseInt(m[1],10);if(value>100)reasons.push('S/N '+value+'% is over 100');}
  }else if(contract==='redflag'){
    if(first==='NO RED FLAGS')value=0;
    else if((m=/^RED FLAGS FOUND: (\d+)$/.exec(first))){value=parseInt(m[1],10);if(value<1)reasons.push('RED FLAGS FOUND: 0 is not a count; say NO RED FLAGS');}
    else reasons.push('first line is "'+first.slice(0,80)+'", must be exactly "NO RED FLAGS" or "RED FLAGS FOUND: X"');
  }else die('unknown contract '+contract);
  var body=lines.slice(contract==='critique'||contract==='crew'?0:1).join('\n');
  if(body.trim()==='')reasons.push(contract==='critique'?'no critique':contract==='crew'?'no reply to the other seats':'no reasoning after the first line');
  var words=wordCount(text);
  // The cap reason names the retry target (ruled 2026-10-15); it reaches a fresh reader in its retry
  // task and an outside seat in its retry note, so both get the same number from this one line.
  if(words>cap)reasons.push(words+' words, over the cap of '+cap+'; write it again under '+retryTarget(cap)+' words, counting them; a second answer over '+cap+' is cut at the last sentence before '+cap);
  // The two sections (issue 80), only when the packet asked for them; the reasons are listed apart so
  // check-answer.js can turn them into notes on a second check.
  var held=contract==='rating'||contract==='critique';
  var sectionFaults=(opts.sections&&held?sectionReasons(text,contract):[]).concat(opts.rewrite&&held?rewriteReasons(text,contract):[]);
  reasons=reasons.concat(sectionFaults);
  return {ok:reasons.length===0,contract:contract,rating:rating,value:value,words:words,reasons:reasons,sections:opts.sections?answerSections(text).labeled:null,rewrite:opts.rewrite?!!rewriteOf(text):null,section_reasons:sectionFaults};
}

// The record's line for a cut read, for either cutter: the checker (a fresh reader, 2026-10-15)
// or the crew add-on (an outside seat, 2026-10-09). `t` is the truncated object a log line carries.
function truncationLine(t){
  return 'Truncated at '+t.at+' words by '+(t.by==='checker'?'the checker':'the crew add-on')+' on the seat\'s second overrun; the seat returned '+t.words_returned+' words'+(t.cut_at==='sentence'?'; cut at the last sentence end before the cap':'')+(t.first_line_moved?'; its first line was found lower in the reply and moved to the top':'')+'.';
}

// Quotes in an answer, each with the other seat it is attributed to. A quote is a span in
// straight or curly double quotes, at least three words long. It is attributed to a seat when
// the same line, or the line before it, names that seat by id ("seat-2", "seat 2" or "seat2",
// any case; "seat-12" never names seat-1) or by its model name when that name belongs to
// exactly one other seat (matched exactly). Nothing else counts as attribution.
function normalizeQuote(s){ return s.replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').replace(/^[\s"'.,;:!?…-]+|[\s"'.,;:!?…-]+$/g,''); }
function seatIdPattern(id){
  var m=/^seat-(\d+)$/.exec(id);
  return m?new RegExp('\\bseat[-\\s]?'+m[1]+'\\b','i'):new RegExp('(^|[^A-Za-z0-9-])'+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^A-Za-z0-9-])');
}
function attributedQuotes(text,self,others){
  var lines=text.split(/\r?\n/), out=[];
  var modelCount={}; others.forEach(function(s){modelCount[s.model]=(modelCount[s.model]||0)+1;});
  function namedIn(line){
    return others.filter(function(s){
      if(seatIdPattern(s.id).test(line))return true;
      return s.model&&s.model!==MODEL_UNREPORTED&&modelCount[s.model]===1&&line.indexOf(s.model)>=0;
    });
  }
  var re=/["“]([^"“”]{8,}?)["”]/g, m;
  lines.forEach(function(line,i){
    while((m=re.exec(line))){
      var q=normalizeQuote(m[1]);
      if(q.split(' ').length<3)continue;
      var named=namedIn(line); if(!named.length&&i>0)named=namedIn(lines[i-1]);
      named.filter(function(s){return s.id!==self.id;}).forEach(function(s){out.push({quote:q,seat:s,line:i+1});});
    }
  });
  return out;
}

// The flip check for one seat's rating answer in one round.
//   previous: the seat's own answer in the round it read (text), or null when it has none.
//   carried:  the other seats' answers in that round (from roundAnswers), the quotes are matched against these.
// Returns {status, from, to, quote, cited, reason}. Statuses: first (no earlier answer), stand (held and says
// Stand), held (held and does not say Stand), flip-valid (changed, quote found in the cited seat's answer),
// flip-invalid (changed, no quote, misattributed, or altered), unrated (first line not a rating).
function checkFlip(text,self,previousText,carried){
  var to=parseRating(text);
  if(to===null)return {status:'unrated',from:null,to:null};
  if(!previousText)return {status:'first',from:null,to:to};
  var from=parseRating(previousText);
  if(from===null)return {status:'first',from:null,to:to};
  if(from===to){
    var stands=/\bStand\b/.test(text);
    return {status:stands?'stand':'held',from:from,to:to,reason:stands?null:'held the rating without saying Stand'};
  }
  var others=carried.filter(function(c){return c.seat.id!==self.id;}).map(function(c){return c.seat;});
  var quotes=attributedQuotes(text,self,others);
  if(!quotes.length)return {status:'flip-invalid',from:from,to:to,reason:'rating changed with no quote attributed to another seat'};
  for(var i=0;i<quotes.length;i++){
    var q=quotes[i];
    var cited=carried.filter(function(c){return c.seat.id===q.seat.id&&!c.missing;})[0];
    if(!cited)continue;
    if(normalizeQuote(cited.text).indexOf(q.quote)>=0)return {status:'flip-valid',from:from,to:to,quote:q.quote,cited:q.seat.id};
  }
  return {status:'flip-invalid',from:from,to:to,quote:quotes[0].quote,cited:quotes[0].seat.id,
    reason:'the quote attributed to '+quotes[0].seat.id+' is not in that seat\'s answer (altered or misattributed)'};
}


// The run as one object (Part 43, 2026-10-21): every presentation over a run reads this,
// the screen first, so the rules that make a cell, a latest rating or the band live once.
// Built from the files and log.jsonl, like the record and the board; nothing is averaged. The
// why-lines of the band and the no-rounds line are the board's words, pinned equal by
// tests/state_check.js; render-board.js and render-record.js keep their own code until a
// later cleanup moves them onto runState.
var STATE_SCHEMA=1;
var STATE_FILE='state.json';
function pluginVersion(){ try{ return JSON.parse(readText(path.join(__dirname,'..','.claude-plugin','plugin.json'))).version||null; }catch(e){ return null; } }
function lastLogWhere(log,pred){ for(var i=log.length-1;i>=0;i--){ if(pred(log[i]))return log[i]; } return null; }
function noRoundsLine(hasDraft,hasBrief){
  return hasDraft
    ?'No rounds yet. The draft'+(hasBrief?' and the brief are':' is')+' stored; no seat has read it. Next: '+CMD.sparring+' for the first reads and ratings, or '+CMD.battle+' to start with the discussion.'
    :'No rounds yet. The brief is stored; there is no draft yet. Next: '+CMD.sparring+' or '+CMD.battle+' with the draft pasted; it joins this run.';
}
// A cut read: the add-on's cut (crew.answered) or the checker's (answer.checked), whichever is
// last for that seat, round and read.
function truncationOf(log,seatId,round,read){
  var e=lastLogWhere(log,function(x){return (x.event==='crew.answered'&&x.round===round&&x.seat===seatId&&(x.read||'rating')===read)
    ||(x.event==='answer.checked'&&x.round===round&&x.seat===seatId&&x.truncated&&(x.contract==='sn'||x.contract==='redflag'?x.contract:'rating')===read);});
  if(!e||!e.truncated)return null;
  return Object.assign({by:e.event==='answer.checked'?'checker':'add-on'},e.truncated);
}
function withTrunc(mark,t){ return t?(mark?mark+' · ':'')+'truncated at '+t.at+' words':mark; }
// One seat in one non-final round: kind is missing, not-asked, failed, critique, first, stand,
// held, flip-valid or flip-invalid; rating is the number or null (a 7 or a contradiction is a
// failed read, so a rating here is always a sound one); text is the scoreboard cell's word.
function roundCell(runDir,seat,round,seats,log){
  var rel=path.join('rounds',round,seat.id+'.answer.md'), p=path.join(runDir,rel);
  var q=path.join(runDir,'rounds',round,seat.id+'.question.md');
  var note=fs.existsSync(q)?readText(q).trim():null;
  if(!fs.existsSync(p))return wasAsked(runDir,round,seat.id,log)?{kind:'missing',text:'missing',rating:null,mark:'',title:'',note:note,file:null}:{kind:'not-asked',text:'not asked',rating:null,mark:'',title:'the round was put to other seats only',note:note,file:null};
  var text=readText(p);
  var contract=contractSent(runDir,round,p,log);
  var logged=lastLogWhere(log,function(e){return e.event==='answer.checked'&&e.round===round&&e.seat===seat.id&&(!e.contract||e.contract===contract);});
  var check=checkAnswer(text,logged?logged.word_cap:null,contract);
  var trunc=truncationOf(log,seat.id,round,'rating');
  var rw=rewriteOf(text);
  var copy=logged&&logged.copy?logged.copy:null;
  var base={file:rel,words:wordCount(text),word_cap:logged?logged.word_cap:null,contract:contract,answer:text,truncated:trunc,note:note,verdict_line:verdictLine(text,contract),rewrite:rw?rw.text:null,copy:copy,from:null,cited:null,flip:null};
  if(!check.ok)return Object.assign(base,{kind:'failed',text:'failed read',title:check.reasons.join('; '),rating:null,wrote:check.rating,mark:withTrunc('',trunc),reasons:check.reasons});
  if(contract==='critique')return Object.assign(base,{kind:'critique',text:'critique',title:copy?'the rewrite is a copy of '+copy.model+'\'s':'this round asked for no rating',rating:null,mark:withTrunc(copyMark(copy),trunc),reasons:[]});
  var flip=lastLogWhere(log,function(e){return e.event==='flip.checked'&&e.round===round&&e.seat===seat.id;});
  if(!flip){ var inputs=flipInputs(runDir,seat,round,seats); flip=checkFlip(text,seat,inputs.ownRated?inputs.ownRated.text:null,inputs.prevAnswers); }
  var kind={first:'first',stand:'stand',held:'held','flip-valid':'flip-valid','flip-invalid':'flip-invalid',unrated:'first'}[flip.status]||'first';
  var mark={first:'',stand:'Stand',held:'held, no Stand','flip-valid':'flip from '+flip.from+', valid','flip-invalid':'flip from '+flip.from+', INVALID'}[kind]||'';
  var title={'flip-valid':'quoted '+flip.cited,'flip-invalid':flip.reason||'quote not found'}[kind]||'';
  return Object.assign(base,{kind:kind,rating:check.rating,text:check.rating+'/10',mark:withTrunc(mark,trunc),title:title,reasons:[],from:flip.from===undefined?null:flip.from,cited:flip.cited||null,flip:flip.status});
}
// One seat in a final round: its S/N read and its red-flag read, each missing, sound or failed.
function finalCell(runDir,seat,round,log){
  var out={};
  ['sn','redflag'].forEach(function(c){
    var rel=path.join('rounds',round,seat.id+'.'+c+'.answer.md'), p=path.join(runDir,rel);
    if(!fs.existsSync(p)){ out[c]={missing:true,ok:false,value:null,reasons:[],truncated:null,file:null,words:0,answer:null}; return; }
    var logged=lastLogWhere(log,function(e){return e.event==='answer.checked'&&e.round===round&&e.seat===seat.id&&e.contract===c;});
    var text=readText(p);
    var r=checkAnswer(text,logged?logged.word_cap:null,c);
    out[c]={missing:false,ok:r.ok,value:r.ok?r.value:null,reasons:r.reasons||[],truncated:truncationOf(log,seat.id,round,c),file:rel,words:wordCount(text),answer:text};
  });
  out.text=finalText(out);
  return out;
}
function finalText(f){
  var snT=f.sn.missing?'S/N missing':f.sn.ok?'S/N '+f.sn.value+'%':'S/N failed read';
  var rfT=f.redflag.missing?'red flags missing':f.redflag.ok?(f.redflag.value===0?'no red flags':f.redflag.value+' red flag'+(f.redflag.value===1?'':'s')):'red-flag read failed';
  return snT+' · '+rfT;
}
// The band (ruled 2026-10-14 and 2026-10-15): from every seat's own latest rating, nothing
// averaged; every rated seat at 8 or more is SEND; any at 6 or less is BACK TO THE DRAWING
// BOARD and the band names it; FINAL READS over each seat's two numbers when the run holds final
// reads and no rating; no band at all otherwise. The words are the board's.
function bandOf(seats,latest,finalRounds,finalCells){
  var rated=seats.filter(function(s){return !!latest[s.id];});
  var low=rated.filter(function(s){return latest[s.id].rating<=6;});
  var lastFinal=finalRounds.length?finalRounds[finalRounds.length-1]:null;
  if(!rated.length){
    if(lastFinal)return {verdict:'FINAL READS',why:'No seat has rated this draft. These are the final reads of round '+lastFinal+', each seat\'s own S/N ratio and red-flag count. Nothing is averaged.',low:[],numbers:seats.map(function(s){return {seat:s.id,label:seatLabel(s),text:finalCells[s.id].text};}),final_round:lastFinal};
    return {verdict:null,why:null,low:[],numbers:[],final_round:null};
  }
  var numbers=rated.map(function(s){return {seat:s.id,label:seatLabel(s),rating:latest[s.id].rating,round:latest[s.id].round};});
  if(!low.length)return {verdict:'SEND',why:(rated.length===1?'The one rated seat':'Every rated seat')+' put it at 8 or more: a working document by '+(rated.length===1?'its':'each seat\'s')+' own number. Nothing is averaged.',low:[],numbers:numbers,final_round:lastFinal};
  return {verdict:'BACK TO THE DRAWING BOARD',why:low.map(function(s){return seatLabel(s)+' rated it '+latest[s.id].rating+'/10';}).join('; ')+': a problem document by '+(low.length===1?'that seat\'s':'those seats\'')+' own number. Nothing is averaged; one seat at 6 or less sends it back.',low:low.map(function(s){return s.id;}),numbers:numbers,final_round:lastFinal};
}
function runState(runDir){
  runDir=path.resolve(runDir);
  var seats=readSeats(runDir).seats;
  var log=readLog(runDir);
  var rounds=listRounds(runDir);
  var finalRounds=rounds.filter(isFinalRound);
  var tableRounds=rounds.filter(function(r){return !isFinalRound(r);});
  var drafts=listDrafts(runDir), newestDraft=latestDraft(runDir);
  var hasBrief=fs.existsSync(path.join(runDir,'brief.md'));
  var readerText=readReader(runDir);
  var created=null; log.forEach(function(e){ if(e.event==='run.created'&&!created)created=e; });
  var draftsOut=drafts.map(function(d){
    var e=lastLogWhere(log,function(x){return (x.event==='draft.added'&&x.file===d)||(x.event==='run.created'&&d==='draft.md');});
    var buf=fs.readFileSync(path.join(runDir,d)), text=buf.toString('utf8'), f=draftFacts(text);
    return {file:d,n:draftNumber(d),sha256:(e&&(e.sha256||(e.draft&&e.draft.sha256)))||sha256(buf),facts:f,facts_line:draftFactsLine(f),facts_full:draftFactsFull(f),one_line_warning:oneLineWarning(f),newest:d===newestDraft,text:text};
  });
  var champ=championEvents(log);
  var shipped=champ.filter(function(e){return e.event==='champion.shipped';});
  var canons=listCanons(runDir).map(function(c){
    var froze=null; shipped.forEach(function(e){ if(e.canon===c&&e.canon_new)froze=e.draft; });
    var buf=fs.readFileSync(path.join(runDir,c));
    return {file:c,n:numberOf(c,'canon'),froze_draft:froze,current:!!newestDraft&&sha256(buf)===sha256(fs.readFileSync(path.join(runDir,newestDraft))),text:buf.toString('utf8')};
  });
  var seatsOut=seats.map(function(s){ return {id:s.id,model:s.model,company:s.company,served_by:s.served_by||null,provider:s.provider||null,short:seatShortName(s),label:seatLabel(s),fresh_reader:isFreshReader(s),source:s.source||null}; });
  var companies=seats.map(function(s){return s.company;}).filter(function(v,i,a){return a.indexOf(v)===i;});
  var crewLine=seats.map(seatLabel).join('; ')+'. '+(companies.length===1?'One company\'s models ('+companies[0]+').':companies.length+' companies: '+companies.join(', ')+'.')+' '+nameSources(seats);
  var grid={}, finals={};
  seats.forEach(function(s){ grid[s.id]={}; finals[s.id]={}; tableRounds.forEach(function(r){grid[s.id][r]=roundCell(runDir,s,r,seats,log);}); finalRounds.forEach(function(r){finals[s.id][r]=finalCell(runDir,s,r,log);}); });
  var roundsOut=rounds.map(function(r){
    var fin=isFinalRound(r);
    var task=roundTask(runDir,r,log);
    var asked=askedIn(runDir,r,log);
    var put=seats.filter(function(s){return !asked||asked[s.id];});
    var done=put.filter(function(s){return fs.existsSync(path.join(runDir,'rounds',r,s.id+(fin?'.sn':'')+'.answer.md'));});
    var ann=lastLogWhere(log,function(e){return e.event==='round.announced'&&e.round===r;});
    var packets=log.filter(function(e){return e.event==='packet.built'&&e.round===r;}).map(function(e){return {seat:e.seat,file:e.file,draft:e.draft,mode:e.mode,contract:e.contract,rerate:!!e.rerate,reads_round:e.reads_round||null,word_cap:e.word_cap,carried:(e.carried||[]).map(function(c){return c.seat;}),missing:e.missing||[],not_asked:e.not_asked||[],ts:e.ts};});
    var cells={}; seats.forEach(function(s){ cells[s.id]=fin?finals[s.id][r]:grid[s.id][r]; });
    return {round:r,n:parseInt(r.slice(0,2),10),kind:roundKind(r),final:fin,task:task,task_line:taskLine(task),rating_line:ratingLine(task,r),
      announced:ann?{kind:ann.kind,to:ann.to||[],rerate:!!ann.rerate,line:ann.line||null,ts:ann.ts}:null,
      put_to:put.map(function(s){return s.id;}),answered:done.map(function(s){return s.id;}),all_seats:!asked||put.length===seats.length,packets:packets,cells:cells};
  });
  var latest={}, latestTurn={};
  seats.forEach(function(s){
    latest[s.id]=null; latestTurn[s.id]=null;
    tableRounds.forEach(function(r){ var c=grid[s.id][r]; if(c.rating!==null&&c.rating!==undefined)latest[s.id]={round:r,rating:c.rating}; if(c.kind!=='not-asked')latestTurn[s.id]={round:r,kind:c.kind}; });
  });
  var lastFinalCells={}; if(finalRounds.length)seats.forEach(function(s){ lastFinalCells[s.id]=finals[s.id][finalRounds[finalRounds.length-1]]; });
  var band=bandOf(seats,latest,finalRounds,lastFinalCells);
  var championOut={
    shipped:shipped.map(function(e){ return {at:e.at,when:whenUtc(e.at),line:shippedLine(e),canon:e.canon,canon_new:!!e.canon_new,draft:e.draft,url:e.url||null,address_text:e.url?stripScheme(e.url):null,host:e.host||null,channel:e.channel||null,live:e.live===undefined?null:e.live,digest:!!e.digest,page_kind:e.page_kind||null,match:e.match||null}; }),
    results:champ.filter(function(e){return e.event==='champion.result';}).map(function(e){ return {at:e.at,date:dateUtc(e.at),text:String(e.text||'').replace(/\s+/g,' ').trim()}; }),
    insights:champ.filter(function(e){return e.event==='champion.insight';}).map(function(e){ return {at:e.at,date:dateUtc(e.at),text:e.text,vault:e.vault}; })
  };
  var noRounds=noRoundsLine(!!newestDraft,hasBrief);
  return {
    schema:STATE_SCHEMA,plugin_version:pluginVersion(),rendered_at:new Date().toISOString(),
    run:{id:path.basename(runDir),dir:runDir,stage_started:created&&created.stage?created.stage:null,first_round:rounds.length?rounds[0]:null,started_line:startedAtLine(runDir,log,rounds)},
    drafts:draftsOut,newest_draft:newestDraft,
    brief:{present:hasBrief,file:hasBrief?'brief.md':null,name:(created&&created.brief&&created.brief.name)||null,text:hasBrief?readText(path.join(runDir,'brief.md')).trim():null},
    reader:{present:readerText!==null,file:readerText!==null?READER_FILE:null,text:readerText,line:readerWords(readerText)},
    canons:canons,newest_canon:latestCanon(runDir),
    seats:seatsOut,crew_line:crewLine,seats_lines:crewStateLines(runDir,seats,log),seat_key:seatKey(seats),name_sources:nameSources(seats),
    briefing:null,
    rounds:roundsOut,latest:latest,latest_turn:latestTurn,band:band,champion:championOut,
    next_line:rounds.length?nextLine(seats):noRounds,no_rounds_line:noRounds,legend:SCOREBOARD_LEGEND,
    board_file:BOARD_FILE,record_file:'record.md',board_present:fs.existsSync(path.join(runDir,BOARD_FILE)),record_present:fs.existsSync(path.join(runDir,'record.md')),
    gitignore_written:log.some(function(e){return e.event==='gitignore.written';}),log_lines:log.length
  };
}

module.exports={
  RUNS_DIR:RUNS_DIR,DEFAULT_WORD_CAP:DEFAULT_WORD_CAP,DEFAULT_SYNTHESIS_WORD_CAP:DEFAULT_SYNTHESIS_WORD_CAP,
  DEFAULT_FINAL_WORD_CAP:DEFAULT_FINAL_WORD_CAP,DEFAULT_CREW_WORD_CAP:DEFAULT_CREW_WORD_CAP,CREW_PASS_LINE:CREW_PASS_LINE,CREW_PASS_HEADING:CREW_PASS_HEADING,crewPassOf:crewPassOf,DEFAULT_COMPANY:DEFAULT_COMPANY,MODEL_UNREPORTED:MODEL_UNREPORTED,
  SN_PROMPT:SN_PROMPT,REDFLAG_PROMPT:REDFLAG_PROMPT,DEFAULT_READ_PROMPT:DEFAULT_READ_PROMPT,DEFAULT_SYNTHESIS_PROMPT:DEFAULT_SYNTHESIS_PROMPT,
  DEFAULT_SYNTHESIS_RERATE_PROMPT:DEFAULT_SYNTHESIS_RERATE_PROMPT,DEFAULT_FIRST_CRITIQUE_PROMPT:DEFAULT_FIRST_CRITIQUE_PROMPT,FIRST_ROUND_LINE:FIRST_ROUND_LINE,CMD:CMD,startedAtLine:startedAtLine,nextLine:nextLine,NO_RATING_LINE:NO_RATING_LINE,
  SIGNAL_LINE:SIGNAL_LINE,VERDICT_SENTENCE_LINE:VERDICT_SENTENCE_LINE,VERDICT_SENTENCE_LINE_CRITIQUE:VERDICT_SENTENCE_LINE_CRITIQUE,SCOREBOARD_LEGEND:SCOREBOARD_LEGEND,BOARD_FILE:BOARD_FILE,verdictPhrases:verdictPhrases,verdictOf:verdictOf,verdictLine:verdictLine,escapeHtml:escapeHtml,renderLite:renderLite,ADDON_INSTALL:ADDON_INSTALL,ADDON_CONFIGURE:ADDON_CONFIGURE,ADDON_STATE:ADDON_STATE,crewStateLines:crewStateLines,
  parseArgs:parseArgs,die:die,sha256:sha256,readText:readText,appendLog:appendLog,readLog:readLog,readSeats:readSeats,isFreshReader:isFreshReader,isPaddedSeat:isPaddedSeat,seatLabel:seatLabel,seatShortName:seatShortName,seatKey:seatKey,askedIn:askedIn,wasAsked:wasAsked,nameSources:nameSources,
  listDrafts:listDrafts,draftNumber:draftNumber,latestDraft:latestDraft,listNumbered:listNumbered,listCanons:listCanons,latestCanon:latestCanon,listRounds:listRounds,roundKind:roundKind,isFinalRound:isFinalRound,previousRound:previousRound,
  GITIGNORE_FILE:GITIGNORE_FILE,GITIGNORE_LINES:GITIGNORE_LINES,GITIGNORE_LINE:GITIGNORE_LINE,inGitRepo:inGitRepo,writeGitignore:writeGitignore,
  BRIEFS_DIR:BRIEFS_DIR,BRIEFS_DIR_REL:BRIEFS_DIR_REL,BRIEF_NAME_RE:BRIEF_NAME_RE,briefsDir:briefsDir,briefNamePath:briefNamePath,isBriefName:isBriefName,listBriefs:listBriefs,briefFirstLine:briefFirstLine,briefNameKeptLine:briefNameKeptLine,
  PROJECT_BRIEF_FILE:PROJECT_BRIEF_FILE,PROJECT_BRIEF_REL:PROJECT_BRIEF_REL,PROJECT_BRIEF_KEPT_LINE:PROJECT_BRIEF_KEPT_LINE,projectBriefPath:projectBriefPath,briefSourceOf:briefSourceOf,briefWords:briefWords,briefLine:briefLine,
  READER_FILE:READER_FILE,READER_HEADING:READER_HEADING,READER_SHOWN:READER_SHOWN,readerPath:readerPath,readReader:readReader,readerWords:readerWords,
  BRIEF_UPDATE_RE:BRIEF_UPDATE_RE,BRIEF_UPDATE_SHOWN:BRIEF_UPDATE_SHOWN,briefUpdateParagraph:briefUpdateParagraph,newestBriefUpdate:newestBriefUpdate,briefUpdateWords:briefUpdateWords,
  URL_RE:URL_RE,VAULT_FILE:VAULT_FILE,VAULT_REL:VAULT_REL,VAULT_HEADING:VAULT_HEADING,VAULT_INTRO:VAULT_INTRO,vaultPath:vaultPath,stripScheme:stripScheme,hostOf:hostOf,canonMatch:canonMatch,pageText:pageText,matchWords:matchWords,whenUtc:whenUtc,dateUtc:dateUtc,shippedLine:shippedLine,championEvents:championEvents,championNextLine:championNextLine,
  capSent:capSent,contractSent:contractSent,estimateTokens:estimateTokens,packetSize:packetSize,PACKET_PARTS:PACKET_PARTS,roundBudget:roundBudget,budgetLine:budgetLine,budgetWarning:budgetWarning,budgetLines:budgetLines,sectionsSent:sectionsSent,SECTIONS_LINE:SECTIONS_LINE,SECTION_LABELS:SECTION_LABELS,LINKS_UNREAD_LINE:LINKS_UNREAD_LINE,hasLink:hasLink,sectionLabelOf:sectionLabelOf,answerSections:answerSections,sectionReasons:sectionReasons,roundContract:roundContract,roundTask:roundTask,taskLine:taskLine,kindLabel:kindLabel,PROMPT_FIRST_LINE:PROMPT_FIRST_LINE,SECTIONS_LINE_PROMPTED:SECTIONS_LINE_PROMPTED,REWRITE_LINE:REWRITE_LINE,REWRITE_BEGIN:REWRITE_BEGIN,REWRITE_END:REWRITE_END,asksRewrite:asksRewrite,rewriteOf:rewriteOf,rewriteReasons:rewriteReasons,rewriteSent:rewriteSent,copyShare:copyShare,rewriteCopy:rewriteCopy,copyMark:copyMark,COPY_SHARE:COPY_SHARE,announcedOrdinal:announcedOrdinal,TASK_KINDS:TASK_KINDS,ratingLine:ratingLine,roundAnswers:roundAnswers,latestOwnAnswer:latestOwnAnswer,latestOwnRating:latestOwnRating,flipInputs:flipInputs,wordCount:wordCount,draftFacts:draftFacts,draftFactsLine:draftFactsLine,draftFactsFull:draftFactsFull,FACTS_HEADING:FACTS_HEADING,VOICE_ORDER:VOICE_ORDER,voiceTier:voiceTier,voiceBase:voiceBase,voiceRank:voiceRank,isFenceLine:isFenceLine,plainSpoken:plainSpoken,spokenPlain:spokenPlain,draftParts:draftParts,draftPartsLines:draftPartsLines,PARTS_HEADING:PARTS_HEADING,PARTS_LINE:PARTS_LINE,oneLineWarning:oneLineWarning,ONE_LINE_WORDS:ONE_LINE_WORDS,RETRY_TARGET_RATIO:RETRY_TARGET_RATIO,retryTarget:retryTarget,SENTENCE_CUT_WINDOW:SENTENCE_CUT_WINDOW,truncateAnswer:truncateAnswer,truncationLine:truncationLine,contractOf:contractOf,parseRating:parseRating,checkAnswer:checkAnswer,
  normalizeQuote:normalizeQuote,attributedQuotes:attributedQuotes,checkFlip:checkFlip,
  STATE_SCHEMA:STATE_SCHEMA,STATE_FILE:STATE_FILE,pluginVersion:pluginVersion,noRoundsLine:noRoundsLine,truncationOf:truncationOf,roundCell:roundCell,finalCell:finalCell,finalText:finalText,bandOf:bandOf,runState:runState
};
