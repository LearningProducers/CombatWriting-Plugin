// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// champion.js: records the Champion stage (steps 15 to 19) on a run: the piece as shipped, each
// result as it comes, and the insights that outlive the run (ruled 2026-10-19, issue 13). The
// only writer of canon, results and the vault.
//
//   node champion.js --run <run folder> --kind shipped|result|insight --file <inbox file>
//                    [--page <inbox file> [--digest]] [--live no] [--at <time>]
//
// Everything the person typed reaches this script as a file cut from the inbox, never as inline
// text (the packet rule, applied to champion). --at dates an entry to when it happened (any form
// Date parses; stored as ISO, UTC); it defaults to now. The log's ts stays the write time.
//
// shipped: freezes the newest draft as canon, byte for byte. The first `shipped` writes canon.md;
//   a later one compares the newest draft's SHA-256 with the newest canon's: equal, the same
//   canon shipped again through another channel and no file is written; different, a revised
//   draft came after the canon and canon-2.md is written, numbered like the drafts. The files
//   decide. The text: the first address in it (lib.URL_RE) is the link, the host name cut from
//   it by string; the rest of the words are the channel ("LinkedIn post", "email to Dana Ruiz").
//   The page: the host opens the address once, by its own route (a shell fetch, or its web tool
//   when it has no shell), and saves what came back whole; --page hands that file here and is
//   the proof the link was live, an HTML page reduced to its text (lib.pageText) and measured by
//   lib.canonMatch against the canon paragraph by paragraph; --page with --digest says the
//   host's tool returned a digest, not the page, which is recorded and never measured (issue 40);
//   --live no says the host opened the address and got no page; neither, with an address, is
//   recorded as not checked. This script never fetches. Logs champion.shipped with page_kind
//   (text, html or digest); prints the Shipped line (lib.shippedLine).
// result: one dated line in the person's words, silence included (steps 16 to 18 all land here;
//   the plugin computes and fetches no metric). Logs champion.result; prints "Result recorded
//   <date>: <text>". No gate on a prior `shipped`: a piece shipped by hand still has results.
// insight: one dated, run-tagged line appended to the project's vault, combat-writing/
//   insight-vault.md (lib.vaultPath, from the run folder alone), created with its heading on the
//   first write. A lexicon term is an insight written as one. Logs champion.insight; prints
//   "Insight recorded <date> in combat-writing/insight-vault.md: <text>".
//
// Refusals, exit 2 with one line on stderr: a missing --run, --kind or --file; a kind not among
// the three; a missing or empty file; an --at that is not a date; shipped on a run with no draft;
// --page or --live with no address in the text; --live not "no"; --live no with --page; a missing
// or empty page file; --page or --live on result or insight; insight on a run not under
// combat-writing/runs/. No network module, no fetch, no address literal of its own.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
['run','kind','file'].forEach(function(k){ if(!args[k]||args[k]===true)lib.die('--'+k+' is required'); });
var KINDS=['shipped','result','insight'];
var kind=String(args.kind).trim().toLowerCase();
if(KINDS.indexOf(kind)<0)lib.die('--kind must be shipped, result or insight; got '+args.kind);
var runDir=path.resolve(args.run);
lib.readSeats(runDir);
if(!fs.existsSync(args.file))lib.die('file not found: '+args.file);
var text=lib.readText(args.file).replace(/\r\n/g,'\n').replace(/^﻿/,'').trim();
if(!text)lib.die('the file is empty: '+args.file+'; the words come from the inbox cut, never inline');
var at=new Date().toISOString();
if(args.at!==undefined){
  if(args.at===true)lib.die('--at needs a time');
  var d=new Date(String(args.at));
  if(isNaN(d.getTime()))lib.die('--at is not a date: '+args.at);
  at=d.toISOString();
}
var source=path.basename(args.file);
function oneLine(s){ return s.replace(/\s+/g,' ').trim(); }

if(kind!=='shipped'){
  if(args.page!==undefined)lib.die('--page belongs to shipped; '+kind+' checks no page');
  if(args.live!==undefined)lib.die('--live belongs to shipped; '+kind+' checks no page');
  if(args.digest!==undefined)lib.die('--digest belongs to shipped; '+kind+' checks no page');
}
if(args.digest!==undefined&&args.digest!==true)lib.die('--digest takes no value: it says the page file holds a digest the host\'s tool returned, not the page');
if(args.digest===true&&args.page===undefined)lib.die('--digest goes with --page: the digest the tool returned is the page file');

if(kind==='shipped'){
  var draft=lib.latestDraft(runDir);
  if(!draft)lib.die('no draft in this run; nothing to ship');
  var re=new RegExp(lib.URL_RE.source,'i');
  var m=re.exec(text);
  var url=m?m[0].replace(/[.,;:!?]+$/,''):null;
  var host=url?lib.hostOf(url):null;
  var channel=oneLine(m?text.slice(0,m.index)+' '+text.slice(m.index+m[0].length):text)||null;
  if(!url&&(args.page!==undefined||args.live!==undefined))lib.die('--page and --live need an address in the text; without a link there is no page to check');
  if(args.live!==undefined&&String(args.live).trim().toLowerCase()!=='no')lib.die('--live takes only "no" (the address gave no page); a page that came back goes in --page');
  if(args.live!==undefined&&args.page!==undefined)lib.die('--live no and --page together say two things; give one');
  var page=null, pageText=null;
  if(args.page!==undefined){
    if(args.page===true)lib.die('--page needs a file');
    if(!fs.existsSync(args.page))lib.die('page file not found: '+args.page);
    pageText=lib.readText(args.page).replace(/^﻿/,'');
    if(!pageText.trim())lib.die('the page file is empty: '+args.page+'; if the address gave nothing, say so with --live no');
    page=path.basename(args.page);
  }
  var draftBuf=fs.readFileSync(path.join(runDir,draft));
  var sha=lib.sha256(draftBuf);
  var canons=lib.listCanons(runDir);
  var canon, canonNew;
  if(!canons.length){ canon='canon.md'; canonNew=true; }
  else{
    var newest=canons[canons.length-1];
    if(lib.sha256(fs.readFileSync(path.join(runDir,newest)))===sha){ canon=newest; canonNew=false; }
    else{
      var n=canons.length+1; canon='canon-'+n+'.md';
      while(fs.existsSync(path.join(runDir,canon)))canon='canon-'+(++n)+'.md';
      canonNew=true;
    }
  }
  if(canonNew)fs.writeFileSync(path.join(runDir,canon),draftBuf);
  var live=page?true:args.live!==undefined?false:null;
  var digest=args.digest===true;
  // An HTML page is measured by its text (issue 40); a digest is recorded, never measured.
  var reduced=page&&!digest?lib.pageText(pageText):null;
  var match=reduced?lib.canonMatch(draftBuf.toString('utf8'),reduced.text):null;
  var e={event:'champion.shipped',at:at,canon:canon,canon_new:canonNew,draft:draft,sha256:sha,url:url,host:host,channel:channel,page:page,page_kind:page?(digest?'digest':reduced.kind):null,digest:page?digest:null,live:live,match:match,source:source};
  lib.appendLog(runDir,e);
  process.stdout.write(lib.shippedLine(e)+'\n');
}else if(kind==='result'){
  lib.appendLog(runDir,{event:'champion.result',at:at,text:text,source:source});
  process.stdout.write('Result recorded '+lib.dateUtc(at)+': '+oneLine(text)+'\n');
}else{
  var vault=lib.vaultPath(runDir);
  if(!vault)lib.die('the run folder is not under combat-writing/runs/, so the vault has no place: '+runDir);
  var line=oneLine(text);
  var entry='- '+lib.dateUtc(at)+' · '+path.basename(runDir)+' · '+line+'\n';
  var first=!fs.existsSync(vault);
  if(first)fs.writeFileSync(vault,lib.VAULT_HEADING+'\n\n'+lib.VAULT_INTRO+'\n\n'+entry);
  else{
    var existing=fs.readFileSync(vault,'utf8');
    fs.appendFileSync(vault,(existing.length&&!/\n$/.test(existing)?'\n':'')+entry);
  }
  lib.appendLog(runDir,{event:'champion.insight',at:at,text:line,vault:lib.VAULT_REL.split(path.sep).join('/'),first:first,source:source});
  process.stdout.write('Insight recorded '+lib.dateUtc(at)+' in '+lib.VAULT_REL.split(path.sep).join('/')+': '+line+'\n');
}
