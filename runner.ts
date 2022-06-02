// This is a mashup of tutorials from:
//
// - https://github.com/AssemblyScript/wabt.js/
// - https://developer.mozilla.org/en-US/docs/WebAssembly/Using_the_JavaScript_API

import wabt from 'wabt';
import { compile, GlobalEnv } from './compiler';
import {parse} from './parser';
import {emptyLocalTypeEnv, GlobalTypeEnv, tc, tcStmt} from  './type-check';
import { Program, Type, Value, SourceLocation } from './ast';
import { optimizeAst } from './optimize_ast';
import { optimizeIr } from './optimize_ir';
import { PyValue, NONE, BOOL, NUM, CLASS } from "./utils";
import { lowerProgram } from './lower';
import { BuiltinLib } from './builtinlib';
import { BlobOptions } from 'buffer';
import { removeGenerics } from './remove-generics';

export type Config = {
  importObject: any;
  // env: compiler.GlobalEnv,
  env: GlobalEnv,
  typeEnv: GlobalTypeEnv,
  functions: string        // prelude functions
}

export var sourceCode = "";

// NOTE(joe): This is a hack to get the CLI Repl to run. WABT registers a global
// uncaught exn handler, and this is not allowed when running the REPL
// (https://nodejs.org/api/repl.html#repl_global_uncaught_exceptions). No reason
// is given for this in the docs page, and I haven't spent time on the domain
// module to figure out what's going on here. It doesn't seem critical for WABT
// to have this support, so we patch it away.
if(typeof process !== "undefined") {
  const oldProcessOn = process.on;
  process.on = (...args : any) : any => {
    if(args[0] === "uncaughtException") { return; }
    else { return oldProcessOn.apply(process, args); }
  };
}

export async function runWat(source : string, importObject : any) : Promise<any> {
  const wabtInterface = await wabt();
  const myModule = wabtInterface.parseWat("test.wat", source);
  var asBinary = myModule.toBinary({});
  var wasmModule = await WebAssembly.instantiate(asBinary.buffer, importObject);
  const result = (wasmModule.instance.exports.exported_func as any)();
  return [result, wasmModule];
}


export function augmentEnv(env: GlobalEnv, prog: Program<[Type, SourceLocation]>) : GlobalEnv {
  const newGlobals = new Map(env.globals);
  const newClasses = new Map(env.classes);

  var newOffset = env.offset;
  prog.inits.forEach((v) => {
    newGlobals.set(v.name, true);
  });
  prog.classes.forEach(cls => {
    const classFields = new Map();
    cls.fields.forEach((field, i) => classFields.set(field.name, [i, field.value]));
    newClasses.set(cls.name, classFields);
  });
  return {
    globals: newGlobals,
    classes: newClasses,
    locals: env.locals,
    labels: env.labels,
    offset: newOffset
  }
}


// export async function run(source : string, config: Config) : Promise<[Value, compiler.GlobalEnv, GlobalTypeEnv, string]> {

export async function run(source : string, config: Config, astOpt: boolean = false, irOpt: boolean = false) : Promise<[Value, GlobalEnv, GlobalTypeEnv, string, WebAssembly.WebAssemblyInstantiatedSource, string]> {
  const parsed = parse(source);
  sourceCode = source;
  const specialized = removeGenerics(parsed);
  var [tprogram, tenv] = tc(config.typeEnv, specialized);
  if(astOpt){
    tprogram = optimizeAst(tprogram);
  }
  const globalEnv = augmentEnv(config.env, tprogram);
  var irprogram = lowerProgram(tprogram, globalEnv);

  if(irOpt){
    irprogram = optimizeIr(irprogram);
  }
  // printProgIR(irprogram);

  let progTyp = tprogram.a[0];
  var returnType = "";
  var returnExpr = "";
  // const lastExpr = parsed.stmts[parsed.stmts.length - 1]
  // const lastExprTyp = lastExpr.a;
  // console.log("LASTEXPR", lastExpr);
  if (progTyp === NUM) {
    progTyp = NONE;
    returnExpr = "(local.get $$last)\n(call $print_last_num)\n(local.set $$last)" // use set to consume the element on stack
  } else if (progTyp === BOOL) {
    returnType = "(result i32)";
    returnExpr = "(local.get $$last)"
  }
  let globalsBefore = config.env.globals;
  // const compiled = compiler.compile(tprogram, config.env);
  const compiled = compile(irprogram, globalEnv);

  const globalImports = [...globalsBefore.keys()].map(name =>
    `(import "env" "${name}" (global $${name} (mut i32)))`
  ).join("\n");
  const globalDecls = compiled.globals.map(name =>
    `(global $${name} (export "${name}") (mut i32) (i32.const 0))`
  ).join("\n");

  const importObject = config.importObject;
  if(!importObject.js) {
    const memory = new WebAssembly.Memory({initial:2000, maximum:2000});
    importObject.js = { memory: memory };
  }
  const funcs = `(func $abs (import "imports" "abs") (param i32) (result i32))
  (func $min (import "imports" "min") (param i32) (param i32) (result i32))
  (func $max (import "imports" "max") (param i32) (param i32) (result i32))
  (func $pow (import "imports" "pow") (param i32) (param i32) (result i32))
  `
  const wasmSource = `(module
    (import "js" "memory" (memory 1))
    (func $index_out_of_bounds (import "imports" "index_out_of_bounds") (param i32) (param i32) (result i32))
    (func $division_by_zero (import "imports" "division_by_zero") (param i32) (param i32) (param i32) (result i32))
    (func $assert_not_none (import "imports" "assert_not_none") (param i32) (param i32) (param i32) (result i32))
    (func $stack_push (import "imports" "stack_push") (param i32))
    (func $stack_clear (import "imports" "stack_clear"))
    (func $print_last_num (import "imports" "print_last_num") (param i32) (result i32))
    (func $print_num (import "imports" "print_num") (param i32) (result i32))
    (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
    (func $print_none (import "imports" "print_none") (param i32) (result i32))
    (func $plus (import "imports" "plus") (param i32) (param i32) (result i32))
    (func $minus (import "imports" "minus") (param i32) (param i32) (result i32))
    (func $mul (import "imports" "mul") (param i32) (param i32) (result i32))
    (func $iDiv (import "imports" "iDiv") (param i32) (param i32) (result i32))
    (func $mod (import "imports" "mod") (param i32) (param i32) (result i32))
    (func $eq (import "imports" "eq") (param i32) (param i32) (result i32))
    (func $neq (import "imports" "neq") (param i32) (param i32) (result i32))
    (func $lte (import "imports" "lte") (param i32) (param i32) (result i32))
    (func $gte (import "imports" "gte") (param i32) (param i32) (result i32))
    (func $lt (import "imports" "lt") (param i32) (param i32) (result i32))
    (func $gt (import "imports" "gt") (param i32) (param i32) (result i32))
    (func $get_num (import "imports" "get_num") (param i32) (result i32))
${BuiltinLib.map(x=>`    (func $${x.name} (import "imports" "${x.name}") ${"(param i32)".repeat(x.typeSig[0].length)} (result i32))`).join("\n")}
    (func $alloc (import "libmemory" "alloc") (param i32) (result i32))
    (func $load (import "libmemory" "load") (param i32) (param i32) (result i32))
    (func $store (import "libmemory" "store") (param i32) (param i32) (param i32))
    (func $set$add (import "libset" "set$add") (param i32) (param i32) (result i32))
    (func $set$contains (import "libset" "set$contains") (param i32) (param i32) (result i32))
    (func $set$length (import "libset" "set$length") (param i32) (result i32))
    (func $set$remove (import "libset" "set$remove") (param i32) (param i32) (result i32))
    (func $set$print (import "libset" "set$print") (param i32) (result i32))
    (func $set$update (import "libset" "set$update") (param i32) (param i32) (result i32))
    (func $set$clear (import "libset" "set$clear") (param i32) (result i32))
    (func $set$firstItem (import "libset" "set$firstItem") (param i32) (result i32))
    (func $set$hasnext (import "libset" "set$hasnext") (param i32) (param i32) (result i32))
    (func $set$next (import "libset" "set$next") (param i32) (param i32) (result i32))
    ${globalImports}
    ${globalDecls}
    ${config.functions}
    ${compiled.functions}
    (func (export "exported_func") ${returnType}
      ${compiled.mainSource}
      ${returnExpr}
    )
  )`;
  console.log(wasmSource);
  const [result, instance] = await runWat(wasmSource, importObject);

  return [PyValue(progTyp, result), compiled.newEnv, tenv, compiled.functions, instance, wasmSource];
}
