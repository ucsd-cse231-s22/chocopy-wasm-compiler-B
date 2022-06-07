import CodeMirror from "codemirror";
import { BasicREPL } from "./repl";

function getCompletions(wordList: string[], token: any, context: any[]) {
    var completions: any[] = [];
    var prefix = token.string;
    if (context) {
        var object = context.pop(),base;
        switch(object.type){
            case "variable":
                base = object.string;
                break;
            case "property":
                base = object.string;
                break;
            case "buildin":
                base = object.string;
                break;
            case "keyword":
                base = object.string;
                break;
        }
        while (base != null && context.length) base = base[context.pop().string];
        if (base != null) {
            completions = gatherCompletions(wordList, prefix);
        }
    }
    return completions;
}

function gatherCompletions(wordList: string[], prefix: string): string[] {
    var completions: string[] = [];
    for (var i = 0; i < wordList.length; i++) {
        var str = wordList[i];
        //only add word if not already in array and prefix matches word
        if (str.indexOf(prefix) == 0 && !strExists(completions, str)) {
            completions.push(str);
        }
    }
    return completions;
}

function strExists(arr: string[], item: string) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] == item) {
        return true;
      }
    }
    return false;
}

export function autocompleteHint(editor: any, keywords: string[], getToken: any) {
    // Find the token at the cursor
    var currPos = editor.getCursor();
    var token = getToken(editor, currPos),
      tprop = token;
    var isClassMethod = false;
    if (token.string[token.string.length - 1] === ".") {
      isClassMethod = true;
      token = tprop = {
        start: currPos.ch,
        end: currPos.ch,
        string: "",
        state: token.state,
        type: "property",
      };
    } else if (token.type == "property") {
      isClassMethod = true;
    }
    //ignore any non word or property token
    else if (!/^[\w$_]*$/.test(token.string)) {
      token = tprop = {
        start: currPos.ch,
        end: currPos.ch,
        string: "",
        state: token.state,
        className: token.string == ":" ? "python-type" : null,
      };
    }
  
    if (!context || isClassMethod) {
      var context = [];
      context.push(tprop);
  
      var completionList = getCompletions(keywords, token, context);
      completionList = completionList.sort();
      if (completionList.length == 1) {
        completionList.push(" ");
      }
    }
    return {
      list: completionList,
      from: CodeMirror.Pos(currPos.line, token.start),
      to: CodeMirror.Pos(currPos.line, token.end),
    };
}


export function completeMethod(repl: BasicREPL): Array<any> {
  var defList: string[] = [];
  var classMethodList: string[] = [];
  //get variable names for autocomplete
  repl.currentTypeEnv.globals.forEach((val, key) => {
    //don't add functions into variable list
    defList.push(key);
  });
  //get class names for autocomplete
  repl.currentTypeEnv.classes.forEach((val, key) => {
    if (val.length > 1) {
      val[1].forEach((v, k) => {
        console.log(classMethodList)
        classMethodList.push(k + "()");
      });
    }
  });
  //get function names for autocomplete
  repl.currentTypeEnv.functions.forEach((val, key) => {
    defList.push(key + "()");
  });
  return [defList, classMethodList];
}


// class E(object):
//     a : int = 1
//     f : int = 2
//     get1 : int = 1
// class C(E):
//     a : int = 2
//     e : E = None
//     def __init__(self: C):
//         self.e = E()
//     def get1(self: C) -> int:
//         return 1
// class F(E):
//     a : int = 2
//     e : E = None
//     def __init__(self: F):
//         self.e = E()
//     def get2(self: F) -> int:
//         return 2

// c : C = None
// c = C()


// class C(Object):
//       a : int = 1
//       b : int = 2
//       def get1(self:C) ->int:
//           return 1
//       def get1(self:C) ->int:
//           return 1
// c : C = None
// c = C()


// class E(object):
//     a : int = 1
//     f : int = 2
//     d : int = 1
// class C(E):
//     a : int = 2
//     e : E = None
//     def __init__(self: C):
//         self.e = E()
//     def d(self: C) -> int:
//         return 1
// c : C = None
// c = C()
