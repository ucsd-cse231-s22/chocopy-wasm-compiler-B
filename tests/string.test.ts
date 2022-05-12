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

  // 4
  assertFail(
    "test case 4: index out of range error, should be a runtime error",
    `s:str = "asdf"
      print(s[5])`
  )
  // 5
  assertPrint(
    "test case 5: get the length of string",
    `s:str = "asdf"
      print(len(s))`,
    ["4"]
  )
  // 6
  assertTCFail(
    "test case 6: immutable",
    `s:str = "asdf"
      s[1] = "p"`
  )

  //7
  assertPrint("test case 7: compare two strings using their ascii values",
    `s1:str = "ab"
  s2:str = "abc"
  print(s1 < s2)`, [`True`])
  //7.5
  assertPrint("test case 7.5: compare two strings using their ascii values",
    `print("abcd" < "abc")`, [`False`])
  //8
  assertPrint("test case 8: check if two strings are equal",
    `s1:str = "ab"
  s2:str = "abc"
  print(s1 == s2)`, [`False`])
  //8.5
  assertPrint("test case 8.5: check if two strings are equal",
    `s1:str = "abc"
  s2:str = "abc"
  print(s1 == s2)`, [`True`])
  //9
  assertPrint("test case 9: concat two strings",
    `s1:str = "abc"
  s2:str = "def"
  print(s1+s2)`, [`abcdef`])

  //10
  assertTCFail("test case 10: should report type error ", `s:int = "asd"`);

  //11
  assertPrint("test case 11: use string as function parameters", `def f(s:str)->str:\n\treturn s\nprint(f("asd"))`, [`asd`]);

  //12
  assertPrint("test case 12: use string as class fields", `class C(object):\n\ts:str = "asd"\n\tdef gets(self: C)->str:\n\t\treturn self.s\nc:C = None\nc = C()\nprint(c.gets())`, [`asd`]);
});
