// import { TypeCheckError } from "./type-check";

// export enum Type {NUM, BOOL, NONE, OBJ}; 
export type Type =
  | {tag: "number"}
  | {tag: "bool"}
  | {tag: "none"}
  | {tag: "class", name: string}
  | {tag: "func"; args: Type[]; ret: Type }
  | {tag: "either", left: Type, right: Type }

export type Parameter<A> = { name: string, type: Type }

export type Program<A> = { a?: A, funs: Array<FunDef<A>>, inits: Array<VarInit<A>>, classes: Array<Class<A>>, stmts: Array<Stmt<A>> }

export type Class<A> = { a?: A, name: string, fields: Array<VarInit<A>>, methods: Array<FunDef<A>>}

export type VarInit<A> = { a?: A, name: string, type: Type, value: Literal }

export type FunDef<A> = { a?: A, name: string, parameters: Array<Parameter<A>>, ret: Type, inits: Array<VarInit<A>>, body: Array<Stmt<A>> }

export type Stmt<A> =
  | {  a?: A, tag: "assign", name: string, value: Expr<A> }
  | {  a?: A, tag: "return", value: Expr<A> }
  | {  a?: A, tag: "expr", expr: Expr<A> }
  | {  a?: A, tag: "pass" }
  | {  a?: A, tag: "field-assign", obj: Expr<A>, field: string, value: Expr<A> }
  | {  a?: A, tag: "if", cond: Expr<A>, thn: Array<Stmt<A>>, els: Array<Stmt<A>> }
  | {  a?: A, tag: "while", cond: Expr<A>, body: Array<Stmt<A>> }
  | {  a?: A, tag: "closure", func: FunDef<A> }
  | {  a?: A, tag: "nonlocal", vars: string[] }
  | {  a?: A, tag: "global", vars: string[] }

export type Expr<A> =
    {  a?: A, tag: "literal", value: Literal }
  | {  a?: A, tag: "id", name: string }
  | {  a?: A, tag: "binop", op: BinOp, left: Expr<A>, right: Expr<A>}
  | {  a?: A, tag: "uniop", op: UniOp, expr: Expr<A> }
  | {  a?: A, tag: "builtin1", name: string, arg: Expr<A> }
  | {  a?: A, tag: "builtin2", name: string, left: Expr<A>, right: Expr<A>}
  | {  a?: A, tag: "call", name: string, arguments: Array<Expr<A>> } 
  | {  a?: A, tag: "lookup", obj: Expr<A>, field: string }
  | {  a?: A, tag: "method-call", obj: Expr<A>, method: string, arguments: Array<Expr<A>> }
  | {  a?: A, tag: "construct", name: string }
  | {  a?: A, tag: "lambda", args: string[], body: Expr<A> }

export type Literal = 
    { tag: "num", value: number }
  | { tag: "bool", value: boolean }
  | { tag: "none" }

// TODO: should we split up arithmetic ops from bool ops?
export enum BinOp { Plus, Minus, Mul, IDiv, Mod, Eq, Neq, Lte, Gte, Lt, Gt, Is, And, Or};

export enum UniOp { Neg, Not };

export type Value =
    Literal
  | { tag: "object", name: string, address: number}

/// checks if t1 is a subtype of t2 (t1 is assignable to t2)
export function subType(t1: Type, t2: Type): boolean {
  if (t1.tag === t2.tag) {
    if (t1.tag === "func" && t2.tag === "func") {
      return (
        t1.args.length === t2.args.length &&
        subType(t1.ret, t2.ret) &&
        t1.args.every((_, i) => subType(t2.args[i], t1.args[i]))
      );
    } else if (t1.tag === "class" && t2.tag === "class") {
      return t1.name === t2.name;
    } else {
      return true;
    }
  } else {
    return t1.tag === "none" && (t2.tag === "class" || t2.tag === "func");
  }
}
