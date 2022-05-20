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

2: The comprehension "Range" and "generator" classes in repl will need to be updated so each "number" is now a bigint type. Furthermore, any function or class taking input (ie Range in this case) will need to be updated to reconstruct any numerical parameters from the memory representation of integers into a javascript bigint for correct behavior. Otherwise, the range in the comprehension would be the numerical value of x, as opposed to its value of 5. 

