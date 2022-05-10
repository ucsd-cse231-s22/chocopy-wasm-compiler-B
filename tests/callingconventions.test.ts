import { expect } from "chai";
import { parse } from "../parser";
import { Program, FunDef } from "../ast";

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
 * Ensures that when parsing source, the parser throws an exception.
 */
function assertParseFail(name: string, source: string) {
  expect(() => parse(source)).to.throw("PARSE ERROR:")
}

let blankPrgm: Program<null> = {
  funs: [],
  inits: [],
  classes: [],
  stmts: [],
}

let testWithPass: FunDef<null> = {
  name: "test",
  parameters: [],
  ret: { tag: "none" },
  inits: [],
  body: [
    { tag: "pass" }
  ]
}

describe("Parses default arguments", () => {
  assertParse("Parses one default argument", `
def test(x:int=3):
  pass`, {
    ...blankPrgm,
    funs:
      [
        {
          ...testWithPass, parameters: [
            {
              "name": "x",
              "type": {
                "tag": "number"
              },
              "value": {
                "tag": "literal",
                "value": {
                  "tag": "num",
                  "value": 3
                },
              }
            }
          ]
        },
      ],
  });


  assertParse("Parses multiple default arguments", `
def test(x:int=3, z:bool=True):
  pass`, {
    ...blankPrgm,
    funs:
      [
        {
          ...testWithPass, parameters: [
            {
              "name": "x",
              "type": {
                "tag": "number"
              },
              "value": {
                "tag": "literal",
                "value": {
                  "tag": "num",
                  "value": 3
                },
              }
            },
            {
              name: "z",
              type: {
                tag: "bool"
              },
              value: {
                "tag": "literal",
                value: {
                  tag: "bool",
                  value: true
                }

              }
            }
          ]
        },
      ],
  });

  assertParseFail("Does not accept non-default arguments after default arguments", `
def test(x : int = 3, y : int):
  pass`);

  // TODO: parse a class with methods
});

describe("Type check functions with default arguments", () => {
  // ...
  // ensure default parameter values have the correct type
  // check methods AND functions
})
