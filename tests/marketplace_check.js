// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// marketplace_check.js: the marketplace names both plugins, each entry points at a folder
// that holds a manifest with the same name and version, and the add-on's manifest declares
// its MCP server and its masked key prompts the way the rulings require.
//
// What it pins:
//   - .claude-plugin/marketplace.json parses, is named learning-producers, names an owner,
//     and lists exactly combat-writing and combat-writing-crew, each with a relative source
//     under ./plugins/ that exists and holds .claude-plugin/plugin.json whose name and
//     version match the entry; the renames map carries combat-writing -> cw (the rename of
//     2026-10-14), so an install recorded under the old name migrates.
//   - The add-on's manifest declares one stdio MCP server started with node on a file inside
//     the plugin (${CLAUDE_PLUGIN_ROOT}/server.js, plain arguments, no shell), every key
//     option is a string with sensitive: true and no default, every env value in the server
//     entry is a ${user_config.<option>} reference to a declared option, and no value in the
//     manifest looks like a credential.
//   - The listed plugin's manifest declares no MCP server, no hooks field and no userConfig,
//     and the folder has no .mcp.json: it holds no keys and makes no outside call. Its one
//     hook file, hooks/hooks.json (the session-start line, ruled 2026-10-09, and the seat scope,
//     ruled 2026-10-16), is pinned by tests/hook_check.js and tests/seat_scope_check.js.
//   - The separation, as it stands since the add-on is submitted too (PLAN.md Part 107, issue
//     221): each plugin folder is its own submission to the directory, so each stands alone. A
//     literal relative require in either folder resolves inside that folder, the add-on's
//     folder holds its own manifest, README, LICENSE.md and NOTICE, its README has more than 40
//     words outside code blocks (the directory's README rule), and no tracked file in it holds
//     something shaped like a credential.
//   - The add-on's road to the directory (Part 107, issue 221). No file that speaks for the
//     add-on says it is not listed: the marketplace, the add-on's manifest and README, both
//     checklist pages and CLAUDE.md are read line by line for the phrases that said so (not
//     listed, never listed, unlisted plugin, not or never submitted, not in the Claude plugin
//     directory, only plugins/combat-writing is submitted, the directory never scans); the one
//     sentence left alone is the /mcp one, where "not listed" is a server missing from that
//     list. The add-on's listing text, its manifest description and its README, says Claude
//     Code plainly (a local MCP server is ignored in chat on claude.ai and loads in the desktop
//     app only on your own computer) and never names cw as "the listed plugin"; the README
//     names the three key routes and says why the key file exists; the marketplace's cw entry
//     names the add-on as its crew; CLAUDE.md says the add-on is submitted as a second bundle;
//     the main checklist's add-on row no longer reads n/a and points at the add-on's own page.
//   - docs/directory-checklist-crew.md, the add-on's own pass: it names the two published
//     pages it was read against; its sections are the published checklist's, each with as
//     many rows as the checklist had on the day of the pass (the counts live here, in
//     CREW_PAGE, and move when the page is re-passed); every row's result is pass, HELD or
//     n/a; no row carries a date or a version; the row on a credential read from the person's
//     machine reads HELD, and of the three key routes the masked prompt reads pass and the
//     environment variable and the key file read HELD.
//   - When the claude CLI is on PATH, `claude plugin validate --strict` passes on the root,
//     on both plugin folders and on the listed plugin's component folders; otherwise that
//     step is reported as skipped.
//
// Run from the repo root:   node tests/marketplace_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), cp=require('child_process');
var root=path.join(__dirname,'..');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(rel){ return fs.readFileSync(path.join(root,rel),'utf8'); }
function exists(rel){ return fs.existsSync(path.join(root,rel)); }

function m_renames(m){ return !!m.renames&&m.renames['combat-writing']==='cw'; }
var market=null;
try{market=JSON.parse(read('.claude-plugin/marketplace.json'));}catch(e){failures.push('marketplace.json: '+e.message);}
if(market){
  check(market.name==='learning-producers','marketplace: name is '+market.name);
  check(market.owner&&market.owner.name==='Learning Producers Inc.','marketplace: owner missing');
  var names=(market.plugins||[]).map(function(p){return p.name;}).sort();
  check(names.join(',')==='combat-writing-crew,cw','marketplace: plugins are '+names.join(','));
  // The rename (2026-10-14): the listed plugin's name went from combat-writing to cw; the renames map
  // migrates an install recorded under the old name, and the docs say to keep it as append-only history.
  check(m_renames(market),'marketplace: renames must map combat-writing to cw');
  (market.plugins||[]).forEach(function(p){
    check(typeof p.source==='string'&&/^\.\/plugins\/[a-z0-9-]+$/.test(p.source),p.name+': source is '+JSON.stringify(p.source));
    var folder=String(p.source||'').replace(/^\.\//,'');
    var mf=folder+'/.claude-plugin/plugin.json';
    check(exists(mf),p.name+': no manifest at '+mf);
    if(exists(mf)){
      var m=JSON.parse(read(mf));
      check(m.name===p.name,p.name+': manifest name is '+m.name);
      check(m.version===p.version,p.name+': manifest version '+m.version+' differs from the marketplace entry '+p.version);
      check(typeof p.description==='string'&&p.description.length>20,p.name+': entry has no description');
    }
  });
}

// The add-on's manifest.
var crew=JSON.parse(read('plugins/combat-writing-crew/.claude-plugin/plugin.json'));
var servers=crew.mcpServers||{};
var serverNames=Object.keys(servers);
check(serverNames.length===1&&serverNames[0]==='combat-writing-crew','crew manifest: expected one MCP server named combat-writing-crew, got '+serverNames.join(','));
var srv=servers['combat-writing-crew']||{};
check(srv.command==='node'&&Array.isArray(srv.args)&&srv.args.length===1&&srv.args[0]==='${CLAUDE_PLUGIN_ROOT}/server.js','crew manifest: the server must be started as node ${CLAUDE_PLUGIN_ROOT}/server.js, got '+JSON.stringify(srv.command)+' '+JSON.stringify(srv.args));
check(!srv.url&&!/sh\b|-c\b|npm|npx/.test(JSON.stringify(srv)),'crew manifest: the server entry must not use a shell, a launcher or a URL');
check(exists('plugins/combat-writing-crew/server.js'),'crew: server.js missing');
var options=crew.userConfig||{};
var keyOptions=Object.keys(options).filter(function(k){return /_api_key$/.test(k);});
check(keyOptions.length>=1,'crew manifest: no *_api_key option');
keyOptions.forEach(function(k){
  var o=options[k];
  check(o.type==='string'&&o.sensitive===true&&o.default===undefined&&o.required!==true,'crew manifest: option '+k+' must be a sensitive, optional string with no default');
  check(/Sent only to [a-z0-9.-]+\.[a-z]+/.test(o.description||''),'crew manifest: option '+k+' must say which address it is sent to');
});
Object.keys(options).forEach(function(k){ check(options[k].title&&options[k].description,'crew manifest: option '+k+' lacks a title or description'); });
var env=srv.env||{};
Object.keys(env).forEach(function(name){
  var m=/^\$\{user_config\.([a-z_]+)\}$/.exec(env[name]);
  check(!!m&&options[m[1]]!==undefined,'crew manifest: env '+name+' is '+env[name]+', expected a ${user_config.<declared option>} reference');
  check(/^CW_CREW_[A-Z_]+$/.test(name),'crew manifest: env name '+name+' should be CW_CREW_*');
});
keyOptions.forEach(function(k){ check(Object.keys(env).some(function(n){return env[n]==='${user_config.'+k+'}';}),'crew manifest: option '+k+' is not mapped into the server\'s env'); });
// The server reads what the manifest maps (2026-10-19): every keyed provider's key_prompt_env is an env name
// the manifest fills from ${user_config.<its key_option>}, and that option is declared sensitive; the field
// the no-key message names is a field the dialog shows.
var providers=JSON.parse(read('plugins/combat-writing-crew/providers.json')).providers||[];
providers.filter(function(p){return p.key_prompt_env&&!p.stub;}).forEach(function(p){
  var option=p.key_option||(p.id+'_api_key');
  check(env[p.key_prompt_env]==='${user_config.'+option+'}','crew: provider '+p.id+' reads '+p.key_prompt_env+', which the manifest maps to '+JSON.stringify(env[p.key_prompt_env])+', expected ${user_config.'+option+'}');
  check(options[option]&&options[option].sensitive===true,'crew: provider '+p.id+' names the field '+option+', which the manifest does not declare as a sensitive option');
  check(typeof p.key_env==='string'&&/^[A-Z][A-Z0-9_]+_API_KEY$/.test(p.key_env),'crew: provider '+p.id+' has no conventional key_env');
});
var manifestText=read('plugins/combat-writing-crew/.claude-plugin/plugin.json')+read('plugins/combat-writing-crew/providers.json');
check(!/\b(sk|gsk|xai|pplx)[-_][A-Za-z0-9]{16,}/.test(manifestText),'crew: something that looks like a credential appears in the manifest or provider table');
// The same shape in every file of the add-on's folder, documentation and examples included
// (the directory's rule: real credentials out of every file).
function filesUnder(rel){
  var out=[]; (function walk(d){ fs.readdirSync(path.join(root,d)).forEach(function(n){ var p=d+'/'+n; if(fs.statSync(path.join(root,p)).isDirectory())walk(p); else out.push(p); }); })(rel);
  return out;
}
filesUnder('plugins/combat-writing-crew').forEach(function(f){
  check(!/\b(sk|gsk|xai|pplx)[-_][A-Za-z0-9]{16,}/.test(read(f)),'crew: something that looks like a credential appears in '+f);
});
check(!crew.hooks&&!crew.commands&&!crew.agents,'crew manifest: the add-on should declare no hooks, commands or agents');

// The listed plugin holds no keys and makes no outside call.
var listed=JSON.parse(read('plugins/combat-writing/.claude-plugin/plugin.json'));
check(!listed.mcpServers&&!listed.hooks&&!listed.userConfig,'listed manifest: must declare no MCP server, hooks field or userConfig');
check(!exists('plugins/combat-writing/.mcp.json'),'listed plugin: must have no .mcp.json');
check(exists('tests/hook_check.js'),'listed plugin: hooks/ is pinned by tests/hook_check.js, which is missing');
var listedScripts=fs.readdirSync(path.join(root,'plugins/combat-writing/scripts')).filter(function(f){return /\.js$/.test(f);}).map(function(f){return read('plugins/combat-writing/scripts/'+f);}).join('\n');
check(!/require\(['"](https?|net|dgram)['"]\)/.test(listedScripts)&&!/\bfetch\(/.test(listedScripts),'listed plugin: a script requires a network module or calls fetch');
// child_process is allowed in two scripts: open-board.js, which starts the system's opener on the
// local board.html (2026-10-14), and speak.js, which runs the Mac's speech engine on each seat's
// answer (Part 81, issue 121); tests/open_board_check.js pins that no other script requires it and
// that neither makes a network call.
var scriptsButRuled=fs.readdirSync(path.join(root,'plugins/combat-writing/scripts')).filter(function(f){return /\.js$/.test(f)&&f!=='open-board.js'&&f!=='speak.js';}).map(function(f){return read('plugins/combat-writing/scripts/'+f);}).join('\n');
check(!/require\(['"]child_process['"]\)/.test(scriptsButRuled),'listed plugin: a script other than open-board.js or speak.js requires child_process');
check(!/https?:\/\//.test(listedScripts.replace(/\/\/[^\n]*/g,'')),'listed plugin: a script holds a URL outside a comment');

// The separation, re-pinned (PLAN.md Part 107, issue 221): the add-on is submitted too, each folder
// its own submission, and a person who installs one gets that folder alone. So each stands alone.
['plugins/combat-writing','plugins/combat-writing-crew'].forEach(function(folder){
  filesUnder(folder).filter(function(f){return /\.js$/.test(f);}).forEach(function(f){
    var text=read(f), re=/require\(\s*['"](\.[^'"]*)['"]\s*\)/g, m;
    while((m=re.exec(text))){
      var target=path.resolve(root,path.dirname(f),m[1]);
      check(target.indexOf(path.join(root,folder)+path.sep)===0,f+': require('+JSON.stringify(m[1])+') leaves '+folder+', and each folder is its own submission');
    }
  });
});
['.claude-plugin/plugin.json','README.md','LICENSE.md','NOTICE','server.js','crew-lib.js','providers.json'].forEach(function(f){
  check(exists('plugins/combat-writing-crew/'+f),'crew: '+f+' is missing from the add-on\'s folder, which is submitted on its own');
});
var crewReadme=read('plugins/combat-writing-crew/README.md');
var crewWords=crewReadme.replace(/```[\s\S]*?```/g,' ').replace(/<!--[\s\S]*?-->/g,' ').split(/\s+/).filter(function(w){return /[A-Za-z0-9]/.test(w);}).length;
check(crewWords>40,'crew README: '+crewWords+' words outside code blocks, the directory needs more than 40');

// The add-on's road to the directory (PLAN.md Part 107, issue 221): no file that speaks for the
// add-on says it is not listed.
var ROAD=['.claude-plugin/marketplace.json','plugins/combat-writing-crew/.claude-plugin/plugin.json','plugins/combat-writing-crew/README.md','docs/directory-checklist.md','docs/directory-checklist-crew.md','CLAUDE.md'];
var NOT_LISTED=[/\b(?:not|never) listed\b/i,/\bunlisted (?:plugin|add-on)\b/i,/\b(?:not|never) submitted\b/i,/\bnot in the Claude plugin directory\b/i,/\bonly `?plugins\/combat-writing`? is submitted\b/i,/\bthe directory never scans\b/i];
// The one sentence that keeps the words: under /mcp, "not listed" is a server missing from that list.
var MCP_LIST=[/if it is not listed, `?\/plugin`?/g,/not listed means `?\/plugin`?/g];
ROAD.forEach(function(f){
  check(exists(f),f+': missing');
  if(!exists(f))return;
  read(f).split('\n').forEach(function(line,i){
    var bare=line.replace(/\*\*/g,'');
    MCP_LIST.forEach(function(re){ bare=bare.replace(re,' '); });
    NOT_LISTED.forEach(function(re){
      var m=re.exec(bare);
      check(!m,f+':'+(i+1)+': says the add-on is not listed ("'+(m?m[0]:'')+'"): '+bare.trim().slice(0,110));
    });
  });
});
// The listing text, the add-on's manifest description and its README, says Claude Code plainly.
var crewListing={'crew manifest description':String(crew.description||''),'crew README':crewReadme};
Object.keys(crewListing).forEach(function(k){
  var t=crewListing[k].replace(/\*\*/g,'');
  check(/Claude Code/.test(t)&&/ignored in chat on claude\.ai/.test(t)&&/loads in the desktop app only on your own computer/.test(t),k+': should say Claude Code plainly: a local MCP server is ignored in chat on claude.ai and loads in the desktop app only on your own computer');
  check(!/\blisted plugin\b/i.test(t),k+': names cw as "the listed plugin", which says this one is not');
});
check(/masked prompt/i.test(crewReadme)&&/environment variable/i.test(crewReadme)&&/key file/i.test(crewReadme),'crew README: should name the three key routes: the masked prompt, the environment variable, the key file');
check(/key file exists[^.]*survives a host update/i.test(crewReadme.replace(/\*\*/g,'')),'crew README: should say why the key file exists: it is the route that survives a host update');
if(market){
  var cwEntry=(market.plugins||[]).filter(function(p){return p.name==='cw';})[0]||{};
  check(/combat-writing-crew/.test(cwEntry.description||'')&&/\bcrew\b/.test(cwEntry.description||'')&&/add-on/.test(cwEntry.description||''),'marketplace: the cw entry\'s description should name the add-on, combat-writing-crew, as its crew');
}
var claudeMd=read('CLAUDE.md');
check(/submitted to the Claude plugin directory as a second bundle/.test(claudeMd),'CLAUDE.md: the add-on rule should say the add-on is submitted to the Claude plugin directory as a second bundle');
var mainPage=read('docs/directory-checklist.md');
var addonRow=mainPage.split('\n').filter(function(l){return /^\| The add-on's keys \|/.test(l);})[0]||'';
check(!!addonRow,'docs/directory-checklist.md: the row "The add-on\'s keys" is missing');
check(!!addonRow&&!/^n\/a/i.test((addonRow.split('|')[2]||'').trim()),'docs/directory-checklist.md: the row "The add-on\'s keys" still reads n/a');
check(/docs\/directory-checklist-crew\.md/.test(mainPage),'docs/directory-checklist.md: should point at the add-on\'s own page, docs/directory-checklist-crew.md');

// docs/directory-checklist-crew.md: the add-on's own pass, row by row. The counts are the published
// checklist's rows per section as read on the day of the pass; they move when the page is re-passed.
var CREW_PAGE=[
  ['Repository and folder layout',9],
  ['Manifest and plugin name',8],
  ['README and license',2],
  ['Files in the plugin folder',5],
  ['What the plugin runs and connects to',9],
  ['Choices a reviewer always checks',3],
  ['Hooks, skills, commands and agents',4],
  ['The security scan',3],
  ['The three key routes',3]
];
if(exists('docs/directory-checklist-crew.md')){
  var page=read('docs/directory-checklist-crew.md');
  check(/claude\.com\/docs\/plugins\/pre-submission-checklist/.test(page)&&/claude\.com\/docs\/plugins\/submit/.test(page),'crew checklist: should name the two published pages it was read against');
  check(/plugins\/combat-writing-crew/.test(page),'crew checklist: should name the folder it passes');
  // The rows of each section: table lines under a "## " heading, the header and the rule dropped.
  var sections={}, order=[], current=null, seenRule=false;
  page.split('\n').forEach(function(line){
    var h=/^## (.+?)\s*$/.exec(line);
    if(h){ current=h[1]; sections[current]=[]; order.push(current); seenRule=false; return; }
    if(!current||!/^\|/.test(line)){ if(!/^\|/.test(line))seenRule=false; return; }
    if(/^\|\s*:?-+/.test(line)){ seenRule=true; return; }
    if(seenRule)sections[current].push(line);
  });
  var tabled=order.filter(function(n){return sections[n].length>0;});
  check(tabled.join(' / ')===CREW_PAGE.map(function(e){return e[0];}).join(' / '),'crew checklist: the sections with rows are '+tabled.join(' / ')+', expected '+CREW_PAGE.map(function(e){return e[0];}).join(' / '));
  CREW_PAGE.forEach(function(e){
    var rows=sections[e[0]]||[];
    check(rows.length===e[1],'crew checklist: "'+e[0]+'" has '+rows.length+' rows, the checklist has '+e[1]);
    rows.forEach(function(row){
      var cells=row.split('|').map(function(c){return c.trim();});
      var item=(cells[1]||'').slice(0,60), result=cells[2]||'';
      check(cells.length>=5&&cells[1]&&cells[3],'crew checklist: a row of "'+e[0]+'" lacks an item or what shows it: '+item);
      check(/^(pass|HELD|n\/a)(?![A-Za-z])/.test(result),'crew checklist: the row "'+item+'" reads "'+result+'", expected pass, HELD or n/a');
      var bare=row.replace(/LicenseRef-PolyForm-Shield-1\.0\.0|PolyForm[ -]Shield[ -]1\.0\.0/g,' ');
      check(!/\b\d{4}-\d{2}-\d{2}\b/.test(bare)&&!/\b\d+\.\d+\.\d+\b/.test(bare),'crew checklist: the row "'+item+'" carries a date or a version; the number lives in the file or test the row names');
    });
  });
  function resultOf(rows,re){ var r=(rows||[]).filter(function(l){return re.test(l);})[0]; return r?(r.split('|')[2]||'').trim():'(no such row)'; }
  var runs=sections['What the plugin runs and connects to'], routes=sections['The three key routes'];
  check(/^HELD/.test(resultOf(runs,/already set in the (?:user|person)'s environment/)),'crew checklist: the row on a credential already set in the environment reads "'+resultOf(runs,/already set in the (?:user|person)'s environment/)+'", expected HELD');
  check(/^pass/.test(resultOf(routes,/^\| The masked prompt/)),'crew checklist: the masked prompt reads "'+resultOf(routes,/^\| The masked prompt/)+'", expected pass');
  check(/^HELD/.test(resultOf(routes,/^\| The environment variable/)),'crew checklist: the environment variable reads "'+resultOf(routes,/^\| The environment variable/)+'", expected HELD');
  check(/^HELD/.test(resultOf(routes,/^\| The owner-only key file/)),'crew checklist: the owner-only key file reads "'+resultOf(routes,/^\| The owner-only key file/)+'", expected HELD');
}

// claude plugin validate --strict, when the CLI is here.
var which=cp.spawnSync(process.platform==='win32'?'where':'which',['claude'],{encoding:'utf8'});
if(which.status===0){
  ['.','plugins/combat-writing','plugins/combat-writing-crew','plugins/combat-writing/agents','plugins/combat-writing/skills'].forEach(function(dir){
    var r=cp.spawnSync('claude',['plugin','validate','--strict',dir],{cwd:root,encoding:'utf8'});
    check(r.status===0,'claude plugin validate --strict '+dir+': exit '+r.status+'\n'+(r.stdout||'').split('\n').filter(function(l){return /✘|›|❯|error|warning/i.test(l);}).join('\n'));
  });
}else console.log('note: claude CLI not on PATH; the validate step was skipped here (CI runs it)');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'marketplace_check: '+failures.length+' failure(s), ':'marketplace_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
