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
});
