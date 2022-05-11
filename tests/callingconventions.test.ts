import { expect } from "chai";
import { parse } from "../parser";
import { Program, FunDef, Class, Parameter, BinOp } from "../ast";
import { assertPrint, assertTC, assertFail } from "./asserts.test";
import { NUM, BOOL, NONE, CLASS, typeCheck } from "./helpers.test";
import { TypeCheckError } from "../error_reporting";

// BLank programs/functions/classes, used in helpers at the bottom of this
// file
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

let blankC: Class<null> = {
  name: "C",
  fields: [],
  methods: [],
};

describe("Parses default arguments", () => {
  assertParse(
    "Parses one default argument",
    `
def test(x:int=3):
  pass`,
    testFuncWithParams([
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
    ])
  );

  assertParse(
    "Parses multiple default arguments",
    `
def test(x:int=3, z:bool=True):
  pass`,
    testFuncWithParams([
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
    ])
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
  pass`,
    testFuncWithParams([
      {
        name: "x",
        type: {
          tag: "number",
        },
        value: {
          left: {
            tag: "literal",
            value: {
              tag: "num",
              value: 1,
            },
          },
          op: BinOp.Plus,
          right: {
            tag: "literal",
            value: {
              tag: "num",
              value: 2,
            },
          },
          tag: "binop",
        },
      },
    ])
  );

  assertParse(
    "Parses a method with default arguments",
    `
class C(object):
  def test(self : C, x : int = 5):
    pass`,
    classCWithTestWithParams([
      {
        name: "x",
        type: { tag: "number" },
        value: {
          tag: "literal",
          value: { tag: "num", value: 5 },
        },
      },
    ])
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
  // check methods AND functions
});

// Helpers

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
    expect(() => typeCheck(source)).to.throw(TypeCheckError);
  });
}

/**
 * Ensures that when parsing source, the parser throws an exception.
 */
function assertParseFail(name: string, source: string) {
  it(name, () => expect(() => parse(source)).to.throw(Error));
}

function testFuncWithParams(params: Parameter<null>[]): Program<null> {
  return {
    ...blankPrgm,
    funs: [{ ...testWithPass, parameters: params }],
  };
}

function classCWithTestWithParams(params: Parameter<null>[]): Program<null> {
  return {
    ...blankPrgm,
    classes: [
      {
        ...blankC,
        methods: [
          {
            ...testWithPass,
            parameters: (
              [
                {
                  name: "self",
                  type: {
                    name: "C",
                    tag: "class",
                  },
                  value: undefined,
                },
              ] as Array<Parameter<null>>
            ).concat(params),
          },
          {
            body: [],
            inits: [],
            name: "__init__",
            parameters: [
              {
                name: "self",
                type: {
                  name: "C",
                  tag: "class",
                },
              },
            ],
            ret: {
              tag: "none",
            },
          },
        ],
      },
    ],
  };
}
