import { assertPrint, assertFail, assertTCFail, assertTC } from "./asserts.test";
import { NUM, BOOL, NONE, CLASS } from "./helpers.test"

describe("string test", () => {
  // 1
  assertTC("test case 1: var definition for string", `s:str = "asdf"\ns`, [`class: str`]);
  // 2
  assertPrint("test case 2: print string", `s:str = "asdf"\nprint(s)`, [`asdf`]);
  // 3
  assertPrint(
    "test case 3: index accessing",
    `
    s:str = "asdf"
print(s[0])`,
    ["a"]
  );

  //10
  assertTCFail("test case 10: should report type error ", `s:int = "asd"`);

  //11
  assertPrint("test case 11: use string as function parameters", `def f(s:str)->str:\n\treturn s\nprint(f("asd"))`, [`asd`]);

  //12
  assertPrint("test case 12: use string as class fields", `class C(object):\n\ts:str = "asd"\n\tdef gets(self: C)->str:\n\t\treturn self.s\nc:C = None\nc = C()\nprint(c.gets())`, [`asd`]);



});
