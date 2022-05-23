In general, we wouldn’t have much conflict with other groups as we try
to make import names transparent. We only expect frontend team and
error reporting team to be affected.

# Compiler B: Bignums
We make imported symbols transparent, so data representation doesn’t
really affect has any conflict.
```python
# mod
x:int = 100000000000000000000

# main
from mod import x
x
```

# Compiler B: Closures/first class/anonymous functions
Closures don’t have names, though they could access global names.
Those are expanded transparently so it doesn’t affect them more than
normal functions.

```python
# mod
x:int=0

# main
from mod import x
sort([1,2,3], lambda y: y>x)
```

# Compiler B: comprehensions
Similarly, comprehensions shouldn’t be affected by names, since
imported names can be used just like normal names.

```python
# mod
x:int=0

# main
from mod import x
[x+y for y in [1,2,3]]
```

# Compiler B: Destructuring assignment
Destructing assignment shouldn’t be affected more than local
variables, ie, no affect.

```python
# mod
x:[int]=None

# main
from mod import x
y:int=0
z:int=0
y,z=x,x
```

# Compiler B: Error reporting
Since we mangle names into `mod$name`, error reporting team might want
to decode `mod$name` into `mod.name`. Undefined symbol error are
reported by us on import, so we need to update those bits according to
changes made by them.

```python
# mod
x:[int]=None

# main
from mod import y # should report "undefined symbol y"
```

# Compiler B: Fancy calling conventions
Fancy calling conventions are not affected by us, since imported names
are used just like locally defined ones.

```python
# mod
x:int=2

# main
def f(a:int=0):
   return a + x
```

# Compiler B: for loops/iterators
Fancy calling conventions are not affected by us either, for the same reason.
```python
# mod
x:[int]=None

# main
for y:int in x:
    print(y)
```

# Compiler B: Front-end user interface
We need to work with frontend team to add multiple panes for each
modules. They need to support adding and remove modules in the
frontend, and each pane should have to input fields for module name
and module source code. There should be at least on module available,
named "main".

# Compiler B: Generics and polymorphism
Since we only process global variables, functions and classes, types
are not importable. Therefore there isn’t conflict between us.

```python
# mod
T: TypeVar = TypeVar('T')
class Printer(Generic[T]):
   def print(self: Printer, x: T):
       print(x)

p_int: Printer[int] = None
p_int = Printer[int]()

p_bool: Printer[bool] = None
p_bool = Printer[bool]()

# main
from mod import p_int, p_bool
p_int.print(10)
p_bool.print(True)
```

# Compiler B: I/O, files
Since I/O and files are implemented in JavaScript and are just
imported functions available to all modules, there isn’t any conflict.

```python
# mod
f : File = None

# main
f = open('test', 'rb')
```

# Compiler B: Inheritance
Inheritance mostly concerns about classes, since we transparently
expand class names, no conflict should occur.

```python
# mod
class A(object):
    a:int=0

#main
import mod

class B(mod.A):
    b:int
```

# Compiler B: Lists
Like other teams working internal representation of data, there are
conflicts between us.

```python
# mod
x:[int]=[1,2,3]

# main
from mod import x
print(x)
```

# Compiler B: Memory management
Memory management works complete in the backend and are not related to
us who works on the very frontend.

# Compiler B: Optimization
Like memory management, optimization works on the backend and are not
affected by us.

# Compiler B: Sets and/or tuples and/or dictionaries
Sets, tuples, dictionaries are like lists, which are mainly concerned
with syntax and internal data representation, and are not affected by us.

```python
# mod
x:(int, bool)=(1,True)

# main
import mod
print(mod.x[0])
```

# Compiler B: Strings
Strings are like lists and concers data representation rather than
names, so we won’t have conflict.

```python
# mod
x:str="hello"

# main
from mod import x
print(x + " world")
```
