import { Type } from './ast';
import { RunTimeError } from './error_reporting';
import { BOOL, NONE, NUM } from './utils';
const random = require('random-bigint')

type BuiltinFunc = {
  name: string
  body: Function
  typeSig: [Type[], Type]
}

// here to register builtinFunctions
export const BuiltinLib:BuiltinFunc[] = [
  {
    name: "factorial",
    body: factorial,
    typeSig: [[NUM], NUM]
  },
  {
    name: "randint",
    body: randint,
    typeSig: [[NUM,NUM], NUM]
  },
  {
    name: "gcd",
    body: gcd,
    typeSig: [[NUM,NUM], NUM]
  },
  {
    name: "lcm",
    body: lcm,
    typeSig: [[NUM,NUM], NUM]
  },
  {
    name: "comb",
    body: comb,
    typeSig: [[NUM,NUM], NUM]
  },
  {
    name: "perm",
    body: perm,
    typeSig: [[NUM,NUM], NUM]
  },
  {
    name: "randrange",
    body: randrange,
    typeSig: [[NUM,NUM, NUM], NUM]
  },
  {
    name: "time",
    body: ()=>Date.now()%1000000000,
    typeSig: [[], NUM]
  },
  {
    name: "sleep",
    body: sleep,
    typeSig: [[NUM], NONE]
  },
  {
    name: "int",
    body: (x:any)=>x,
    typeSig: [[BOOL], NUM]
  },
  {
    name: "bool",
    body: (x:number)=>x!=0,
    typeSig: [[NUM], BOOL]
  },
  {
    name: "abs",
    body: (x:bigint) => {
      if (x >= 0) {
        return x;
      }
      return -x;
    },
    typeSig: [[NUM], NUM]
  },
  {
    name: "min",
    body: (x:bigint, y:bigint)=> {
      if (x < y) {
        return x;
      }
      return y;
    },
    typeSig: [[NUM, NUM], NUM]
  },
  {
    name: "max",
    body: (x:bigint, y:bigint)=> {
      if (x > y) {
        return x;
      }
      return y;
    },
    typeSig: [[NUM, NUM], NUM]
  },
  {
    name: "pow",
    body: (x:bigint, y:bigint)=> {
      return x ** y;
    },
    typeSig: [[NUM, NUM], NUM]
  }
]

// builtins groups defined functions, have been moved to webstart and modified to take bignums
function factorial(x:bigint):bigint{
  return x>0 ? x*factorial(x-BigInt(1)): BigInt(1)
}
 
function randint(x:bigint, y:bigint):bigint{
  if(y<x) 
    throw new RunTimeError("randint range error, upperBound less than lowerBound");
  var num = random(128);
  num %= (x-y+BigInt(1));
  return x + num;
}

function gcd(a:bigint,b:bigint):bigint{
  if (a<0 || b<0 || a==BigInt(0) && b==BigInt(0))
    throw new RunTimeError("gcd param error, eq or less than 0");
  return b==BigInt(0) ? a : gcd(b,a % b);
}

function lcm(x:bigint, y:bigint):bigint{
  if (x<=0 || y<=0 || x==BigInt(0) && y==BigInt(0))
    throw new RunTimeError("lcm param negative error, eq or less than 0");
  return x*y/gcd(x,y)
}

function comb(x:bigint, y:bigint):bigint{
  if (x < y || x < 0 || y < 0)
    throw new RunTimeError("comb param error");
	return perm(x, y) / perm(y, y)
}

function perm(x:bigint, y:bigint):bigint{

  if (x < y || x < 0 || y < 0)
    throw new RunTimeError("perm param error");
  let result = BigInt(1)
  for (var i = 0; i < y; i++) {
    result *= (x - BigInt(i))
  }
  return result
}

function randrange(x:bigint, y:bigint, step:bigint){
  if(y<x) 
    throw new RunTimeError("randrange range error, upperBound less than lowerBound");
  let result = randint(x, y)
  while ((result - x) % step !== BigInt(0)) {
    result = randint(x, y)
  }
  return result
}

function sleep(ms:bigint):bigint{
	const start = Date.now();
	while (Date.now()-start<ms);
	return BigInt(0);
}

// Export helper functions to be called in webstart

// Source: https://devimalplanet.com/how-to-generate-random-number-in-range-javascript
export function generateRandomBigInt(x: bigint, y: bigint):bigint {
  const difference = y - x;
  const differenceLength = difference.toString().length;
  let multiplier = '';
  while (multiplier.length < differenceLength) {
    multiplier += Math.random()
      .toString()
      .split('.')[1];
  }
  multiplier = multiplier.slice(0, differenceLength);
  const divisor = '1' + '0'.repeat(differenceLength);

  const randomDifference = (difference * BigInt(multiplier)) / BigInt(divisor);

  return x + randomDifference;
}

export function gcd_help(a:bigint,b:bigint):bigint {
  if (a<BigInt(0) || b<BigInt(0) || a==BigInt(0) && b==BigInt(0))
    throw new RunTimeError("gcd param error, eq or less than 0");
  return b==BigInt(0) ? a : gcd_help(b,a % b);
}

export function perm_help(x:bigint,y:bigint):bigint {
  let result = BigInt(1)
  for (var i = BigInt(0); i < y; i++) {
    result *= (x - i)
  }
  return result
}