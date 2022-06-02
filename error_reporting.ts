import { SourceLocation } from "./ast";
import { stackTrace } from "./runtime_error";

export class CompileTimeError extends Error {
    __proto__: Error
    constructor(message: string) {
     const trueProto = new.target.prototype;
     super(message);
 
     // Alternatively use Object.setPrototypeOf if you have an ES6 environment.
     this.__proto__ = trueProto;
   } 
 }

// I ❤️ TypeScript: https://github.com/microsoft/TypeScript/issues/13965
export class TypeCheckError extends CompileTimeError {
    constructor(message: string, location: SourceLocation) {
      super("TYPE ERROR: " + message + " in line " + location.line.toString()+" at column " + location.column.toString() + "\n\t" + location.srcCode.trim() + "\n\t" + '^'.repeat(location.srcCode.trim().length));
   } 
 }

 export class ParseError extends CompileTimeError { 
    constructor(message: string, location: SourceLocation) {
      super("PARSE ERROR: " + message + " in line " + location.line.toString()+" at column " + location.column.toString() + "\n\t" + location.srcCode.trim() + "\n\t" + ' '.repeat(location.column-1) + "^^^");
   } 
 }

 export class RunTimeError extends Error {
    __proto__: Error
    constructor(message: string) {
     const trueProto = new.target.prototype;
     super(message);
 
     // Alternatively use Object.setPrototypeOf if you have an ES6 environment.
     this.__proto__ = trueProto;
   } 
 }

