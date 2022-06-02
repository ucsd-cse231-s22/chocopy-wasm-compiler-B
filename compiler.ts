import { Program, Stmt, Expr, Value, Class, VarInit, FunDef } from "./ir"
import { BinOp, Type, UniOp, SourceLocation } from "./ast"
import { BOOL, NONE, NUM } from "./utils";
import { RunTimeError } from "./error_reporting";

export type GlobalEnv = {
  globals: Map<string, boolean>;
  classes: Map<string, Map<string, [number, Value<[Type, SourceLocation]>]>>;
  classesMethods?: Map<string, Map<string, [number, Type]>>; // class -> {method -> [offset, return type]}
  classVTableOffsets?: Map<string, number>;
  locals: Set<string>;
  labels: Array<string>;
  offset: number;
}

export const emptyEnv : GlobalEnv = { 
  globals: new Map(), 
  classes: new Map(),
  classesMethods: new Map(),
  locals: new Set(),
  labels: [],
  offset: 0 
};

type CompileResult = {
  globals: string[],
  functions: string,
  mainSource: string,
  newEnv: GlobalEnv,
  methodsVTable? : string
};

export function makeLocals(locals: Set<string>) : Array<string> {
  const localDefines : Array<string> = [];
  localDefines.push(`(local $scratch i32)`);
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
  // console.log(ast.inits, globalNames);
  const funs : Array<string> = [];
  ast.funs.forEach(f => {
    funs.push(codeGenDef(f, withDefines).join("\n"));
  });
  const classes : Array<string> = ast.classes.map(cls => codeGenClass(cls, withDefines)).flat();
  const allFuns = funs.concat(classes).join("\n\n");

  // set up vtable
  var tableOffset = 0;
  ast.classes.forEach(cls => {
    tableOffset += cls.methods.length;
  });
  const vTable : Array<string> = [
    `(table ${tableOffset} funcref)`,
    `(elem (i32.const 0) `,
  ];
  let orderedMethods : Array<string> = [];
  ast.classes.forEach(cls => {
    cls.methods.forEach(methodDef => {
      orderedMethods.push(`$${methodDef.name}`);
    });
  });
  vTable.push(orderedMethods.join(" "));
  vTable.push(`)`);
  console.log("vtable:", vTable);

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
  const allCommands = [...localDefines, ...inits, `(call $stack_clear)`, bodyCommands];
  withDefines.locals.clear();
  return {
    globals: globalNames,
    functions: allFuns,
    mainSource: allCommands.join("\n"),
    newEnv: withDefines,
    methodsVTable: vTable.join("\n")
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
      if (env.locals.has(stmt.name)) {
        return valStmts.concat([`(local.set $${stmt.name})`]); 
      } else {
        return valStmts.concat([`(global.set $${stmt.name})`]); 
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
      var divbyzero = ``;
      if(expr.op === BinOp.IDiv || expr.op === BinOp.Mod) {
        // line number and column number

        divbyzero = `(i32.const ${expr.a[1].line})(i32.const ${expr.a[1].column})(call $division_by_zero)`;
      }
      return [...lhsStmts, ...rhsStmts, divbyzero, codeGenBinOp(expr.op)]

    case "uniop":
      const exprStmts = codeGenValue(expr.expr, env);
      switch(expr.op){
        case UniOp.Neg:
          return [`(i32.const 0)`, ...exprStmts, `(i32.sub)`];
        case UniOp.Not:
          return [`(i32.const 0)`, ...exprStmts, `(i32.eq)`];
      }

    case "call":
      if (expr.name=="print"){
        if (expr.arguments[0].a[0].tag === "set") {
          let argCode = codeGenValue(expr.arguments[0], env);
          argCode.push("(call $set$print)");
          return argCode;
        }
        var valStmts = expr.arguments.map(arg=>{
          let argCode = codeGenValue(arg, env);
          switch (arg.a[0]){
            case NUM:
              argCode.push("(call $print_num)");
              break;
            case BOOL:
              argCode.push("(call $print_bool)");
              break;
            case NONE:
              argCode.push("(call $print_none)");
              break;  
            default:
              throw new RunTimeError("not implemented object print")
          }
          argCode.push("drop");
          return argCode;
        }).flat();
        return valStmts.slice(0,-1);
      }
      var valStmts = expr.arguments.map((arg) => codeGenValue(arg, env)).flat();
      valStmts.push(`(i32.const ${expr.a[1].line})`);
      valStmts.push(`(call $stack_push)`);
      if(expr.name === 'assert_not_none'){
        valStmts.push(`(i32.const ${expr.a[1].line})(i32.const ${expr.a[1].column}) `);
      }
      valStmts.push(`(call $${expr.name})`);
      return valStmts;

    case "call_indirect":
    /*
    e.g. obj.foo(1, 2), returns a bool
    (type $C$foo (func (param i32) (param i32) (result f32)) <-- do this as part of codeGenClass
    say that obj is of type C, which has offset 0 into the vtable
    say that foo has method offset 1, so the overall offset is 0+1 = 1

    <2 is on the stack>
    <1 is on the stack>
    <address to obj is on the stack>
    <put address to obj on the stack again>
    (i32.load) <-- loads the class offset, which is 0
    (i32.add 1) <-- add the method offset
    (call_indirect (type $C$foo))
    */
      var valStmts : Array<string> = [];
      const firstArg = expr.arguments[0];
      if (firstArg.tag == "id" && env.classVTableOffsets.has(firstArg.name)) {
        valStmts = expr.arguments.map((arg) => codeGenValue(arg, env)).flat(); // load arguments onto stack except for the class name, which gets turned into a no-op basically
        valStmts.push(`(i32.const ${env.classVTableOffsets.get(firstArg.name)})`); // class offset
      } else {
        valStmts = expr.arguments.map((arg) => codeGenValue(arg, env)).flat(); // load arguments onto stack
        // duplicate the address
        valStmts.push(...codeGenValue(expr.arguments[0], env));
        valStmts.push(`(i32.load)`); // load the class offset
      }

      /*
      class A(object):
          x : int = 0
          def foo(self : A):
              print(self.A)
      class B(A):
          def foo(self : B):
              self.x = 3
              A.foo(self) ==> the arglist is [A, self]
      b : B = None
      b = B()
      b.foo()
      # we expect this to print 3
      */

      valStmts.push(`(i32.add (i32.const ${expr.method_offset}))`); // add the method offset

      valStmts.push(`(call_indirect (type $${expr.name}))`); // expr.name already includes the class name
      
      return valStmts;
    
    case "alloc":
      return [
        ...codeGenValue(expr.amount, env),
        `call $alloc`
      ];
    case "load":
      return [
        ...codeGenValue(expr.start, env),
        `(i32.const ${expr.a[1].line})(i32.const ${expr.a[1].column}) (call $assert_not_none)`,
        // `call $assert_not_none`,
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
      if (env.classVTableOffsets.has(val.name)) {
        return [];
      } else if (env.locals.has(val.name)) {
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
// super().show()
// A.show() -> A -> id -> call_indirect A$show
function codeGenDef(def : FunDef<[Type, SourceLocation]>, env : GlobalEnv) : Array<string> {
  var definedVars : Set<string> = new Set();
  def.inits.forEach(v => definedVars.add(v.name));
  definedVars.add("$last");
  definedVars.add("$selector");
  // def.parameters.forEach(p => definedVars.delete(p.name));
  definedVars.forEach(env.locals.add, env.locals);
  def.parameters.forEach(p => env.locals.add(p.name));
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

// Generate method type signatures
function codeGenSig(def : FunDef<[Type, SourceLocation]>, env : GlobalEnv) : Array<string> {
  var params = def.parameters.map(p => `(param i32)`).join(" "); // at some point we should actually make sure we use the correct type for params
  var ret = 'i32'
  switch(def.ret) {
    default:
      ret = 'i32'
  }
  return [`(type $${def.name} (func ${params} (result ${ret})))`];
}

function codeGenClass(cls : Class<[Type, SourceLocation]>, env : GlobalEnv) : Array<string> {
  const methods = [...cls.methods];
  methods.forEach(method => method.name = `${cls.name}$${method.name}`);
  const result = methods.map(method => codeGenDef(method, env));
  const methodTypes = methods.map(method => codeGenSig(method, env));
  return [...result.flat(), ...methodTypes.flat()];
}
