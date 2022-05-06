# Changes to ast

1. A new field in Program: module name
2. A new statement for import.

# Changes to compilation passes

1. A pass that reduces module accesses to plain strings, ie

```
{tag: lookup, obj: {tag: id, name: MOD}, field: NAME}

-->

{tag:id, name: $MOD$NAME}
```

and

```
{tag: id, name: NAME}

-->

{tag: id, name: $MOD$NAME} where MOD is the current module's name

```

# Tests we’d like to pass

```
Should pass:

from mod import x
from mod immport x as y
from mod import *
from mod import x as y, m as n, z

Should fail:

from mod import x, *
from mod import x.y
from mod.n impport x.y
```


## Sample test cases


1. Simple import

```python
# deps.py
x:int = 10

# main.py
import deps
print(deps.x) # prints 10
```


2. Mutable imports

```python
# deps.py
x:int = 10

# main.py
import deps
x:int = 10
deps.x = 15

print(x) # prints 10
print(deps.x) # prints 15
```


3. Imports are globally mutable

```python
# deps.py
x:int = 10

# lib.py
import deps
def printx():
  print(deps.x)

# main.py
import deps
import lib
deps.x = 15

lib.printx() # prints 15
```


4. Circular imports

Python does support circular dependencies - we will not.
The following code will cause a compile time error.

```python
# deps.py
import lib
# ... do stuff ...

# lib.py
import deps
# ... do stuff ...

```


5. Import functions

```python
# lib.py
def distance(x:int, y:int) -> int:
  pass

# main.py
import lib
print(lib.distance(x, y))
```


6. Import classes

```python
# lib.py
class Point(object):
  pass

# main.py
import lib
pt : Point = Point()
```


7. From syntax

```python
# main.py
from lib import add
print(add(x,y))
```


8. Import multiple

```python
# main.py
from lib import add, sub
# ... do stuff ...
```


9. Import with aliasing

```python
# main.py
from lib import add as sum
print(sum(x,y))
```


10. Import star synatx

```python
# lib.py
def sum(x:int, y:int) -> int:
  return 0
def sub(x:int, y:int) -> int:
  return 0

# main.py
from lib import *
print(add(x,y))
print(sub(x,y))
```
