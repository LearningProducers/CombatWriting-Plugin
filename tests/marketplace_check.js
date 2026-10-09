// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// marketplace_check.js: the marketplace names both plugins, each entry points at a folder
// that holds a manifest with the same name and version, and the add-on's manifest declares
// its MCP server and its masked key prompts the way the rulings require.
//
// What it pins:
//   - .claude-plugin/marketplace.json parses, is named learning-producers, names an owner,
//     and lists exactly combat-writing and combat-writing-crew, each with a relative source
//     under ./plugins/ that exists and holds .claude-plugin/plugin.json whose name and
//     version match the entry.
//   - The add-on's manifest declares one stdio MCP server started with node on a file inside
//     the plugin (${CLAUDE_PLUGIN_ROOT}/server.js, plain arguments, no shell), every key
//     option is a string with sensitive: true and no default, every env value in the server
//     entry is a ${user_config.<option>} reference to a declared option, and no value in the
//     manifest looks like a credential.
//   - The listed plugin's manifest declares no MCP server, no hooks field and no userConfig,
//     and the folder has no .mcp.json: it holds no keys and makes no outside call. Its one
//     hook file, hooks/hooks.json (the session-start line, ruled 2026-10-09), is pinned by
//     tests/hook_check.js.
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

var market=null;
try{market=JSON.parse(read('.claude-plugin/marketplace.json'));}catch(e){failures.push('marketplace.json: '+e.message);}
if(market){
  check(market.name==='learning-producers','marketplace: name is '+market.name);
  check(market.owner&&market.owner.name==='Learning Producers Inc.','marketplace: owner missing');
  var names=(market.plugins||[]).map(function(p){return p.name;}).sort();
  check(names.join(',')==='combat-writing,combat-writing-crew','marketplace: plugins are '+names.join(','));
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
var manifestText=read('plugins/combat-writing-crew/.claude-plugin/plugin.json')+read('plugins/combat-writing-crew/providers.json');
check(!/\b(sk|gsk|xai|pplx)[-_][A-Za-z0-9]{16,}/.test(manifestText),'crew: something that looks like a credential appears in the manifest or provider table');
check(!crew.hooks&&!crew.commands&&!crew.agents,'crew manifest: the add-on should declare no hooks, commands or agents');

// The listed plugin holds no keys and makes no outside call.
var listed=JSON.parse(read('plugins/combat-writing/.claude-plugin/plugin.json'));
check(!listed.mcpServers&&!listed.hooks&&!listed.userConfig,'listed manifest: must declare no MCP server, hooks field or userConfig');
check(!exists('plugins/combat-writing/.mcp.json'),'listed plugin: must have no .mcp.json');
check(exists('tests/hook_check.js'),'listed plugin: hooks/ is pinned by tests/hook_check.js, which is missing');
var listedScripts=fs.readdirSync(path.join(root,'plugins/combat-writing/scripts')).map(function(f){return read('plugins/combat-writing/scripts/'+f);}).join('\n');
check(!/require\(['"](https?|net|dgram|child_process)['"]\)/.test(listedScripts)&&!/\bfetch\(/.test(listedScripts),'listed plugin: a script requires a network module or calls fetch');
check(!/https?:\/\//.test(listedScripts.replace(/\/\/[^\n]*/g,'')),'listed plugin: a script holds a URL outside a comment');

// claude plugin validate --strict, when the CLI is here.
var which=cp.spawnSync(process.platform==='win32'?'where':'which',['claude'],{encoding:'utf8'});
if(which.status===0){
  ['.','plugins/combat-writing','plugins/combat-writing-crew','plugins/combat-writing/commands','plugins/combat-writing/agents','plugins/combat-writing/skills'].forEach(function(dir){
    var r=cp.spawnSync('claude',['plugin','validate','--strict',dir],{cwd:root,encoding:'utf8'});
    check(r.status===0,'claude plugin validate --strict '+dir+': exit '+r.status+'\n'+(r.stdout||'').split('\n').filter(function(l){return /✘|›|❯|error|warning/i.test(l);}).join('\n'));
  });
}else console.log('note: claude CLI not on PATH; the validate step was skipped here (CI runs it)');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'marketplace_check: '+failures.length+' failure(s), ':'marketplace_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
