Jeff Makings and Zach Lee 

Test cases: 
1.
Test for initial compilation: 
“999999999999999999999999999999999999999999999999” 
Expected: 999999999999999999999999999999999999999999999999
2.
Basic assignment and printing: 
“x: int = 999999999999999999999999999999999999999999999999 
print(x)” 
Expected: “999999999999999999999999999999999999999999999999” 
3.
Unary operation: 
“x: int = -999999999999999999999999999999999999999999999999 
print(x)” 
Expected: “-999999999999999999999999999999999999999999999999”
4.
Basic addition: 
“x:int = 1000000000000000000000000000 + 1000000000000000000000000000
print(x)” 
Expected: 2000000000000000000000000000
5.
Basic subtraction: 
“x:int = 5000000000000000000000000000 - 2000000000000000000000000000
print(x)” 
Expected: 3000000000000000000000000000
6.
Multiply i32s to get BigNum: 
“x:int = 10000*300000
print(x)” 
Expected: 3000000000
7.
Divide: 
“x:int = 30000000000000000000000000000 // 30000000000 
print(x)”
Expected: 1000000000000000000
8.
Comparison Operator: 
“x:int = 1000000000000000000
y: int = 2000000000000000000
If y > x: 
	print(True)
Else: 
	print(False)
Expected: True” 
9.
Equality Operator: 
“x:int = 1000000000000000000
y: int = 2000000000000000000
If y == x: 
	print(True)
Else: 
	print(False)
Expected: False” 
10.
List Test (for when it’s implemented): 
“x:int = 900000001
list1 = [3] * x
print(list1[x-1])”
Expected: 3

The below is related to the concerns from instructors.

(1)
AST/IR
For parsing, we can store the value as a javaScript big number.
ex.
export type Literal<A>  = 
  { a?: A, tag: "num"  , value: javaScript big number }

(2)
We can store the big number like a class which looks like this.
class bigNum(object):
    size : int = 3
    0 : int = 1 // ranges from 0 to 2^32 - 1
    1 : int = 333
    2 : int = 5934739

With the first field, we can know how many bytes does a big number need
bignum.size = 3 

To reconstruct the number we need the following 3 fields bignum.0, bignum.1, and bignum.2.
The number would be 1 * (2^32) ^ 0 + 333 * (2^32) ^ 1 + 5934739 * (2^32) ^ 2. 

(3)
We can view all numbers as big numbers, so that we don't need to worry about conversion during arithmetic operations.

Week 7 Milestone: 
This week, we implemented large numbers in the compiler. There is now no limit on the size of number that can be used in the compiler. We also implemented binary operations operations for these numbers, as well as changing all numbers so that all integers are now stored in the heap instead of the stack. 
The following is the list of changes we made: 
ast.ts: 
Changed type Literal.num to have value: bigint from value: int
Changed type Value.object to have address: bigint from address:int

ir.ts: 
Changed type Value.num to have value: bigint 
Changed type Value.wasmint to have value: bigint

compiler.ts 
changed GlobalEnv offset to take bigint

compiler.ts/codeGenExpr: 
changed "uniop" to handle negative bigints 

compiler.ts/codeGenValue: 
changed "num" to first allocate memory for the bignumber, with the 0-index 4 byte memory block holding the "size" which is how many 4 byte blocks of memory are needed for this number. 
In a loop, the least significant digits of the bigint are determined by taking currentValue % (2^31), then storing them in the next index in the memory block, then updating currentValue = currentValue (floor division) 2^31. 
This way, the least significant digits are consistently being stored in memory as i32s without risking overflow. 

compiler.ts/codeGenBinOp: 
Changed Plus, Minus, Mul, IDiv, Mod, Eq, Neq, Lte, Gte, Lt, and Gt so that they call into custom imported javascript functions. 

runner.ts: 
added function declarations for imported javascript functions for arithmetic and comparison operators. 

webstart.ts: 
created javascript function that takes the memory address of a bigint and reconstructs it into a javascript bigint. This is useful for printing and handling binary operations. 

created arithmeticOp javascript function that is imported into the wasm module. Takes two values and performs arithmetic binary operations on them (plus, minus, mul, div, mod). Allocates memory for the new bigint that was created and stores the bignumber in memory. 

created comparisonOp javascript function that is imported into the wasm module. Takes two values and performs comparison binary operations on them (eq, neq, lte, gte, lt, gt). Returns a boolean value. 

importObject.imports: 
created 12 new imported functions (plus, minus, mul, iDiv, mod, eq, neq,lte,gte,lt,gt) from the above arithmeticOp and comparisonOp functions to be imported into wasm. Each performs a binary operation. 


Updated test cases: 

1.
Test for initial compilation: 
“999999999999999999999999999999999999999999999999” 

Expected: 999999999999999999999999999999999999999999999999

2.
Basic assignment and printing: 
“x: int = 999999999999999999999999999999999999999999999999 
print(x)” 

Expected: “999999999999999999999999999999999999999999999999” 

3.
More complex assignment, addition, and printing: 
“x: int = 999999999999999999999999999999999999999999999999
y: int =  1
print(x+y)” 

Expected: “1000000000000000000000000000000000000000000000000”

4.
Basic addition: 
“1000000000000000000000000000 + 1000000000000000000000000000” 

Expected: 2000000000000000000000000000

5.
Basic subtraction: 
“5000000000000000000000000000 - 2000000000000000000000000000” 

Expected: 3000000000000000000000000000

6.
Multiply i32s to get BigNum: 
“10000*300000” 

Expected: 3000000000

7.
Divide: 
“30000000000000000000000000000 // 30000000000”

Expected: 1000000000000000000

8: 
Modulo: 
"100000000000000000000000000000 % 6"

Expected: 4

9: 
Complex operations: 
"x:int = 5000000000000000
x = x * x * x - x
print(x)" 

Expected: 124999999999999999999999999999995000000000000000

10.
Comparison Operator: 
“x:int = 1000000000000000000
y: int = 2000000000000000000
y > x" 

Expected: True 

11.
Equality Operator: 
“x:int = 1000000000000000000
y: int = 2000000000000000000
y == x" 

Expected: False

12.
Inequality Operator: 
"x:int = 1000000000000000000
y: int = 2000000000000000000
y != x"

Expected: True
