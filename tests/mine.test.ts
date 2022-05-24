import { assertPrint, assertFail, assertTCFail, assertTC } from "./asserts.test";
import { NUM, BOOL, NONE, CLASS } from "./helpers.test"

describe("my tests", () => {
  // 1
  assertPrint(
    "Test for initial compilation", 
    `
print(999999999999999999999999999999999999999999999999)
    `, 
    [`999999999999999999999999999999999999999999999999`]
  ),
  // 2
  assertPrint(
    "Basic assignment and printing", 
    `
x: int = 999999999999999999999999999999999999999999999999 
print(x)
    `, 
    [`999999999999999999999999999999999999999999999999`]
  ),
  // 3
  assertPrint(
    "More complex assignment, addition, and printing",
    `
x: int = 999999999999999999999999999999999999999999999999 
y: int = 1 
print(x + y)
    `,
    [`1000000000000000000000000000000000000000000000000`]
  ),
  // 4
  assertPrint(
    "Basic addition", 
    `
print(1000000000000000000000000000 + 1000000000000000000000000000)
    `, 
    [`2000000000000000000000000000`]
  ),
  // 5
  assertPrint(
    "Basic subtraction", 
    `
print(5000000000000000000000000000 - 2000000000000000000000000000)
    ` , 
    [`3000000000000000000000000000`]
  ),
  // 6
  assertPrint(
    "Multiply i32s to get BigNum",
    `
print(10000 * 300000)
    `,
    [`3000000000`]
  ),
  // 7
  assertPrint(
    "Divide",
    `
print(30000000000000000000000000000 // 30000000000)
    `,
    [`1000000000000000000`]
  ),
  // 8
  assertPrint(
    "Modulo", 
    `
print(100000000000000000000000000000 % 6)
    `, 
    [`4`]
  ),
  // 9
  assertPrint(
    "Complex operations",
    `
x:int = 5000000000000000 
x = x * x * x - x 
print(x)
    `, 
    [`124999999999999999999999999999995000000000000000`]
  ),
  // 10
  assertPrint(
    "Comparison Operator",
    `
x:int = 1000000000000000000 
y: int = 2000000000000000000 
print(y > x)
    `, 
    [`True`]
  ),
  // 11
  assertPrint(
    "Equality Operator", 
    `
x:int = 1000000000000000000 
y: int = 2000000000000000000 
print(y == x)
    `, 
    [`False`]
  ),
  // 12
  assertPrint(
    "Inequality Operator", 
    `
x:int = 1000000000000000000 
y: int = 2000000000000000000 
print(y != x)
    `,
    [`True`]
  ),
  // 13
  assertPrint(
    "negative number",
    `
x : int = 10
y : int = 20
x = -10
print(x + y)
    `,
    [`10`]
  ),
  // 14
  assertPrint(
    "mutiplying negative number",
    `
x : int = 10
y : int = 20
x = -x
y = -y
print(x * y)
    `,
    [`200`]
  ),
  // 15
  assertPrint(
    "dividing negative number",
    `
x : int = 10
y : int = 20
x = -x
y = -y
print(y // x)
    `,
    [`2`]
  ),
  // 16
  assertPrint(
    "minusing negative number",
    `
x : int = 10
y : int = 20
x = -x
y = -y
print(x - y)
    `,
    [`10`]
  ),
  // 17
  assertPrint(
    "adding tests on bignums where the majority of the digits are not 0's",
    `
x : int = 12345678900987654321
y : int = 11223344556677889900
print(x + y)
    `,
    [`23569023457665544221`]
  ),
  // 18
  assertPrint(
    "minusing tests on bignums where the majority of the digits are not 0's",
    `
x : int = 12345678900987654321
y : int = 11223344556677889900
print(x - y)
    `,
    [`1122334344309764421`]
  ),
  // 19
  assertPrint(
    "multiplying tests on bignums where the majority of the digits are not 0's",
    `
x : int = 12345678900987654321
y : int = 11223344556677889900
print(x * y)
    `,
    [`138559808091892864182427857364897257900`]
  ),
  // 20
  assertPrint(
    "divide bignums to get i32",
    `
x : int = 12345678900987654321
y : int = 11223344556677889900
print(x // y)
    `,
    [`1`]
  ),
  // 21
  assertPrint(
    "abs bignum",
    `
x : int = 12345678900987654321
print(abs(x))
    `,
    [`12345678900987654321`]
  ),
  // 22
  assertPrint(
    "abs negative bignum",
    `
x : int = 12345678900987654321
x = -x
print(abs(x))
    `,
    [`12345678900987654321`]
  ),
  // 23
  assertPrint(
    "min bignums",
    `
x : int = 12345678900987654321
y : int = 11223344556677889900
print(min(x, y))
    `,
    [`11223344556677889900`]
  ),
  // 24
  assertPrint(
    "max bignums",
    `
x : int = 12345678900987654321
y : int = 11223344556677889900
print(max(x, y))
    `,
    [`12345678900987654321`]
  ),
  // 25
  assertPrint(
    "pow bignum",
    `
x : int = 12345678900987654321
y : int = 3
print(pow(x, y))
    `,
    [`1881676372240757194277820616164488626666147700309108518161`]
  )
});
