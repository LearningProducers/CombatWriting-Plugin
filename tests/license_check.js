// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// license_check.js: every file carries the right license header for its path,
// and the repository meets the licensing and directory rules in CLAUDE.md.
//
// What it pins:
//   - Every file that can carry a comment has exactly one SPDX-License-Identifier
//     header: on line 1 for a plain file, or on the line after the closing ---
//     for a Markdown file that opens with YAML frontmatter. A skill, command or
//     agent file must open with frontmatter on line 1. The identifier
//     matches the path rule: docs/** and plugins/*/method/** are CC-BY-NC-SA-4.0;
//     everything else is LicenseRef-PolyForm-Shield-1.0.0. JSON files, NOTICE
//     files, LICENSES/, plugins/*/LICENSE*, images and fonts carry no header.
//     No file carries two.
//   - The CC prose shipped inside the plugin (plugins/combat-writing/method/*.md)
//     is byte-identical to its mirror under docs/.
//   - NOTICE holds every ruled line: the Required Notice, the Licensor Line of
//     Business naming the plugin, training and writing-analysis services, the CC
//     attribution designation with the canonical URL, the internal-use paragraph
//     with no permission to sell, and the brand statement granting no trademark
//     license. The plugin folder's NOTICE and LICENSE.md are byte-identical to
//     the root NOTICE and the root Shield text.
//   - Both texts in LICENSES/ match the SHA-256 of their sources.
//   - Every README contains the trademark sign and "source-available". No file
//     the directory or a reader sees says "open source"; only CLAUDE.md, this
//     file and the license texts may contain the phrase, because they state or
//     carry the rule.
//   - Every file that is not an image or a font is under 256 KiB.
//   - No lockfile beside a package.json at the repository root or a plugin root.
//   - No bin/ at the repository root or a plugin root.
//   - plugin.json's license field is the Shield identifier; marketplace.json
//     names both combat-writing and combat-writing-crew.
//
// Run from the repo root:   node tests/license_check.js
// Optional first argument: a path to a different repository root to check.
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), crypto=require('crypto'), cp=require('child_process');
var root=path.resolve(process.argv[2]||path.join(__dirname,'..'));

var SHIELD='LicenseRef-PolyForm-Shield-1.0.0';
var CC='CC-BY-NC-SA-4.0';
var SIZE_LIMIT=256*1024;
var LICENSE_HASHES={
  'LICENSES/LicenseRef-PolyForm-Shield-1.0.0.md':'56328093d57c87dcf2811ddcc824caf2723a07ffc332e6fbe4f9f108a2893a91', // polyformproject/polyform-licenses @ 76a278c
  'LICENSES/CC-BY-NC-SA-4.0.txt':'600ca4e25fe11762b75a97e714707fab48bb778374e92d24c6ca068791661c11'                // spdx/license-list-data @ 31ba1a5
};
var IMAGE_OR_FONT=/\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|eot)$/i;
var LOCKFILES=['package-lock.json','npm-shrinkwrap.json','yarn.lock','pnpm-lock.yaml','bun.lock','bun.lockb'];

var failures=[], passes=0;
function fail(msg){failures.push(msg);}
function ok(){passes++;}
function check(cond,msg){ if(cond)ok(); else fail(msg); }
function read(rel){ return fs.readFileSync(path.join(root,rel),'utf8'); }
function exists(rel){ return fs.existsSync(path.join(root,rel)); }
function sha256(rel){ return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex'); }

// The file list: git's, so untracked scratch is not scanned; a walk when git is absent.
function listFiles(){
  try{
    var out=cp.execFileSync('git',['-C',root,'ls-files','-z'],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
    var files=out.split('\0').filter(Boolean).filter(function(f){return fs.existsSync(path.join(root,f));});
    if(files.length)return files;
  }catch(e){}
  var acc=[];
  (function walk(dir){
    fs.readdirSync(path.join(root,dir),{withFileTypes:true}).forEach(function(d){
      var rel=dir?dir+'/'+d.name:d.name;
      if(d.isDirectory()){ if(d.name==='.git'||d.name==='node_modules')return; walk(rel); }
      else acc.push(rel);
    });
  })('');
  return acc;
}
var files=listFiles();

// Which identifier a path must carry, or null when it carries none.
function expectedId(rel){
  var base=path.basename(rel);
  if(/\.json$/i.test(base))return null;
  if(base==='NOTICE')return null;
  if(rel.indexOf('LICENSES/')===0)return null;
  if(/^plugins\/[^/]+\/LICENSE(\.[a-z]+)?$/i.test(rel))return null;
  if(IMAGE_OR_FONT.test(base))return null;
  if(rel.indexOf('docs/')===0)return CC;
  if(/^plugins\/[^/]+\/method\//.test(rel))return CC;
  return SHIELD;
}
var HEADER_RE=/^\s*(\/\/|#|<!--|\*|;)?\s*SPDX-License-Identifier:\s*(\S+)/;

files.forEach(function(rel){
  var want=expectedId(rel);
  var buf=fs.readFileSync(path.join(root,rel));
  if(!IMAGE_OR_FONT.test(rel))check(buf.length<SIZE_LIMIT,rel+': '+buf.length+' bytes, limit '+SIZE_LIMIT);
  var text=buf.toString('utf8');
  var lines=text.split('\n');
  var headers=[];
  lines.forEach(function(l,i){ var m=HEADER_RE.exec(l); if(m)headers.push({line:i+1,id:m[2].replace(/\s*-->\s*$/,'')}); });
  if(want===null){
    check(headers.length===0,rel+': carries a header but its kind takes none');
    return;
  }
  if(headers.length!==1){ fail(rel+': expected exactly one SPDX-License-Identifier header, found '+headers.length); return; }
  // Line 1 for a plain file. For a Markdown file that opens with YAML frontmatter, the
  // line after the closing ---, because the loader reads frontmatter only on line 1.
  var wantLine=1;
  var isComponent=/^plugins\/[^/]+\/(skills|commands|agents)\/.+\.md$/.test(rel);
  if(isComponent&&lines[0].replace(/\r$/,'')!=='---'){ fail(rel+': a skill, command or agent file must open with YAML frontmatter on line 1; the header goes after it'); return; }
  if(lines[0].replace(/\r$/,'')==='---'){
    var close=-1;
    for(var i=1;i<lines.length;i++){ if(lines[i].replace(/\r$/,'')==='---'){close=i;break;} }
    if(close<0){ fail(rel+': frontmatter opened on line 1 but never closed'); return; }
    wantLine=close+2;
  }
  check(headers[0].line===wantLine,rel+': header on line '+headers[0].line+', must be on line '+wantLine+(wantLine===1?'':' (the line after the closing ---)'));
  check(headers[0].id===want,rel+': header says '+headers[0].id+', path rule says '+want);
});

// NOTICE: every ruled line, and the plugin copies identical.
var notice=exists('NOTICE')?read('NOTICE'):'';
check(notice.length>0,'NOTICE: missing');
check(notice.indexOf('Required Notice: Combat Writing — Learning Producers Inc., Israel Hernandez, founder')>=0,'NOTICE: Required Notice line missing or changed');
var lob=notice.split('\n').filter(function(l){return l.indexOf('Licensor Line of Business:')===0;})[0]||'';
check(lob.length>0,'NOTICE: Licensor Line of Business line missing');
['plugin','training','writing-analysis'].forEach(function(w){ check(lob.indexOf(w)>=0,'NOTICE: Licensor Line of Business does not mention "'+w+'"'); });
check(notice.indexOf('https://combatwriting.learningproducers.com')>=0,'NOTICE: canonical URL missing');
check(/Attribution designation/i.test(notice)&&/CC BY-NC-SA 4\.0/.test(notice),'NOTICE: CC attribution designation missing');
check(/internal use/i.test(notice),'NOTICE: internal-use permission missing');
check(/does not include selling/i.test(notice)&&/paid product/i.test(notice),'NOTICE: the no-sale sentence missing');
check(/brand of Learning Producers Inc\./.test(notice)&&/No trademark license is granted/.test(notice),'NOTICE: brand statement missing');
check(/does not claim ownership of the method as a process/.test(notice),'NOTICE: the process disclaimer missing');
var pluginRoots=files.map(function(f){var m=/^(plugins\/[^/]+)\//.exec(f);return m?m[1]:null;}).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;});
check(pluginRoots.indexOf('plugins/combat-writing')>=0,'plugins/combat-writing: missing');
check(exists('plugins/combat-writing/NOTICE')&&read('plugins/combat-writing/NOTICE')===notice,'plugins/combat-writing/NOTICE: missing or differs from the root NOTICE');
check(exists('plugins/combat-writing/LICENSE.md')&&exists('LICENSES/LicenseRef-PolyForm-Shield-1.0.0.md')&&sha256('plugins/combat-writing/LICENSE.md')===sha256('LICENSES/LicenseRef-PolyForm-Shield-1.0.0.md'),'plugins/combat-writing/LICENSE.md: missing or differs from the root Shield text');

// The CC prose shipped inside the plugin is mirrored under docs/, byte for byte.
files.filter(function(f){return /^plugins\/combat-writing\/method\/.+\.md$/.test(f);}).forEach(function(rel){
  var mirror='docs/'+path.basename(rel);
  check(exists(mirror)&&sha256(mirror)===sha256(rel),rel+': docs/ mirror '+mirror+' missing or differs');
});

// LICENSES/: both texts verbatim.
Object.keys(LICENSE_HASHES).forEach(function(rel){
  check(exists(rel)&&sha256(rel)===LICENSE_HASHES[rel],rel+': missing or its SHA-256 differs from the source text');
});

// READMEs and the phrase rules.
var readmes=files.filter(function(f){return /(^|\/)README\.md$/.test(f);});
check(readmes.indexOf('README.md')>=0,'README.md: missing at the root');
check(readmes.indexOf('plugins/combat-writing/README.md')>=0,'plugins/combat-writing/README.md: missing');
readmes.forEach(function(rel){
  var t=read(rel);
  check(t.indexOf('™')>=0,rel+': no ™ on the name');
  check(/source-available/i.test(t),rel+': does not say "source-available"');
});
var OPEN_SOURCE=/open[\s-]source/i;
files.forEach(function(rel){
  if(rel==='CLAUDE.md'||rel==='tests/license_check.js'||rel.indexOf('LICENSES/')===0)return;
  if(/^plugins\/[^/]+\/LICENSE(\.[a-z]+)?$/i.test(rel))return;
  if(IMAGE_OR_FONT.test(rel))return;
  check(!OPEN_SOURCE.test(read(rel)),rel+': says "open source"');
});
// The plugin README: over 40 words outside code blocks (a directory rule).
if(exists('plugins/combat-writing/README.md')){
  var prose=read('plugins/combat-writing/README.md').replace(/```[\s\S]*?```/g,' ').replace(/<!--[\s\S]*?-->/g,' ');
  var words=prose.split(/\s+/).filter(Boolean).length;
  check(words>40,'plugins/combat-writing/README.md: '+words+' words outside code blocks, needs more than 40');
}

// Lockfiles and bin/ at the repository root and at every plugin root.
['', 'plugins/combat-writing', 'plugins/combat-writing-crew'].concat(pluginRoots).filter(function(v,i,a){return a.indexOf(v)===i;}).forEach(function(dir){
  var p=function(n){return dir?dir+'/'+n:n;};
  if(exists(p('package.json'))){
    LOCKFILES.forEach(function(l){ check(!exists(p(l)),p(l)+': lockfile beside package.json'); });
  }
  check(!exists(p('bin')),p('bin')+': bin/ is not allowed here');
});

// Manifests.
if(exists('plugins/combat-writing/.claude-plugin/plugin.json')){
  var manifest=JSON.parse(read('plugins/combat-writing/.claude-plugin/plugin.json'));
  check(manifest.name==='combat-writing','plugin.json: name is '+manifest.name);
  check(manifest.license===SHIELD,'plugin.json: license field is '+manifest.license+', expected '+SHIELD);
  check(manifest.author&&manifest.author.name==='Learning Producers Inc.','plugin.json: author is not Learning Producers Inc.');
}else fail('plugins/combat-writing/.claude-plugin/plugin.json: missing');
if(exists('.claude-plugin/marketplace.json')){
  var market=JSON.parse(read('.claude-plugin/marketplace.json'));
  var names=(market.plugins||[]).map(function(p){return p.name;});
  check(names.indexOf('combat-writing')>=0,'marketplace.json: does not name combat-writing');
  check(names.indexOf('combat-writing-crew')>=0,'marketplace.json: does not name combat-writing-crew');
}else fail('.claude-plugin/marketplace.json: missing');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'license_check: '+failures.length+' failure(s), ':'license_check: all passed, ')+passes+' checks over '+files.length+' files');
process.exit(failures.length?1:0);
