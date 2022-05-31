import { Type } from './ast';
import { RunTimeError } from './error_reporting';
import { BOOL, NONE, NUM } from './utils';

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
    typeSig: [new Map([["start",NUM],["stop",NUM]]), NUM, 2]
  },
  {
    name: "gcd",
    body: gcd,
    typeSig: [new Map([["num1",NUM],["num2",NUM]]), NUM, 2]
  },
  {
    name: "lcm",
    body: lcm,
    typeSig: [new Map([["num1",NUM],["num2",NUM]]), NUM, 2]
  },
  {
    name: "comb",
    body: comb,
    typeSig: [new Map([["n",NUM],["r",NUM]]), NUM, 2]
  },
  {
    name: "perm",
    body: perm,
    typeSig: [new Map([["n",NUM],["r",NUM]]), NUM, 2]
  },
  {
    name: "randrange",
    body: randrange,
    typeSig: [new Map([["start",NUM],["stop",NUM]]), NUM, 2]
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

function randint(x:number, y:number):number{
  if(y<x) 
    throw new RunTimeError("randint range error, upperBound less than lowerBound");
  return Math.floor(Math.random()*(y-x+1) + x);
}

function gcd(a:number,b:number):number{
  if (a<0 || b<0 || a==0 && b==0)
    throw new RunTimeError("gcd param error, eq or less than 0");
  return b==0 ? a : gcd(b,a % b);
}

function lcm(x:number, y:number):number{
  if (x<=0 || y<=0 || x==0 && y==0)
    throw new RunTimeError("lcm param negative error, eq or less than 0");
  return Math.floor(x*y/gcd(x,y))
}

function comb(x:number, y:number):number{
  if (x < y || x < 0 || y < 0)
    throw new RunTimeError("comb param error");
	return perm(x, y) / perm(y, y)
}

function perm(x:number, y:number):number{
  if (x < y || x < 0 || y < 0)
    throw new RunTimeError("perm param error");
  let result = 1
  for (var i = 0; i < y; i++) {
    result *= (x - i)
  }
  return result
}
function randrange(x:number, y:number, step:number){
  if(y<x) 
    throw new RunTimeError("randrange range error, upperBound less than lowerBound");
  let result = randint(x, y)
  while ((result - x) % step !== 0) {
    result = randint(x, y)
  }
  return result
}


function sleep(ms:number):number{
	const start = Date.now();
	while (Date.now()-start<ms);
	return 0;
}