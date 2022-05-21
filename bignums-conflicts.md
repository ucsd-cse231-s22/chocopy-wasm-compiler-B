# Bignums Compiler B conflicts with other groups: #

## Built-in libraries/Modules/FFI: ##

As all of the built-ins implemented in week 7 by this group were mathematical function, there will certainly be interactions between bignums and the builtin functions. Some collaboration on implementation will be necessary. 

1: Due to our new implementation of all integers being stored on the heap, builtin function cases such as: 

pow(2,2) 

now return 0 instead of the expected 4.

2: The standard javascript library functions (abs, min, max, and pow) included in builtinlib.ts will need to be updated. Furthermore, the custom functions made (randint, gcd, etc. ) will need to be updated so they accept Javascript "Bigint" instead of "number". Our group has a builtin function that reconstructs bigints given the memory address, this can be used to easily create custom javascript functions. 

## Closures/first class/anonymous functions ##

Apart from integers being used in closures, the changes made by closures and bignums should not interact. 
To use the closure group's example from design.md, their focus is changing a nested function from this : 

def getAdder(a:int) -> Callable[[int], int]:
    def adder(b: int) -> int:
        return a + b
    return adder
f: Callable[[int], int] = None
f = getAdder(1)
f(2)

To look like this according to the AST: 

class Closure1(Callable[[int], int]):
    a: int = 0
    def __call__(self: Closure1, b: int) -> int:
        return self.a + b

def getAdder(a:int) -> Callable[[int], int]:
    adder: Closure1 = None
    adder = Closure1()
    adder.a = a
    return adder

f: Callable[[int], int] = None
f = getAdder(1)
f.__call__(2)  # need inheritance to work


Closures's changes were mostly to the parser and AST, changing the way the function is represented in the AST, whereas the changes we made would effect how the integers in this function are stored in memory, mostly changing the compiler, webstart, and runner. I don't forsee any conflicts. 

## Comprehensions ##

1: The following function will conflict with our implementation: 

x:int = 5
[3 for _ in range(x)]

due to the way we have changed the representation of numbers. 

2: The comprehension "Range" and "generator" classes in repl will need to be updated so each "number" is now a bigint type. A function or class taking input (ie Range in this case) may need to be updated to reconstruct any numerical parameters from the memory representation of integers into a javascript bigint for correct behavior. Otherwise, the range in the comprehension would be the numerical value of x, as opposed to its value of 5. 

## Destructing assignment ##

Could not find a pull request for destructuring assignment. 

## Error reporting ##

Our current implementation includes many of the merged changes from error reporting, including the SourceLocation type in the AST, and the changes including the SourceLocation in the parser and type-checker. 

The following program

x: int = 4
	
if (x == 4)::
	print(x)

Currently throws "Error: PARSE ERROR: Could not parse stmt at 25 26: :at line 3", and the error reporting group plans to update the error that's printed if anything. There is little to no interaction with bignums. 

## Calling Conventions ##

Calling conventions is concerned with allowing default values for function parameters, and is unlikely to interact with bignums.
The following function showcases this: 

def test(x : int, y : int = 1+5) -> int:
    return x + y

print(test(3))

Expected = 9

In this function, our implementation of numbers and our binop function would be used to add the default function parameters and the arguments in the return statement. However, this is done in the compiler, whereas calling convention's changes to default variables mostly occurs in the AST/lower/IR. Therefore, there is unlikely to be interaction with these changes. 

## for Loops/Iterators##

Similar to the builtins group, for loops/iterators will have a conflict with bignums and will have to change their imported javascript functions. 

Take the function: 

x:int = 5

for i in range(0,x,1): 
    print(i)

Expected = [0,1,2,3,4] 
Actual = [0,1,2,3]

I'm unsure when the imported functions such as $range$__init__, $range$__hasnext__, etc. functions are called specifically, but we will have to be very careful to make sure that if these functions are calling numbers from memory (in this case, "x"), that they are first converted from their WASM memory representation into their javascript bigint representation in the $range functions.

Currently, the $range$index function would accept the memory address of x (4), as opposed to the value. We will need to work on this with them. 

## Front-end user interface ##

Bignums has not changed the UI of anything in the compiiler, and the Front-end group has not made significant changes to the areas to the areas we updated (compiler's codeGen of binop/numbers, imports from webstart, functions in runner, etc.). The most relevant example: 

x:int = 5
print(x)

expected = 5

The Front End group had discussed in their designs that they would like to display what space has been used by the heap, so this is a possible source of collaboration between Front End/Memory Management/Bignums. Otherwise, it seems that Front-End/bignum interactions will not break anything. 

