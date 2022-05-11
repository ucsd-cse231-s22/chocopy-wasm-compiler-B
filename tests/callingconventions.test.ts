import { expect } from "chai";
import { parse } from "../parser";
import { Program, FunDef } from "../ast";
import { assertPrint, assertTC, assertFail } from "./asserts.test";
import { NUM, BOOL, NONE, CLASS, typeCheck } from "./helpers.test";

/**
 * Given a test case name, source program, and expected Program output, test if the
 * given Program is parsed into the expected Program.
 */
function assertParse(name: string, source: string, result: Program<null>) {
  it(name, () => {
    expect(parse(source)).to.deep.equal(result);
  });
}

/**
 * Ensure during typechecking, a TypeError is thrown.
 */
function assertTCFail(name: string, source: string) {
  it(name, async () => {
    expect(() => typeCheck(source)).to.throw(TypeError);
  });
}

/**
 * Ensures that when parsing source, the parser throws an exception.
 */
function assertParseFail(name: string, source: string) {
  it(name, () => expect(() => parse(source)).to.throw(Error));
}

let blankPrgm: Program<null> = {
  funs: [],
  inits: [],
  classes: [],
  stmts: [],
};

let testWithPass: FunDef<null> = {
  name: "test",
  parameters: [],
  ret: { tag: "none" },
  inits: [],
  body: [{ tag: "pass" }],
};

describe("Parses default arguments", () => {
  assertParse(
    "Parses one default argument",
    `
def test(x:int=3):
  pass`,
    {
      ...blankPrgm,
      funs: [
        {
          ...testWithPass,
          parameters: [
            {
              name: "x",
              type: {
                tag: "number",
              },
              value: {
                tag: "literal",
                value: {
                  tag: "num",
                  value: 3,
                },
              },
            },
          ],
        },
      ],
    }
  );

  assertParse(
    "Parses multiple default arguments",
    `
def test(x:int=3, z:bool=True):
  pass`,
    {
      ...blankPrgm,
      funs: [
        {
          ...testWithPass,
          parameters: [
            {
              name: "x",
              type: {
                tag: "number",
              },
              value: {
                tag: "literal",
                value: {
                  tag: "num",
                  value: 3,
                },
              },
            },
            {
              name: "z",
              type: {
                tag: "bool",
              },
              value: {
                tag: "literal",
                value: {
                  tag: "bool",
                  value: true,
                },
              },
            },
          ],
        },
      ],
    }
  );

  assertParseFail(
    "Does not accept non-default arguments after default arguments",
    `
def test(x : int = 3, y : int):
  pass`
  );

  // TODO: parse a class with methods
});

describe("Type check functions with default arguments", () => {
  assertTC(
    "Functions can be called without defining their optional arguments",
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
    "Arguments with same name, default or not, fail in typechecking",
    `
def test(x : bool, x : bool = True):
  pass`
  );
  // check methods AND functions
});
