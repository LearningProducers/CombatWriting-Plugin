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
//   - The three texts in LICENSES/ match the SHA-256 of their sources (the OFL for the four
//     embedded faces, Part 106).
//   - A license text ships with what it covers, because an installer receives the plugin
//     folder alone: a plugin folder that holds a font holds LICENSES/OFL-1.1.txt, one that
//     holds method/ holds LICENSES/CC-BY-NC-SA-4.0.txt, each byte for byte the root text of
//     the same name, and no other file stands in a plugin's LICENSES/. The LICENSES/ path
//     the folder's NOTICE gives for each of those two texts is then a file in that folder
//     (for the Shield text the NOTICE itself names the folder's copy, LICENSE.md). The listed plugin's README
//     names the three licenses in its License section, each with the path of its text, and
//     every path it names there is a file in the folder.
//   - Every README contains the trademark sign and "source-available". No file
//     the directory or a reader sees says "open source"; only CLAUDE.md, this
//     file, readme_check.js and the license texts may contain the phrase,
//     because they state or carry the rule.
//   - Every file that is not an image or a font is under 256 KiB.
//   - No lockfile beside a package.json at the repository root or a plugin root.
//   - No bin/ at the repository root or a plugin root.
//   - plugin.json's license field is the Shield identifier; marketplace.json
//     names both combat-writing and combat-writing-crew.
//
//   - Every skill, command and agent file found on disk under a plugin folder has a header
//     (the YAML frontmatter) that a strict YAML reader reads: one `key: value` per line, the
//     value a plain or a quoted scalar. A plain value may not hold a colon followed by a space,
//     a space followed by #, or a tab, may not end with a colon, and may not open with an
//     indicator ([ { ] } , # & * ! | > % @ ` ' " or - ? : before a space); a quoted value must
//     close, with nothing after it but a comment. `description` and `argument-hint` must be
//     text, never a value YAML reads as a number, a truth value or null. The reader is this
//     file's own (headerProblems, no dependency) and is narrower than YAML: a list, a block
//     scalar or an indented line is refused as outside what it reads. The fixtures under it
//     run on every pass, one per refused shape, so the reader cannot go soft unseen. The
//     folders are walked on disk, so a new skill file is covered with no edit here.
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
  'LICENSES/CC-BY-NC-SA-4.0.txt':'600ca4e25fe11762b75a97e714707fab48bb778374e92d24c6ca068791661c11',               // spdx/license-list-data @ 31ba1a5
  'LICENSES/OFL-1.1.txt':'3c17a8394f32ef59bcf50896331249c22a4a4b9c53a5c6d5b9b88464b1c77239'                       // google/fonts ofl/inter/OFL.txt from its third line (the license text; each font's copyright line is in NOTICE)
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
      if(d.isDirectory()){ if(d.name==='.git'||d.name==='node_modules'||d.name==='.venv'||d.name==='__pycache__')return; walk(rel); }
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
  // The screen's generated lock and its Python version pin carry none (Part 44): uv rewrites
  // uv.lock, and .python-version is one bare line uv reads. Its .py, .toml and .tcss files
  // carry the Shield header like every other executable file.
  if(base==='uv.lock'||base==='.python-version')return null;
  if(rel.indexOf('LICENSES/')===0)return null;
  if(/^plugins\/[^/]+\/LICENSES\//.test(rel))return null;
  if(/^plugins\/[^/]+\/LICENSE(\.[a-z]+)?$/i.test(rel))return null;
  if(IMAGE_OR_FONT.test(base))return null;
  if(rel.indexOf('docs/')===0)return CC;
  if(/^plugins\/[^/]+\/method\//.test(rel))return CC;
  return SHIELD;
}
var HEADER_RE=/^\s*(\/\/|#|<!--|\/\*|\*|;)?\s*SPDX-License-Identifier:\s*(\S+)/;

files.forEach(function(rel){
  var want=expectedId(rel);
  var buf=fs.readFileSync(path.join(root,rel));
  if(!IMAGE_OR_FONT.test(rel))check(buf.length<SIZE_LIMIT,rel+': '+buf.length+' bytes, limit '+SIZE_LIMIT);
  var text=buf.toString('utf8');
  var lines=text.split('\n');
  var headers=[];
  lines.forEach(function(l,i){ var m=HEADER_RE.exec(l); if(m)headers.push({line:i+1,id:m[2].replace(/\s*(-->|\*\/)\s*$/,'')}); });
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

// The headers of the skill, command and agent files: read as a strict YAML reader reads them.
// headerProblems takes the lines between the two --- lines and returns one line per problem.
var TEXT_KEYS=['description','argument-hint'];
var NOT_TEXT=/^(~|null|Null|NULL|true|True|TRUE|false|False|FALSE|[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?|0o[0-7]+|0x[0-9a-fA-F]+|[-+]?\.(inf|Inf|INF)|\.(nan|NaN|NAN))$/;
function scalarProblem(v){
  if(v==='')return null;
  var c=v.charAt(0), m;
  if(c==='"'){
    m=/^"((?:[^"\\]|\\.)*)"(.*)$/.exec(v);
    if(!m)return 'opens with a double quote that is never closed';
    if(m[2]!==''&&!/^ +#/.test(m[2])&&!/^ +$/.test(m[2]))return 'has text after the closing double quote';
    var esc=m[1].match(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/g)||[];
    for(var i=0;i<esc.length;i++)if(!/^\\(x..|u....|U........|[0abtnvfre "\/\\N_LP])$/.test(esc[i]))return 'holds the escape '+esc[i]+', which YAML does not have';
    return null;
  }
  if(c==="'"){
    m=/^'((?:[^']|'')*)'(.*)$/.exec(v);
    if(!m)return 'opens with a single quote that is never closed';
    if(m[2]!==''&&!/^ +#/.test(m[2])&&!/^ +$/.test(m[2]))return 'has text after the closing single quote';
    return null;
  }
  if('[]{},#&*!|>%@`'.indexOf(c)>=0)return 'is unquoted and opens with '+c;
  if((c==='-'||c==='?'||c===':')&&(v.length===1||v.charAt(1)===' '))return 'is unquoted and opens with '+c+' before a space';
  if(/: /.test(v))return 'is unquoted and holds a colon followed by a space';
  if(/:$/.test(v))return 'is unquoted and ends with a colon';
  if(/ #/.test(v))return 'is unquoted and holds a space followed by #';
  return null;
}
function headerProblems(lines){
  var out=[], seen={};
  lines.forEach(function(raw,i){
    var line=raw.replace(/\r$/,''), n=i+2;
    if(line.indexOf('\t')>=0){ out.push('line '+n+' holds a tab'); return; }
    if(/^\s*$/.test(line)||/^#/.test(line))return;
    var m=/^([A-Za-z0-9_][A-Za-z0-9_-]*):(?: (.*))?$/.exec(line);
    if(!m){ out.push('line '+n+' is not `key: value` on one line (a list, a block or an indented line is outside what this check reads)'); return; }
    var key=m[1], v=(m[2]||'').replace(/^ +/,'').replace(/ +$/,'');
    if(seen[key])out.push('line '+n+' repeats the key '+key);
    seen[key]=true;
    var p=scalarProblem(v);
    if(p){ out.push('line '+n+', '+key+': the value '+p); return; }
    if(TEXT_KEYS.indexOf(key)>=0&&v.charAt(0)!=='"'&&v.charAt(0)!=="'"&&(v===''||NOT_TEXT.test(v)))out.push('line '+n+', '+key+': the value is not text to a YAML reader ('+(v===''?'empty':v)+')');
  });
  return out;
}
// The component files, walked on disk: plugins/<name>/skills|commands|agents/**/*.md.
function componentFiles(){
  var acc=[];
  if(!exists('plugins'))return acc;
  fs.readdirSync(path.join(root,'plugins'),{withFileTypes:true}).filter(function(d){return d.isDirectory();}).forEach(function(pl){
    ['skills','commands','agents'].forEach(function(kind){
      (function walk(rel){
        if(!exists(rel))return;
        fs.readdirSync(path.join(root,rel),{withFileTypes:true}).forEach(function(d){
          if(d.isDirectory())walk(rel+'/'+d.name);
          else if(/\.md$/.test(d.name))acc.push(rel+'/'+d.name);
        });
      })('plugins/'+pl.name+'/'+kind);
    });
  });
  return acc.sort();
}
var components=componentFiles();
check(root!==path.resolve(__dirname,'..')||components.length>0,'plugins/: no skill, command or agent file found on disk');
components.forEach(function(rel){
  var lines=read(rel).split('\n');
  if(lines[0].replace(/\r$/,'')!=='---'){ fail(rel+': the header does not open on line 1'); return; }
  var close=-1;
  for(var i=1;i<lines.length;i++){ if(lines[i].replace(/\r$/,'')==='---'){close=i;break;} }
  if(close<0){ fail(rel+': the header opened on line 1 is never closed'); return; }
  var problems=headerProblems(lines.slice(1,close));
  check(problems.length===0,rel+': a strict YAML reader refuses the header: '+problems.join('; '));
});
// The fixtures: each refused shape, and the shapes that must be read. Invented text only.
[
  ['a colon followed by a space','description: Battle. One round: every seat answers'],
  ['a value that ends with a colon','description: the rounds are these:'],
  ['a value that opens with [','argument-hint: [all] [topic]'],
  ['a value that opens with {','argument-hint: {all}'],
  ['a value that opens with *','description: *bold* opening'],
  ['a value that opens with &','description: &anchor text'],
  ['a value that opens with !','description: !tagged text'],
  ['a value that opens with |','argument-hint: | all'],
  ['a value that opens with >','argument-hint: > all'],
  ['a value that opens with %','description: %percent first'],
  ['a value that opens with @','description: @seat first'],
  ['a value that opens with a backtick','description: `fq:` puts one question'],
  ['a double quote never closed','description: "an opening quote with no end'],
  ['a single quote never closed','description: \'an opening quote with no end'],
  ['a double quote closed before the end','description: "closed early" and more text'],
  ['a single quote closed by a lone quote inside','description: \'the seat\'s answer\''],
  ['a space followed by #','description: the draft #2 is read'],
  ['a tab','description: one\ttab inside'],
  ['a tab inside quotes on the line','description: "one\ttab inside"'],
  ['an escape YAML does not have','description: "a \\q escape"'],
  ['a dash before a space','description: - a list item'],
  ['a question mark before a space','description: ? a key'],
  ['a key twice','name: a\nname: b'],
  ['an indented line','description: first line\n  second line'],
  ['a block scalar','description: >-\n  folded text'],
  ['a line with no key','just words'],
  ['a description YAML reads as a number','description: 42'],
  ['an argument-hint YAML reads as null','argument-hint: ~'],
  ['an empty description','description:']
].forEach(function(f){
  check(headerProblems(f[1].split('\n')).length>0,'the header reader passes a fixture it must refuse: '+f[0]);
});
[
  ['a plain value','description: A seat reads one packet, rates it 1 to 10 and saves its answer.'],
  ['a colon with no space after it','description: the time is 10:30 and the path is a:b'],
  ['a # with no space before it','description: draft#2 and C# are read'],
  ['a double-quoted value holding every refused shape','description: "[all] {x} one: two #3 `fq:` \'s *b* @a %c"'],
  ['a single-quoted value with a doubled quote','description: \'the seat\'\'s answer: one line\''],
  ['a quoted value with a comment after it','argument-hint: "[all | topic]" # the two words'],
  ['YAML\'s own escapes','description: "a \\" quote, a \\\\ and \\u00e9"'],
  ['a quoted number is text','description: "42"'],
  ['other keys, a comment line and an empty value','name: seat\n# a comment\ntools: Read, Write\nmodel: inherit\nextra:']
].forEach(function(f){
  var p=headerProblems(f[1].split('\n'));
  check(p.length===0,'the header reader refuses a fixture it must read: '+f[0]+' ('+p.join('; ')+')');
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
// Every plugin folder with a manifest carries byte-identical copies of the root NOTICE and the Shield text,
// and its manifest's license field is the Shield identifier.
pluginRoots.filter(function(r){return exists(r+'/.claude-plugin/plugin.json');}).forEach(function(r){
  check(exists(r+'/NOTICE')&&read(r+'/NOTICE')===notice,r+'/NOTICE: missing or differs from the root NOTICE');
  check(exists(r+'/LICENSE.md')&&exists('LICENSES/LicenseRef-PolyForm-Shield-1.0.0.md')&&sha256(r+'/LICENSE.md')===sha256('LICENSES/LicenseRef-PolyForm-Shield-1.0.0.md'),r+'/LICENSE.md: missing or differs from the root Shield text');
  var m=JSON.parse(read(r+'/.claude-plugin/plugin.json'));
  check(m.license===SHIELD,r+'/.claude-plugin/plugin.json: license field is '+m.license+', expected '+SHIELD);
  check(m.author&&m.author.name==='Learning Producers Inc.',r+'/.claude-plugin/plugin.json: author is not Learning Producers Inc.');
});

// The CC prose shipped inside the plugin is mirrored under docs/, byte for byte.
files.filter(function(f){return /^plugins\/combat-writing\/method\/.+\.md$/.test(f);}).forEach(function(rel){
  var mirror='docs/'+path.basename(rel);
  check(exists(mirror)&&sha256(mirror)===sha256(rel),rel+': docs/ mirror '+mirror+' missing or differs');
});

// LICENSES/: both texts verbatim.
Object.keys(LICENSE_HASHES).forEach(function(rel){
  check(exists(rel)&&sha256(rel)===LICENSE_HASHES[rel],rel+': missing or its SHA-256 differs from the source text');
});

// A license text ships with what it covers: the copies inside a plugin folder, read on disk.
var FONT=/\.(woff2?|ttf|otf|eot)$/i;
function bytesEqual(a,b){ return exists(a)&&exists(b)&&fs.statSync(path.join(root,a)).isFile()&&fs.readFileSync(path.join(root,a)).equals(fs.readFileSync(path.join(root,b))); }
pluginRoots.filter(function(r){return exists(r+'/.claude-plugin/plugin.json');}).forEach(function(r){
  var inside=files.filter(function(f){return f.indexOf(r+'/')===0;});
  var needs=[];
  if(inside.some(function(f){return FONT.test(f);}))needs.push('OFL-1.1.txt');
  if(inside.some(function(f){return f.indexOf(r+'/method/')===0;}))needs.push('CC-BY-NC-SA-4.0.txt');
  needs.forEach(function(n){
    check(bytesEqual(r+'/LICENSES/'+n,'LICENSES/'+n),r+'/LICENSES/'+n+': missing or not byte for byte the root LICENSES/'+n+' (the folder holds what that text covers, and an installer receives the folder alone)');
  });
  var held=exists(r+'/LICENSES')?fs.readdirSync(path.join(root,r,'LICENSES')):[];
  held.forEach(function(n){
    check(bytesEqual(r+'/LICENSES/'+n,'LICENSES/'+n),r+'/LICENSES/'+n+': not byte for byte a text of the root LICENSES/');
  });
  // The folder's NOTICE, read from the folder: a LICENSES/ path it gives for a text the folder
  // needs is a file there. The Shield path is covered by its own words, "inside the plugin folder, in LICENSE.md".
  var named=(exists(r+'/NOTICE')?read(r+'/NOTICE'):'').match(/LICENSES\/[A-Za-z0-9._-]+\.(txt|md)/g)||[];
  named.filter(function(v,i,a){return a.indexOf(v)===i;}).forEach(function(n){
    if(needs.indexOf(n.slice('LICENSES/'.length))<0)return;
    check(exists(r+'/'+n),r+'/NOTICE names '+n+', and the folder holds no such file');
  });
});
// The listed plugin's README: its License section names the three licenses and where each text is.
if(exists('plugins/combat-writing/README.md')){
  var lic=(/\n## License\n([\s\S]*?)(\n## |$)/.exec(read('plugins/combat-writing/README.md'))||[])[1]||'';
  check(lic.length>0,'plugins/combat-writing/README.md: no License section');
  [['PolyForm Shield License 1.0.0','LICENSE.md'],['CC BY-NC-SA 4.0','LICENSES/CC-BY-NC-SA-4.0.txt'],['SIL Open Font License','LICENSES/OFL-1.1.txt']].forEach(function(p){
    check(lic.indexOf(p[0])>=0&&lic.indexOf('`'+p[1]+'`')>=0,'plugins/combat-writing/README.md: the License section does not name '+p[0]+' with its text at `'+p[1]+'`');
  });
  (lic.match(/`(LICENSE\.md|NOTICE|LICENSES\/[^`]+|method\/|fonts\/)`/g)||[]).forEach(function(q){
    var n=q.slice(1,-1);
    check(exists('plugins/combat-writing/'+n),'plugins/combat-writing/README.md: the License section names `'+n+'`, and the folder holds no such path');
  });
}

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
  if(rel==='CLAUDE.md'||rel==='tests/license_check.js'||rel==='tests/readme_check.js'||rel.indexOf('LICENSES/')===0)return;
  if(/^plugins\/[^/]+\/LICENSE(\.[a-z]+)?$/i.test(rel)||/^plugins\/[^/]+\/LICENSES\//.test(rel))return;
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
  check(manifest.name==='cw','plugin.json: name is '+manifest.name+' (the listed plugin is cw since 2026-10-14; the folder stays plugins/combat-writing)');
  check(manifest.license===SHIELD,'plugin.json: license field is '+manifest.license+', expected '+SHIELD);
  check(manifest.author&&manifest.author.name==='Learning Producers Inc.','plugin.json: author is not Learning Producers Inc.');
}else fail('plugins/combat-writing/.claude-plugin/plugin.json: missing');
if(exists('.claude-plugin/marketplace.json')){
  var market=JSON.parse(read('.claude-plugin/marketplace.json'));
  var names=(market.plugins||[]).map(function(p){return p.name;});
  check(names.indexOf('cw')>=0,'marketplace.json: does not name cw');
  check(names.indexOf('combat-writing-crew')>=0,'marketplace.json: does not name combat-writing-crew');
}else fail('.claude-plugin/marketplace.json: missing');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'license_check: '+failures.length+' failure(s), ':'license_check: all passed, ')+passes+' checks over '+files.length+' files');
process.exit(failures.length?1:0);
