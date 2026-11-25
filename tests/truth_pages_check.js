// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// truth_pages_check.js: the pages that say what the two plugins are and do (issue 245). Most
// of its checks failed on the tree as it stood before their repair; PLAN.md Part 143 names the
// ones that were added with a repair and were never red.
//
// Reads files only: the two manifests, the marketplace file, the add-on's provider table, the
// privacy page, the support page, the two checklist pages, and, for the last item, the .md and .js
// files the list under A DECISION names (found by reading folders, not by asking git). Starts nothing; calls nothing outside.
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
//     table's addresses, each once, and no other; the `cw` plugin's manifest declares none.
//   - THE MARKETPLACE FILE carries no version of its own under metadata: the two plugins'
//     versions are its entries', and a third number there had gone stale.
//   - THE CHECKLIST PAGES. Neither says the plugin bundles no font; the main page marks the
//     bundled fonts and the hook that calls another file of the plugin as held, as the add-on's
//     page marks its own, and says the two holds are accepted.
//   - A DECISION IS WRITTEN AS THE DECISION. No .md or .js file at the root or under docs/,
//     plugins/, tests/, .github/ or screen/ (folders whose names open with a dot are not entered) marks a
//     quoted span as the words a decision was made in (the markers are listed below). CLAUDE.md
//     is held like the rest since its two such spans were restated on the owner's word (issue 252).
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
// A page names an address when the address stands in it whole: cut at white space and at the
// marks a link is written between, a period, comma, semicolon or colon after it dropped, one
// piece is the address and nothing more. A longer address that only opens with it is another.
function namesAddress(text,address){ return String(text).split(/[\s()<>\[\]"'`]+/).some(function(piece){ return piece.replace(/[.,;:]+$/,'')===address; }); }
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
  check(namesAddress(t,BLOB+'PRIVACY.md')&&namesAddress(t,BLOB+'SUPPORT.md'),r+': must name the privacy page and the support page by their addresses');
});

// THE SUPPORT PAGE.
var support=read('SUPPORT.md');
var mails=support.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)||[];
check(mails.length>0&&mails.every(function(m){ return m===mails[0]; })&&/@learningproducers\.com$/.test(mails[0]||''),'SUPPORT.md: must name one mail address, on the company\'s domain: '+JSON.stringify(mails));
check(namesAddress(support,BLOB.replace(/blob\/main\/$/,'issues')),'SUPPORT.md: must name the repository\'s issues page');
check(/never[^.]*\bkey\b/i.test(support),'SUPPORT.md: must say never to send a key');

// THE PRIVACY PAGE.
var privacy=read('PRIVACY.md');
var providers=(json(PLUGINS[1]+'/providers.json').providers||[]).filter(function(p){ return typeof p.base_url==='string'; });
function hostOf(u){ return String(u).replace(/^https?:\/\//,'').split('/')[0].replace(/:\d+$/,''); }
var hosts=providers.map(function(p){ return hostOf(p.base_url); });
// "over HTTPS": every provider that takes a key is called at an address that opens with https://;
// the one keyless entry, the local Ollama program, is called over plain HTTP at localhost.
providers.forEach(function(p){
  check(p.keyless?/^http:\/\/localhost(:\d+)?\//.test(p.base_url):/^https:\/\//.test(p.base_url),'providers.json: '+p.id+' must be called over https, or, the keyless entry alone, over http at localhost: '+p.base_url);
});
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
// What the hooks are handed (issue 255): the fence is matched to a Read, a Write and the start of an agent, and no longer
// to every tool call; the result hook is handed every shell command with its output and every start of an agent.
check(/every Read and Write call/.test(privacy)&&/every start of an agent/.test(privacy)&&/every (?:shell|Bash) command/i.test(privacy)&&!/every tool call/.test(privacy),'PRIVACY.md: must say what the two hooks are handed: every Read and Write call and every start of an agent, and every shell command with its output; the fence is no longer handed every tool call');
check(/browser['’]s own (?:speech )?voices?/i.test(privacy)&&/browser['’]s storage/i.test(privacy),'PRIVACY.md: must speak of the board\'s read-aloud through the browser\'s own voices and of the voice pick kept in the browser\'s storage');
check(/plain HTTP/.test(privacy)&&/needs no key/.test(privacy),'PRIVACY.md: must say the local Ollama seat is called over plain HTTP and needs no key');
check(!/calls no one else|is no party/.test(privacy)&&!/until the system clears/.test(privacy)&&!/neither asks you to make an account/.test(privacy)&&!/reads two environment variables/.test(privacy),'PRIVACY.md: a sentence the read found too wide or unproved stands in it');
check(/redirect/.test(privacy),'PRIVACY.md: the shipped link is fetched with its redirects followed; the page must say so');
check(/temporary folder/.test(privacy)&&/absolute/.test(privacy)&&/twenty/.test(privacy),'PRIVACY.md: must name the temporary folder, that the records\' paths are absolute, and the twenty sessions a start clears at the most');
// Two older pages said the plugin writes nowhere but the project folder; the hooks' data folder is
// outside it, and until issue 261 the speech script's temporary files were (it writes none now).
var listing=read(PLUGINS[0]+'/README.md'), helpSkill=read(PLUGINS[0]+'/skills/help/SKILL.md'), rules=read(PLUGINS[0]+'/skills/combat-writing/SKILL.md');
[['the listing README',listing],['the help skill',helpSkill]].forEach(function(p){
  check(/Nothing is written anywhere else in your project\. Outside it/.test(p[1])&&/temporary folder/.test(p[1])&&/data folder/.test(p[1]),p[0]+': its list of what is written must end on the project and then name the data folder, the one place outside it, and say what becomes of the temporary folder');
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
check(/temporary folder/.test(rootReadme)&&/data folder/.test(rootReadme),'README.md: what the plugin writes must name the data folder, the one place outside the project, and say what becomes of the temporary folder');

// THE HOSTS.
var declared=(crew.network&&Array.isArray(crew.network.hosts))?crew.network.hosts.slice().sort():null;
check(!!declared&&JSON.stringify(declared)===JSON.stringify(hosts.slice().sort()),'the add-on\'s plugin.json: network.hosts must be the hosts of providers.json, each once: '+JSON.stringify(declared)+' against '+JSON.stringify(hosts.slice().sort()));
// What the add-on can say of the local seat: where it sends the packet, and no more. The page
// says what Ollama does with a packet is Ollama's; a manifest's text, which the person reads
// where the model is named, must not promise for Ollama that nothing leaves the machine.
var ollamaText=String(((crew.userConfig||{}).ollama_model||{}).description||'');
check(ollamaText.length>0&&!/nothing leaves/i.test(ollamaText)&&/to localhost only/.test(ollamaText)&&/is Ollama's/.test(ollamaText),'the add-on\'s plugin.json: the ollama_model text must say the packet goes to localhost only and that what Ollama does with it is Ollama\'s, and must not say nothing leaves the machine: '+JSON.stringify(ollamaText));
manifests.forEach(function(m,i){ check(!/nothing leaves your machine|never leaves your machine/i.test(JSON.stringify(m)),PLUGINS[i]+'/.claude-plugin/plugin.json: says nothing leaves your machine; a manifest says where the plugin sends and no more'); });
check(/What Ollama does with a packet is Ollama's\./.test(privacy),'PRIVACY.md: must say that what Ollama does with a packet is Ollama\'s');
check(!!cw.network&&Array.isArray(cw.network.hosts)&&cw.network.hosts.length===0,'the cw plugin\'s plugin.json: network.hosts must be an empty list, the plugin reaches no host: '+JSON.stringify(cw.network));

// THE MARKETPLACE FILE.
var market=json('.claude-plugin/marketplace.json');
check(!!market.metadata&&market.metadata.version===undefined,'.claude-plugin/marketplace.json: metadata carries a version of its own ('+JSON.stringify(market.metadata&&market.metadata.version)+'), a third number beside the two plugins\'');

// THE CHECKLIST PAGES.
var mainPage=read('docs/directory-checklist.md'), crewPage=read('docs/directory-checklist-crew.md');
// Sentences the reads found wider than the code, in the add-on's README and its checklist page.
// The key file's check reads mode bits and no owner (crew-lib.js readKeyFile), so neither page
// says who can read the file. A key comes from two places, so no page names a third. The add-on
// writes in the folder a tool call names and does not check where it is.
[[PLUGINS[1]+'/README.md',crewReadme],['docs/directory-checklist-crew.md',crewPage]].forEach(function(p){
  check(!/only (you|its owner) can (read|open)|by no one else/.test(p[1]),p[0]+': says who can read or open the key file; the code reads the mode bits and no owner');
});
check(!/third key route/.test(crewPage),'docs/directory-checklist-crew.md: names a third key route; a key comes from two places');
check(!/the run folder the person names/.test(crewPage)&&/the run folder a tool call names/.test(crewPage),'docs/directory-checklist-crew.md: must say the add-on writes into the run folder a tool call names');
// A token count is kept when it is a whole number from 0 to a thousand million (server.js), and a maker opens with a letter or a digit (MAKER_RE).
[['PRIVACY.md',privacy],[PLUGINS[1]+'/README.md',crewReadme]].forEach(function(p){
  check(/when they are whole numbers from 0 to a thousand million/.test(p[1]),p[0]+': must say token counts are kept when they are whole numbers from 0 to a thousand million');
});
check(/A maker must be a plain name that opens with a letter or a digit:/.test(crewReadme),PLUGINS[1]+'/README.md: the maker sentence must say a maker opens with a letter or a digit');
check(!/not made, reviewed or endorsed/.test(mainPage)&&!/not made, reviewed or endorsed/.test(crewPage),'the two checklist pages still quote the README sentence with "reviewed"');
check(/not made or endorsed by Anthropic/.test(crewReadme)&&!/reviewed or endorsed/.test(crewReadme),PLUGINS[1]+'/README.md: must say "not made or endorsed by Anthropic", with no "reviewed"');
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
// bracket with no colon before it. The words between end no clause: a semicolon there is another
// clause's bracket (the archive's line on departure 16, which quotes a rule's name).
var MARKERS6=new RegExp('\\bthe founder\\b[^.;\\u0022\\u201c\\n(]{0,40}\\(\\s*'+Q+NOQ+'{3,}'+QEND,'i');
// A seventh shape, in a script's comment: an issue in a bracket, a colon, and the quotation,
// with no date between them.
var MARKERS7=new RegExp('\\(issue \\d+:\\s*'+Q+NOQ+'{8,}'+QEND);
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
searched.forEach(function(f){
  var rel=path.relative(root,f), flat=fs.readFileSync(f,'utf8').replace(/\n[ \t]*\/\/ ?/g,' ');
  if(f===__filename)return;
  var hits=flat.split('\n').filter(function(l){ return MARKERS.test(l)||MARKERS2.test(l)||MARKERS3.test(l)||MARKERS4.test(l)||MARKERS5.test(l)||MARKERS6.test(l)||MARKERS7.test(l); }).length;
  check(hits===0,rel+': '+hits+' line(s) mark a quoted span as the words a decision was made in; write the decision in plain words');
});

// The board's page speaks through the browser's own voices, and what a browser does to speak is
// the browser's: the privacy page says so. A comment in the script that writes the board says
// what the page's own code does, and does not say that nothing is sent or that no request leaves.
var boardScript=read(PLUGINS[0]+'/scripts/render-board.js');
check(!/Nothing is sent anywhere/.test(boardScript)&&!/No request leaves the page/.test(boardScript),PLUGINS[0]+'/scripts/render-board.js: a comment says nothing is sent, or that no request leaves the page; say what the page\'s own code does');

// The result hook reads no transcript (issue 255). The model a reader started on comes from the
// start call the host hands the hook: the task's first lines, to learn the seat and the round,
// and the model the host resolved. The page says so, says the hook keeps none of the text it is
// handed, and no longer says it opens the session's transcripts.
check(privacy.indexOf('takes no text of your conversation')<0,'PRIVACY.md: says the result hook takes no text of your conversation; it reads the first lines of the task a reader was started with');
check(/reads no transcript/.test(privacy)&&!/transcript files Claude Code keeps/.test(privacy)&&!/up to 200/.test(privacy),'PRIVACY.md: must say the result hook reads no transcript, and no longer that it opens the session\'s transcripts');
check(/the model the host resolved/.test(privacy)&&/keeps none of (it|that text)/.test(privacy),'PRIVACY.md: must say the hook reads, of the start it is handed, the model the host resolved, and that it keeps none of the text');
// No Node on the PATH (issue 255): the pages say what stops and what does not.
[PLUGINS[0]+'/README.md','README.md'].forEach(function(rel){
  var page=read(rel);
  check(/Node is not on (?:the|your) PATH/.test(page)&&/nothing of your own work is stopped/i.test(page),rel+': must say what happens when Node is not on the PATH: nothing of your own work is stopped, and no reader is started');
  check(!/every tool call of the session, your own included/.test(page)&&!/transcript files Claude Code keeps/.test(page),rel+': still says a hook that cannot run stops every tool call of the session, or that a hook reads the session\'s transcript files');
});

// The checklist's row on hooks.json says the declarations as they stand (found by the fresh-eyes read of issue 255: the
// row still said the fence had no matcher and the result hook one entry, beside a hooks.json that said otherwise).
var hooksDecl=JSON.parse(read(PLUGINS[0]+'/hooks/hooks.json')).hooks;
var hooksRow=read('docs/directory-checklist.md').split('\n').filter(function(l){ return /^\| `hooks\/hooks\.json` valid, with only documented events and types \|/.test(l); })[0]||'';
var declared=[]; Object.keys(hooksDecl).forEach(function(ev){ hooksDecl[ev].forEach(function(en){ declared.push({event:ev,matcher:en.matcher}); }); });
check(!!hooksRow&&!/no matcher/.test(hooksRow)&&declared.every(function(d){ return hooksRow.indexOf('`'+d.event+'`')>=0&&hooksRow.indexOf('`'+String(d.matcher).split('|').join('\\|')+'`')>=0; })&&hooksRow.indexOf(['zero','one','two','three','four','five'][declared.length]+' entries')>=0,'docs/directory-checklist.md: the row on hooks.json must name each event and each entry\'s matcher as hooks.json declares them ('+declared.map(function(d){ return d.event+' '+d.matcher; }).join(', ')+') and count the entries; it reads: '+hooksRow.slice(0,420));

// What the second fresh read of issue 255 found on the pages. The privacy page said a provider's answer is written
// without the key scrub, where the add-on now replaces the key in use in it; it listed six fields of the line the result
// hook writes, where the hook writes more; and three pages said nothing of the person's own work is stopped with no Node,
// with no word of the two cases where a call of theirs is.
// Every key the add-on holds, not one (the acting desk's read of issue 255: the scrub loops over each provider's key
// it finds, crew-lib.js keysInUse, so a second provider's key in an answer or an error is replaced too).
check(!/written without that scrub/.test(privacy)&&/replaces every key the add-on holds, each by its exact text, before the answer is written/.test(privacy)&&/shapes are not applied to an answer/.test(privacy)&&/a key the add-on does not hold, and an account id, stay in an answer/.test(privacy)&&/removes from it every key the add-on holds, each by its exact text/.test(privacy)&&!/the key in use/.test(privacy),'PRIVACY.md: must say what the add-on does to a key in an error text and in an answer: every key the add-on holds replaced by its exact text; a key it does not hold, and an account id, stay in an answer; the page must not say "the key in use", which is one key where the code replaces each');
var crewLibSrc=read(PLUGINS[1]+'/crew-lib.js');
check(/function scrubKeys\(text\)\{[^}]*keysInUse\(\)\.forEach/.test(crewLibSrc)&&/function keysInUse\(\)\{[\s\S]{0,200}providers\.forEach/.test(crewLibSrc),'the test\'s own ground: crew-lib.js scrubKeys replaces each key keysInUse returns, and keysInUse reads every provider\'s key');
var hookSrc=read(PLUGINS[0]+'/hooks/show-result.js');
var lineKeys=((/var line=\{([^}]*)\}/.exec(hookSrc)||[])[1]||'').split(',').map(function(kv){ return kv.split(':')[0].trim(); }).concat((hookSrc.match(/\bline\.([a-z]+)=/g)||[]).map(function(m){ return m.slice(5,-1); })).filter(function(k,i,a){ return k&&a.indexOf(k)===i; }).sort();
check(lineKeys.join(',')==='at,by,event,meta,model,passed,round,seat,ts','the test\'s own ground: the fields the result hook writes on its line, read from its source, are at, by, event, meta, model, passed, round, seat and ts; found '+lineKeys.join(','));
check(/the line's kind/.test(privacy)&&/that the hook wrote it/.test(privacy)&&/a mark that the choice could not be read/.test(privacy),'PRIVACY.md: the fields of the line the result hook writes must be named whole: the time, the line\'s kind, the seat, the round, the model\'s id, the choice passed, that it was read at the start, that the hook wrote it, and the mark for a choice that could not be read');
[['PRIVACY.md',privacy],[PLUGINS[0]+'/README.md',read(PLUGINS[0]+'/README.md')]].forEach(function(pg){
  check(/one of whose values is exactly the reader's name, `cw:seat`, or ends with that name right after a double quote/.test(pg[1])&&/no `grep`/.test(pg[1]),pg[0]+': where it says nothing of your own work is stopped with no Node, it must name the two cases where a call of yours is: one of whose values is exactly the reader\'s name, or ends with it right after a double quote, and a machine with no `grep`');
});
check(/Git for Windows/.test(read(PLUGINS[0]+'/README.md').split('\n').filter(function(l){ return /Node must be on your PATH/.test(l); })[0]||''),PLUGINS[0]+'/README.md: the install paragraph that names Node must name Git for Windows beside it, for a Windows machine');

// The add-on is not submitted to the Claude plugin directory (issue 257): `cw` alone goes there, and the add-on stays
// on Learning Producers' own marketplace. So no page says the add-on is, was or is to be submitted (issue 255 had
// them say "to be submitted"); each of the five says it is not in the directory, or not submitted to it; and the three
// that give the reason give the one reason: the add-on connects to model providers Learning Producers does not own or
// control. CLAUDE.md, the wall, says the same, and no longer what pull request 256 made untrue of the hooks. And the
// two rows of the add-on's checklist that only the directory's own portal can settle say `portal`, as the same row of
// the `cw` page does.
['README.md',PLUGINS[0]+'/README.md','docs/plugin-map.md','docs/directory-checklist-crew.md','docs/directory-checklist.md'].forEach(function(rel){
  var page=read(rel), said=/\b(?:is|are|was|were|and|been) submitted\b[^.|]{0,80}/.exec(page.replace(/nothing has been submitted/g,''));
  check(!said,rel+': says a plugin is, or was, submitted to the directory ("'+(said?said[0]:'')+'"); nothing has been submitted yet, and the add-on is not to be');
  check(!/to be submitted/.test(page),rel+': still says the add-on is to be submitted to the directory; it is not submitted');
  check(/not in the Claude plugin directory|not submitted to (?:it|the directory|the Claude plugin directory)/.test(page),rel+': must say the add-on is not in the Claude plugin directory, or not submitted to it');
});
['README.md',PLUGINS[0]+'/README.md','docs/directory-checklist-crew.md'].forEach(function(rel){
  check(/model providers that Learning Producers does not own or control/.test(read(rel))&&/own or control each address/.test(read(rel)),rel+': must give the reason the add-on is not submitted: it connects to model providers that Learning Producers does not own or control, and the directory\'s policy asks a developer to own or control each address their software connects to');
});
var wall=read('CLAUDE.md');
check(!/measured from the seat's own transcript/.test(wall)&&!/on every tool call it holds a fresh reader/.test(wall)&&!/to find a seat's transcript/.test(wall),'CLAUDE.md: still says the model is measured from a seat\'s transcript, or that the fence runs on every tool call; the result hook opens no transcript and the fence is matched (issue 255)');
check(/not submitted to the Claude plugin directory/.test(wall)&&/on LPI's own marketplace, not submitted to the directory/.test(wall)&&!/second bundle (?:to be )?submitted/.test(wall)&&!/submitted to the Claude plugin directory as a second bundle/.test(wall),'CLAUDE.md: must say the add-on is not submitted to the Claude plugin directory, in its opening and in its layout');
// The wall's new sentences on the hooks, each held by its own words (they stood on the head when these pins were
// written, so these did not fail first): when the fence runs, where the model is read, the file printed with no Node,
// and the five live proofs, each a file that exists.
check(/before every Read, every Write and every start of an agent it holds a fresh reader/.test(wall)&&/each hook's command asks first whether `node` runs/.test(wall),'CLAUDE.md: must say the fence runs before every Read, every Write and every start of an agent, and that each hook\'s command asks first whether `node` runs');
check(/measured from the start call, with no transcript read/.test(wall)&&/`tool_response\.resolvedModel`/.test(wall)&&/it opens no transcript and no file the host keeps of a session/.test(wall),'CLAUDE.md: must say the model a fresh reader started on is read from the start call, and that the hook opens no transcript');
check(/hooks\/no-node\.json/.test(wall)&&exists(PLUGINS[0]+'/hooks/no-node.json'),'CLAUDE.md: its layout must name hooks/no-node.json, a file that exists');
var liveNamed=((/\((\w+) exceptions, the live proofs[^)]*\)/.exec(wall)||[])[0]||'').match(/tests\/[a-z_]+_live\.js/g)||[];
var liveOnDisk=fs.readdirSync(path.join(root,'tests')).filter(function(f){ return /_live\.js$/.test(f); }).map(function(f){ return 'tests/'+f; }).sort();
check(/\(five exceptions, the live proofs/.test(wall)&&liveNamed.slice().sort().join()===liveOnDisk.join(),'CLAUDE.md: the test style must name the live proofs, five, each a file under tests/ and every one there; named '+liveNamed.join(', ')+'; on disk '+liveOnDisk.join(', '));
// What the first fresh read of this change found (issue 257). The add-on's own README still told the reader to install
// it from the directory "once it is listed there"; a row of the `cw` checklist still said the directory scans the
// add-on's folder "as its own submission"; and the wall was loose in two places: it listed the working folder among what the hook
// reads of a start and closed with "nothing else of it" (the working folder is of the hook's input, as the READMEs and
// the hook's header have it, and the wall drops the claim), and it said "every result" for a model id that is shown
// only when one was read. No file that speaks for the add-on promises it a listing: its README, its manifest's
// description, the marketplace file.
check(!/once it is listed/.test(crewReadme)&&/not in the Claude plugin directory/.test(crewReadme)&&/model providers that Learning Producers does not own or control/.test(crewReadme)&&/own or control each address/.test(crewReadme),PLUGINS[1]+'/README.md: must not tell the reader to install the add-on from the directory once it is listed; it must say the add-on is not in the Claude plugin directory, and why');
[[PLUGINS[1]+'/README.md',crewReadme],[PLUGINS[1]+'/.claude-plugin/plugin.json',String(crew.description||'')],['.claude-plugin/marketplace.json',read('.claude-plugin/marketplace.json')]].forEach(function(pg){
  var said=/once it is listed|to be submitted|second bundle|\b(?:is|are|was|were|and|been) submitted\b|submitted too|submitted on its own/.exec(pg[1]);
  check(!said,pg[0]+': speaks of the add-on as submitted to, or to be listed in, the directory ("'+(said?said[0]:'')+'")');
});
check(!/scans as its own submission/.test(read('docs/directory-checklist.md'))&&!/each folder is its own submission/.test(read('docs/directory-checklist.md')),'docs/directory-checklist.md: still says the directory scans the add-on\'s folder as its own submission, or that each folder is one; the add-on\'s folder is not submitted');
check(!/and nothing else of it/.test(wall),'CLAUDE.md: closes its list of what the hook reads of a reader\'s start with "nothing else of it", and that list holds the working folder, which is of the hook\'s input and not of the start; the list stands without the claim');
check(/when one was read at its start, which model id each fresh reader started on/.test(wall),'CLAUDE.md: the crew bullet must say a result names the model id a fresh reader started on when one was read at its start, not in every result');
var crewPage=read('docs/directory-checklist-crew.md');
var portalRows=crewPage.split('\n').filter(function(l){ return /^\| A name no other organization's plugin uses/.test(l)||/^\| `name`, `displayName` and `author\.name` not mistakable/.test(l); });
check(portalRows.length===2&&portalRows.every(function(l){ return l.split('|')[2].trim()==='portal'; })&&!/pass \(the portal confirms\)/.test(crewPage),'docs/directory-checklist-crew.md: the two rows on the name and its look-alikes are the portal\'s to settle and must read `portal`, as the `cw` page\'s row does; found '+JSON.stringify(portalRows.map(function(l){ return l.split('|')[2].trim(); })));

// THE LISTING'S FACE (issue 260). What a stranger meets first says what the directory's copy does when read alone.
// The manifest's description is 300 characters or fewer; it and the marketplace's entry for `cw` say two fresh
// readers, that other companies' models are the add-on's, that a seat rates again when the person asks, and that
// seats read each other in the sharing rounds; neither says every result ends with a picker (the picker can be
// switched off for a project).
var faceDesc=String(cw.description||''), faceEntry=String((((json('.claude-plugin/marketplace.json').plugins||[]).filter(function(e){ return e.name==='cw'; })[0])||{}).description||'');
check(faceDesc.length>0&&faceDesc.length<=300,PLUGINS[0]+'/.claude-plugin/plugin.json: the description must be 300 characters or fewer; it is '+faceDesc.length);
[[PLUGINS[0]+'/.claude-plugin/plugin.json: the description',faceDesc],['.claude-plugin/marketplace.json: the entry for cw',faceEntry]].forEach(function(d){
  check(/two fresh (?:AI )?readers/.test(d[1]),d[0]+' must say the crew is two fresh readers');
  check(/add-on/.test(d[1])&&/other companies' models/i.test(d[1]),d[0]+' must say other companies\' models are the add-on\'s');
  check(/rate again when you ask/.test(d[1]),d[0]+' must say a seat rates again when you ask');
  check(/in the sharing rounds/.test(d[1])&&!/reads each other in battle/.test(d[1]),d[0]+' must say the seats read each other in the sharing rounds, not in every battle round');
  check(!/ends with a picker/.test(d[1]),d[0]+' says every result ends with a picker; the picker can be switched off for a project');
  check(/Claude Code/.test(d[1])&&/7 forbidden/.test(d[1]),d[0]+' must name Claude Code and the rating rule, 7 forbidden');
});
check(!/description names (?:the seven commands|what ships, the seven commands)/.test(read('docs/directory-checklist.md')),'docs/directory-checklist.md: two rows say the description names the seven commands, the record and the board; the short description names none of them');
check(!/README and the description/.test(read('docs/directory-checklist.md')),'docs/directory-checklist.md: says the README and the description disclose the one link the host opens; the short description names no link, and the README and the privacy page disclose it');
check(!/asked about Read and Write alone/.test(read('docs/directory-checklist.md'))&&/the fence is asked about Read, Write and the start of an agent/.test(read('docs/directory-checklist.md')),'docs/directory-checklist.md: says the fence is asked about Read and Write alone; hooks.json matches it to Read, Write and the two names of the tool that starts an agent');
check(/not in (?:this|the Claude plugin) directory/.test(faceDesc),PLUGINS[0]+'/.claude-plugin/plugin.json: the description must say the add-on is not in the directory');
// Three claims that said more than the code, on the two READMEs. Which of the two holds a reader to Read and Write:
// the agent file's `tools:` line, not the hook. What the board loads: nothing from the network; it links the run's
// record and plays the run's own audio files. And the name `seat`: an agent of the person's own named exactly so is
// taken for the plugin's reader with Node present too, which the two READMEs, the privacy page and the map say.
['README.md',PLUGINS[0]+'/README.md'].forEach(function(rel){
  var t=read(rel);
  check(!/holds every fresh reader to Read and Write only/.test(t)&&/its `tools:` line/.test(t)&&/`agents\/seat\.md`/.test(t),rel+': must not say the hook holds a reader to Read and Write only; that is the agent file\'s `tools:` line (`agents/seat.md`), and the hook holds the two files and the start');
  check(!/loads nothing from anywhere/.test(t)&&/loads nothing from the network/.test(t)&&/audio files/.test(t)&&/links the run's own `record\.md`/.test(t),rel+': must say the board loads nothing from the network, and name what it does use: the link to the run\'s own record.md and the run\'s own audio files');
});
check(/^tools: Read, Write$/m.test(read(PLUGINS[0]+'/agents/seat.md')),'the test\'s own ground: agents/seat.md gives a reader Read and Write and no other tool');
check(/new Audio\(/.test(read(PLUGINS[0]+'/scripts/render-board.js'))&&/href="record\.md"/.test(read(PLUGINS[0]+'/scripts/render-board.js')),'the test\'s own ground: the board plays audio files and links record.md');
// The reader's one name (issue 261): the two hooks hold the plugin's reader by `cw:seat` alone, so the pages no longer say an
// agent of the person's own named `seat` is taken for it; they say it is the person's.
[PLUGINS[0]+'/hooks/seat-scope.js',PLUGINS[0]+'/hooks/show-result.js'].forEach(function(rel){
  check(/^var SEAT_TYPE='cw:seat';$/m.test(read(rel))&&!/SEAT_TYPES/.test(read(rel))&&!/\(\?:cw:\)\?seat/.test(read(rel)),rel+': the test\'s own ground: the hook holds the plugin\'s reader by one name, cw:seat, and by no pattern that also takes the bare name');
});
['README.md',PLUGINS[0]+'/README.md','PRIVACY.md','docs/plugin-map.md',PLUGINS[0]+'/skills/combat-writing/SKILL.md',PLUGINS[0]+'/hooks/no-node.json'].forEach(function(rel){
  check(!/named exactly `?seat`? is taken/.test(read(rel))&&!/named exactly `?seat`?/.test(read(rel)),rel+': must no longer say an agent of your own named exactly `seat` is taken for the plugin\'s reader; the reader\'s one name is cw:seat');
});
['README.md',PLUGINS[0]+'/README.md','PRIVACY.md','docs/plugin-map.md'].forEach(function(rel){
  check(/an agent of your own named `seat` is yours/.test(read(rel)),rel+': must say an agent of your own named `seat` is yours');
});
// The root README's first screen: after the motto, three lines of what the plugin is, then the install line, then a
// table of the hook entries, one row an entry of hooks/hooks.json in its order: the event, what it is matched to,
// what it does, and what happens when it fails (a call is stopped only where the entry sets onFailure "block"). The
// cell on what a hook does is held by its length alone: its words are a reader's to judge.
var faceLines=read('README.md').split('\n'), faceMotto=faceLines.indexOf('**Reading is Peace. Writing is War.**'), faceH2=faceLines.map(function(l,i){ return /^## /.test(l)?i:-1; }).filter(function(i){ return i>=0; });
var faceOpen=faceMotto>=0&&faceH2.length?faceLines.slice(faceMotto+1,faceH2[0]).filter(function(l){ return l.trim(); }):[];
check(faceOpen.length===3&&faceOpen.every(function(l){ return l.length<=320; }),'README.md: between the motto and the first heading stand three lines of what the plugin is, each 320 characters or fewer; found '+faceOpen.length+' ('+faceOpen.map(function(l){ return l.length; }).join(', ')+')');
check(faceH2.length>1&&faceLines[faceH2[0]]==='## Install'&&faceLines.slice(faceH2[0],faceH2[1]).indexOf('/plugin install cw --marketplace LearningProducers/CombatWriting-Plugin')>=0,'README.md: the first heading must be "## Install", with the install line under it');
check(faceH2.length>2&&faceLines[faceH2[1]]==='## The hooks','README.md: the second heading must be "## The hooks"');
var faceRows=faceH2.length>2?faceLines.slice(faceH2[1],faceH2[2]).filter(function(l){ return /^\| `/.test(l); }).map(function(l){ var c=l.split('|').map(function(x){ return x.trim(); }); return {ev:c[1].replace(/`/g,''),matcher:(c[2].match(/`[^`]+`/g)||[]).map(function(x){ return x.replace(/`/g,''); }).join('|'),does:c[3]||'',fail:c[4]||''}; }):[];
var faceHooks=json(PLUGINS[0]+'/hooks/hooks.json').hooks||{}, faceEntries=[];
Object.keys(faceHooks).forEach(function(ev){ faceHooks[ev].forEach(function(e){ faceEntries.push({ev:ev,matcher:String(e.matcher||''),block:(e.hooks||[]).some(function(h){ return h.onFailure==='block'; })}); }); });
check(faceEntries.length>0&&faceRows.length===faceEntries.length,'README.md: the hooks table must hold one row an entry of hooks/hooks.json: '+faceRows.length+' rows, '+faceEntries.length+' entries');
faceEntries.forEach(function(e,i){
  var r=faceRows[i]||{ev:'',matcher:'',does:'',fail:''};
  check(r.ev===e.ev&&r.matcher===e.matcher,'README.md: row '+(i+1)+' of the hooks table must be '+e.ev+' matched to '+e.matcher+'; it is '+r.ev+' matched to '+r.matcher);
  check(r.does.length>20&&(e.block?/the call is stopped/.test(r.fail)&&!/^Nothing is stopped/.test(r.fail):/^Nothing is stopped/.test(r.fail)),'README.md: row '+(i+1)+' of the hooks table ('+e.ev+', '+e.matcher+') must say what the hook does, and that '+(e.block?'the call is stopped when the hook fails (the entry sets onFailure "block")':'nothing is stopped when it fails (the entry sets no onFailure)'));
});

// The loose sentences in code (issue 261): Part 150 set them right on the pages. That the fence holds a reader to Read
// and Write only stood in the rules skill, the agent file's text and the fence's own header: the agent file's `tools:` line
// does that, and the hook holds the two files and the start. And two skill descriptions said every result ends with a picker.
var rulesSkill=read(PLUGINS[0]+'/skills/combat-writing/SKILL.md'), seatFile=read(PLUGINS[0]+'/agents/seat.md'), fenceSrc=read(PLUGINS[0]+'/hooks/seat-scope.js');
check(!/lets the `seat` agent use Read and Write only/.test(rulesSkill)&&/Read and Write are its only tools, by its agent file's `tools:` line/.test(rulesSkill),PLUGINS[0]+'/skills/combat-writing/SKILL.md: must not say the hook lets the seat use Read and Write only; the agent file\'s `tools:` line gives a reader its two tools');
check(!/or any tool but Read and Write, is refused/.test(seatFile)&&/Read and Write are the only tools you are given, and the plugin's hook holds you to the two files/.test(seatFile),PLUGINS[0]+'/agents/seat.md: must not tell a reader that the hook refuses any tool but Read and Write; it is given those two alone, and the hook holds it to the two files');
check(!/uses Read and Write only, reads two files/.test(fenceSrc)&&/no other tool by its agent file's `tools:` line, which the host applies/.test(fenceSrc),PLUGINS[0]+'/hooks/seat-scope.js: its header must not say the hook holds a reader to Read and Write only');
['battle','sparring'].forEach(function(n){
  var d=(/^description: (.+)$/m.exec(read(PLUGINS[0]+'/skills/'+n+'/SKILL.md'))||[])[1]||'';
  check(/ends with a picker for the next round, unless you switched it off\./.test(d)&&!/ends with a picker for the next round\./.test(d),PLUGINS[0]+'/skills/'+n+'/SKILL.md: its description must not say every result ends with a picker without the off switch');
});
// The wait (issue 261): a hook cannot say a line before it ends, so the two round skills hand the host one line for the shell
// call that runs the four result scripts, the same words in both. It is the host's writing; this holds only that the skills ask.
var WAIT_LINE='give the shell call that runs these four scripts the description "Combat Writing: showing the result (on a Mac the voices can take up to a minute)"';
['battle','sparring'].forEach(function(n){ check(read(PLUGINS[0]+'/skills/'+n+'/SKILL.md').split(WAIT_LINE).length===2,PLUGINS[0]+'/skills/'+n+'/SKILL.md: must ask the host once for the one line the person reads while the hook renders the voices'); });
// The table's own heading (issue 261: no check held it): the four columns the rows above are read by, then the rule line.
var faceHead=faceH2.length>2?faceLines.slice(faceH2[1],faceH2[2]).filter(function(l){ return /^\|/.test(l); }).slice(0,2):[];
check(faceHead[0]==='| Event | Matched to | What it does | When the hook fails |'&&faceHead[1]==='|---|---|---|---|','README.md: the hooks table must open with its heading, the four columns Event, Matched to, What it does and When the hook fails, then the rule line; it opens '+JSON.stringify(faceHead));
// The checklist's two rows on the description (issue 261: they were held only by what they must not say). Each thing a
// row says the description names is in the description, the length a row gives is the length it has at the most, and
// what the row says it leaves out (a link) is not in it.
var cwDesc=String(json(PLUGINS[0]+'/.claude-plugin/plugin.json').description||''), clistRows=read('docs/directory-checklist.md').split('\n');
var rowListing=clistRows.filter(function(l){ return /^\| \*\*Listing details\*\* /.test(l); })[0]||'', rowScoped=clistRows.filter(function(l){ return /^\| The `cw` plugin's description stays scoped /.test(l); })[0]||'';
var saidLength=parseInt((/the description says in (\d+) characters or fewer/.exec(rowListing)||[])[1],10);
check(saidLength>0&&cwDesc.length>0&&cwDesc.length<=saidLength,'docs/directory-checklist.md: the Listing details row must give a length the description keeps to; the row says '+saidLength+', the description is '+cwDesc.length+' characters');
[[/two fresh readers/,/two fresh readers/],[/the rating from 1 to 10 with 7 forbidden/,/rates it 1 to 10, 7 forbidden/],[/the reading of each other in the sharing rounds/,/read each other in the sharing rounds/],[/a rating again when asked/,/rate again when you ask/],[/`\/cw:help`/,/\/cw:help/],[/they need an add-on that is not in the directory/,/need an add-on not in this directory/]].forEach(function(p){
  check(p[0].test(rowScoped)&&p[1].test(cwDesc),'docs/directory-checklist.md: the row on the description\'s scope must name '+p[0]+' and the description must hold '+p[1]+'; the row '+(p[0].test(rowScoped)?'does':'does not')+', the description '+(p[1].test(cwDesc)?'does':'does not'));
});
check(/not in the description/.test(rowScoped)&&!/https?:|shipped/.test(cwDesc),'docs/directory-checklist.md: the row says the one link the host opens is disclosed elsewhere and not in the description; the description must name no link and not `shipped`');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'truth_pages_check: '+failures.length+' failure(s), ':'truth_pages_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
