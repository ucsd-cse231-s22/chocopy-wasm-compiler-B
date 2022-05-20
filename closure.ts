import { Stmt, Expr, Type, UniOp, BinOp, Literal, Program, FunDef, VarInit, Class, SourceLocation } from './ast';
import { TypeCheckError } from './error_reporting'
import { NUM, BOOL, NONE, CLASS } from './utils';

let closureClassCounter = 0

export function translateClosuresToClasses(program : Program<SourceLocation>): Program<SourceLocation> {
  closureClassCounter = 0

  program.funs.forEach(func => translateClosuresInFunc(func, program))
  // TODO methods in class might also contain closures

  return program
}

function translateClosuresInFunc(f: FunDef<SourceLocation>, program: Program<SourceLocation>) {
  const body: Stmt<SourceLocation>[] = []
  for (const stmt of f.body) {
    if (stmt.tag == "closure") {
      // global variable
      // def f
      //     def g <-- closure
      const g = stmt.func

      // generate a name C for the closure class
      const gClassName = genClosureClassName(g.name)

      // escape analysis
      // get a list of closure variables (focus on read-only now) and their types
      const closureVars: Map<string, Type> = new Map();
      const reads: Set<string> = new Set();
      for (const s of g.body) {
        getStmtRW(s, reads);
      }

      for (const p of g.parameters) {
        reads.delete(p.name);
      }
      for (const v of g.inits) {
        reads.delete(v.name);
      }

      const flocals: Map<string, Type> = new Map() // local vars in f
                                                   // part of it becomes closure vars for g
      for (const p of f.parameters) {
        flocals.set(p.name, p.type)
      }
      for (const v of f.inits) {
        flocals.set(v.name, v.type)
      }

      for (const id of reads) {
        if (flocals.has(id)) {
          closureVars.set(id, flocals.get(id))
        } else {
          if (!program.inits.some(ini => ini.name === id)) {
            throw new TypeCheckError(`unknown variable ${id}`);
          }
        }
      }

      // generate a class C
      // TODO C is a subclass of Callable...
      //     field 1 with type
      //     field 2 with type...
      //     def __call__(...) -> ...:  the original function
      const gFields: VarInit<SourceLocation>[] = []
      for (const [v, t] of closureVars.entries()) {
        const field = {
          a: g.a,
          name: v,
          type: t,
          value: defaultLiteral(t)
        };
        gFields.push(field)
      }
      closureReadsToSelf(g.body, closureVars);
      const callMethod = {
        a: g.a,
        name: "__call__",
        parameters: [{name: "self", type: CLASS(gClassName)}, ...g.parameters],
        ret: g.ret,
        inits: g.inits,
        body: g.body,
      };
      const initMethod = {
        a: g.a,
        name: "__init__",
        parameters: [{name: "self", type: CLASS(gClassName)}],
        ret: NONE,
        inits: [] as any,
        body: [] as any
      };
      const gClass: Class<SourceLocation> = {
        a: g.a,
        name: gClassName,
        fields: gFields,
        methods: [callMethod, initMethod]
      }
      program.classes.push(gClass)

      // add funcname to localEnv
      f.inits.push({
        a: g.a,
        name: g.name,
        type: CLASS(gClassName),
        value: {tag: "none"}
      });

      // funcname = C()       # create the closure instance
      body.push({
        a: g.a,
        tag: "assign",
        name: g.name,
        value: {
          tag: "call",
          name: gClassName,
          arguments: []
        }
      })

      // func.field1 = field1
      // func.field2 = field2
      // ...
      for (const v of closureVars.keys()) {
        body.push({
          a: g.a,
          tag: "field-assign",
          obj: {
            a: g.a,
            tag: "id",
            name: g.name,
          },
          field: v,
          value: {   // TODO might be self.v for nested closures
            a: g.a,
            tag: "id",
            name: v
          }
        });
      }
    } else {
      body.push(stmt)
    }
  }
  f.body = body
}

// modify in place
function closureReadsToSelf(stmts: Stmt<SourceLocation>[], closureVars: Map<string, Type>) {
  for (const stmt of stmts) {
    switch(stmt.tag) {
      case "assign":
        stmt.value = closureReadsToSelfInExpr(stmt.value, closureVars)
        return;
      case "return":
        stmt.value = closureReadsToSelfInExpr(stmt.value, closureVars)
        return;
      case "expr":
        stmt.expr = closureReadsToSelfInExpr(stmt.expr, closureVars)
        return;
      case "field-assign":
        stmt.obj = closureReadsToSelfInExpr(stmt.obj, closureVars)
        stmt.value = closureReadsToSelfInExpr(stmt.value, closureVars)
        return;
      case "if":
        stmt.cond = closureReadsToSelfInExpr(stmt.cond, closureVars)
        closureReadsToSelf(stmt.thn, closureVars)
        closureReadsToSelf(stmt.els, closureVars)
        return;
      case "while":
        stmt.cond = closureReadsToSelfInExpr(stmt.cond, closureVars)
        closureReadsToSelf(stmt.body, closureVars)
        return;
      case "closure":
        throw new Error("nested closure not implemented"); //TODO
      case "pass":
      case "nonlocal":
      case "global":
        return;
    }
  }
}

// return a new one
function closureReadsToSelfInExpr(expr: Expr<SourceLocation>, closureVars: Map<string, Type>): Expr<SourceLocation> {
  switch(expr.tag) {
    case "literal":
      return expr;
    case "id":
      if (closureVars.has(expr.name)) {
        return {
          tag: "lookup",
          obj: {
            tag: "id",
            name: "self"
          },
          field: expr.name
        }
      } else {
        return expr
      }
    case "binop": {
      return {
        ...expr,
        left: closureReadsToSelfInExpr(expr.left, closureVars),
        right: closureReadsToSelfInExpr(expr.right, closureVars)
      };
    }
    case "uniop":
      return {
        ...expr,
        expr: closureReadsToSelfInExpr(expr.expr, closureVars),
      };
    case "builtin1":
      return {
        ...expr,
        arg: closureReadsToSelfInExpr(expr.arg, closureVars),
      };
    case "builtin2":
      return {
        ...expr,
        left: closureReadsToSelfInExpr(expr.left, closureVars),
        right: closureReadsToSelfInExpr(expr.right, closureVars)
      };
    case "call":
      // TODO: expr.name
      return {
        ...expr,
        arguments: expr.arguments.map(arg => closureReadsToSelfInExpr(arg, closureVars))
      }
    case "lookup":
      return {
        ...expr,
        obj: closureReadsToSelfInExpr(expr.obj, closureVars),
      }
    case "method-call":
      return {
        ...expr,
        obj: closureReadsToSelfInExpr(expr.obj, closureVars),
        arguments: expr.arguments.map(arg => closureReadsToSelfInExpr(arg, closureVars))
      }
    case "construct":
      throw new Error("unreachable: construct");
    case "lambda":
      throw new Error("lambda not implemented");
  }
}

function genClosureClassName(originalName: string) {
  return `Clo_${closureClassCounter++}_${originalName}`
}

function getExprRW(expr: Expr<SourceLocation>, reads: Set<string>) {
  switch(expr.tag) {
    case "literal":
      return;
    case "id":
      reads.add(expr.name);
      return;
    case "binop": {
      getExprRW(expr.left, reads);
      getExprRW(expr.right, reads);
      return;
    }
    case "uniop":
      getExprRW(expr.expr, reads);
      return;
    case "builtin1":
      getExprRW(expr.arg, reads);
      return;
    case "builtin2":
      getExprRW(expr.left, reads);
      getExprRW(expr.right, reads);
      return;
    case "call":
      // TODO: add expr.name
      for (const arg of expr.arguments) {
        getExprRW(arg, reads);
      }
      return;
    case "lookup":
      getExprRW(expr.obj, reads);
      return;
    case "method-call":
      getExprRW(expr.obj, reads);
      for (const arg of expr.arguments) {
        getExprRW(arg, reads);
      }
      return;
    case "construct":
      throw new Error("unreachable: construct");
    case "lambda":
      throw new Error("lambda not implemented");
  }
}

function getStmtRW(stmt: Stmt<SourceLocation>, reads: Set<string>) {
  switch(stmt.tag) {
    case "assign":
      getExprRW(stmt.value, reads);
      return;
    case "return":
      getExprRW(stmt.value, reads);
      return;
    case "expr":
      getExprRW(stmt.expr, reads);
      return;
    case "field-assign":
      getExprRW(stmt.obj, reads);
      getExprRW(stmt.value, reads);
      return;
    case "if":
      getExprRW(stmt.cond, reads);
      for (const s of stmt.thn) {
        getStmtRW(s, reads);
      }
      for (const s of stmt.els) {
        getStmtRW(s, reads);
      }
      return;
    case "while":
      getExprRW(stmt.cond, reads);
      for (const s of stmt.body) {
        getStmtRW(s, reads);
      }
      return;
    case "closure":
      // TODO: find free var
      throw new Error("nested closure not implemented");
    case "pass":
    case "nonlocal":
    case "global":
      return;
  }
}

function defaultLiteral(t: Type): Literal {
  switch(t.tag) {
    case "number":
      return { tag: "num", value: 0 }
    case "bool":
      return { tag: "bool", value: false }
    default:
      return { tag: "none" }
  }
}
