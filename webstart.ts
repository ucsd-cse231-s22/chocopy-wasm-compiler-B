import { BasicREPL} from './repl';
import { NUM, BOOL, NONE } from './utils';
import * as RUNTIME_ERROR from './runtime_error'
import { renderResult, renderError, renderPrint, renderDebug } from "./outputrender";

import { themeListExport } from "./themelist";
import {BuiltinLib} from "./builtinlib"

import CodeMirror from "codemirror";
import "codemirror/addon/edit/closebrackets";
import "codemirror/mode/python/python";
import "codemirror/addon/hint/show-hint";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/comment-fold";
import "codemirror/addon/dialog/dialog";
import "codemirror/addon/edit/matchbrackets";
import "codemirror/addon/search/searchcursor"
import "codemirror/keymap/vim";
import "codemirror/addon/scroll/simplescrollbars";
import "codemirror/addon/lint/lint";

import "./style.scss";
import { autocompleteHint, completeMethod } from "./ac";
import { default_keywords, default_functions } from "./default_ac";

const breakpointLines = new Set<number>(); 
var breakpointPrev: number = -1;

function webStart() {
  var editMode = "default";
  var filecontent: string | ArrayBuffer;
  document.addEventListener("DOMContentLoaded", async function() {

    // https://github.com/mdn/webassembly-examples/issues/5
    const memory = new WebAssembly.Memory({ initial: 10, maximum: 100 });
    const memoryModule = await fetch('memory.wasm').then(response =>
      response.arrayBuffer()
    ).then(bytes =>
      WebAssembly.instantiate(bytes, { js: { mem: memory } })
    );

    var importObject:any = {
      imports: {
        ...BuiltinLib.reduce((o:Record<string, Function>, key)=>Object.assign(o, {[key.name]:key.body}), {}),
        index_out_of_bounds: (length: any, index: any, line: number, col: number) => RUNTIME_ERROR.index_out_of_bounds(length, index, line, col),
        division_by_zero: (arg: number, line: number, col: number) => RUNTIME_ERROR.division_by_zero(arg, line, col),
        stack_push: (line: number) => RUNTIME_ERROR.stack_push(line),
        stack_clear: () => RUNTIME_ERROR.stack_clear(),
        assert_not_none: (arg: any, line: number, col: number) => RUNTIME_ERROR.assert_not_none(arg, line, col),
        print_num: (arg: number) => renderPrint(NUM, arg),
        print_bool: (arg: number) => renderPrint(BOOL, arg),
        print_none: (arg: number) => renderPrint(NONE, arg),
        abs: Math.abs,
        min: Math.min,
        max: Math.max,
        pow: Math.pow
      },
      libmemory: memoryModule.instance.exports,
      memory_values: memory, //it is kind of pointer pointing to heap
      js: {memory: memory}
    };

    const setModule = await fetch('sets.wasm').then(response =>
      response.arrayBuffer()
    ).then(bytes =>
      WebAssembly.instantiate(bytes, {...importObject, js: { mem: memory } })
    );

    importObject.libset = setModule.instance.exports;
    
    var repl = new BasicREPL(importObject);

    function setupRepl() {
      document.getElementById("output").innerHTML = "";
      const replCodeElement = document.getElementById("next-code") as HTMLTextAreaElement;
      replCodeElement.addEventListener("keypress", (e) => {
    
        if (e.shiftKey && e.key === "Enter") {
        } else if (e.key === "Enter") {
          e.preventDefault();
          const source = replCodeElement.value;
    
          const output = document.createElement("div");
          const prompt = document.createElement("span");
          prompt.innerText = "» " + source;
          output.appendChild(prompt);
          document.getElementById("output").appendChild(output);
          
          replCodeElement.value = "";
    
          var codeHeight = -20
          if(source !== ""){
            repl.run(source).then((r) => {
              var objectTrackList = repl.trackObject(r, repl.trackHeap());
              renderResult(r, objectTrackList);
              console.log("run finished");
            })
              .catch((e) => { renderError(e); console.log("run failed", e) });
            codeHeight = 20;
          }

          var interactions = document.getElementById("interactions") as HTMLDivElement;
          interactions.scrollTop = interactions.scrollHeight + codeHeight;
        }
      });
    }
    
    setupRepl();

    function resetRepl() {
      document.getElementById("output").innerHTML = "";
      var beforeText = document.querySelector(".prompt-text") as HTMLElement;
      beforeText.innerHTML = "";
      var afterText = document.getElementById("prompt-text-after") as HTMLSpanElement;
      afterText.innerHTML = "";
      var sourceCode = document.getElementById("next-code") as HTMLTextAreaElement;
      sourceCode.value = "";
    }

    document.getElementById("clear").addEventListener("click", (e)=>{
      resetRepl();
      //resets environment
      repl = new BasicREPL(importObject);
      //clear editor
      var element = document.querySelector(".CodeMirror") as any;
      var editor = element.CodeMirror;
      editor.setValue("");
      editor.clearHistory();
    })

    document.getElementById("run").addEventListener("click", function (e) {
      repl = new BasicREPL(importObject);
      const source = document.getElementById("user-code") as HTMLTextAreaElement;
      var text = source.value;
      if (breakpointPrev != -1){
        var codeLines = text.split('\n')
        console.log("eval part of lines:",codeLines);
        console.log("breakpoint:",breakpointPrev);
        //if( codeLines.length == 0 || codeLines.length == 1 && codeLines[0].trim().length == 0) return
        text = getCodeUntillBreakpoint(codeLines);
      }
      //console.log("code to be executed:",text)
      resetRepl();
      repl.run(text).then((r) => {
        var objectTrackList = repl.trackObject(r, repl.trackHeap());
        // console.log(objectTrackList);
        renderResult(r, objectTrackList);
        console.log("run finished")

      })
        .catch((e) => { renderError(e); 
        //console.log(e);
        if (e.stack!=undefined){
          //console.log(e.name);
          //console.log("highlight the error line")
          //console.log(e.stack);
          //console.log(e.location)
          //highlightError(1,e);
          //var info = editor.lineInfo(1);
          //console.log("reading info: "+info);
          //makeMarkerErrorMarker()
          console.log("name:",e.name);
          var lineNum = parseLineLocation(e)-1;
          var endIndex = parseCharLocation(e);
          if (lineNum != null){
            editor.setGutterMarker(lineNum, 'breakpoints',  makeMarkerErrorMarker());
            editor.addLineClass(lineNum, 'background', 'line-error');
            console.log("error line marked")
            //editor.markText({line:lineNum,ch:1},{line:3,ch:1},{readOnly:true});
            var lineString =  editor.getLine(lineNum);
            var startIndex = getStartIndex(lineString, endIndex);
            console.log("lineString:",lineString);
            console.log("startIndex:",startIndex);
            console.log("endIndex:",endIndex);
            editor.markText({line:lineNum,ch:startIndex},{line:lineNum,ch:endIndex}, { className: "error_content" });
          }
        }
        console.log("run failed", e)});;
    });

    document.getElementById("refresh").addEventListener("click", function (e) {
      var text = editor.getValue();
      editor.refresh();
      editor.setValue(text);
      console.log("editor refreshed")
    });

    document.getElementById("choose_file").addEventListener("change", function (e) {
      //load file
      var input: any = e.target;
      var reader = new FileReader();
      reader.onload = function () {
        filecontent = reader.result;
        resetRepl();
        //reset environment
        repl = new BasicREPL(importObject);
        // Repalce text area with the content in the uploaded file
        editor.setValue(filecontent.toString());
      };
      reader.readAsText(input.files[0]);
    });

    document.getElementById("import").addEventListener("click", function () {
      document.getElementById("choose_file").click();
    });

    document.getElementById("save").addEventListener("click", function (e) {
      //download the code in the user-code text area
      var FileSaver = require("file-saver");
      var title = "download";
      const source = editor.getValue();
      var blob = new Blob([source], { type: "text/plain;charset=utf-8" });
      FileSaver.saveAs(blob, title);
    });

    const textarea = document.getElementById("user-code") as HTMLTextAreaElement;
    const editor = CodeMirror.fromTextArea(textarea, {
      mode: "python",
      theme: "blackboard",
      lineNumbers: true,
      autoCloseBrackets: true,
      lineWrapping: true,
      foldGutter: true,
      keyMap: "default",
      matchBrackets: true,
      showCursorWhenSelecting: true,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter","breakpoints","error","CodeMirror-lint-markers"],
      extraKeys: {
        "Ctrl": "autocomplete",
      },
      lint:true,
      hintOptions: {
        alignWithWord: false,
        completeSingle: true,
      },
      scrollbarStyle: "simple",
    } as any);
    var commandDisplay = document.getElementById('command-display');
    var keys = '';
    let isMethod = false;
    var classMethodList: string[] = [];
    var defList: string[] = [];
    CodeMirror.on(editor, 'vim-keypress', function(key : string) {
      keys = keys + key;
      commandDisplay.innerText = keys;
    });
    CodeMirror.on(editor, 'vim-command-done', function(e : string) {
      keys = '';
      commandDisplay.innerHTML = keys;
    });
    var vimMode = document.getElementById('vim-mode');
    CodeMirror.on(editor, 'vim-mode-change', function(e : string) {
      vimMode.innerText = JSON.stringify(e);
    });
    console.log(editor)
    
    editor.on('gutterClick', function(cm, lineNum) {
      console.log("breakpoint click");
      var info = cm.lineInfo(lineNum);
      if (info.gutterMarkers) breakpointLines.delete(lineNum);
      else breakpointLines.add(lineNum);
      cm.setGutterMarker(lineNum, 'breakpoints', info.gutterMarkers ? null : makeMarkerBreakPoint());
      var startLine = colorLinesAfterBreakpoint(cm,lineNum, breakpointLines);
      //highlightError(1, cm.lineInfo(lineNum).text);
      //cm.setGutterMarker(lineNum, 'error', info.gutterMarkers ? null : makeMarkerErrorMarker());
    });

    editor.on("change", (cm, change) => {

        textarea.value = editor.getValue();
    })

    editor.on("inputRead", function onChange(editor, input) {
      if (input.text[0] === ";" || input.text[0] === " " || input.text[0] === ":") {
        isMethod = false;
        return;
      } else if (input.text[0] === "." || isMethod) {
        //autocomplete class methods
        isMethod = true;
        editor.showHint({
          hint: () =>
            autocompleteHint(editor, classMethodList, function (e: any, cur: any) {
              return e.getTokenAt(cur);
            }),
        });
      } else {
        //autocomplete variables, names, top-level functions
        editor.showHint({
          hint: () =>
            autocompleteHint(
              editor,
              default_keywords.concat(default_functions).concat(defList),
              function (e: any, cur: any) {
                return e.getTokenAt(cur);
              }
            ),
        });
      }
    });


    editor.on("keydown", (cm, event) => {
      switch (event.code) {
        //reset isClassMethod variable based on enter or space or backspace
        case "Space":
          isMethod = false;
          return;
        case "Backspace":
          isMethod = false;
          return;
        case "Enter":
          isMethod = false;
          const repl = new BasicREPL(importObject);
          const source = document.getElementById("user-code") as HTMLTextAreaElement;
          repl.run(source.value).then((r) => {
            [defList, classMethodList] = completeMethod(repl);
          });
          return;
      }
    });

    dragbarFunction();
    promptTextArea();
    themeDropDown(editor);
    modeDropDown(editor, editMode);
  });
}

webStart();


function dragbarFunction(){
  var bar = document.getElementById("dragbar") as HTMLElement;
  console.log(bar);
  var wrapper = bar.closest('.dynamic-content-border') as HTMLElement;
  var codeEditor = wrapper.querySelector('.absolute-content-border') as HTMLElement;
  var interactions = wrapper.querySelector('.interection-content-border') as HTMLElement;
  var isDragging = false;

  document.addEventListener('mousedown', function(e){
    if(e.target === bar){
      isDragging = true;
    }
  });

  document.addEventListener('mousemove', function(e){
    if(!isDragging){
      return false;
    }

    var containerOffsetLeft = wrapper.offsetLeft;
    var pointerRelativeXpos = e.clientX - containerOffsetLeft;
    var editorMinWidth = 60;
    var editorWidth = (Math.max(editorMinWidth, pointerRelativeXpos - 8))

    var containerOffsetWidth = wrapper.offsetWidth;
    var barWidth = bar.offsetWidth;


    codeEditor.style.width = editorWidth + 'px';
    codeEditor.style.flexGrow = '0';

    interactions.style.width = containerOffsetWidth-editorWidth-barWidth + 'px';
    interactions.style.flexGrow = '0'

  });

  document.addEventListener('mouseup', function(e){
    isDragging = false;
  });
}

function promptTextArea(){
  var nextCode = document.getElementById("next-code") as HTMLTextAreaElement;
  document.getElementById("interactions").addEventListener("click", (e)=>{
    nextCode.focus();
  });

  nextCode.addEventListener("focus", (e)=>{
    var source = ""
    nextCode.addEventListener("keyup", (e)=>{
      source = nextCode.value;
      var before = document.querySelector(".prompt-text") as HTMLSpanElement;
      before.innerHTML = source.substring(0, nextCode.selectionStart);
      var after = document.getElementById("prompt-text-after") as HTMLSpanElement;
      after.innerHTML = source.substring(nextCode.selectionStart);
    })   
  });

}

function themeDropDown (editor : any) {
  // Load theme list
  var themeList = themeListExport;
  var dropdown = document.getElementById("config-theme");
  themeList.forEach (theme => {
    var option = document.createElement("option");
    option.value = theme;
    option.text = theme;
    dropdown.appendChild(option);
  });
  // Create listener for theme dropdown
  var themeDropDown = document.getElementById("config-theme") as HTMLSelectElement;
  themeDropDown.addEventListener("change", (event) => {
    editor.setOption("theme", themeDropDown.value);
  });
  // Create a random theme button
  document.getElementById("random-theme").addEventListener("click", (e)=>{
    const random = Math.floor(Math.random() * themeList.length);
    var randomTheme = themeList[random];
    editor.setOption("theme", randomTheme);
  });
}

function modeDropDown (editor : any, editMode : string) {
  // Append vim mode
  var dropdown = document.getElementById("config-mode");
  dropdown.appendChild
  var option = document.createElement("option");
  option.value = "vim";
  option.text = "vim";
  dropdown.appendChild(option);
  // Create listener for mode dropdown
  var modeDropDown = document.getElementById("config-mode") as HTMLSelectElement;
  modeDropDown.addEventListener("change", (event) => {
    editMode = modeDropDown.value;
    editor.setOption("keyMap", modeDropDown.value);
  });
  // Change edit mode
  document.getElementById("change-mode").addEventListener("click", (e)=>{
    if (editMode === "vim") {
      editMode = "default";
      editor.setOption("keyMap", "default");
    } else if (editMode === "default"){
      editMode = "vim";
      editor.setOption("keyMap", "vim");
    }
  });
}

function printGlobalVariable(repl: BasicREPL){
  const globalVariable = repl.currentEnv.globals;
  globalVariable.forEach((value: boolean, key: string)=>{
    repl.run(key).then(r =>{
      var objectTrackList = repl.trackObject(r, repl.trackHeap());
      renderDebug(r, objectTrackList);
      console.log("get the click");
      //Find a way to display variable
    })
  })
}

function makeMarkerBreakPoint() {
  const marker = document.createElement('div');
  marker.style.color = "#ffffff";
  marker.innerHTML = '⬤';
  return marker;
}

function makeMarkerErrorMarker() {
  const marker = document.createElement('div');
  marker.style.color = "#ff0800";
  marker.innerHTML = 'ⓧ';
  return marker;
}

// function makeInLineErrorMarker() {
//   const marker = document.createElement('div');
//   marker.style.color = "#ffFFFF";
//   marker.innerHTML = 'X';
//   return marker;
// }

function highlightError(lineNum: number, message: any) {
  var area = document.querySelector(".CodeMirror") as any;
  var editor = area.CodeMirror;
  editor.setGutterMarker(lineNum, "error", makeMarkerError(message));
  console.log("error line marked")
  editor.addLineClass(lineNum, "background", "line-error");
}


function makeMarkerError(message: any): any {
  const marker = document.createElement("div");
  marker.classList.add("error-marker");
  marker.innerHTML = "&nbsp;";

  const error = document.createElement("div");
  error.innerHTML = message;
  error.classList.add("error-message");
  marker.appendChild(error);

  return marker;
}

function parseLineLocation(e: any) {
  console.log("msg:",e);
  var eles = e.toString().split(" ") ;
  for (var i = 0; i < eles.length; i++){
    if (eles[i]=="line"){
      break;
    }
  }
  if (i==eles.length){return null;}
  var lineIndex = eles[i+1];
  console.log("line:",lineIndex);
  return lineIndex;
}

function parseCharLocation(e: any) {
  console.log("msg:",e);
  var raw  = e.toString().split("\n");
  var eles = raw[0].split(" ") ;
  
  for (var i = 0; i < eles.length; i++){
    if (eles[i]=="column"){
      break;
    }
  }
  if (i==eles.length){return null;}
  var columnIndex = eles[i+1];
  console.log("column:",columnIndex);
  return columnIndex;
}

function parseCharLocationEnd(e: any) {
  console.log("msg:",e);
  var eles = e.toString().split(" ") ;
  for (var i = 0; i < eles.length; i++){
    if (eles[i]=="column"){
      break;
    }
  }
  if (i==eles.length){return null;}
  var columnIndex = eles[i+1];
  console.log("column:",columnIndex);
  return columnIndex;
}

function colorLinesAfterBreakpoint(cm: CodeMirror.Editor, lineNum: number, breakpointLines: Set<number>) {
  if (breakpointLines.size==0){
    clearColorLine(cm,breakpointPrev);
    breakpointPrev = -1;
    return;
  }
  if (breakpointPrev != -1){
    clearColorLine(cm,breakpointPrev);
  }
  var startLine = getArrayMin(breakpointLines);
  breakpointPrev = startLine;
  console.log("break line:",startLine);
  if (startLine != cm.getLineNumber){
    cm.addLineClass(startLine,"background","noEvalFirst");
  }
  for(let i=startLine; i<cm.lineCount(); i++){
    cm.addLineClass(i,"background","noEval")
  }
  return startLine;
}

function getArrayMin(array: Set<number>){
  return Math.min.apply(this, [...array]);
}

function clearColorLine(cm: CodeMirror.Editor, breakpointPrev: number) {
  for (let i=0;i<cm.lineCount();i++){
    cm.removeLineClass(i,"background","noEvalFirst")
    cm.removeLineClass(i,"background","noEval")
  }
}
function getCodeUntillBreakpoint(codeLines: string[]): string {
  let lineStop = breakpointPrev+1 //switch to one-based indexing
	if(lineStop > codeLines.length){
		lineStop = breakpointPrev = -1 //user got rid of new line, so get rid of unnecessary break
		console.debug("stop at line " + lineStop + " the number of lines: " + codeLines.length)
	}
	else if(lineStop > 0){
		codeLines = codeLines.slice(0,lineStop-1)
	}
	return codeLines.join('\n');
}

function getStartIndex(lineString: string, endIndex: number) {
  var start = -1;
  for (var i:number = 0; i < lineString.length; i++){
    //console.log(i);
    //console.log(endIndex);
    if (i==endIndex){
      //console.log("match");
      return start+1;
    }
    if (lineString.charAt(i) == " "){
      //console.log("space at",i);
      start = i;
    }
  }
  return start+1;
}
