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
//   - A DECISION IS WRITTEN AS THE DECISION. No tracked .md or .js file but CLAUDE.md marks a
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
check(/not made, reviewed or endorsed by Anthropic/.test(privacy),'PRIVACY.md: must say it is not Anthropic\'s');
check(privacy.length>0&&!/\[[A-Z][A-Z ,:'-]{6,}/.test(privacy)&&!/\bDRAFT\b|CHANGES AFTER FIX|OPEN QUESTIONS/.test(privacy),'PRIVACY.md: an unfilled bracket or a word that marks a draft stands in it');
check(/^Last updated: \d{4}-\d\d-\d\d$/m.test(privacy),'PRIVACY.md: must carry its date as "Last updated: YYYY-MM-DD" on a line of its own');

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
var MARKERS=/\b(?:(?:the )?founder['’]s (?:own )?words?|his (?:own )?words?|in his words|the founder (?:said|wrote|typed|answered)|the founder['’]s (?:answer|go))\b[^"“\n]{0,60}["“][^"”\n]{12,}["”]/i;
function tracked(dir,deep){
  var out=[];
  fs.readdirSync(dir,{withFileTypes:true}).forEach(function(d){
    var p=path.join(dir,d.name);
    if(d.isDirectory()){ if(deep&&d.name!=='node_modules'&&d.name[0]!=='.')out=out.concat(tracked(p,true)); }
    else if(d.isFile()&&/\.(md|js)$/.test(d.name))out.push(p);
  });
  return out;
}
var searched=tracked(root,false).concat(tracked(path.join(root,'docs'),true),tracked(path.join(root,'plugins'),true),tracked(path.join(root,'tests'),true),tracked(path.join(root,'.github'),true));
var inClaude=0;
searched.forEach(function(f){
  var rel=path.relative(root,f), flat=fs.readFileSync(f,'utf8').replace(/\n[ \t]*\/\/ ?/g,' ');
  if(f===__filename)return;
  var hits=flat.split('\n').filter(function(l){ return MARKERS.test(l); }).length;
  if(rel==='CLAUDE.md'){ inClaude=hits; return; }
  check(hits===0,rel+': '+hits+' line(s) mark a quoted span as the words a decision was made in; write the decision in plain words');
});

failures.forEach(function(f){console.log('FAIL '+f);});
if(inClaude)console.log('note: CLAUDE.md holds '+inClaude+' such line(s); they change on the owner\'s word');
console.log((failures.length?'truth_pages_check: '+failures.length+' failure(s), ':'truth_pages_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
