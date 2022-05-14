import { assertPrint, assertFail, assertTCFail, assertTC } from "./asserts.test";
import { NUM, BOOL, NONE, CLASS } from "./helpers.test"

describe("my tests", () => {
  // 1
  assertPrint(
      "Test for initial compilation", 
      `print(999999999999999999999999999999999999999999999999)`, 
      [`999999999999999999999999999999999999999999999999`]
    );
  // 2
  assertPrint(
      "Basic assignment and printing", 
      `x: int = 999999999999999999999999999999999999999999999999 
      print(x)`, 
      [`999999999999999999999999999999999999999999999999`]);
  // 3
  assertPrint(
    "More complex assignment, addition, and printing",
    `x: int = 999999999999999999999999999999999999999999999999 
    y: int = 1 
    print(x + y)`,
    ["1000000000000000000000000000000000000000000000000"]
  );
  // 4
  assertPrint(
      "Basic addition", 
      `print(1000000000000000000000000000 + 1000000000000000000000000000)`, 
      [`2000000000000000000000000000`]
    );
  // 5
  assertPrint(
      "Basic subtraction", 
      `print(5000000000000000000000000000 - 2000000000000000000000000000)` , 
      [`3000000000000000000000000000`]
    );
  // 6
  assertPrint(
    "Multiply i32s to get BigNum",
    `print(10000 * 300000)`,
    [`3000000000`]
  );
  // 7
  assertPrint(
    "Divide",
    `print(30000000000000000000000000000 // 30000000000)`,
    [`1000000000000000000`]
  );
  // 8
  assertPrint(
    "Modulo", 
    `print(100000000000000000000000000000 % 6)`, 
    [`6`]
  );
  // 9
  assertPrint(
    "Complex operations",
    `x:int = 5000000000000000 
    x = x * x * x - x 
    print(x)`, 
    [`124999999999999999999999999999995000000000000000`]
  );
  // 10
  assertPrint(
    "Comparison Operator",
    `x:int = 1000000000000000000 
    y: int = 2000000000000000000 
    print(y > x)`, 
    [`True`]
  ),
  // 11
  assertPrint(
    "Equality Operator", 
    `x:int = 1000000000000000000 
    y: int = 2000000000000000000 
    print(y == x)`, 
    ["False"]
  )
  // 12
  assertPrint(
    "Inequality Operator", 
    `x:int = 1000000000000000000 
    y: int = 2000000000000000000 
    print(y != x)`,
    [`True`]
  );
});