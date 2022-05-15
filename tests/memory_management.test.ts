import { assertPrint, assertFail, assertTCFail, assertTC } from "./asserts.test";
import { NUM, BOOL, NONE, CLASS } from "./helpers.test"

describe("Memory Management tests", () => {
  assertPrint(
    "Test Allocation",`
class C(object):
    x: int = 0
    y: bool = False
  
c: C = None
c = C()
print(c.x)`,
    ["0"]
  );
  // 
  assertPrint("Test read/write", `
class C(object):
  x: int = 0
  y: bool = False

c: C = None
c = C()
print(c.x)
c.x = 10
print(c.x)`, ["0", "10"]);
  // 
  assertPrint("Test refcount", `
class C(object):
  i: int = 0
    
c: C = None
d: C = None
c = C()
print(test_refcount(c, 1))
d = c
print(test_refcount(c, 2))
d = None
print(test_refcount(c, 1))
c = None`, ["True", "True", "True"]);
// Refcount of var in func
// first we alloc C(), then it's not assigned, so its refcount will be 0
// then we call method foo(10), it's binded to self, its refcount will be 1
// we create a C in foo, it's normal
// after C().foo(10). both objects would be free
  assertPrint("Refcount of var in func", `
class C(object):
  i: int = 0
    
  def foo(self: C, x: int) -> int:
    c: C = None
    c = C()
    print(test_refcount(self, 1))
    print(test_refcount(c, 1))
    return 1

C().foo(10)`, ["True", "True"]);
// Refcount of var in func param
// first we alloc C(), then assign it to c, its ref_count = 1
// then we call c.foo(c), then c will be binded to fc in the function, and c will bind it to self, its ref_count = 3
// When we exit c.foo(c), then fc is disappear. The ref_count goes back to 1.
  assertPrint("Refcount of var in func param", `
class C(object):
  i: int = 0

  def foo(self: C, fc: C):
    print(test_refcount(fc, 3))

c: C = None
c = C()
print(test_refcount(c, 1))
c.foo(c)
print(test_refcount(c, 1))`, ["True", "True", "True"]);
// Refcount in return
  assertPrint("Refcount in return", `
class C(object):
  i: int = 0
 
  def foo(self: C) -> C:
    c0: C = None
    c1: C = None
    c0 = C()
    c1 = C()
    print(test_refcount(c0, 1))
    return c0

v: C = None
v = C().foo()
print(test_refcount(v, 1))`, ["True", "True"]);
  // 
  assertPrint("Linked", `
class Node(object):
  prev: Node = None
  next: Node = None
    
node0: Node = None
node1: Node = None
node2: Node = None
node0 = Node()
node1 = Node()
node2 = Node()
  
node0.prev = node2
node0.next = node1
node1.prev = node0
node1.next = node2
node2.prev = node1
node2.next = node0
print(test_refcount(node0, 3)) 
print(test_refcount(node1, 3))
print(test_refcount(node2, 3))
`, ["True", "True", "True"]); // for node there are three pointers, node0.self, node1.prev, node2.next
});
