import {parse} from './parser';
import { run, Config, augmentEnv } from "./runner";
import {emptyLocalTypeEnv, GlobalTypeEnv, tc, tcStmt} from  './type-check';
import { Program, Type, Value, SourceLocation, BinOp, UniOp, Parameter } from './ast';
import { lowerProgram } from './lower';
import { importObject, addLibs  } from "./tests/import-object.test";
import { BasicREPL } from "./repl";
import * as ir from './ir';
import { CliRenderer } from "@diagrams-ts/graphviz-cli-renderer";
import { optimizeAst } from './optimize_ast';
import { optimizeIr, liveness_analysis, live_predicate } from './optimize_ir';


export function printProgIR(p: ir.Program<[Type, SourceLocation]>) {
  // p.body.map(bb => bb.stmts.map(stmt => printStmt(stmt)));
  console.log("--------------Inits-------------")
  p.inits.forEach(v => console.log(valInitStr(v)));
  console.log("--------------Func-------------")
  p.funs.forEach(printFuncDef);
  console.log("--------------CLS-------------")
  p.classes.forEach(printClass);
  console.log("--------------Body-------------")
  p.body.forEach(printBlock);
}

function valStr(val: ir.Value<[Type, SourceLocation]>): string {
  switch (val.tag) {
    case "num":
    case "wasmint":
    case "bool":
      return val.value.toString();
    case "id":
      return val.name;
    case "none":
      return "None";
    default:
      return "unknown";
  }
}

function argStr(p: Parameter<[Type, SourceLocation]>): string {
  return p.name + ": " + p.type.tag;
}

function valInitStr(val: ir.VarInit<[Type, SourceLocation]>): string {
  return `Init ${val.name}: ${val.type.tag} = ${valStr(val.value)}`;
}

function printFuncDef(fdef: ir.FunDef<[Type, SourceLocation]>) {
  console.log("--------------------------------");
  console.log("Func: " + fdef.name);
  fdef.parameters.forEach(p => console.log(argStr(p)));
  console.log("Ret -> " + fdef.ret.tag);
  console.log("--- init ---");
  fdef.inits.forEach(v => console.log(valInitStr(v)));
  console.log("--- body ---");
  fdef.body.forEach(printBlock);
  console.log("--------------------------------");
}

function printClass(cls: ir.Class<[Type, SourceLocation]>) {
  console.log("--------------------------------");
  console.log("Class: " + cls.name);
  console.log("--- filds ---");
  cls.fields.forEach(v => console.log(valInitStr(v)));
  console.log("--- methods ---");
  cls.methods.forEach(printFuncDef);
  console.log("--------------------------------");
}

function printBlock(bb: ir.BasicBlock<[Type, SourceLocation]>) {
  console.log("--------------------------------")
  console.log("L: " + bb.label);
  bb.stmts.forEach(printStmt);
  console.log("--------------------------------")
}

function printStmt(stmt: ir.Stmt<[Type, SourceLocation]>) {
  console.log("--" + stmt.tag);
  switch (stmt.tag) {
  case "assign":
    console.log("  " + stmt.name + " = ");
    console.log(exprStr(stmt.value));
    break;
  case "return":
    console.log(" RETURN ");
    break;
  case "expr":
    console.log(stmt.expr.tag);
    console.log(exprStr(stmt.expr));
    break;
  case "pass":
    console.log(" PASS ");
    break;
  case "ifjmp":
    console.log(" --> " + stmt.thn + " IF ");
    console.log(valStr(stmt.cond)); 
    console.log(" --> " + stmt.els + " ELSE ");
    break;
  case "jmp":
    console.log(" --> " + stmt.lbl);
    break;
  case "store":
    console.log(" Not handled yet " + stmt.tag);
    break;
  }
  console.log("\n");
}

function exprStr(expr: ir.Expr<[Type, SourceLocation]>): string {
  switch (expr.tag) {
  case "value":
    return valStr(expr.value)
  case "binop":
    return `${valStr(expr.left)} ${BinOp[expr.op]} ${valStr(expr.right)}`
  case "uniop":
    return `${UniOp[expr.op]} ${valStr(expr.expr)}`;
  case "call":
    const argStrs = expr.arguments.map(valStr).join(", ");
    return `${expr.name}(${argStrs})`;
  case "alloc":
    return ("alloc: " + expr.amount);
  case "load":
    return ("load: " + expr.start + " " + expr.offset);
  }
}


export enum JumpType { IF = 'green', ELSE = 'red', GOTO = 'black'}

function createBlock(lid: string, stmtStrs: Array<string>): string {
  const label = `<lbl> ${lid}`;
  const stmts = stmtStrs.map((s, i) => `<ins${i}> ${s}`);
  if (stmts.length > 0) {
    return `"${lid}" [label="${label} | {${stmts.join(' | ')}}"];`;
  } else {
    return `"${lid}" [label="${label}"];`; 
  }
}

function createInits(lid: string, inits: ir.VarInit<[Type, SourceLocation]>[]): string {
  const initStrs = inits.map(valInitStr);
  return `"${lid}" [label="Inits | {${initStrs.join(' | ')}}"]`;
}

function createArgs(lid: string, ps: Parameter<[Type, SourceLocation]>[]): string {
  const argStrs = `{${ps.map(argStr).join(' | ')}}`;
  return `"${lid}" [label="Args | ${argStrs}"]`;
}

function createBody(lid: string, body: ir.BasicBlock<[Type, SourceLocation]>[]): [string, string[]] {
  const bodyStr = [];
  bodyStr.push(`subgraph "cluster_${lid}"{`);
  bodyStr.push(`label="${lid}"`);
  const jmps: Array<string> = []
  body.forEach(bb => {
    const stmtStrs: Array<string>= [];
    bb.stmts.forEach((stmt, i) => {
      const sj = inLineStmt(stmt, bb.label, i)
      stmtStrs.push(sj[0]);
      jmps.push(...sj[1]);
    });
    bodyStr.push(createBlock(bb.label, stmtStrs));
  });
  bodyStr.push("}");
  return [bodyStr.join("\n"), jmps];
}

function createFuncDef(lid: string, fdef: ir.FunDef<[Type, SourceLocation]>): [string, string[]] {
  const defStr = [];
  defStr.push(`subgraph "cluster_${lid}"{`);
  defStr.push(`label="${fdef.ret.tag} @${fdef.name}"`);
  defStr.push(createArgs(`$${fdef.name}$args`, fdef.parameters));
  defStr.push(createInits(`$${fdef.name}$inits`, fdef.inits));
  const body = createBody(`$${fdef.name}$body`, fdef.body); 
  defStr.push(body[0]);
  defStr.push("}");
  return [defStr.join('\n'), body[1]];
}

function createClass(lid: string, cls: ir.Class<[Type, SourceLocation]>): [string, string[]] {
  const clsStr = [];
  clsStr.push(`subgraph "cluster_${lid}"{`);
  clsStr.push(`label="${cls.name}"`);
  clsStr.push(createInits(`$${cls.name}$fields`, cls.fields));
  const jmps: Array<string> = [];
  cls.methods.forEach(mdef => {
    const fsub = createFuncDef(`$${cls.name}${mdef.name}`, mdef);
    clsStr.push(fsub[0]);
    jmps.push(...fsub[1]);
  });
  clsStr.push("}");
  return [clsStr.join('\n'), jmps]
}

type EdgeTarget = [string, string]
function createEdge(s: EdgeTarget, t: EdgeTarget, jt: JumpType) {
  return `"${s[0]}":${s[1]} -> "${t[0]}":${t[1]} [color = ${jt}];`
}

export function dotProg(p: ir.Program<[Type, SourceLocation]>): string {
  const dotStr: Array<string> = [];
  dotStr.push("digraph IR {");
  dotStr.push(`
  node [shape=record];
  graph [labeljust=l];
  ratio = "fill";
  `);
  dotStr.push(createInits("$IR_VARINITS", p.inits));
  p.funs.forEach(f => {
    const fsub = createFuncDef(f.name, f);
    dotStr.push(fsub[0]);
    dotStr.push(...fsub[1]);
  });
  p.classes.forEach(cls => {
    const clsSub = createClass(cls.name, cls);
    dotStr.push(clsSub[0]);
    dotStr.push(...clsSub[1]);
  });
  p.body.forEach(bb => {
    const stmtStrs: Array<string>= [], jmps: Array<string> = [];
    bb.stmts.forEach((stmt, i) => {
      const sj = inLineStmt(stmt, bb.label, i)
      stmtStrs.push(sj[0]);
      jmps.push(...sj[1]);
    });
    dotStr.push(createBlock(bb.label, stmtStrs));
    dotStr.push(...jmps);
  });
  dotStr.push("}");
  const dotCode = dotStr.join("\n");
  console.log(dotCode);
  return dotCode;

}

function inLineStmt(stmt: ir.Stmt<[Type, SourceLocation]>, curBlock: string, i: number): [string, Array<string>] {
  switch (stmt.tag) {
    case "assign": {
      return [stmt.name + " = " + exprInline(stmt.value), []];
    }
    case "return": {
      return ["return " + valInline(stmt.value), []];
    }
    case "expr": {
      return [exprInline(stmt.expr), []];
    }
    case "pass": {
      return ["pass", []];
    }
    case "ifjmp":
      const ifjmpLabel = valInline(stmt.cond) + " ? " + stmt.thn + ":" + stmt.els;
      const jmpIf = createEdge([`${curBlock}`, `ins${i.toString()}`], [`${stmt.thn}`, "lbl"], JumpType.IF);
      const jmpElse = createEdge([`${curBlock}`, `ins${i.toString()}`], [`${stmt.els}`, "lbl"], JumpType.ELSE);
      return [ifjmpLabel, [jmpIf, jmpElse]];
    case "jmp":
      const jmpLabel = "goto: " + stmt.lbl;
      return [jmpLabel, [createEdge([`${curBlock}`, `ins${i.toString()}`], [`${stmt.lbl}`, "lbl"], JumpType.GOTO)]];
    case "store":
      const storeLabel = "st " + valInline(stmt.value) + " to " + valInline(stmt.start) + " + " + valInline(stmt.offset);
      return [storeLabel, []];
  }
}

function exprInline(expr: ir.Expr<[Type, SourceLocation]>): string {
  switch (expr.tag) {
    case "value":
      return valInline(expr.value);
    case "binop":
      return valInline(expr.left) + " " + BinOp[expr.op] + " " + valInline(expr.right);
    case "uniop":
      return UniOp[expr.op] + " " + valInline(expr.expr);
    case "call":
      const argStrs = expr.arguments.map(valInline);
      return expr.name + "(" + argStrs.join(", ") + ")";
    case "alloc":
      return "alloc " + expr.amount;
    case "load":
      return "ld " + expr.start + ", " + expr.offset
    }
}

function valInline(val: ir.Value<[Type, SourceLocation]>): string {
  switch (val.tag) {
  case "num":
  case "wasmint":
  case "bool":
    return val.value.toString()
  case "id":
    return val.name;
  case "none":
    return "None";
  }
}

// entry point for debugging
async function debug(optAst: boolean = false, optIR: boolean = false) {
  var source = 
`
a: int = 10
b: int = 6
r: int = 0
while (a % b) > 0:
  r = a % b
  a = b
  b = r
b
`
  const parsed = parse(source);
  // console.log(JSON.stringify(parsed, null, 2));
  const repl = new BasicREPL(await addLibs());
  // const program_type = repl.tc(source);
  const config : Config = {importObject: repl.importObject, env: repl.currentEnv, typeEnv: repl.currentTypeEnv, functions: repl.functions};
  var [tprogram, tenv] = tc(config.typeEnv, parsed);
  if (optAst)
    tprogram = optimizeAst(tprogram);
  console.log(JSON.stringify(tprogram, null, 2));
  const globalEnv = augmentEnv(config.env, tprogram);
  var irprogram = lowerProgram(tprogram, globalEnv);
  if (optIR)
    irprogram = optimizeIr(irprogram);
  console.log(JSON.stringify(irprogram, (k, v) => typeof v === "bigint" ? v.toString(): v, 2));
  printProgIR(irprogram);

  const lp: live_predicate = liveness_analysis(irprogram.body);
  console.log(lp);
  // const render = CliRenderer({ outputFile: "./example.svg", format: "svg" });
  // const dot = dotProg(irprogram);
  // await render(dot);
}

debug(false, false);