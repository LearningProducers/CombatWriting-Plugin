// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// truth_pages_check.js: the pages that say what the two plugins are and do (issue 245). Each
// repair here opened with checks that failed on the tree as it stood.
//
// Reads files only: the two manifests, the marketplace file, the add-on's provider table, the
// privacy page, the support page, the two checklist pages, and every tracked .md and .js file
// for the last item. Starts nothing; calls nothing outside.
//
// What it pins:
//   - THE ICON. Each plugin folder holds .claude-plugin/icon.png, a PNG of 512 by 512 pixels, the
//     same bytes in both (one sha256, written once below), and each plugin.json names it as
//     "./.claude-plugin/icon.png".
//   - THE TWO LINKS. Both manifests carry privacyPolicyUrl and supportUrl, the same two in both,
//     each an https address of a file on this repository's main branch, and that file is in the
//     tree at the root.
//     The root README and each plugin's own README name both pages by those addresses.
//   - THE SUPPORT PAGE names one mail address and the repository's issues page, and says never
//     to send a key.
//   - THE PRIVACY PAGE holds its sections, names every provider host the add-on's table holds
//     and no other host, says each provider's own terms apply to what the add-on sends it, says
//     what Learning Producers receives, says it is not Anthropic's, and carries no unfilled
//     bracket and no word that marks a draft.
//   - THE HOSTS. The add-on's manifest declares, under network.hosts, the hosts of its provider
//     table's addresses, each once, and no other; the listed plugin's manifest declares none.
//   - THE MARKETPLACE FILE carries no version of its own under metadata: the two plugins'
//     versions are its entries', and a third number there had gone stale.
//   - THE CHECKLIST PAGES. Neither says the plugin bundles no font; the main page marks the
//     bundled fonts and the hook that calls another file of the plugin as held, as the add-on's
//     page marks its own, and says the two holds are accepted.
//   - A DECISION IS WRITTEN AS THE DECISION. No .md or .js file at the root or under docs/,
//     plugins/, tests/, .github/ or screen/ (folders whose names open with a dot are not entered) but CLAUDE.md marks a
//     quoted span as the words a decision was made in (the markers are listed below). CLAUDE.md
//     is read too and its count is printed, never failed: its lines change on the owner's word.
//
// Run from the repo root:   node tests/truth_pages_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), crypto=require('crypto');
var root=path.join(__dirname,'..');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function exists(rel){ return fs.existsSync(path.join(root,rel)); }
function read(rel){ return exists(rel)?fs.readFileSync(path.join(root,rel),'utf8'):''; }
function json(rel){ try{ return JSON.parse(read(rel)); }catch(e){ return {}; } }

var PLUGINS=['plugins/combat-writing','plugins/combat-writing-crew'];
var cw=json(PLUGINS[0]+'/.claude-plugin/plugin.json'), crew=json(PLUGINS[1]+'/.claude-plugin/plugin.json');
var manifests=[cw,crew];

// THE ICON.
var ICON='.claude-plugin/icon.png', ICON_SHA='85adf9f6389ab52f990465fd7b172c61da15265eb3d0c7749f243f95cf39cb77';
PLUGINS.forEach(function(p,i){
  var rel=p+'/'+ICON, buf=exists(rel)?fs.readFileSync(path.join(root,rel)):Buffer.alloc(0);
  var png=buf.length>24&&buf.slice(0,8).toString('hex')==='89504e470d0a1a0a'&&buf.slice(12,16).toString('latin1')==='IHDR';
  check(png&&buf.readUInt32BE(16)===512&&buf.readUInt32BE(20)===512,rel+': must be a PNG of 512 by 512 pixels'+(png?', is '+buf.readUInt32BE(16)+' by '+buf.readUInt32BE(20):exists(rel)?', is no PNG':', is not there'));
  check(crypto.createHash('sha256').update(buf).digest('hex')===ICON_SHA,rel+': must be the approved file, byte for byte');
  check(manifests[i].icon==='./'+ICON,p+'/.claude-plugin/plugin.json: icon must be "./'+ICON+'", is '+JSON.stringify(manifests[i].icon));
});

// THE TWO LINKS.
var BLOB='https://github.com/LearningProducers/CombatWriting-Plugin/blob/main/';
[['privacyPolicyUrl','PRIVACY.md'],['supportUrl','SUPPORT.md']].forEach(function(f){
  manifests.forEach(function(m,i){
    check(m[f[0]]===BLOB+f[1],PLUGINS[i]+'/.claude-plugin/plugin.json: '+f[0]+' must be '+BLOB+f[1]+', is '+JSON.stringify(m[f[0]]));
  });
  check(exists(f[1]),f[1]+': the page '+f[0]+' names must be in the tree, at the root');
});

// Each README a person meets names the two pages by their address: the root README and the two
// plugins' own, which the directory shows as each listing's description.
['README.md',PLUGINS[0]+'/README.md',PLUGINS[1]+'/README.md'].forEach(function(r){
  var t=read(r);
  check(t.indexOf(BLOB+'PRIVACY.md')>=0&&t.indexOf(BLOB+'SUPPORT.md')>=0,r+': must name the privacy page and the support page by their addresses');
});

// THE SUPPORT PAGE.
var support=read('SUPPORT.md');
var mails=support.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)||[];
check(mails.length>0&&mails.every(function(m){ return m===mails[0]; })&&/@learningproducers\.com$/.test(mails[0]||''),'SUPPORT.md: must name one mail address, on the company\'s domain: '+JSON.stringify(mails));
check(support.indexOf('https://github.com/LearningProducers/CombatWriting-Plugin/issues')>=0,'SUPPORT.md: must name the repository\'s issues page');
check(/never[^.]*\bkey\b/i.test(support),'SUPPORT.md: must say never to send a key');

// THE PRIVACY PAGE.
var privacy=read('PRIVACY.md');
var providers=(json(PLUGINS[1]+'/providers.json').providers||[]).filter(function(p){ return typeof p.base_url==='string'; });
function hostOf(u){ return String(u).replace(/^https?:\/\//,'').split('/')[0].replace(/:\d+$/,''); }
var hosts=providers.map(function(p){ return hostOf(p.base_url); });
check(hosts.length===7,'the add-on\'s provider table should hold seven addresses for this check to mean what it says, holds '+hosts.length);
['What Learning Producers receives','what leaves your machine','what it stores','where a key is kept','Removing your data','Support'].forEach(function(h){
  check(new RegExp('^#+ .*'+h.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'im').test(privacy),'PRIVACY.md: the section on "'+h+'" is missing');
});
hosts.forEach(function(h){ check(privacy.indexOf(h)>=0,'PRIVACY.md: must name '+h+', an address the add-on calls'); });
var named=(privacy.match(/\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|ai|org|net|io|dev)\b/gi)||[]).map(function(h){ return h.toLowerCase(); }).filter(function(h,i,a){ return a.indexOf(h)===i; });
var allowed=hosts.concat(['github.com','learningproducers.com','combatwriting.learningproducers.com','support.claude.com','claude.ai']);
check(named.every(function(h){ return allowed.indexOf(h)>=0; }),'PRIVACY.md: names a host that is neither one the add-on calls nor this project\'s own: '+named.filter(function(h){ return allowed.indexOf(h)<0; }).join(', '));
check(/under (?:its|that provider's) own terms/i.test(privacy)&&/your own (?:API )?key/i.test(privacy),'PRIVACY.md: must say that what the add-on sends a provider goes with your own key, under that provider\'s own terms');
check(privacy.length>0&&!/\[[A-Z][A-Z ,:'-]{6,}/.test(privacy)&&!/\bDRAFT\b|CHANGES AFTER FIX|OPEN QUESTIONS/.test(privacy),'PRIVACY.md: an unfilled bracket or a word that marks a draft stands in it');
check(/^Last updated: \d{4}-\d\d-\d\d$/m.test(privacy),'PRIVACY.md: must carry its date as "Last updated: YYYY-MM-DD" on a line of its own');

// WHAT THE READ OF THE PAGES FOUND. A reader who had not written them proved each sentence of
// the two pages against the code. These are the sentences it found false or too wide, held so
// that none comes back, and the things it found left out, held so that each stays said.
check(/not made or endorsed by Anthropic/.test(privacy)&&!/reviewed or endorsed/.test(privacy)&&!/reviewed or endorsed/.test(support),'PRIVACY.md and SUPPORT.md: say "not made or endorsed by Anthropic"; a listing in the directory is read by Anthropic, so "reviewed" would not stay true');
check(!/hold your draft and the seats' answers/.test(support)&&/record\.md/.test(support),'SUPPORT.md: the log holds no draft and no answer in full; name what the run folder and record.md hold');
check(/model each reader runs on/.test(privacy),'PRIVACY.md: must say that a reader\'s packet goes to the model each reader runs on; the second reader is by default on a model other than the session\'s');
check(/every tool call/.test(privacy)&&/every (?:shell|Bash) command/i.test(privacy),'PRIVACY.md: must say what the two hooks are handed: every tool call, and every shell command with its output');
check(/browser['’]s own (?:speech )?voices?/i.test(privacy)&&/browser['’]s storage/i.test(privacy),'PRIVACY.md: must speak of the board\'s read-aloud through the browser\'s own voices and of the voice pick kept in the browser\'s storage');
check(/plain HTTP/.test(privacy)&&/needs no key/.test(privacy),'PRIVACY.md: must say the local Ollama seat is called over plain HTTP and needs no key');
check(!/calls no one else|is no party/.test(privacy)&&!/until the system clears/.test(privacy)&&!/neither asks you to make an account/.test(privacy)&&!/reads two environment variables/.test(privacy),'PRIVACY.md: a sentence the read found too wide or unproved stands in it');
check(/redirect/.test(privacy),'PRIVACY.md: the shipped link is fetched with its redirects followed; the page must say so');
check(/temporary folder/.test(privacy)&&/absolute/.test(privacy)&&/twenty/.test(privacy),'PRIVACY.md: must name the temporary folder, that the records\' paths are absolute, and the twenty sessions a start clears at the most');
// Two older pages said the plugin writes nowhere but the project folder; the hooks' data folder and
// the speech script's temporary files are outside it.
var listing=read(PLUGINS[0]+'/README.md'), helpSkill=read(PLUGINS[0]+'/skills/help/SKILL.md'), rules=read(PLUGINS[0]+'/skills/combat-writing/SKILL.md');
[['the listing README',listing],['the help skill',helpSkill]].forEach(function(p){
  check(/Nothing is written anywhere else in your project\. Outside it/.test(p[1])&&/temporary folder/.test(p[1])&&/data folder/.test(p[1]),p[0]+': its list of what is written must end on the project and then name the two places outside it, the data folder and the temporary folder');
});
check(!/the scripts write only inside/.test(listing)&&!/They write only inside/.test(rules),'the listing README and the rules skill: "write only inside combat-writing/" leaves out the speech script\'s files in the temporary folder');
check(!/Nothing is sent anywhere to speak\./.test(listing),'the listing README: "Nothing is sent anywhere to speak." speaks for every browser\'s voices; say what the plugin\'s own code does');

// WHAT THE SECOND READ FOUND. The page was rewritten after the first read, so a second reader who
// had not written it proved the rewrite. These are the sentences it found wider than the code or
// resting on another party unsaid, and the gaps it found.
[[/each statement here can be checked against the code/,'a statement about another program cannot be checked against this code'],
 [/only when you send it yourself/,'what the company sees is no fact of the code; say what the software sends'],
 [/Each acts only on the plugin's own calls/,'the hooks tell the plugin\'s calls by name: an agent type, a script\'s name in a command'],
 [/deletes a run, an inbox file or a recording/,'the speech script removes a recording that holds no sound or failed'],
 [/at most one line/,'the result hook writes a line whenever the model found is not the one last logged'],
 [/once in five minutes at the most/,'a failed answer and a new start of the server ask the provider again'],
 [/that you alone can read/,'the key file\'s check reads mode bits, no owner'],
 [/managed and revoked in that provider's own console/,'a provider\'s console is the provider\'s; say what the add-on cannot do'],
 [/by default on another model your Claude Code session offers/,'the second reader is on the next most capable model, which on some sessions is the session\'s own'],
 [/are written as they came/,'the add-on strips a think block, trims line ends and cuts an answer over its cap before it writes it'],
 [/and each time it scrubs an error's text\./,'the key file is read at the scrub of any text, the server\'s own ready line among them'],
 [/the log shows no board opened in the last two minutes/,'the hook reads the log\'s last line on the board alone, and counts only an opening by the shell'],
 [/Outside your project, in two places/,'the browser\'s storage and a download are outside the project too; the count is of the scripts\' and hooks\' writes']
].forEach(function(w){ check(!w[0].test(privacy),'PRIVACY.md: '+w[1]); });
check(!/An issue is public\./.test(support),'SUPPORT.md: "An issue is public." speaks for the host of the repository; say to treat it as public');
check(/clipboard/.test(privacy)&&/[Dd]ownload/.test(privacy),'PRIVACY.md: the board\'s Copy and Download of the shipped draft are in no sentence');
check(/between you and that provider/.test(privacy),'PRIVACY.md: a provider\'s terms are between the person and the provider; the page must say it does not speak for them');
check(/given as a file path/.test(privacy),'PRIVACY.md: a draft, a brief or a reader given as a file path is read from where it is');
check(/by name/.test(privacy)&&/does not check who wrote/.test(privacy),'PRIVACY.md: must say the hooks match by name, and that the add-on sends the packet file it finds without checking who wrote it');
check(/corrects a seat's model name/.test(privacy),'PRIVACY.md: the add-on also corrects a seat\'s model name in the list of seats when a provider answers under another id');
check(/hand the session/.test(privacy),'PRIVACY.md: the lines the hooks and the add-on\'s tools hand the session are in no sentence');

// WHAT THE READ FOUND IN THE HOOK SENTENCES. The same read proved the sentences that say what
// each hook reads and opens. These are the clauses it found wider than the code.
var rootReadme=read('README.md'), cl=read('docs/directory-checklist.md'), mapPage=read('docs/plugin-map.md'), crewReadme=read(PLUGINS[1]+'/README.md');
var WIDE=[
  [/reads, writes and calls nothing/,'a later session start makes the data folder when it is missing and looks for its record; "reads, writes and calls nothing" is more than that'],
  [/writ(?:ing|es) only log lines in the run/,'the result hook\'s own writes are log lines, and the scripts it starts write the board, the record and the recordings'],
  [/no link anywhere in it or in its rounds/,'the result hook looks at the run folder\'s own entries, its rounds folder\'s and each round folder\'s, and enters no other folder'],
  [/the command itself names in full/,'the result hook takes a relative path too, placed under the working folder'],
  [/hook (?:that )?runs after the plugin's own scripts/,'the result hook runs after every shell command of the session and acts on the plugin\'s own'],
  [/after (?:each|a) seat's answer is checked|checked a seat's answer|model wrote (?:a|that) seat's replies/,'the model is measured for a fresh reader alone, never for an outside seat'],
  [/made from the first words of (?:your|the) draft, or of (?:your|the) brief when a run starts from the brief alone/,'a run folder is named from a pasted text\'s first words or from a file\'s name']
];
[['README.md',rootReadme],[PLUGINS[0]+'/README.md',listing],['docs/directory-checklist.md',cl],['docs/plugin-map.md',mapPage]].forEach(function(p){
  WIDE.forEach(function(w){ check(!w[0].test(p[1]),p[0]+': '+w[1]); });
});
check(/first call/.test(rootReadme)&&/binds/.test(rootReadme),'README.md: must say a fresh reader\'s first call names its packet or its answer file and binds it to that start\'s record');
check(/plain HTTP/.test(crewReadme),PLUGINS[1]+'/README.md: "over HTTPS" must name the exception, the local Ollama seat over plain HTTP');
check(/temporary folder/.test(rootReadme)&&/data folder/.test(rootReadme),'README.md: what the plugin writes must name the two places outside the project');

// THE HOSTS.
var declared=(crew.network&&Array.isArray(crew.network.hosts))?crew.network.hosts.slice().sort():null;
check(!!declared&&JSON.stringify(declared)===JSON.stringify(hosts.slice().sort()),'the add-on\'s plugin.json: network.hosts must be the hosts of providers.json, each once: '+JSON.stringify(declared)+' against '+JSON.stringify(hosts.slice().sort()));
check(!!cw.network&&Array.isArray(cw.network.hosts)&&cw.network.hosts.length===0,'the listed plugin\'s plugin.json: network.hosts must be an empty list, the plugin reaches no host: '+JSON.stringify(cw.network));

// THE MARKETPLACE FILE.
var market=json('.claude-plugin/marketplace.json');
check(!!market.metadata&&market.metadata.version===undefined,'.claude-plugin/marketplace.json: metadata carries a version of its own ('+JSON.stringify(market.metadata&&market.metadata.version)+'), a third number beside the two plugins\'');

// THE CHECKLIST PAGES.
var mainPage=read('docs/directory-checklist.md'), crewPage=read('docs/directory-checklist-crew.md');
check(!/bundles no image or font/.test(mainPage)&&!/every tracked file in the plugin folder is text/.test(mainPage),'docs/directory-checklist.md: still says the plugin bundles no font, or that every file in it is text');
function row(page,re){ return page.split('\n').filter(function(l){ return /^\|/.test(l)&&re.test(l); })[0]||''; }
function result(r){ return (r.split('|')[2]||'').trim(); }
var fontRow=row(mainPage,/bundled image or font referred to/i), callsRow=row(mainPage,/calls to other files/i), readRow=row(mainPage,/cannot read through|can't read through/i);
check(/^HELD\b/.test(result(fontRow)),'docs/directory-checklist.md: the row on bundled images and fonts named from scripts must read HELD, reads "'+result(fontRow)+'"');
check(/^HELD\b/.test(result(callsRow)),'docs/directory-checklist.md: the row on calls to other files in a hook\'s script must read HELD, reads "'+result(callsRow)+'"');
check(/^HELD\b/.test(result(readRow)),'docs/directory-checklist.md: the row on a program the validator cannot read through must read HELD, reads "'+result(readRow)+'"');
check(/accepted/i.test(fontRow)&&/accepted/i.test(callsRow),'docs/directory-checklist.md: the two holds, the bundled fonts and the hook\'s call to another file, must each be recorded as accepted');
check(/\.claude-plugin\/icon\.png/.test(mainPage)&&/\.claude-plugin\/icon\.png/.test(crewPage),'both checklist pages must name the icon file');

// A DECISION IS WRITTEN AS THE DECISION.
// The marker phrases, and after one of them a span in double quotation marks. The quotation
// marks are written as their code points, so that this file holds no line of the shape it finds.
var Q='[\\u0022\\u201c]', QEND='[\\u0022\\u201d]', NOQ='[^\\u0022\\u201c\\u201d\\n]';
var PHRASES=['(?:the )?founder[\u2019\']s (?:own )?words?','his (?:own )?words?','in his words','the founder (?:said|wrote|typed|answered)','the founder[\u2019\']s (?:answer|go)'];
var MARKERS=new RegExp('\\b(?:'+PHRASES.join('|')+')\\b[^\\u0022\\u201c\\n]{0,60}'+Q+NOQ+'{12,}'+QEND,'i');
// The second shape: the decider named, a colon, and the quotation.
var MARKERS2=new RegExp('\\b(?:the founder|founder[\u2019\']s (?:rule|reason|order|ruling))\\s*:\\s*'+Q+NOQ+'{8,}'+QEND,'i');
// Three more shapes, found by the fresh-eyes read after the first two were cured: the decider, some
// words that end no sentence (a date, an occasion) and then the colon and the quotation; a noun of
// the decider's (a rule, a question) and, further on, a colon or a bracket and the quotation; and an
// issue with its date, a colon and the quotation.
var MARKERS3=new RegExp('\\bthe founder\\b[^.\\u0022\\u201c\\n]{1,90}:\\s*'+Q+NOQ+'{8,}'+QEND,'i');
var MARKERS4=new RegExp('\\bfounder[\u2019\']s (?:rule|reason|order|ruling|question|answer|go|stamp)\\b[^.\\n]{0,260}?[:(]\\s*'+Q+NOQ+'{8,}'+QEND,'i');
var MARKERS5=new RegExp('\\(issue \\d+, \\d{4}-\\d{2}-\\d{2}:\\s*'+Q+NOQ+'{8,}'+QEND);
// A sixth shape, found by the second fresh-eyes read: the decider, a date, and the quotation in a
// bracket with no colon before it.
var MARKERS6=new RegExp('\\bthe founder\\b[^.\\u0022\\u201c\\n(]{0,40}\\(\\s*'+Q+NOQ+'{3,}'+QEND,'i');
function tracked(dir,deep){
  var out=[];
  fs.readdirSync(dir,{withFileTypes:true}).forEach(function(d){
    var p=path.join(dir,d.name);
    if(d.isDirectory()){ if(deep&&d.name!=='node_modules'&&d.name[0]!=='.')out=out.concat(tracked(p,true)); }
    else if(d.isFile()&&/\.(md|js)$/.test(d.name))out.push(p);
  });
  return out;
}
var searched=tracked(root,false).concat(tracked(path.join(root,'docs'),true),tracked(path.join(root,'plugins'),true),tracked(path.join(root,'tests'),true),tracked(path.join(root,'.github'),true),tracked(path.join(root,'screen'),true));
var inClaude=0;
searched.forEach(function(f){
  var rel=path.relative(root,f), flat=fs.readFileSync(f,'utf8').replace(/\n[ \t]*\/\/ ?/g,' ');
  if(f===__filename)return;
  var hits=flat.split('\n').filter(function(l){ return MARKERS.test(l)||MARKERS2.test(l)||MARKERS3.test(l)||MARKERS4.test(l)||MARKERS5.test(l)||MARKERS6.test(l); }).length;
  if(rel==='CLAUDE.md'){ inClaude=hits; return; }
  check(hits===0,rel+': '+hits+' line(s) mark a quoted span as the words a decision was made in; write the decision in plain words');
});

failures.forEach(function(f){console.log('FAIL '+f);});
if(inClaude)console.log('note: CLAUDE.md holds '+inClaude+' such line(s); they change on the owner\'s word');
console.log((failures.length?'truth_pages_check: '+failures.length+' failure(s), ':'truth_pages_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
