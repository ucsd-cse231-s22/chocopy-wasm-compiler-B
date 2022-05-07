## Test Cases

### Testcase 1

```python
class C(object):
  x: int = 0
  y: bool = False

c: C = None
c = C()
```

The allocation is correct.

### Testcase 2

```python
class C(object):
  x: int = 0
  y: bool = False

c: C = None
c = C()
print(c.x)
c.x = 10
print(c.x)
```

Field read/write is correct.

### Testcase 3

```python

```

Basic reference counting test

### Testcase 4

```python
class C(object):
  d: D = None

class D(object):
  i: int = 1

c: C = C()
d: D = D()
c.d = d
# $$test_refcount($d, 2)
c.d = None
# $$test_refcount($d, 1)
d = None
# $$test_refcount($d, 0)
```

We have object `D` in the field of `C`.

### Testcase 5

```python
class C(object):
  i: int = 0
    
def foo(x: int) -> int:
  c: C = C()
  # $$test_refcount($c, 1)
  return 1

foo(10)
# $$test_refcount($c, 1)
```

After calling function `foo`, the count of all local variables defined in `foo` should be 0.

### Testcase 6

```python
class C(object):
  i: int = 0

def foo(c: C):
  # $$test_refcount($c, 2)
  pass

c: C = C()
# $$test_refcount($c, 1)
foo(c)
# $$test_refcount($c, 1)
```

The program will pass the object `c` as parameters, so the ref count of `c` will increase by 1. After the function call, the ref count will decrease to 1 again.

### Testcase 7

```python
class C(object):
  i: int = 0
  
  def foo(self: C):
    # $$test_refcount($c, 2)
    pass
  
c: C = C()
# $$test_refcount($c, 1)
c.foo()
# $$test_refcount($c, 1)
```

Test the ref count in the method call. In the method call, the ref count of object itself, i.e., `self` will increase by 1.

### Testcase 8

```python
class C(object):
  i: int = 0
 
def foo(x: int) -> C:
  c: C = C()
  c.i = x
  return c

c: C = None
v = foo(1)
# $$test_refcount($foo(1), 1)
foo(2)
# $$test_refcount($foo(2), 0)
```

### Testcase 9

```python
class C(object):
  i: int = 0
  c: C = None

c: C = C()
c.c = C()
```

### Testcase 10

```python
class Node(object):
  prev: Node = None
  next: Node = None
    
node0: Node = Node()
node1: Node = Node()
node2: Node = Node()
  
node0.prev = node2
node0.next = node1
node1.prev = node0
node1.next = node2
node2.prev = node1
node2.next = node0
# $$test_refcount($node0, 2)
# $$test_refcount($node1, 2)
# $$test_refcount($node2, 2)
```



