## Test Cases

### Testcase 1

```python
class C(object):
  x: int = 0
  y: bool = False

c: C = None
c = C()
```

Test the allocation is correct. The program should allocate 1 `C` object. 

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

Test field read/write is correct. The program should allocate 1 `C` object. Read the field, and write the field.

### Testcase 3

```python
class C(object):
  i: int = 0
    
c: C = None
c = C()
addr = get_addr(c)
test_refcount(addr, 1)
d = c
test_refcount(addr, 2)
d = None
test_refcount(addr, 1)
c = None
test_refcount(addr, 0)
```

Basic reference counting test. `get_addr` will return the memory address of object. `test_refcount(addr, num)` will check if the ref count of object stored in `addr` is equal to `num`.

### Testcase 4

```python
class C(object):
  d: D = None

class D(object):
  i: int = 1

c: C = C()
addr0 = get_addr(c)
d: D = D()
addr1 = get_addr(d)
c.d = d
test_refcount(addr1, 2)
c.d = None
test_refcount(addr1, 1)
d = None
test_refcount(addr1, 0)
```

Test object in the class field. We will focus on the ref count of object `d`. The program will allocate object `d`, then `c.d` will ref it, so the ref count will be 2. Then `c.d` is set to `None`, the ref count decrease to 1. In the end, `d = None`, the only ref disappears.

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
  addr = get_addr(c)
  test_refcount(addr, 2)

c: C = C()
addr = get_addr(c)
test_refcount(addr, 1)
foo(c)
test_refcount(addr, 1)
```

The program will pass the object `c` as parameters, so the ref count of `c` will increase by 1. After the function call, the ref count will decrease to 1 again.

### Testcase 7

```python
class C(object):
  i: int = 0
  
  def foo(self: C):
    addr = get_addr(self)
    test_refcount(addr, 2)
    pass
  
c: C = C()
addr = get_addr(c)
test_refcount(addr, 1)
c.foo()
test_refcount(addr, 1)
```

Test the ref count in the method call. In the method call, the ref count of object itself, i.e., `self` will increase by 1.

### Testcase 8

```python
class C(object):
  i: int = 0
 
def foo(x: int) -> C:
  c: C = C()
  c.i = x
  addr = get_addr(c)
  test_refcount(addr, 1)
  return c

c: C = None
v = foo(1)
addr = get_addr(v)
test_refcount(v, 1)
```

Test the ref count when object is returned by a function. 

### Testcase 9

```python
class C(object):
  i: int = 0
  c: C = None

c: C = C()
c.c = C()
```

The program should allocate two `C` object, set the field `c` to object.

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
addr0 = get_addr(node0)
addr1 = get_addr(node1)
addr2 = get_addr(node2)
test_refcount(addr0, 2)
test_refcount(addr1, 2)
test_refcount(addr2, 2)
```

The program is a linked list with a cycle.







