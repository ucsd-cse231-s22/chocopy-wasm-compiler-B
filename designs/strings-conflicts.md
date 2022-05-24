* Compiler B: Bignums
The Bignums group's implementation made all number identifiers addresses pointing to a Bignum object. This conflicts with our string accessor as the accesor method takes in an `i32` primitive as its index argument. After some discussion the Bigint group now implemented a method that converts a Bignum to an `i32` primitive.
```
s:str = "abc"
i:int = 2 #i here is a bignum address
print(s[i]) #i here is an index, acting as a memory offset
```
This code should print "c"
* Compiler B: Built-in libraries/Modules/FFI
The group forcuses on imports. Since our implementation does not change how the identifiers work, we have little conflict with them. 

* Compiler B: Closures/first class/anonymous functions
* Compiler B: comprehensions
* Compiler B: Destructuring assignment
* Compiler B: Error reporting
* Compiler B: Fancy calling conventions
* Compiler B: for loops/iterators
* Compiler B: Front-end user interface
* Compiler B: Generics and polymorphism
* Compiler B: I/O, files
* Compiler B: Inheritance
* Compiler B: Lists
* Compiler B: Memory management
* Compiler B: Optimization
* Compiler B: Sets and/or tuples and/or dictionaries