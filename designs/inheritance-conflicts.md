# For loops / iterators
Inheritance codes does not interact much with for loops.  The only  interaction happens when for loops are used in the method body. In this case, all changes related to for loops / iterators can be done by calling statement handling functions (e.g., traverseStmt, tcStmt, codeGenStmt) without touching their part directly.
The following program shows the case where a for loop is inside a overwitten method body, which is the case when both features are involved. In this case, all loop related part in the print function are done by calling `traverseStmt()` when we traverse the method body in `traverseClass()`.
```Python
class A(object):
    a : int = 0
    def print(self: A, n: int):
        print(n * self.a)
class B(A):
    def print(self: B, n: int):
        for i in range(0, n, 1):
            print(n * self.a)
x : B = None
x = B()
x.a = 5
x.print(3)
"""
Expected output:
0
5
10
"""
```

# Front-end user interface
We don't interact directly with the Front-end user interface group. We just provide theose class-related functions used by them.

# Generics and polymorphism
Inheritance and generics code has some overlaps. To be more specific, we both use the parent list in the class definition. Without modifying, our class handling code will consider generics as a superclass, which cause the compiler to crash.
```Python
T: TypeVar = TypeVar('T')
class Machine(object):
    weight : int = 0
class Printer(Generics[T], Machine):
    def print(self: Printer, x: T):
        print(x)
p: Printer[int] = None
p = Printer[int]()
p.print(10)
"""
Expected output:
10
Actuall behavior(without modifying): compiler crash
"""
```
By discussing with the generics group, we decide to make the changes mainly from our side. Firstly we call the generic handling function `traverseGenerics()` to get generics information. Then in `traverseArguments()`, for all item inside the parent list, before adding them to the `supers` field, we check whether it is a generic by checking whether it contains "Generic". If so, we skip the item, otherwise, we add it to the `supers` field. Then when return, we both contain the `generics` and `supers` field. Because before type checking, the generics group will replace all generics part by the actual types, we don't need to make any changes in the type checking code or anything after that.

# I/O, files
Similar to the for loops group, we don't have direct interactions with the I/O group. I/O statements inside a method are handled by those statement handling functions. What we do is to call those functions.
The following program shows the case where I/O statements is inside a method body. In this case, all I/O related part are done by calling `traverseStmt()` when we traverse the method body or `traverseVarInit()` when we traverse field definitions.
```Python
class Machine(object):
    weight: int = 0
class Logger(Machine):
    path : str = None
    def write(self: Logger, message: int):
        f : File = None
        f = open(path, 'w')
        f.write(message)
        f.close()
logger: Logger = None
logger = Logger()
logger.path = "log.txt"
logger.write(123)
```
# Lists
We don't have direct interactions with the List group. list-related statements inside a method are handled by those statement handling functions. What we do is to call those functions.
The following program shows the case where list-operations are inside a method body. In this case, all list-related part in the print function are done by calling `traverseStmt()` when we traverse the method body or `traverseVarInit()` when we traverse field definitions.
```Python
class Machine(object):
    weight: int = 0
class Recorder(Machine):
    storage: [int] = None
    def play(self: Recorder):
        for num in storage:
            print(num)
recorder : Recorder = None
recorder = Recorder()
recorder.storage = [1, 2, 3]
recorder.play()
"""
Expected output:
1
2
3
"""
```
