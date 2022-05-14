import { assertPrint, assertFail, assertTCFail, assertTC } from "./asserts.test";
import { NUM, BOOL, NONE, CLASS } from "./helpers.test"

describe("Inheritance test", () => {
    assertPrint("Field Access", `class A(object):
    a : int = 1
class B(A):
    b : int = 2
x : B = None
x = B()
print(x.a)
print(x.b)`, ["1","2"]);

   assertPrint("Method Call",`class A(object):
   a : int = 1
   def get(self: A)->int:
       return self.a
class B(A):
   c : int = 3
   b : int = 2
   
x : B = None
x = B()
print(x.get())`,[`1`]);

   assertTCFail("None Super Class",`class Test(None):
x : int = 0`);

   assertTCFail("Parent-child same field",`
   class A(object):
      a : int = 1
   class B(A):
      a: int = 0`);

   assertPrint("Method Override",`class Person(object):
   age:int = 0
   def new(self:Person,age:int) -> Person:
       self.age = age
       return self
 
   def getAge(self:Person)->int:
       return self.age
 
   def isEmployee(self:Person)->bool:
       return False

class Employee(Person):

   def new(self:Employee,age:int) -> Person:
       self.age = age
       return self

   def isEmployee(self:Employee)->bool:
       return True
 
emp1: Person = None
emp2: Person = None

emp1 = Person().new(40)
print(emp1.getAge())
print(emp1.isEmployee())


emp2 = Employee().new(30)
print(emp2.getAge())
print(emp2.isEmployee())`,["40", "False","30","True"]);

    assertTCFail("Method override different signature",`
    class A(object):
          def test(self: A, arg: int):
               pass
    class B(A):
          def test(self: B, arg: bool):
               pass
    
    `);


    assertTCFail("Method override with diff return type",`class A(object):
    def test(self: A)->int:
        return 1
class B(A):
    def test(self: B)->bool:
        return False`);

    
    assertPrint("Subclass-Superclass Type conversion",`class A(object):
    x : int = 1
class B(A):
    y : int = 2
def test(arg: A):
    print(arg.x)
x : B = None
x = B()
test(x)`,["1"]);

    
    assertTCFail("SuperClass-Subclass TC",`class A(object):
    a : int = 1
class B(A):
    b : int = 2
def test(arg: B):
    pass
x : B = None
x = A()`);


    assertPrint("Chained calls",`
    
    class CL(object):
    def sum(self : CL) -> int:
        return 1//0
    def count(self : CL) -> int:
        return 1//0

class Empty(CL):
    def sum(self : Empty) -> int:
        return 0
    def count(self: Empty) -> int:
        return 0

class Single(CL):
    val : int = 0
    def new(self : Single, val : int) -> Single:
        self.val = val
        return self
    def count(self: Single) -> int:
        return 1
    def sum(self : Single) -> int:
        return self.val
    def getval(self: Single) -> int:
        return self.val

class Concat(CL):
    left : CL = None
    right : CL = None
    def sum(self : Concat) -> int:
        return self.left.sum() + self.right.sum()
    def count(self : Concat) -> int:
        return self.left.count() + self.right.count()
    def new(self : Concat, l : CL, r : CL) -> Concat:
        self.left = l
        self.right = r
        return self

l : CL = None
l = Concat().new(Single().new(5), Empty())
print(l.count())
print(Single().getval())
    
    
    
    
    
    `,["1","0"]);








})