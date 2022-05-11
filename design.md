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
“x:int = 30000000000000000000000000000 / 30000000000 
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


