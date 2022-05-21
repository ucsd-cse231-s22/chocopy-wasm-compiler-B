import { expect } from "chai";
import { parse } from "../parser";
import { assertPrint, assertTC, assertFail } from "./asserts.test";
import { NUM, BOOL, NONE, CLASS, typeCheck } from "./helpers.test";
import { TypeCheckError } from "../error_reporting";

describe("Parses default arguments", () => {
  assertParse(
    "Parses one default argument",
    `
def test(x:int=3):
  pass`
  );

  assertParse(
    "Parses multiple default arguments",
    `
def test(x:int=3, z:bool=True):
  pass`
  );

  assertParseFail(
    "Does not accept non-default arguments after default arguments",
    `
def test(x : int = 3, y : int):
  pass`
  );

  assertParse(
    "Parses a function with an Expr for a default arg",
    `
def test(x : int = 1 + 2):
  pass`
  );

  assertParse(
    "Parses a method with default arguments",
    `
class C(object):
  def test(self : C, x : int = 5):
    pass`
  );
});

describe("Type check functions with default arguments", () => {
  assertTC(
    "Default arguments are typechecked correctly",
    `
def returnInt(x : int = 5) -> int:
  return x`,
    NONE
  );

  assertTCFail(
    "The value of a default argument must match its declaration",
    `
def returnInt(x : int = False) -> int:
  return x`
  );

  assertTC(
    "A function can be called without defining default arguments",
    `
def returnInt(x : int = 5) -> int:
  return x
  
returnInt()`,
    NUM
  );

  assertTCFail(
    "Calls that redefine default arguments are typechecked",
    `
def test(x : bool = False) -> bool:
    return x

print(test(3))`
  );

  assertTC(
    "Default arguments defined with an Expr are typechecked",
    `
def test(x : bool = 3 != 5) -> bool:
  return x

print(test())`,
    BOOL
  );

  assertTCFail(
    "Default arguments with an Expr resulting in the wrong type are typechecked",
    `
def test(x : bool = 1 + 2) -> bool:
  return x`
  );

  assertTCFail(
    "Arguments with same name, default or not, fail in typechecking",
    `
def test(x : bool, x : bool = True):
  pass`
  );

  assertTC(
    "Typecheck methods",
    `
class C(object):
  def test(self : C, x : int = 5) -> int:
    return x
      
x : C = None
x = C()
x.test()`,
    NUM
  );
});

describe("Can successfully call functions with default parameters", () => {
  assertPrint(
    "Call function without defining default arg",
    `
def test(x : int, y : int = 3) -> int:
    return x + y

print(test(3))`,
    ["6"]
  );

  assertPrint(
    "Call function and redefine default arg",
    `
def test(x : int, y : int = 3) -> int:
    return x + y

print(test(3, 6))`,
    ["9"]
  );

  assertPrint(
    "Default arguments defined as expressions work",
    `
def test(x : bool = 3 != 5) -> bool:
    return x

print(test())`,
    ["True"]
  );

  assertPrint(
    "Default arguments in methods work",
    `
class C(object):
  def test(self : C, x : int = 7+2):
    print(x)
    
x : C = None
x = C()
x.test()`,
    ["9"]
  );

  assertPrint(
    "Functions with required and optional args work",
    `
def test(x : int, y : int = 3, z : int = 5):
  print(x + y + z)
  
test(1, 4)`,
    ["10"]
  );

  assertPrint("Default values using builtin1 functions work", `
def test(builtIn : int = abs(-1)):
  print(builtIn)
  
test()`, ["1"])

  assertPrint("Default values using builtin2 functions work", `
def test(builtIn : int = min(5,10)) -> int:
  if(builtIn > 5):
    return builtIn
  else:
    return 0
    
print(test())`, ["0"])

assertPrint("Default values using methods from a class work", `
class C(object):
  def return5(self : C) -> int:
    return 5

  
def test(fromC : int = C().return5()):
  print(fromC)
    
test()`, ["5"])

assertPrint("Default values using methods within a class work", `
class C(object):
  def return5(self : C) -> int:
    return 5

  def test(self : C, fromC : int = C().return5()):
    print(fromC)
    
C().test()`, ["5"])

assertPrint("Default values using both methods and fields within a class", `
class C(object):
  x : int = 5

  def return5(self : C) -> int:
    return 5

  def test(self : C, fromC : int = C().x + C().return5()):
    print(fromC)
    
C().test()`, ["10"])

// assertPrint("Can use globals in default args", `
// x : int = 5`)

// de
//   print(param)
  
// globalAsDef()
// ""5[] ,:) x= tni  :marapf()DeAslaobgl
assertPrint("can use the NOT uniop in default args", `
b : bool = True

def f(x : int, y : int, b2 : bool = not b):
  if(b2):
    print(x)
  else:
    print(y)

f(4,8)`, ["8"])

assertPrint("Use of NOT overrided by passed arg", `
b : bool = True

def f(x : int, y : int, b2 : bool = not b):
  if(b2):
    print(x)
  else:
    print(y)

f(4,8,b)`, ["4"])

assertPrint("Changing global variable does change default value", `
b : bool = True

def f(b2 : bool = b):
  if(b2):
    print(1)
  else:
    print(2)

f()

b = False

f()`, ["1", "2"])


});
// Helpers

/**
 * Given a test case name, source program, and expected Program output, test if the
 * given Program can successfully be parsed.
 */
function assertParse(name: string, source: string) {
  it(name, () => {
    expect(() => parse(source)).to.not.throw();
  });
}
/**
 * Ensures that when parsing source, the parser throws an exception.
 */
function assertParseFail(name: string, source: string) {
  it(name, () => expect(() => parse(source)).to.throw(Error));
}

/**
 * Ensure during typechecking, a TypeError is thrown.
 */
function assertTCFail(name: string, source: string) {
  it(name, async () => {
    expect(() => typeCheck(source)).to.throw(TypeCheckError);
  });
}
