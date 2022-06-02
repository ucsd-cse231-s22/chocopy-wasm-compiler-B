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
  // 
  assertPrint("Test refcount in store", `
class C(object):
  c: C = None
    
c: C = None
d: C = None
e: C = None
c = C()
d = C()
e = C()
d.c = c
print(test_refcount(c, 2))
d.c = e
print(test_refcount(c, 1))
print(test_refcount(d, 1))
print(test_refcount(e, 2))
`, ["True", "True", "True", "True"]);
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

// ===========================
// Memory Recycling!!!
// ===========================
/*
* Basic Test
*/
assertPrint(
  "Test memory basic",`
class C(object):
  x: int = 0
  y: bool = False

c: C = None
c = C()
print_obj_in_mem()
print_mem_used()`, 
  ["1", "20"] // only 1 object(c) in the memory, its size is 12(header) + 4(c.x) + 4(c.y) = 20
); 
/*
* Recycle no ref object(field assign)
*/
assertPrint("Recycle no ref object(field assign)", `
class C(object):
  i: int = 0
  
c: C = None
d: C = None
c = C()
d = c
print_obj_in_mem() 
print_mem_used()
d = None
print_obj_in_mem()
print_mem_used()
c = None
print_obj_in_mem()
print_mem_used()
`, [
  "1", "16", // At first, we create c, so there is 1 object in the memory and its size is 12(header) + 4(c.i) = 16
  "1", "16", // Than, we set `d=None`, the ref count of c decrease to 1, so we cannot free it yet.
  "0", "0" // After we set `c=None`, the ref count is 0, we will free it, so there is no obj in the memory.
]
);
/*
* Recycle no ref object(store)
*/
assertPrint("Recycle no ref object(store)", `
class C(object):
  c: C = None
  
c: C = None
c = C()
print_obj_in_mem() 
print_mem_used()
c.c = C()
print_obj_in_mem() 
print_mem_used()
c.c = None
print_obj_in_mem() 
print_mem_used()
c = None
print_obj_in_mem() 
print_mem_used()
`, [
  "1", "16", // `c = C()` create 1 object on the memory, its size is 12(header) + 4(c.i) = 16
  "2", "32", // `c.c = C()` create 1 more object on the memory, so there are 2 object, and they cost 32 bytes
  "1", "16", // after `c.c = None`, we don't have ref for the 2nd C(), so we will free it. Hence, 1 object remained on the memory
  "0", "0" // after `c = None`, we free the only object on the memory, it's clear.
]);
/*
* Recycle no ref object(free object)
*/
assertPrint("Recycle no ref object(free object)", `
class C(object):
  c: C = None
  
c: C = None
c = C()
print_obj_in_mem() 
print_mem_used()
c.c = C()
print_obj_in_mem() 
print_mem_used()
c = None
print_obj_in_mem() 
print_mem_used()
`, [
  "1", "16", // `c = C()` create 1 object on the memory, its size is 12(header) + 4(c.i) = 16
  "2", "32", // `c.c = C()` create 1 more object on the memory, so there are 2 object, and they cost 32 bytes
  "0", "0" // after `c = None`, we will try to free the first C(), so the ref count of c.c will decrease to 0, we will free it too
]);
/*
* Recycle local var at the end of the function
*/
assertPrint("Recycle local var at the end of the function", `
class C(object):
  i: int = 0
  
  def foo(self: C, x: int) -> int:
    f: C = None
    f = C()
    print_obj_in_mem() 
    print_mem_used()
    return 1

c: C = None
c = C()
print_obj_in_mem() 
print_mem_used()
c.foo(10)
print_obj_in_mem() 
print_mem_used()`, [
  "1", "16", // 1 object c
  "2", "32", // 2 object c and f
  "1", "16" // just to make sure the local var f is recycled
]);
/*
* Dec ref count of param at the end of the function
*/
assertPrint("Dec ref count of param at the end of the function", `
class C(object):
  i: int = 0
  
  def foo(self: C, f: C) -> int:
    print_obj_in_mem() 
    print_mem_used()
    return 1

c: C = None
c = C()
print_obj_in_mem() 
print_mem_used()
c.foo(C())
print_obj_in_mem() 
print_mem_used()`, [
  "1", "16", // 1 object c
  "2", "32", // 2 object c and C() in the param
  "1", "16" // We will dec the ref count of params then free the 0-count params, in this case, C() in param is free
]);
/*
* Do not recycle the return
*/
assertPrint("Do not recycle the return", `
class C(object):
  i: int = 0
  
  def foo(self: C, f: C) -> C:
    print_obj_in_mem() 
    print_mem_used()
    return f

c: C = None
d: C = None
c = C()
print_obj_in_mem() 
print_mem_used()
d = c.foo(C())
print_obj_in_mem() 
print_mem_used()`, [
  "1", "16", // 1 object c
  "2", "32", // 2 object c and C() in the param
  "2", "32" // We will increase the ref count of the return val then decrease it(to make sure it's not recycle at the end of the function)
]);
/*
* Allocate a lot
*/
assertPrint("Allocate a lot", `
class C(object):
  c: C = None
    
c: C = None
d: C = None
c = C()
print_obj_in_mem() 
print_mem_used()
d = C()
print_obj_in_mem() 
print_mem_used()
c = C()
print_obj_in_mem() 
print_mem_used()
d = C()
print_obj_in_mem() 
print_mem_used()
c = C()
print_obj_in_mem() 
print_mem_used()
d = C()
print_obj_in_mem() 
print_mem_used()
c = C()
print_obj_in_mem() 
print_mem_used()
d = C()
print_obj_in_mem() 
print_mem_used()`, [
  "1", "16",
  "2", "32",
  "2", "32",
  "2", "32",
  "2", "32",
  "2", "32",
  "2", "32",
  "2", "32", // we will log the memory alloc/free in console, please take a look if interested
]);


});
