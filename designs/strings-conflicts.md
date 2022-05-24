* Compiler B: Bignums
* Compiler B: Built-in libraries/Modules/FFI
* Compiler B: Closures/first class/anonymous functions
* Compiler B: comprehensions
* Compiler B: Destructuring assignment
* Compiler B: Error reporting
We already have some error reporting in the string group, for example
```
s:str = "asdf"
s[1] = "p"
```
Will print: Type Error: String immutable

After merging with Error reporting group, our error message will contain more information such as line number and column number as below:
Error: TYPE ERROR: String immutable in line 2 at column 10

* Compiler B: Fancy calling conventions
```
def test(x : str, y : str = “def”) -> str:
      return x + y
  print(test(“abc”))
//should print abcdef
```
This might need some work as strings need to be initialized in memory but the design doc mentions that there are no changes to modify the memory.

* Compiler B: for loops/iterators
String is an iterable object in Python. For example, the following code should print “a”, “b” and “c” separately:
```
s: str = “abc”
for(ch in s):
print(ch)
```
This group needs to obtain the memory address of our string object and then iterate through to the end of this object memory. This group can also get the length of our string object as it’s also already stored in our string object.

* Compiler B: Front-end user interface
We don’t really have interactions with the frontend, the frontend are mainly responsible for displaying the result and the layout of the UI, the frond group could make the result of print more appealing. For example:
``` 
print(“abc”)
```
Will print abc in the current frontend interface, but the front end group could change the current size of the print so that the result will be more clear. 

* Compiler B: Generics and polymorphism
This group could have interactions with the strings group, for example:
```
T: TypeVar = TypeVar('T')
class Printer(Generic[T]):
    def print(self: Printer, x: T):
        print(x)
p_int: Printer[str] = None
p_int = Printer[str]()
p_int.print(“abc”)
```
This should work because the string group treats “str” as a class and the generics group has  optional generic type arguments for class types. 

* Compiler B: I/O, files
After importing the files, I/O group needs to know how to store it in the string object we implemented. The open() function needs to store each character in the memory heap.
```
f : File = None
f = open('file.txt', 'r')
for(ch in f):
    print(ch)
```
The I/O group should be easy to do the read and write operations based on the string object we create. We store each character in a string in an organized order in the memory heap and we also treat each character as only one byte.

* Compiler B: Inheritance
This group could have interactions with the strings group, for example:
```
class Str(object):
    def print(self : Str) -> str:
        return “abc”
class Str1(Str):
    def print(self : Str1) -> str:
        return “def”
strclass : Str = None
strclass = Str1()
print(strclass.print())
//should print def
```
This should work because the string group treats “str” as a class and the main function of Inheritance group is to make the child object inherit from its father. As our group treats string as a class, it should be able to be inherited.

* Compiler B: Lists
```
a = [“abc”, “def”, “ghi”]
a[1] =”a”
print(a[1])
//should print a
```
This may have some conflicts since string group and list group both have index accessing methods, so we might have to agree on methods like this to reduce conflicts and repeating methods. 

* Compiler B: Memory management
```
class C(object):
  x: str = “a”
c: C = None
c = C()
c.x = “b”
print(c.x)
//should print b
```
This should already work with strings, we have a similar test in our test. This works because strings deal with memory as well. However, the memory management group might need garage collect the memory that is still on the heap. 

* Compiler B: Optimization
The optimization group does not have interactions with the string group, the typical operation optimization does is this: 
Before Optimization
```
def f(i:int) -> int:
    if True:
      return i + 1
    else:
      return i * 2
After Optimization
def f(i:int) -> int:
    return i + 1
```
As this example shows, the optimization group does the constant propagation, constant folding and and then does the dead code elimination, and changes the code to a simpler version, while the string group simply creates a string as a class and uses the methods of a string class. 

* Compiler B: Sets and/or tuples and/or dictionaries
We could only see set implementation in this group. As string is an immutable type in python, it should be able to be put in a set. However, we do not think this group handles this case right now as they only implement “int.”

```
set_1 : set[str] = None
set_1 = {“abc”, “def”}
print(len(set_1))
set_1.add(“xyz”)
print(len(set_1))
```

String is hashable and can be put in a set. Further, tuples and dictionaries should also be able to contain strings.
