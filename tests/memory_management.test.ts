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
test_refcount(c, 1)
d = c
test_refcount(c, 2)
d = None
test_refcount(c, 1)
c = None`, ["True", "True", "True"]);
  // 
//   assertPrint("Test refcount in function", `
// class C(object):
//   i: int = 0
    
// def foo(x: int) -> int:
//   c: C = None
//   c = C()
//   test_refcount(c, 1)
//   return 1

// foo(10)`, ["True"]);
  // 
//   assertPrint("Test refcount in function param", `
// class C(object):
//   i: int = 0

// def foo(c: C):
//   test_refcount(c, 2)

// c: C = None
// c = C()
// test_refcount(c, 1)
// foo(c)
// test_refcount(c, 1)`, ["True", "True", "True"]);
  // 
  assertPrint("Test refcount in method call", `
class C(object):
  i: int = 0

  def foo(self: C, c: C):
    test_refcount(c, 2)

c: C = None
c = C()
test_refcount(c, 1)
c.foo(c)
test_refcount(c, 1)`, ["True", "True", "True"]);
  // 
//   assertPrint("Return refcount", `
// class C(object):
//   i: int = 0
 
// def foo(x: int) -> C:
//   c: C = None
//   c = C()
//   c.i = x
//   test_refcount(c, 1)
//   return c

// v: C = foo(1)
// test_refcount(v, 1)`, ["True", "True"]);
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
test_refcount(node0, 2)
test_refcount(node1, 2)
test_refcount(node2, 2)
`, ["True", "True", "True"]);
});
