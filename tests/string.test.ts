import { assertPrint, assertFail, assertTCFail, assertTC } from "./string-asserts.test";
import { NUM, BOOL, NONE, CLASS } from "./string-helpers.test"

describe("string test", () => {
  // 1
  assertTC("test case 1: var definition for string", `s:str = "asdf"\ns`, CLASS("str"));
  // 2
  assertPrint("test case 2: print string", `s:str = "asdf"\nprint(s)`, [`asdf`]);
  //2.5
  assertPrint("test case 2.5: print string", `print("asdf")`, [`asdf`]);
  // 3
  assertPrint(
    "test case 3: index accessing",
    `
    s:str = "asdf"
    j:str = "jjj"
    j = s[0]
    print(j)`,
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
  //7.6
  assertPrint("test case 7.6: compare two strings using their ascii values",
    `print("abcd" > "abc")`, [`True`])
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
  assertPrint("test case 11: use string as function parameters",
    `def f(s:str)->str:
    return s
  print(f("asd"))`,
    [`asd`]);

  `
b:str = ""
{
  a = "asdf"
  b = a
}
print(b)->?
a[0]
b = a[0]
temp = str(a[0])
destroy temp
`

  //12
  assertPrint("test case 12: use string as class fields",
    `class C(object):
    s:str = "asd"
    def gets(self: C)->str:
      return self.s
  c:C = None
  c = C()
  print(c.gets())`, [`asd`]);
});
