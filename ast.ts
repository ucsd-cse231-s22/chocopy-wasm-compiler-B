// import { TypeCheckError } from "./type-check";

// export enum Type {NUM, BOOL, NONE, OBJ}; 
export type Type =
  | {tag: "number"}
  | {tag: "bool"}
  | {tag: "none"}
  | {tag: "list", type: Type}
  | {tag: "class", name: string, genericArgs?: Array<Type>}
  | {tag: "either", left: Type, right: Type }
  | {tag: "generator", type: Type } // generator type
  | {tag: "set", valueType: Type }
  | {tag: "type-var"}

export type SourceLocation = { line: number, column: number, srcCode: string }

export type Parameter<A> = { name: string, type: Type }

export type Program<A> = { a?: A, funs: Array<FunDef<A>>, inits: Array<VarInit<A>>, classes: Array<Class<A>>, stmts: Array<Stmt<A>> }

export type Class<A> = { a?: A, name: string, generics?: Array<string>, supers: Array<string>, fields: Array<VarInit<A>>, methods: Array<FunDef<A>>}

export type VarInit<A> = { a?: A, name: string, type: Type, value: Literal<A> }

export type FunDef<A> = { a?: A, name: string, parameters: Array<Parameter<A>>, ret: Type, inits: Array<VarInit<A>>, body: Array<Stmt<A>> }

export type Stmt<A> =
  | {  a?: A, tag: "assign", name: string, value: Expr<A> }
  | {  a?: A, tag: "assign-destr", destr: DestructureLHS<A>[], rhs:Expr<A> }
  | {  a?: A, tag: "return", value: Expr<A> }
  | {  a?: A, tag: "expr", expr: Expr<A> }
  | {  a?: A, tag: "pass" }
  | {  a?: A, tag: "field-assign", obj: Expr<A>, field: string, value: Expr<A> }
  | {  a?: A, tag: "index-assign", obj: Expr<A>, index: Expr<A>, value: Expr<A> }
  | {  a?: A, tag: "if", cond: Expr<A>, thn: Array<Stmt<A>>, els: Array<Stmt<A>> }
  | {  a?: A, tag: "while", cond: Expr<A>, body: Array<Stmt<A>> }
  | {  a?: A, tag: "for", vars: Expr<A>, iterable: Expr<A>, body: Array<Stmt<A>>, elseBody?: Array<Stmt<A>> }
  | {  a?: A, tag: "break", loopCounter?: number }
  | {  a?: A, tag: "continue", loopCounter?: number }

export type Expr<A> =
    {  a?: A, tag: "literal", value: Literal<A> }
  | {  a?: A, tag: "id", name: string}
  | {  a?: A, tag: "binop", op: BinOp, left: Expr<A>, right: Expr<A>}
  | {  a?: A, tag: "uniop", op: UniOp, expr: Expr<A> }
  | {  a?: A, tag: "call", name: string, arguments: Array<Expr<A>>, genericArgs?: Array<Type>} 
  | {  a?: A, tag: "lookup", obj: Expr<A>, field: string }
  | {  a?: A, tag: "listliteral", elements: Array<Expr<A>> }
  | {  a?: A, tag: "index", obj: Expr<A>, index: Expr<A> }
  | {  a?: A, tag: "method-call", obj: Expr<A>, method: string, arguments: Array<Expr<A>> }
  | {  a?: A, tag: "construct", name: string, parameters?: Array<Expr<A>> }
  | {  a?: A, tag: "set", values: Array<Expr<A>>}
  | {  a?: A, tag: "comprehension", type: Type, lhs: Expr<A>, item: string, iterable: Expr<A>, ifcond?: Expr<A> } // comprehension expression
  | {  a?: A, tag: "ternary", exprIfTrue: Expr<A>, ifcond: Expr<A>, exprIfFalse: Expr<A> } // ternary expression
  | {  a?: A, tag: "non-paren-vals", values: Array<Expr<A>> }

export type Literal<A> = 
    { a?: A, tag: "num", value: number }
  | { a?: A, tag: "bool", value: boolean }
  | { a?: A, tag: "none" }
  | { a?: A, tag: "TypeVar" }

// TODO: should we split up arithmetic ops from bool ops?
export enum BinOp { Plus, Minus, Mul, IDiv, Mod, Eq, Neq, Lte, Gte, Lt, Gt, Is, And, Or};

export enum UniOp { Neg, Not };

export type Value =
    Literal<null>
  | { tag: "object", name: string, address: number}

export type DestructureLHS<A> = { a?: A, lhs: AssignTarget<A>, isStarred : boolean, isIgnore : boolean}

export type AssignTarget<A> = 
| {  a?: A,  tag : "id", name : string}
| {  a?: A,  tag : "lookup", obj: Expr<A>, field: string }
| {  a?: A, tag: "index", obj: Expr<A>, index: Expr<A> }
