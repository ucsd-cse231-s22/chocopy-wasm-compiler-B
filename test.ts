import {parse} from './parser'

let main = `
from lib import updateXYZ as update
from math import add, sub
import deps
x: int = 0
y: int = 0
x = add(1,2)
y = sub(3,1)
deps.p2(x,y)
update(20)
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
