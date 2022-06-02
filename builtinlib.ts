import { Type } from './ast';
import { RunTimeError } from './error_reporting';
import { BOOL, NONE, NUM } from './utils';
import { splitString, stackTrace } from './runtime_error'

type BuiltinFunc = {
  name: string
  body: Function
  typeSig: [Map<string, Type>, Type, number]
}
// here to register builtinFunctions
export const BuiltinLib:BuiltinFunc[] = [
  {
    name: "factorial",
    body: factorial,
    typeSig: [new Map([["num",NUM]]), NUM, 1]
  },
  {
    name: "randint",
    body: randint,
    typeSig: [new Map([["start",NUM],["stop",NUM],["line",NUM],["col",NUM]]), NUM, 4]
  },
  {
    name: "gcd",
    body: gcd,
    typeSig: [new Map([["num1",NUM],["num2",NUM],["line",NUM],["col",NUM]]), NUM, 4]
  },
  {
    name: "lcm",
    body: lcm,
    typeSig: [new Map([["num1",NUM],["num2",NUM],["line",NUM],["col",NUM]]), NUM, 4]
  },
  {
    name: "comb",
    body: comb,
    typeSig: [new Map([["n",NUM],["r",NUM],["line",NUM],["col",NUM]]), NUM, 4]
  },
  {
    name: "perm",
    body: perm,
    typeSig: [new Map([["n",NUM],["r",NUM],["line",NUM],["col",NUM]]), NUM, 4]
  },
  {
    name: "randrange",
    body: randrange,
    typeSig: [new Map([["start",NUM],["stop",NUM],["step",NUM],["line",NUM],["col",NUM]]), NUM, 5]
  },
  {
    name: "time",
    body: ()=>Date.now()%1000000000,
    typeSig: [new Map([]), NUM, 0]
  },
  {
    name: "sleep",
    body: sleep,
    typeSig: [new Map([["milliseconds",NUM]]), NONE, 1]
  },
  {
    name: "int",
    body: (x:any)=>x,
    typeSig: [new Map([["x",BOOL]]), NUM, 1]
  },
  {
    name: "bool",
    body: (x:number)=>x!=0,
    typeSig: [new Map([["num",NUM]]), BOOL, 1]
  },
  {
    name: "abs",
    body: Math.abs,
    typeSig: [new Map([["num",NUM]]), NUM, 1]
  },
  {
    name: "min",
    body: Math.min,
    typeSig: [new Map([["num1",NUM],["num2",NUM]]), NUM, 2]
  },
  {
    name: "max",
    body: Math.max,
    typeSig: [new Map([["num1",NUM],["num2",NUM]]), NUM, 2]
  },
  {
    name: "pow",
    body: Math.pow,
    typeSig: [new Map([["base",NUM],["power",NUM]]), NUM, 2]
  }
]


function factorial(x:number):number{
  return x>0 ? x*factorial(x-1): 1 
}

function randint(x:number, y:number, line: number, col: number):number{
  if(y<x) { 
    var message = stackTrace() + `\nRUNTIME ERROR: randint range error, upperBound less than lowerBound in line ` + line.toString() + " at column " + col.toString() + "\n" + splitString()[line-1].trim(); 
    // throw new RunTimeError("randint range error, upperBound less than lowerBound");
    throw new RunTimeError(message);
  }
  return Math.floor(Math.random()*(y-x+1) + x);
}

function gcd(a:number,b:number, line: number, col:number):number{
  if (a<0 || b<0 || a==0 && b==0) {
    var message = stackTrace() + `\nRUNTIME ERROR: gcd param error, eq or less than 0 in line ` + line.toString() + " at column " + col.toString() + "\n" + splitString()[line-1].trim(); 
    // throw new RunTimeError("gcd param error, eq or less than 0");
    throw new RunTimeError(message);
  }
  return b==0 ? a : gcd(b,a % b, line, col);
}

function lcm(x:number, y:number, line: number, col:number):number{
  if (x<=0 || y<=0 || x==0 && y==0) {
    var message = stackTrace() + `\nRUNTIME ERROR: lcm param negative error, eq or less than 0 in line ` + line.toString() + " at column " + col.toString() + "\n" + splitString()[line-1].trim(); 
    // throw new RunTimeError("lcm param negative error, eq or less than 0");
    throw new RunTimeError(message);
  }
  return Math.floor(x*y/gcd(x,y, line, col))
}

function comb(x:number, y:number, line:number, col:number):number{
  if (x < y || x < 0 || y < 0) {
    var message = stackTrace() + `\nRUNTIME ERROR: comb param error in line ` + line.toString() + " at column " + col.toString() + "\n" + splitString()[line-1].trim(); 
    // throw new RunTimeError("comb param error");
    throw new RunTimeError(message);
  }
	return perm(x, y, line, col) / perm(y, y, line, col)
}

function perm(x:number, y:number, line:number, col:number):number{
  if (x < y || x < 0 || y < 0){
    var message = stackTrace() + `\nRUNTIME ERROR: perm param error in line ` + line.toString() + " at column " + col.toString() + "\n" + splitString()[line-1].trim(); 
    // throw new RunTimeError("perm param error");
    throw new RunTimeError(message);
  }
  let result = 1
  for (var i = 0; i < y; i++) {
    result *= (x - i)
  }
  return result
}
function randrange(x:number, y:number, step:number,line:number, col:number){
  if(y<x){
    var message = stackTrace() + `\nRUNTIME ERROR: randrange range error, upperBound less than lowerBound in line ` + line.toString() + " at column " + col.toString() + "\n" + splitString()[line-1].trim();  
    // throw new RunTimeError("randrange range error, upperBound less than lowerBound");
    throw new RunTimeError(message);
  }
  let result = randint(x, y, line, col)
  while ((result - x) % step !== 0) {
    result = randint(x, y, line, col)
  }
  return result
}


function sleep(ms:number):number{
	const start = Date.now();
	while (Date.now()-start<ms);
	return 0;
}