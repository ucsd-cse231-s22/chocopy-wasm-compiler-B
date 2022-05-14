import { Program, Stmt, Expr, Value, Class, VarInit, FunDef } from "./ir"
import { BinOp, Type, UniOp, SourceLocation } from "./ast"
import { BOOL, NONE, NUM } from "./utils";

export type GlobalEnv = {
  globals: Map<string, Type>;
  classes: Map<string, Map<string, [number, Value<[Type, SourceLocation]>]>>;  
  locals: Map<string, Type>;
  labels: Array<string>;
  offset: number;
}

export const emptyEnv : GlobalEnv = { 
  globals: new Map(), 
  classes: new Map(),
  locals: new Map(),
  labels: [],
  offset: 0 
};

type CompileResult = {
  globals: string[],
  functions: string,
  mainSource: string,
  newEnv: GlobalEnv
};

export function makeLocals(locals: Map<string, Type>) : Array<string> {
  const localDefines : Array<string> = [];
  locals.forEach((type, name) => {
    localDefines.push(`(local $${name} i32)`);
  });
  return localDefines;
}

export function compile(ast: Program<[Type, SourceLocation]>, env: GlobalEnv) : CompileResult {
  const withDefines = env;

  const definedVars : Map<string, Type> = new Map();
  definedVars.set("$selector", {tag: "number"});
  definedVars.forEach((ty, name) => env.locals.set(name, ty));
  const localDefines = makeLocals(definedVars);
  const globalNames = ast.inits.map(init => init.name);
  console.log(ast.inits, globalNames);
  // Add the new global variables to the global environment
  ast.inits.forEach(init => env.globals.set(init.name, init.type));
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

  const destructorTable = makeDestructorTable(env);

  // const commandGroups = ast.stmts.map((stmt) => codeGenStmt(stmt, withDefines));
  const allCommands = [...localDefines, ...inits, bodyCommands];
  withDefines.locals.clear();
  return {
    globals: globalNames,
    functions: allFuns + destructorTable,
    mainSource: allCommands.join("\n"),
    newEnv: withDefines
  };
}

function codeGenStmt(stmt: Stmt<[Type, SourceLocation]>, env: GlobalEnv): Array<string> {
  switch (stmt.tag) {
    case "store":
      return [
        ...codeGenValue(stmt.start, env),
        ...codeGenValue(stmt.offset, env),
        ...codeGenValue(stmt.value, env),
        `call $store`
      ]
    case "assign":
      var valStmts = codeGenExpr(stmt.value, env);
      const freeStmts = decRefcount(stmt.name, env);
      if (env.locals.has(stmt.name)) {
        return valStmts.concat(freeStmts).concat([`(local.set $${stmt.name})`]);
      } else {
        return valStmts.concat(freeStmts).concat([`(global.set $${stmt.name})`]); 
      }

    case "return":
      var valStmts = codeGenValue(stmt.value, env);
      valStmts.push("return");
      return valStmts;

    case "expr":
      var exprStmts = codeGenExpr(stmt.expr, env);
      return exprStmts.concat([`drop`]);

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
      return codeGenAlloc(expr.a[0], expr.amount, env);

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
      return [`(i32.const 0)`];
    case "id":
      const incStmts = incRefcount(val.name, env);
      if (env.locals.has(val.name)) {
        return [...incStmts, `(local.get $${val.name})`];
        // return incStmts.concat([`(local.get $${val.name})`]);
      } else {
        return [...incStmts, `(global.get $${val.name})`];
        // return incStmts.concat([`(global.get $${val.name})`]);
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
  var definedVars : Map<string, Type> = new Map();
  def.inits.forEach(v => definedVars.set(v.name, v.type));
  definedVars.set("$selector", {tag: "number"});
  // def.parameters.forEach(p => definedVars.delete(p.name));
  definedVars.forEach((type, name) => env.locals.set(name, type));
  def.parameters.forEach(p => env.locals.set(p.name, p.type));
  env.labels = def.body.map(block => block.label);
  const localDefines = makeLocals(definedVars);
  const locals = localDefines.join("\n");
  const inits = def.inits.map(init => codeGenInit(init, env)).flat().join("\n");
  var params = def.parameters.map(p => `(param $${p.name} i32)`).join(" ");
  var bodyCommands = "(local.set $$selector (i32.const 0))\n"
  bodyCommands += "(loop $loop\n"

  var blockCommands = "(local.get $$selector)\n"
  blockCommands += `(br_table ${def.body.map(block => block.label).join(" ")})`;
  def.body.forEach(block => {
    blockCommands = `(block ${block.label}
              ${blockCommands}    
            ) ;; end ${block.label}
            ${block.stmts.map(stmt => codeGenStmt(stmt, env).join('\n')).join('\n')}
            `
  })
  bodyCommands += blockCommands;
  bodyCommands += ") ;; end $loop"
  env.locals.clear();
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
  const destructor = codeGenDestructor(cls, env);
  return methods.flatMap(method => codeGenDef(method, env)).concat(destructor);
}


/** Helper function for memory management: whether a type is a pointer.
 */
function isPointer(type: Type) : boolean {
  switch (type.tag) {
    case "class":
      return true;

    case "number":
    case "bool":
    case "none":
      return false;

    default:
      // FIXME (memory management): I don't know what an "either" is
      throw new Error(`Internal error: unhandled type ${type.tag}`);
  }
}

/** An array of the destructor names of special built-in types.
 *
 * TODO(memory management): Add the special built-in types to this array.
 */
const SPECIAL_DESTRUCTORS: string[] = [];

/** Generate code to allocate a value of this type.
 * 
 * This will get called to handle the alloc IR instruction
 */
function codeGenAlloc(type: Type, amount: Value<[Type, SourceLocation]>, env: GlobalEnv): Array<string> {
  let destructor_index: number;
  switch (type.tag) {
    case "class":
      destructor_index = Array.from(env.classes.keys()).indexOf(type.name);
      break;

    case "number":
    case "bool":
    case "none":
      throw new Error(`Internal error: ${type.tag}: not an allocated type`);

    default:
      throw new Error(`Internal error: unknown type ${type.tag}`);
  }

  return [
    ...codeGenValue(amount, env),
    `(i32.const ${destructor_index})`, // type info
    `call $alloc`
  ];
}

/** Generate the destructor function for a class
 *
 * Its name is $<class name>$$delete
 */
function codeGenDestructor(cls: Class<[Type, SourceLocation]>, env: GlobalEnv): Array<string> {
  const HEADER_SIZE = 8;
  const name = `$${cls.name}$$delete`;
  const stmts = cls.fields.flatMap((field, index) => {
    if (!isPointer(field.a[0]))
      return [];
    return [
      `(i32.load (i32.add (local.get $obj) (i32.const ${index * 4 + HEADER_SIZE})))`,
      `(call dec_refcount)`
    ];
  });
  return [` (func ${name} (param $obj i32) \n${stmts.join('\n')})`];
}

/** Generate code to decrease the refcount, if that variable is a pointer
 * (and don't do anything, if it's not a pointer)
 * This will get called when values are overwritten, and on local variables at
 * the end of a function
 */
function decRefcount(name: string, env: GlobalEnv): Array<string> {
  const ty =
    env.locals.has(name) ? env.locals.get(name) : env.globals.get(name);
  console.log(`decrementing ${name}`);
  console.log(env.locals, env.globals);
  if (!isPointer(ty))
    return [];
  return [
    `(local.get $${name})`,
    "(call dec_refcount)"
  ];
}

/** Generate code to increase the refcount, if that variable is a pointer
 * (and don't do anything, if it's not a pointer)
 * This will get called when values are loaded from fields or variables
 */
function incRefcount(name: string, env: GlobalEnv): Array<string> {
  const ty =
    env.locals.has(name) ? env.locals.get(name) : env.globals.get(name);
  console.log(`incrementing ${name}`);
  console.log(env.locals, env.globals);
  if (!isPointer(ty))
    return [];
  return [
    `(local.get $${name})`,
    "(call inc_refcount)"
  ];
}

/** Generate code to decrease the reference counts of all local variables
 *
 * This will get called on all exit paths from a function
 */
function freeAllLocals(env: GlobalEnv): Array<string> {
  return Array.from(env.locals.keys()).flatMap((name) => decRefcount(name, env));
}

/** Make the destructor table
 *
 * This is called once for the program
 */
function makeDestructorTable(env: GlobalEnv): string {
  const class_destructors =
    Array.from(env.classes.keys()).flatMap(cls => `$${cls}$$delete`);
  const destructors = [...SPECIAL_DESTRUCTORS, class_destructors];
  return `
    (table (export "destructors") funcref (elem
      ${destructors.join(' ')}))
  `;
}
