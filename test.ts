import {parse} from './parser'

let main = `
from lib import *
from math import add, sub
import deps

print(x) # prints 10
print(deps.x) # prints 15
`

let lib = `
import deps as d
def p2(x:int, y:int):
  print(x)
  print(y)

def p3(x:int, y:int, z:int):
  p2(x, y)
  print(z)

def updateXYZ(x: int):
  d.XYZ = x
`

let math = `
def add(x:int, y:int) -> int:
  return x+y
def sub(x:int, y:int) -> int:
  return x-y
`

let deps = `
XYZ:int = 10
`

let prog = parse({main, lib, math, deps})
console.log(JSON.stringify(prog, null, 4))
