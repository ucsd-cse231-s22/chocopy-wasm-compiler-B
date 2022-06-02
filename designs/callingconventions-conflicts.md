# Calling Conventions: Milestone 1 Conflicts

## Interesting Interactions

### Closures/first class/anonymous functions
Since closures are a new kind of function definition, they have interactions with our feature. However, their design decisions make it such that no changes are required for closures to have default arguments. The AST and IR do not make any changes to FunDef or the call Expr, as they only add new types, so our AST and IR types are fine. Furthermore, closures are parsed with the `traverseFunDef` method, which calls our `traverseParameters` method, which will correctly parse default arguments. Then, in typechecking, closures are translated into classes with their `translateClosuresToClasses` method. Thus, since their closures are now classes, our typechecking of default arguments on classes will occur. Therefore, their system integrates with ours without issue, and allows for closures to have default arguments, allowing for programs such as

```python
def getAdder(a : int) -> Callable([[int], int]):
   def incByDefault(b : int = 1) -> int:
   return a + b
return incByDefault
```
This program would return a closure that, when provided with no arguments, increments whatever the value of a was by one.

### Error reporting
We will have merge conflicts with error reporting. They have added a new optional parameter to `TypeCheckError`, `location`, and have changed `ParseError` to take in a `SourceLocation` instead of a `number`. These will be very minor changes, but the ParseError update will prevent compilation until they are fixed, and our TypeCheckErrors will not have source locations until we add their SourceLocations. For example:

```python
def test(c : int = 3, d : int):
   pass
test()
```

will throw a ParseError, as a non-default argument cannot be declared after a default argument. Our current JavaScript code will throw a `ParseError` and provide the line number: however, since error reporting has changed their API such that we should provide a SourceLocation instead of a line number, the compiler will not compile until this is fixed. We need to update and add the respective fields to our errors.

### Inheritance 
```python
class A(object):
   def test(self: A, arg: int):
      pass
class B(A):
   def test(self: B, arg: int = 5):
      pass
   ```
Currently our repos do interact because we both add to `GlobalTypeEnv` in `type-check.ts`, but we won't have a merge conflict because they changed the way to access methods in a class through the extra field to classes and their change will update our typecheck access as well.

## No Major Interactions

### Bignums
There are no major interactions between our groups that require intervention. The most notable proof of this is most of the work for BigInt is done between the IR -> Wasm layer, while most of our work is done on the AST -> IR layer. Regarding interactions, the BigInt group changes the AST such that literal nums and addresses are always parsed and represented as BigInts, and our default arguments are allowed to be any expression. Therefore, programs that set a default value as an integer larger than the i32 max, such as

```python
def bigIntAsDefault(bigInt : int = 12345678900987654320 + 1):
   print(bigInt)

bigIntAsDefault()
```

will print 12345678900987654321 operate as expected, since the BigInt team has changed the parser to parse all numbers into a BigInt by default, number literals and arithmetic expressions are (eventually) classified as Exprs, and all arithmetic operations are done on big ints.

### Built-in libraries
There are no major interactions between our groups that require intervention. This group added math functions, and in the AST abstracted builtin1 and builtin2 by removing them and instead using a new BuiltinFunction type. This has no impact on us: the only way to use these functions is to write a call Expr, which remains unchanged and is a valid Expr that can be a default argument. Programs like
```python
def builtInAsDefault(returnedVal : int = factorial(4)):
   print(returnedVal)

builtInAsDefault()
```
will print 24 as expected, as our default argument implementation works by inserting any undefined default arguments at lowering time to a call’s parameter list. Therefore, since this call didn’t provide any arguments, max(3,5) will be inserted to a parameter list, therefore treating the call as if it was`builtInAsDefault(max(3,5))`.

### Comprehensions
There are no major interactions between our groups that require intervention. Their modification of the AST adds a generator Type and two Exprs, a comprehension and ternary Expr. The FunDef Expr and function call Exprs are untouched, and this continues to hold true for implementations in type checking and lowering. Default arguments such as
```python
def printIterator(a : generator = (a for a in Range().new(1,3)):
   for num in a:
      print(a)

printIterator()
   ```
Once this group has their generators working correctly, we should be able to interface correctly.

### Destructuring assignment
There are no interactions between our groups. Our feature requires that a default argument is an Expr, while their feature adds a new statement. Therefore, their destructuring cannot be used when defining a new function, which means that it cannot be a default argument, which means we have no overlap. A program like

```python
def getNum(x : int = 6) -> int:
   return x

a, b = 5, getNum()
print(b)
```

will print 6, as 6 is a default argument and the function value is used in the destructuring.



### For loops/iterators 
Our feature does not really interact much with loops and iterators because we dealt with default values this week and loops don’t really control parameters of function or method definitions nor does it really change how function or method calls are made.

```python
def test(d : int, c : int = 3):
print(d + c)


i: int = 0 
for i in range(5):
test(i)
```

This will give the result of 3,4,5,6,7 printed out using both for loops and our default values.

### Front-end user interface
The front end user interface is probably one of the groups that are furthest related to calling conventions because our group works with the back end of dealing with arguments both defined and passed into function/method calls. Our job is done at lowering and the front end doesn’t touch parsing, type checking, or lowering.

### Generics and polymorphism
Because in the type checker there is already a comparison built into checking arguments passed into parameters in the function/method definition, our group doesn’t really need to focus on generics. The function itself that we currently call can be changed to more deeply define equality of types, but the logic behind using that function will be the same.
   
```python 
T: TypeVar = TypeVar('T') 


class Printer(Generic[T]): 
def print(self: Printer, x: T): 
   print(x) 


p: Printer[int] = None 
p = Printer[int]() 
p.print(True)
```

This shouldn’t cause issues because the generics will take care of defining what types the arguments should be and then we can handles it from there.

### I/O, files 
The I/O and files group doesn’t directly interact with our group because the logic that is written within the files and passed into our compiler isn’t changed by the I/O group. All they are doing is defining a way to pass in files with that written code for our compiler to use but the logic within the file remains unchanged by them.

```python
class File(object):
...
    def read(self : File) -> int:
        # Checks if the file is opened and in read mode
        # Reads one i32 from file `self.fd` with the JS function
        # (note that the current read always read from position 0)
    
    def write(self : File, s : int = 5) -> int:
        # Check if the file is opened and in write mode
        # Write one i32 to the file `self.fd` with the JS function
        # (note that the current write always write from position 0)
...
```

Currently the read and write objects don’t work properly so this would not work properly but once write is implemented then there could be a cool interaction where you have a write_to_num method or something with a default in that you wouldn’t need to pass in without having to worry about conflict.

### Lists
We don’t really interact with lists directly yet because their list is simply a representation of an individual type like ints or classes. When this would be passed in as an argument, the list of arguments would simply have the list that's passed in integrated into its list of arguments so it would not really change the functionality.

```python
a: [int] = None 
b: int = 100 
a = [1, 2, 3] 
a[3] = 999 


def f(x : int, y : int = 10)
  print(x - y)


f(b)
``` 
	
From the current implementation, the output would be 989 because the lists group has yet to figure out how to check for index out bounds errors so other variables can be changed. This can’t really be fixed from our end but once the lists group implements index out of bounds then we will have a correct output of 90.

### Memory management 
There is little interaction between our groups. This is mostly because most of their changes are in the file `compiler.ts` which is untouched by our group. FunDef and Expr are untouched throughout typechecking and lowering. A below example program that uses `get_refcount` as a default parameter should print the count of the reference `c`.

```python
c:C = None
def print_ref_count(a :int =get_refcount(c)):
  print(a)


print_ref_count()
```
### Modules/FFI
There are no major interactions between our groups that require intervention. Their modification to AST includes support for importing modules by adding an additional field to `Program`. FunDef and Expr are untouched. They have not made any changes to IR. Their major changes are in parser.ts. However, it doesn't conflict with our changes which just traverses the parameters. A function with default arguments on one module should be successfully imported in another module. The program below should work as expected and print 3.

```python
# lib.py
def test(a :int = 3):
  print(a)


#main.py
import lib
lib.test()
```

### Optimization 
There is little interaction between our groups. AST and IR are kept intact. No modification is made to  typecheck.ts or lower.ts. The optimization is a new phase after lowering the code. So this shouldn't cause any conflict. A program such as 

```python
x:int = 5
def test_optt(a :int = x*0):
  print(a)
```

should change to this after optimization. This program demonstrates constant folding in a default argument of a function definition.

```python
x:int = 5
def test_optt(a :int = 0):
  print(a)
```


### Sets and/or tuples and/or dictionaries 
There are no major interactions between our groups that require intervention. Their modification of the AST adds a set Type. The FunDef Expr and function call Exprs are untouched, and this continues to hold true for implementations in type checking and lowering. Default arguments that are sets will work as expected. The following program should print 3.

```python
def testSet(a :set[int] = {1,2,3}):
  print(len(a))


testSet()
```

### Strings 
There are no major interactions between our groups that require intervention. Their modification of the AST adds a str Type. The FunDef Expr and function call Exprs are untouched, and this continues to hold true for implementations in type checking and lowering. Default arguments that are strings will also work as expected. The below program will print "abc".
```python
def printString(a :str = "abc"):
  print(a)


printString()
```