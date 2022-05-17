import {parser} from "lezer-python";
import { TreeCursor} from "lezer-tree";
import { Program, Expr, Stmt, UniOp, BinOp, Parameter, Type, FunDef, VarInit, Class, Literal, SourceLocation, Modules, ModuleData, ModulesContext } from "./ast";
import { NUM, BOOL, NONE, CLASS } from "./utils";
import { stringifyTree } from "./treeprinter";
import { ParseError} from "./error_reporting";

export let currentModule : string = ""
export let modulesContext : ModulesContext = {
}

export let localCtx :string[] = [] // variable names available locally
export let curCtx :'global'|'func'|'class' = 'global' // current scope

// To get the line number from lezer tree to report errors
function getSourceLocation(c : TreeCursor, s : string) : SourceLocation {
  var line = s.substring(0, c.from).split("\n").length;
  return { line, module: currentModule }
}

export function traverseLiteral(c : TreeCursor, s : string) : Literal {
  var location = getSourceLocation(c, s);
  switch(c.type.name) {
    case "Number":
      return {
        tag: "num",
        value: Number(s.substring(c.from, c.to))
      }
    case "Boolean":
      return {
        tag: "bool",
        value: s.substring(c.from, c.to) === "True"
      }
    case "None":
      return {
        tag: "none"
      }
    default:
      throw new ParseError("Not literal", location.line)
  }
}

export function traverseExpr(c : TreeCursor, s : string) : Expr<SourceLocation> {
  var location = getSourceLocation(c, s);
  let module = modulesContext[currentModule];
  let name = ""
  switch(c.type.name) {
    case "Number":
    case "Boolean":
    case "None":
      return { 
        a: location,
        tag: "literal", 
        value: traverseLiteral(c, s)
      }      
    case "VariableName":
      name = s.substring(c.from, c.to)
      // check if name is there in module.nsMap & not in localCtx
      if(module.nsMap[name] && !localCtx.includes(name)){
        name = module.nsMap[name]
      }
      return {
        a: location,
        tag: "id",
        name
      }
    case "CallExpression":
      c.firstChild();
      const callExpr = traverseExpr(c, s);
      c.nextSibling(); // go to arglist
      let args = traverseArguments(c, s);
      c.parent(); // pop CallExpression


      if (callExpr.tag === "lookup") {
        return {
          a: location,
          tag: "method-call",
          obj: callExpr.obj,
          method: callExpr.field,
          arguments: args
        }
      } else if (callExpr.tag === "id") {
        const callName = callExpr.name;
        var expr : Expr<SourceLocation>;
        if (callName === "print" || callName === "abs") {
          expr = {
            a: location,
            tag: "builtin1",
            name: callName,
            arg: args[0]
          };
        } else if (callName === "max" || callName === "min" || callName === "pow") {
          expr = {
            a: location,
            tag: "builtin2",
            name: callName,
            left: args[0],
            right: args[1]
          }
        }
        else {
          expr = { a: location, tag: "call", name: callName, arguments: args};
        }
        return expr;  
      } else {
        throw new ParseError("Unknown target while parsing assignment", location.line);
      }

    case "BinaryExpression":
      c.firstChild(); // go to lhs 
      const lhsExpr = traverseExpr(c, s);
      c.nextSibling(); // go to op
      var opStr = s.substring(c.from, c.to);
      var op;
      switch(opStr) {
        case "+":
          op = BinOp.Plus;
          break;
        case "-":
          op = BinOp.Minus;
          break;
        case "*":
          op = BinOp.Mul;
          break;
        case "//":
          op = BinOp.IDiv;
          break;
        case "%":
          op = BinOp.Mod;
          break
        case "==":
          op = BinOp.Eq;
          break;
        case "!=":
          op = BinOp.Neq;
          break;
        case "<=":
          op = BinOp.Lte;
          break;
        case ">=":
          op = BinOp.Gte;
          break;
        case "<":
          op = BinOp.Lt;
          break;
        case ">":
          op = BinOp.Gt;
          break;
        case "is":
          op = BinOp.Is;
          break; 
        case "and":
          op = BinOp.And;
          break;
        case "or":
          op = BinOp.Or;
          break;
        default:
          throw new ParseError("Could not parse op at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to), location.line)
      }
      c.nextSibling(); // go to rhs
      const rhsExpr = traverseExpr(c, s);
      c.parent();
      return {
        a: location,
        tag: "binop",
        op: op,
        left: lhsExpr,
        right: rhsExpr
      }
    case "ParenthesizedExpression":
      c.firstChild(); // Focus on (
      c.nextSibling(); // Focus on inside
      var expr = traverseExpr(c, s);
      c.parent();
      return expr;
    case "UnaryExpression":
      c.firstChild(); // Focus on op
      var opStr = s.substring(c.from, c.to);
      var op;
      switch(opStr) {
        case "-":
          op = UniOp.Neg;
          break;
        case "not":
          op = UniOp.Not;
          break;
        default:
          throw new ParseError("Could not parse op at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to), location.line)
      }
      c.nextSibling(); // go to expr
      var expr = traverseExpr(c, s);
      c.parent();
      return {
        a: location,
        tag: "uniop",
        op: op,
        expr: expr
      }
    case "MemberExpression":
      c.firstChild(); // Focus on object
      var objExpr = traverseExpr(c, s);
      c.nextSibling(); // Focus on .
      c.nextSibling(); // Focus on property
      var propName = s.substring(c.from, c.to);
      c.parent();
      // if objExpr.tag = 'id' & id is in module.modMap & hasn't been redefined locally
      if(objExpr.tag === 'id' 
          && module.modMap[objExpr.name] 
          && !localCtx.includes(objExpr.name)) {
            return {
              a: location,
              tag: "id",
              //eg. import lib as x; x.y -> mod$y
              name: `${module.modMap[objExpr.name]}$${propName}`
            }
      }
      return {
        a: location,
        tag: "lookup",
        obj: objExpr,
        field: propName
      }
    case "self":
      return {
        a: location,
        tag: "id",
        name: "self"
      };
    default:
      throw new ParseError("Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to), location.line);
  }
}

export function traverseArguments(c : TreeCursor, s : string) : Array<Expr<SourceLocation>> {
  c.firstChild();  // Focuses on open paren
  const args = [];
  c.nextSibling();
  while(c.type.name !== ")") {
    let expr = traverseExpr(c, s);
    args.push(expr);
    c.nextSibling(); // Focuses on either "," or ")"
    c.nextSibling(); // Focuses on a VariableName
  } 
  c.parent();       // Pop to ArgList
  return args;
}

export function traverseStmt(c : TreeCursor, s : string) : Stmt<SourceLocation> {
  var location = getSourceLocation(c, s);
  switch(c.node.type.name) {
    case "ReturnStatement":
      c.firstChild();  // Focus return keyword
      
      var value : Expr<SourceLocation>;
      if (c.nextSibling()) // Focus expression
        value = traverseExpr(c, s);
      else
        value = { a: location, tag: "literal", value: { tag: "none" } };
      c.parent();
      return { a: location, tag: "return", value };
    case "AssignStatement":
      c.firstChild(); // go to name
      const target = traverseExpr(c, s);
      c.nextSibling(); // go to equals
      c.nextSibling(); // go to value
      var value = traverseExpr(c, s);
      c.parent();

      if (target.tag === "lookup") {
        return {
          a: location,
          tag: "field-assign",
          obj: target.obj,
          field: target.field,
          value: value
        }
      } else if (target.tag === "id") {
        return {
          a: location,
          tag: "assign",
          name: target.name,
          value: value
        }  
      } else {
        throw new ParseError("Unknown target while parsing assignment", location.line);
      }
    case "ExpressionStatement":
      c.firstChild();
      const expr = traverseExpr(c, s);
      c.parent(); // pop going into stmt
      return { a: location, tag: "expr", expr: expr }
    case "IfStatement":
      c.firstChild(); // Focus on if
      c.nextSibling(); // Focus on cond
      var cond = traverseExpr(c, s);
      // console.log("Cond:", cond);
      c.nextSibling(); // Focus on : thn
      c.firstChild(); // Focus on :
      var thn = [];
      while(c.nextSibling()) {  // Focus on thn stmts
        thn.push(traverseStmt(c,s));
      }
      // console.log("Thn:", thn);
      c.parent();
      
      c.nextSibling(); // Focus on else
      c.nextSibling(); // Focus on : els
      c.firstChild(); // Focus on :
      var els = [];
      while(c.nextSibling()) { // Focus on els stmts
        els.push(traverseStmt(c, s));
      }
      c.parent();
      c.parent();
      return {
        a: location,
        tag: "if",
        cond: cond,
        thn: thn,
        els: els
      }
    case "WhileStatement":
      c.firstChild(); // Focus on while
      c.nextSibling(); // Focus on condition
      var cond = traverseExpr(c, s);
      c.nextSibling(); // Focus on body

      var body = [];
      c.firstChild(); // Focus on :
      while(c.nextSibling()) {
        body.push(traverseStmt(c, s));
      }
      c.parent(); 
      c.parent();
      return {
        a: location,
        tag: "while",
        cond,
        body
      }
    case "PassStatement":
      return { a: location, tag: "pass" }
    default:
      throw new ParseError("Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to), location.line);
  }
}

export function traverseType(c : TreeCursor, s : string) : Type {
  // For now, always a VariableName
  let module = modulesContext[currentModule]
  let name = s.substring(c.from, c.to);
  switch(name) {
    case "int": return NUM;
    case "bool": return BOOL;
    default: { // it's either a classType or module.classType
      if(c.name === 'VariableName') // classType
        return CLASS(module.nsMap[name]); // get the mangled name
      else{ // c -> MemberExpression
        let exp = traverseExpr(c, s) // will return the mangled name
        if(exp.tag === 'id')
          return CLASS(exp.name)
      }
    }
  }
}

export function traverseParameters(c : TreeCursor, s : string) : Array<Parameter<null>> {
  var location = getSourceLocation(c, s);
  c.firstChild();  // Focuses on open paren
  const parameters = [];
  c.nextSibling(); // Focuses on a VariableName
  while(c.type.name !== ")") {
    let name = s.substring(c.from, c.to);
    c.nextSibling(); // Focuses on "TypeDef", hopefully, or "," if mistake
    let nextTagName = c.type.name; // NOTE(joe): a bit of a hack so the next line doesn't if-split
    if(nextTagName !== "TypeDef") { throw new ParseError("Missed type annotation for parameter " + name, location.line)};
    c.firstChild();  // Enter TypeDef
    c.nextSibling(); // Focuses on type itself
    let typ = traverseType(c, s);
    c.parent();
    c.nextSibling(); // Move on to comma or ")"
    parameters.push({name, type: typ});
    c.nextSibling(); // Focuses on a VariableName
  }
  c.parent();       // Pop to ParamList
  return parameters;
}

export function traverseVarInit(c : TreeCursor, s : string) : VarInit<SourceLocation> {
  var location = getSourceLocation(c, s);
  c.firstChild(); // go to name
  var name = s.substring(c.from, c.to);
  name = curCtx === 'global'? `${currentModule}$${name}` : name;
  c.nextSibling(); // go to : type

  if(c.type.name !== "TypeDef") {
    c.parent();
    throw new ParseError("invalid variable init", location.line);
  }
  c.firstChild(); // go to :
  c.nextSibling(); // go to type
  const type = traverseType(c, s);
  c.parent();
  
  c.nextSibling(); // go to =
  c.nextSibling(); // go to value
  var value = traverseLiteral(c, s);
  c.parent();

  return { a: location, name, type, value }
}

export function traverseFunDef(c : TreeCursor, s : string) : FunDef<SourceLocation> {
  var location = getSourceLocation(c, s);
  c.firstChild();  // Focus on def
  c.nextSibling(); // Focus on name of function
  var name = s.substring(c.from, c.to)
  name = curCtx == 'global'? `${currentModule}$${name}`: name;
  c.nextSibling(); // Focus on ParamList
  var parameters = traverseParameters(c, s)
  c.nextSibling(); // Focus on Body or TypeDef
  let ret : Type = NONE;
  if(c.type.name === "TypeDef") {
    c.firstChild();
    ret = traverseType(c, s);
    c.parent();
    c.nextSibling();
  }
  let oldCtx = curCtx
  curCtx = 'func'
  c.firstChild();  // Focus on :
  var inits = [];
  var body = [];
  
  var hasChild = c.nextSibling();

  while(hasChild) {
    if (isVarInit(c, s)) {
      inits.push(traverseVarInit(c, s));
    } else {
      break;
    }
    hasChild = c.nextSibling();
  }
  // set localCtx - params and inits
  localCtx = [...parameters.map(p => p.name),
              ...inits.map(v => v.name) ]
  while(hasChild) {
    body.push(traverseStmt(c, s));
    hasChild = c.nextSibling();
  } 
  localCtx = []
  // console.log("Before pop to body: ", c.type.name);
  c.parent();      // Pop to Body
  // console.log("Before pop to def: ", c.type.name);
  c.parent();      // Pop to FunctionDefinition
  curCtx = oldCtx
  return { a: location, name, parameters, ret, inits, body }
}

export function traverseClass(c : TreeCursor, s : string) : Class<SourceLocation> {
  var location = getSourceLocation(c, s);
  const fields : Array<VarInit<SourceLocation>> = [];
  const methods : Array<FunDef<SourceLocation>> = [];
  c.firstChild();
  c.nextSibling(); // Focus on class name
  const className = s.substring(c.from, c.to);
  let name = curCtx === 'global'? `${currentModule}$${className}`:className;
  let oldCtx = curCtx
  curCtx = 'class'
  c.nextSibling(); // Focus on arglist/superclass
  c.nextSibling(); // Focus on body
  c.firstChild();  // Focus colon
  while(c.nextSibling()) { // Focuses first field
    if (isVarInit(c, s)) {
      fields.push(traverseVarInit(c, s));
    } else if (isFunDef(c, s)) {
      methods.push(traverseFunDef(c, s));
    } else {
      throw new ParseError(`Could not parse the body of class: ${className}`, location.line);
    }
  } 
  c.parent();
  c.parent();

  if (!methods.find(method => method.name === "__init__")) {
    methods.push({ a: location, name: "__init__", parameters: [{ name: "self", type: CLASS(name) }], ret: NONE, inits: [], body: [] });
  }
  curCtx = oldCtx
  return {
    a: location,
    name,
    fields,
    methods
  };
}

export function traverseDefs(c : TreeCursor, s : string) : [Array<VarInit<SourceLocation>>, Array<FunDef<SourceLocation>>, Array<Class<SourceLocation>>] {
  const inits : Array<VarInit<SourceLocation>> = [];
  const funs : Array<FunDef<SourceLocation>> = [];
  const classes : Array<Class<SourceLocation>> = [];

  while(true) {
    if (isVarInit(c, s)) {
      inits.push(traverseVarInit(c, s));
    } else if (isFunDef(c, s)) {
      funs.push(traverseFunDef(c, s));
    } else if (isClassDef(c, s)) {
      classes.push(traverseClass(c, s));
    } else {
      return [inits, funs, classes];
    }
    c.nextSibling();
  }

}

export function isVarInit(c : TreeCursor, s : string) : Boolean {
  if (c.type.name === "AssignStatement") {
    c.firstChild(); // Focus on lhs
    c.nextSibling(); // go to : type

    const isVar = c.type.name as any === "TypeDef";
    c.parent();
    return isVar;  
  } else {
    return false;
  }
}

export function isFunDef(c : TreeCursor, s : string) : Boolean {
  return c.type.name === "FunctionDefinition";
}

export function isClassDef(c : TreeCursor, s : string) : Boolean {
  return c.type.name === "ClassDefinition";
}

export function isImportStmt(c : TreeCursor, s : string) : Boolean {
  return c.type.name === "ImportStatement";
}

export function traverse(c : TreeCursor, s : string) : Program<SourceLocation> {
  var location = getSourceLocation(c, s);
  switch(c.node.type.name) {
    case "Script":
      const inits : Array<VarInit<SourceLocation>> = [];
      const funs : Array<FunDef<SourceLocation>> = [];
      const classes : Array<Class<SourceLocation>> = [];
      const stmts : Array<Stmt<SourceLocation>> = [];
      var hasChild = c.firstChild();

      // skip all the imports
      while(hasChild) {
        if (!isImportStmt(c,s)) break;
        hasChild = c.nextSibling();
      }
      while(hasChild) {
        curCtx = "global"
        localCtx = []
        if (isVarInit(c, s)) {
          inits.push(traverseVarInit(c, s));
        } else if (isFunDef(c, s)) {
          funs.push(traverseFunDef(c, s));
        } else if (isClassDef(c, s)) {
          classes.push(traverseClass(c, s));
        } else {
          break;
        }
        hasChild = c.nextSibling();
      }
      curCtx = "global"
      localCtx = []
      while(hasChild) {
        stmts.push(traverseStmt(c, s));
        hasChild = c.nextSibling();
      } 
      c.parent();
      return { a: location, funs, inits, classes, stmts };
    default:
      throw new ParseError("Could not parse program at " + c.node.from + " " + c.node.to, location.line);
  }
}

export function parse(modules : Modules) : Program<SourceLocation> {
  // need to do this first to support "import *"
  // else we could have parsed all the imports with the module itself
  buildModulesContext(modules)
  let parsedModules : Program<SourceLocation>[] = []
  for(let modName in modules){
    const src = modules[modName];
    // update global currentModule
    currentModule = modName;
    const t = parser.parse(src);
    let mod = traverse(t.cursor(), src)
    mod.name = modName
    parsedModules.push(mod);
  }
  return mergeModules(parsedModules);
}

export function traverseImport(c : TreeCursor, s : string) : ModuleData {

  // parseList parses the import list and populates the map
  // <list> = mod1 [[as v1], mod2 [as v2]...]
  let parseList = (module:string, map:any) => {
    // c -> "import"
    let hasNext = true
    while(hasNext){
      // c -> variable name
      let name = s.substring(c.from, c.to)
      let resolve = module? `${module}$${name}` : name

      // move on to 'as' or VariableName or ","
      hasNext = c.nextSibling()
      if(c.name === 'as'){ // module aliased
        c.nextSibling() // VariableName ("alias")
        name = s.substring(c.from, c.to)
        hasNext = c.nextSibling()
      }
      if(c.name === ',')
        hasNext = c.nextSibling() // skip the ','

      // update map
      map[name] = resolve;
    }
  }

  let nData : ModuleData = {
    modMap: {},
    nsMap: {},
    globals : []
  }

  // c -> ImportStatement
  c.firstChild() // point to from or import
  if(c.name === "from"){ // from VarName import <list>
    c.nextSibling() // VariableName ("mod_name")
    let mod_name = s.substring(c.from, c.to)
    c.nextSibling() // import
    c.nextSibling() // first VariableName of <list>
    parseList(mod_name, nData.nsMap)
  } else if (c.name === "import"){ // import <list>
    c.nextSibling() // first VariableName of <list>
    parseList("", nData.modMap)
  }

  c.parent() // point back to ImportStatement
  return nData
}

// takes in the modules and populates the global ModulesContext
export function buildModulesContext(modules : Modules){
  // build the maps & globals for every object
  for(let modName in modules){
    currentModule = modName
    const s = modules[modName];
    const c = parser.parse(s).cursor();
    let mData : ModuleData = {
      modMap: {},
      nsMap: {},
      globals : []
    }
    modulesContext[modName] = mData;
    var hasChild = c.firstChild();

    // populate modMap & nsMap from import statements
    while(hasChild) {
      if (isImportStmt(c,s)){
        let nData : ModuleData = traverseImport(c,s)
        mData = {
          modMap : {...mData.modMap, ...nData.modMap},
          nsMap : {...mData.nsMap, ...nData.nsMap},
          globals : []
        }
      } else {
        break;
      }
      hasChild = c.nextSibling();
    }
    // consume the globals
    // TODO - should replace with just top level parsing
    if(hasChild) {
      mData.globals = getModuleGlobals(c,s);
    }

    // update nsMap with globals of modName
    mData.globals.forEach(g => mData.nsMap[g] = `${modName}$${g}`);
    modulesContext[modName] = mData;
  }

  // expand "*" in nsMap
  // TODO - "from lib import *" won't work yet
}

export function getModuleGlobals(c : TreeCursor, s : string) : string[] {
  let globals :string[] = []
  let hasNext = true
  while(hasNext){
    if(isVarInit(c,s) || isFunDef(c,s) || isClassDef(c,s)){
      // add name to globals - always 1st VariableName node
      c.firstChild()
      while(c.name !== 'VariableName') c.nextSibling()
      globals.push(s.substring(c.from, c.to))
      c.parent()
    } else {
      break;
    }
    hasNext = c.nextSibling()
  }
  return globals
}

export function mergeModules(modules : Program<SourceLocation>[]) : Program<SourceLocation>{
  let prog : Program<SourceLocation> = {
    funs: [],
    inits : [],
    classes : [],
    stmts : []
  }
  modules.forEach(module => prog.inits = [...prog.inits, ...module.inits])
  modules.forEach(module => prog.funs = [...prog.funs, ...module.funs])
  modules.forEach(module => prog.classes = [...prog.classes, ...module.classes])

  // statements only from main module
  prog.stmts = modules.filter(mod => mod.name === 'main')[0].stmts
  return prog
}