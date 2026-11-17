// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// picker.js: the Next picker's off switch, kept per project (issue 215, THE PICKER RULE).
//
//   node picker.js [--run <folder>] [--root <dir>]          (the state; with --run and the picker off, the text Next line under it)
//   node picker.js [--run <folder>] [--root <dir>] --off    (the person chose "I will type commands for this project")
//   node picker.js [--root <dir>] --on                      (the way back: /cw:battle picker on)
//
// The Next picker, the one that ends every sparring and battle round, is on by default. Three
// cases: the person picks a round and it runs as it always has; the person picks the option on
// the More screen, and the host runs --off, which prints the text Next line at once (with --run)
// and the line naming the way back, and keeps the choice in <project>/combat-writing/picker.json;
// the person closes the picker without choosing, and nothing runs, so nothing is remembered and
// the picker opens again after the next round. The host runs the bare read before it opens the
// Next picker: `Picker: on` means open it; a first line starting `Picker: off` means open none
// and print the text Next line this script printed under it, the way a round ends where the
// host has no picker tool.
//
// The file is the eighth write location: the person's own data, kept with the project like
// seats.json and voices.json, never a key, never read by a seat. Shape:
// {"picker":"off","at":"<time>","run":"<run id>"}. --on removes it, so the default holds by there
// being nothing to read; a file that is not JSON, or that says anything but off, reads as on.
// The project is read from the run folder (<project>/combat-writing/runs/<run-id>/), else from
// --root, else it is the working folder. Nothing is logged and nothing in a run folder is
// written: the read is safe to run after every round.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
if(args.on!==undefined&&args.off!==undefined)lib.die('usage: --on or --off, never both');
var runDir=args.run&&args.run!==true?path.resolve(args.run):null;
if(runDir&&!fs.existsSync(path.join(runDir,'seats.json')))lib.die('not a run folder: '+runDir);
var root=args.root&&args.root!==true?path.resolve(args.root):((runDir&&lib.projectOfRun(runDir))||process.cwd());
var file=lib.pickerPath(root);
var rel=lib.PICKER_REL.split(path.sep).join('/');
var back=lib.PICKER_ON_CMD+' turns it back on.';
function nextLine(){ return runDir?lib.runState(runDir).next_line:null; }
function since(state){ return state.at?' since '+String(state.at).slice(0,10):''; }
function out(linesOut){ process.stdout.write(linesOut.filter(function(l){return l!==null;}).join('\n')+'\n'); }

var state=lib.readPicker(root);
if(args.off!==undefined){
  if(state.off){ out([nextLine(),'Picker already off for this project'+since(state)+' ('+rel+'). '+back]); }
  else{
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,JSON.stringify({picker:'off',at:new Date().toISOString(),run:runDir?path.basename(runDir):null},null,2)+'\n');
    out([nextLine(),'Picker off for this project ('+rel+'): no picker opens after a round here. '+back]);
  }
}else if(args.on!==undefined){
  if(fs.existsSync(file)&&(state.off||state.broken)){
    fs.unlinkSync(file);
    out(['Picker on for this project: it opens after the next round.']);
  }else out(['Picker already on for this project.']);
}else{
  if(state.off)out(['Picker: off for this project'+since(state)+' ('+rel+'). Open no picker: print the text Next line and nothing after it. '+back,nextLine()]);
  else if(state.broken)out(['Picker: on ('+rel+' is not JSON and is read as on; '+lib.PICKER_ON_CMD+' removes it).']);
  else out(['Picker: on']);
}
