import { Value, Type } from "./ast";

export function PyValue(typ: Type, result: bigint): Value {
  switch (typ.tag) {
    case "number":
      return PyInt(result);
    case "bool":
      return PyBool(Boolean(result));
    case "class":
      return PyObj(typ.name, Number(result));
    case "none":
      return PyNone();
  }
}

export function PyInt(n: bigint): Value {
  return { tag: "num", value: n };
}

export function PyBool(b: boolean): Value {
  return { tag: "bool", value: b };
}
/*
export function PyObj(name: string, address: bigint): Value {
  if (address === BigInt(0)) return PyNone();
  else return { tag: "object", name, address };
}
*/ 
export function PyObj(name: string, address: number): Value {
  if (address === 0) return PyNone();
  else return { tag: "object", name, address };
}

export function PyNone(): Value {
  return { tag: "none" };
}

export const NUM : Type = {tag: "number"};
export const BOOL : Type = {tag: "bool"};
export const NONE : Type = {tag: "none"};
export const TYPE_VAR : Type = {tag: "type-var"};
export function CLASS(name : string, genericArgs: Array<Type> = null) : Type {return {tag: "class", name, genericArgs}};
