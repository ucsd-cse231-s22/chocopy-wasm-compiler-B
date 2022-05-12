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
