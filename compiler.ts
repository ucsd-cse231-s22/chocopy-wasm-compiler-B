import { Program, Stmt, Expr, Value, Class, VarInit, FunDef } from "./ir"
import { BinOp, Type, UniOp, SourceLocation } from "./ast"
import { BOOL, CLASS, NONE, NUM } from "./utils";
import { valueIsPointer } from "./memory_management";

export type GlobalEnv = {
  globals: Map<string, boolean>;
  global_type: Map<string, Type>;
  classes: Map<string, Map<string, [number, Value<[Type, SourceLocation]>]>>;  // store classname -> {field_name: field_id, init_value}
  locals: Set<string>;
  local_type: Map<string, Type>;
  labels: Array<string>;
  offset: number;
}

export const emptyEnv : GlobalEnv = { 
  globals: new Map(), 
  global_type: new Map(),
  classes: new Map(),
  locals: new Set(),
  local_type: new Map(),
  labels: [],
  offset: 0 
};

type CompileResult = {
  globals: string[],
  functions: string,
  mainSource: string,
  newEnv: GlobalEnv
};

export function makeLocals(locals: Set<string>) : Array<string> {
  const localDefines : Array<string> = [];
  locals.forEach(v => {
    localDefines.push(`(local $${v} i32)`);
  });
  return localDefines;
}

export function compile(ast: Program<[Type, SourceLocation]>, env: GlobalEnv) : CompileResult {
  const withDefines = env;

  const definedVars : Set<string> = new Set(); //getLocals(ast);
  definedVars.add("$last");
  definedVars.add("$selector");
  definedVars.forEach(env.locals.add, env.locals);
  const localDefines = makeLocals(definedVars);
  const globalNames = ast.inits.map(init => init.name);
  console.log(ast.inits, globalNames);
  const funs : Array<string> = [];
  ast.funs.forEach(f => {
    funs.push(codeGenDef(f, withDefines).join("\n"));
  });
  const classes : Array<string> = ast.classes.map(cls => codeGenClass(cls, withDefines)).flat();
  const allFuns = funs.concat(classes).join("\n\n");
  // const stmts = ast.filter((stmt) => stmt.tag !== "fun");
  const inits = ast.inits.map(init => codeGenInit(init, withDefines)).flat();
  withDefines.labels = ast.body.map(block => block.label);
  var bodyCommands = "(local.set $$selector (i32.const 0))\n"
  bodyCommands += "(loop $loop\n"

  var blockCommands = "(local.get $$selector)\n"
  blockCommands += `(br_table ${ast.body.map(block => block.label).join(" ")})`;
  ast.body.forEach(block => {
    blockCommands = `(block ${block.label}
              ${blockCommands}    
            ) ;; end ${block.label}
            ${block.stmts.map(stmt => codeGenStmt(stmt, withDefines).join('\n')).join('\n')}
            `
  })
  bodyCommands += blockCommands;
  bodyCommands += ") ;; end $loop"

  // const commandGroups = ast.stmts.map((stmt) => codeGenStmt(stmt, withDefines));
  const allCommands = [...localDefines, ...inits, bodyCommands];
  withDefines.locals.clear();
  return {
    globals: globalNames,
    functions: allFuns,
    mainSource: allCommands.join("\n"),
    newEnv: withDefines
  };
}

function codeGenStmt(stmt: Stmt<[Type, SourceLocation]>, env: GlobalEnv): Array<string> {
  switch (stmt.tag) {
    case "store":
      var encode_stmts: string[] = [];
      // if value is not a pointer, we need encode them
      // if value is a pointer, it's already encoded
      if(!valueIsPointer(stmt.value, env)){
        encode_stmts = [
          `;; encode num/bool`,
          `(i32.const 0)`,
          `call $encode_value`,
        ];
      }
      return [
        ...codeGenValue(stmt.start, env),
        ...codeGenValue(stmt.offset, env),
        ...codeGenValue(stmt.value, env),
        ...encode_stmts,
        `call $store`
      ]
    case "assign":
      var valStmts = codeGenExpr(stmt.value, env);
      const decPreRefStmts = decRefcount(stmt.name, env);
      const incNowRefStmts = incRefcount(stmt.name, env);
      if (env.locals.has(stmt.name)) {
        return [
          ...decPreRefStmts,
          ...valStmts, 
          `(local.set $${stmt.name})`,
          ...incNowRefStmts
        ];
      } else {
        return [
          ...decPreRefStmts,
          ...valStmts, 
          `(global.set $${stmt.name})`,
          ...incNowRefStmts
        ];
      }

    case "return":
      var valStmts = codeGenValue(stmt.value, env);
      valStmts.push("return");
      return valStmts;

    case "expr":
      var exprStmts = codeGenExpr(stmt.expr, env);
      return exprStmts.concat([`(local.set $$last)`]);

    case "pass":
      return []

    case "ifjmp":
      const thnIdx = env.labels.findIndex(e => e === stmt.thn);
      const elsIdx = env.labels.findIndex(e => e === stmt.els);

      return [...codeGenValue(stmt.cond, env), 
        `(if 
          (then
            (local.set $$selector (i32.const ${thnIdx}))
            (br $loop)
          ) 
          (else 
            (local.set $$selector (i32.const ${elsIdx}))
            (br $loop)
          )
         )`]

    case "jmp":
      const lblIdx = env.labels.findIndex(e => e === stmt.lbl);
      return [`(local.set $$selector (i32.const ${lblIdx}))`, `(br $loop)`]

  }
}

function codeGenExpr(expr: Expr<[Type, SourceLocation]>, env: GlobalEnv): Array<string> {
  switch (expr.tag) {
    case "value":
      return codeGenValue(expr.value, env)

    case "binop":
      const lhsStmts = codeGenValue(expr.left, env);
      const rhsStmts = codeGenValue(expr.right, env);
      return [...lhsStmts, ...rhsStmts, codeGenBinOp(expr.op)]

    case "uniop":
      const exprStmts = codeGenValue(expr.expr, env);
      switch(expr.op){
        case UniOp.Neg:
          return [`(i32.const 0)`, ...exprStmts, `(i32.sub)`];
        case UniOp.Not:
          return [`(i32.const 0)`, ...exprStmts, `(i32.eq)`];
      }

    case "builtin1":
      const argTyp = expr.a[0];
      const argStmts = codeGenValue(expr.arg, env);
      var callName = expr.name;
      if (expr.name === "print" && argTyp === NUM) {
        callName = "print_num";
      } else if (expr.name === "print" && argTyp === BOOL) {
        callName = "print_bool";
      } else if (expr.name === "print" && argTyp === NONE) {
        callName = "print_none";
      } else if (expr.name == "print" && argTyp.tag == "class"){
        callName = "print_num";
        return argStmts.concat([`(call $decode_value)`, `(call $${callName})`]);
      }
      return argStmts.concat([`(call $${callName})`]);

    case "builtin2":
      const leftStmts = codeGenValue(expr.left, env);
      const rightStmts = codeGenValue(expr.right, env);
      return [...leftStmts, ...rightStmts, `(call $${expr.name})`]

    case "call":
      var valStmts = expr.arguments.map((arg) => codeGenValue(arg, env)).flat();
      valStmts.push(`(call $${expr.name})`);
      return valStmts;

    case "alloc":
      return codeGenAlloc(NONE, expr.amount, env); //expr.a[0]

    case "load":
      return [
        ...codeGenValue(expr.start, env),
        `call $assert_not_none`,
        ...codeGenValue(expr.offset, env),
        `call $load`
      ]
  }
}

function codeGenValue(val: Value<[Type, SourceLocation]>, env: GlobalEnv): Array<string> {
  switch (val.tag) {
    case "num":
      return ["(i32.const " + val.value + ")"];
    case "wasmint":
      return ["(i32.const " + val.value + ")"];
    case "bool":
      return [`(i32.const ${Number(val.value)})`];
    case "none":
      return [`(i32.const 1)`];
    case "id":
      if (env.locals.has(val.name)) {
        return [`(local.get $${val.name})`];
      } else {
        return [`(global.get $${val.name})`];
      }
  }
}

function codeGenBinOp(op : BinOp) : string {
  switch(op) {
    case BinOp.Plus:
      return "(i32.add)"
    case BinOp.Minus:
      return "(i32.sub)"
    case BinOp.Mul:
      return "(i32.mul)"
    case BinOp.IDiv:
      return "(i32.div_s)"
    case BinOp.Mod:
      return "(i32.rem_s)"
    case BinOp.Eq:
      return "(i32.eq)"
    case BinOp.Neq:
      return "(i32.ne)"
    case BinOp.Lte:
      return "(i32.le_s)"
    case BinOp.Gte:
      return "(i32.ge_s)"
    case BinOp.Lt:
      return "(i32.lt_s)"
    case BinOp.Gt:
      return "(i32.gt_s)"
    case BinOp.Is:
      return "(i32.eq)";
    case BinOp.And:
      return "(i32.and)"
    case BinOp.Or:
      return "(i32.or)"
  }
}

function codeGenInit(init : VarInit<[Type, SourceLocation]>, env : GlobalEnv) : Array<string> {
  const value = codeGenValue(init.value, env);
  if (env.locals.has(init.name)) {
    return [...value, `(local.set $${init.name})`]; 
  } else {
    return [...value, `(global.set $${init.name})`]; 
  }
}

function codeGenDef(def : FunDef<[Type, SourceLocation]>, env : GlobalEnv) : Array<string> {
  var definedVars : Set<string> = new Set();
  def.inits.forEach(v => definedVars.add(v.name));
  definedVars.add("$last");
  definedVars.add("$selector");
  // def.parameters.forEach(p => definedVars.delete(p.name));
  definedVars.forEach(env.locals.add, env.locals);
  def.inits.forEach(v => {
    env.local_type.set(v.name, v.type);
    // assert(v.type !== undefined);
  })
  def.parameters.forEach(p => env.locals.add(p.name));
  def.parameters.forEach(p => {
    env.local_type.set(p.name, p.type);
    // assert(p.type !== undefined);
  })
  env.labels = def.body.map(block => block.label);
  const localDefines = makeLocals(definedVars);
  const locals = localDefines.join("\n");
  const inits = def.inits.map(init => codeGenInit(init, env)).flat().join("\n");
  var params = def.parameters.map(p => `(param $${p.name} i32)`).join(" ");
  var inc_params: string[] = [];
  //inc ref_count: the param 
  def.parameters.forEach(p => { 
    if(p.type.tag == "class"){
      inc_params = [
        ...inc_params,
        `(local.get $${p.name}) ;; inc ref_count of parma $${p.name}`,
        `(call $inc_refcount)`,
        `(drop)`
      ]
    }
  });
  var dec_params: string[] = [];
  //dec refcount: the param and local_var
  def.parameters.forEach(p => { //dec refcount: the func param
    if(p.type.tag == "class"){
      dec_params = [
        ...dec_params,
        `(local.get $${p.name})`,
        `(call $dec_refcount) ;; dec ref_count of param $${p.name}`,
        `(drop)`
      ]
    }
  });
  def.inits.forEach(init => { //dec refcount: the local_var defined in the function
    if(init.type.tag == "class" && !init.name.includes("newObj")){
      dec_params = [
        ...dec_params,
        `(local.get $${init.name})`,
        `(call $dec_refcount) ;; dec ref_count of field $${init.name}`,
        `(drop)`
      ]
    }
  })
  var bodyCommands = "(local.set $$selector (i32.const 0))\n"
  bodyCommands += inc_params.join("\n");
  bodyCommands += "(loop $loop\n"

  var blockCommands = "(local.get $$selector)\n"
  blockCommands += `(br_table ${def.body.map(block => block.label).join(" ")})`;
  def.body.forEach(block => {
    blockCommands = `(block ${block.label}
              ${blockCommands}    
            ) ;; end ${block.label}
            `
            // ${block.stmts.map(stmt => codeGenStmt(stmt, env).join('\n')).join('\n')}
    const stmtsCommands: string[] = [];
    // add dec ref_count before return
    for (let i = 0; i < block.stmts.length; i++){
      let stmt = block.stmts[i];
      if(stmt.tag == "return"){
        stmtsCommands.push("\n;; dec ref_count of params and fields before each return \n" + dec_params.join("\n"));
      } 
      stmtsCommands.push(codeGenStmt(stmt, env).join("\n"));
    }
    
    // console.log("====" + stmtsCommands + "====");
    
    blockCommands += stmtsCommands.join("\n");
  })
  bodyCommands += blockCommands;
  bodyCommands += ") ;; end $loop"
  // add dec ref_count if there is no return
  bodyCommands += "\n;; dec ref_count of params and fields before the end of function\n" + dec_params.join("\n");
  env.locals.clear();
  env.local_type.clear();
  return [`(func $${def.name} ${params} (result i32)
    ${locals}
    ${inits}
    ${bodyCommands}
    (i32.const 0)
    (return))`];
}

function codeGenClass(cls : Class<[Type, SourceLocation]>, env : GlobalEnv) : Array<string> {
  const methods = [...cls.methods];
  methods.forEach(method => method.name = `${cls.name}$${method.name}`);
  const result = methods.map(method => codeGenDef(method, env));
  return result.flat();
}


/** Generate code to allocate a value of this type.
 * 
 * This will get called to handle the alloc IR instruction
 */
function codeGenAlloc(type: Type, amount: Value<[Type, SourceLocation]>, env: GlobalEnv): Array<string> {
  return [
    ...codeGenValue(amount, env),
    `(i32.const 0)`, // type info
    `call $alloc`
  ];
}

/** Generate code to allocate an instance of a class
 *
 * This will be called by codeGenAlloc in most cases
 */
function allocClass(cls: Class<[Type, SourceLocation]>) : Array<string> {
  const ret_stmt: Array<string> = [];
  return ret_stmt;
}

/** Generate code to decrease the refcount, if that variable is a pointer
 * (and don't do anything, if it's not a pointer)
 * This will get called when values are overwritten, and on local variables at
 * the end of a function
 */
function decRefcount(name: string, env: GlobalEnv): Array<string> {
  if(name.includes("newObj") || name.includes("valname")){
    return [];
  }
  const type = (env.local_type.has(name)) ? env.local_type.get(name) : env.global_type.get(name);
  switch(type.tag){
    case "number":
    case "bool":
      return [];
    case "none":
    case "class":
      return [
        `${(env.locals.has(name)) ? `local` : `global`}.get $${name}`,
        `call $dec_refcount`,
        `drop`
      ]
    case "either":
      throw new Error("Not good for either");
    default:
      throw new Error("Unexpect Error");
  }
}

/** Generate code to increase the refcount, if that variable is a pointer
 * (and don't do anything, if it's not a pointer)
 * This will get called when values are loaded from fields or variables
 */
function incRefcount(name: string, env: GlobalEnv): Array<string> {
  if(name.includes("newObj") || name.includes("valname")){
    return [];
  }
  const type = (env.local_type.has(name)) ? env.local_type.get(name) : env.global_type.get(name);
  switch(type.tag){
    case "number":
    case "bool":
      return [];
    case "none":
    case "class":
      return [
        `${(env.locals.has(name)) ? `local` : `global`}.get $${name}`,
        `call $inc_refcount`,
        `drop`
      ]
    case "either":
      throw new Error("Not good for either");
    default:
      throw new Error("Unexpect Error");
  }
}

/** Generate code to decrease the reference counts of all local variables
 *
 * This will get called on all exit paths from a function
 */
function freeAllLocals(env: GlobalEnv): Array<string> {
  throw new Error("TODO: Memory management implementation");
}

