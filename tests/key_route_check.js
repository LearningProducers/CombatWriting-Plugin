// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// key_route_check.js: what a shipped file or a public page tells a person about where the
// add-on finds a key. The add-on's keyFor reads the masked prompt's value, then the person's
// own key file, and no variable of the shell. A sentence that names a shell variable as a way
// to give a key sends a person down a road that seats nothing.
//
// Read: the text files under plugins/, the Markdown files under docs/, and README.md,
// PRIVACY.md and SUPPORT.md at the root.
//
// 1. THE NAME. A paragraph that holds a provider's key name (the key_name values of
//    providers.json, GROQ_API_KEY and the rest) must also name the key file, or say the name is
//    not read. In a Markdown file a paragraph is a line; in any other file it is the line and
//    the two lines above it. The key_name lines of providers.json are the names' home.
// 2. THE WORDS. A sentence that holds "environment variable" must name a variable the shipped
//    code reads (the process.env reads under plugins/, the prompt variables of providers.json,
//    CLAUDE_PLUGIN_ROOT), or say that none is read, or name no variable and no key.
// 3. THE COMMAND. Each `/plugin configure combat-writing-crew` is the bare command the add-on
//    prints (CONFIGURE_COMMAND in crew-lib.js, ADDON_CONFIGURE in lib.js), with no marketplace
//    after it: an install from the directory is under no marketplace of this repository's.
// The test finds these shapes and no others: a false sentence in another shape passes it.
//
//   node tests/key_route_check.js        (from the repository root; exit 0 pass, 1 fail)

var fs=require('fs'), path=require('path');
var root=path.resolve(__dirname,'..');
var failures=[], checks=0;
function check(ok,msg){ checks+=1; if(!ok)failures.push(msg); }
function read(rel){ return fs.readFileSync(path.join(root,rel),'utf8'); }

var SKIP_DIR={'node_modules':1,'.git':1,'.claude':1,'results':1};
var TEXT=/\.(md|js|json|txt|html|css|yml|yaml)$/;
function walk(rel,keep){ var out=[]; fs.readdirSync(path.join(root,rel)).sort().forEach(function(n){ if(SKIP_DIR[n])return; var r=rel+'/'+n, st=fs.statSync(path.join(root,r)); if(st.isDirectory())out=out.concat(walk(r,keep)); else if(keep.test(n))out.push(r); }); return out; }
var files=walk('plugins',TEXT).concat(walk('docs',/\.md$/),['README.md','PRIVACY.md','SUPPORT.md']);
check(files.length>40&&files.indexOf('plugins/combat-writing/scripts/lib.js')>=0&&files.indexOf('plugins/combat-writing/skills/help/SKILL.md')>=0&&files.indexOf('plugins/combat-writing-crew/README.md')>=0,'the walk found '+files.length+' files and must hold the scripts, the skills and the add-on\'s README');

var providers=JSON.parse(read('plugins/combat-writing-crew/providers.json')).providers||[];
var keyNames=providers.map(function(p){return p.key_name;}).filter(Boolean);
var promptVars=providers.map(function(p){return p.key_prompt_env;}).concat(providers.map(function(p){return p.model_prompt_env;}),providers.map(function(p){return p.model_env;})).filter(Boolean);
check(keyNames.length>=6&&keyNames.indexOf('GROQ_API_KEY')>=0,'providers.json must name the providers\' key names, got '+keyNames.join(', '));

// The variables the shipped code reads, by name.
var readVars=['CLAUDE_PLUGIN_ROOT'].concat(promptVars);
walk('plugins',/\.js$/).forEach(function(f){ (read(f).match(/process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g)||[]).forEach(function(m){ var v=m.slice(12); if(readVars.indexOf(v)<0)readVars.push(v); }); });
check(readVars.indexOf('CLAUDE_PLUGIN_DATA')>=0&&readVars.indexOf('HOME')>=0&&keyNames.every(function(k){return readVars.indexOf(k)<0;}),'the shipped code must read CLAUDE_PLUGIN_DATA and HOME by name and no provider\'s key name; it reads '+readVars.join(', '));

var FILE_NAMED=/\.combat-writing\/keys|\bkey file\b/;
var NOT_READ=/\b(is|are) not read\b|\bnever read\b|\bno key, ever\b/;

files.forEach(function(f){
  var text=read(f), lines=text.split('\n'), md=/\.md$/.test(f);
  // 1. THE NAME.
  lines.forEach(function(l,i){
    var named=keyNames.filter(function(k){ return new RegExp('\\b'+k+'\\b').test(l); });
    if(!named.length)return;
    if(f==='plugins/combat-writing-crew/providers.json'&&/^\s*"key_name":/.test(l))return;
    var para=md?l:lines.slice(Math.max(0,i-2),i+1).join(' ');
    check(FILE_NAMED.test(para)||NOT_READ.test(para),f+':'+(i+1)+': names '+named[0]+' with no key file beside it and no word that it is not read: '+l.trim().slice(0,120));
  });
  // 2. THE WORDS. Comment marks are dropped and the lines joined, so a wrapped sentence is one.
  var flat=md?text:text.replace(/\n\s*\/\/ ?/g,' ');
  flat.split(/(?<=[.!?])\s+(?=[A-Z`*(\[])|\n/).forEach(function(s){
    if(!/environment variables?\b/i.test(s))return;
    var caps=s.match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b|\bHOME\b|\bPATH\b/g)||[];
    var names=caps.length>0, real=caps.every(function(c){ return readVars.indexOf(c)>=0||c==='PATH'; });
    var none=/\b(no|neither|not|never)\b/i.test(s);
    var aboutKey=/\bkeys?\b|\bprovider|\bprompt\b/i.test(s);
    check(names?real||none:none||!aboutKey,f+': a sentence names an environment variable the code does not read, as a way to give a key: '+s.trim().slice(0,150));
  });
  // 3. THE COMMAND.
  lines.forEach(function(l,i){
    var at=l.indexOf('/plugin configure combat-writing-crew');
    while(at>=0){ var next=l.charAt(at+37); check(next!=='@',f+':'+(i+1)+': the configure command carries a marketplace; the add-on prints it bare'); at=l.indexOf('/plugin configure combat-writing-crew',at+37); }
  });
});
check(/^var CONFIGURE_COMMAND='\/plugin configure combat-writing-crew';$/m.test(read('plugins/combat-writing-crew/crew-lib.js'))&&/^var ADDON_CONFIGURE='\/plugin configure combat-writing-crew';$/m.test(read('plugins/combat-writing/scripts/lib.js')),'crew-lib.js CONFIGURE_COMMAND and lib.js ADDON_CONFIGURE must both be the bare /plugin configure combat-writing-crew');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log(failures.length?'key_route_check: '+failures.length+' of '+checks+' checks failed':'key_route_check: all passed, '+checks+' checks');
process.exit(failures.length?1:0);
