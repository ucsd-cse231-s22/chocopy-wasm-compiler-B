# No.1: field access
```
class A(object):
    a : int = 1
class B(A):
    pass
x : B = None
x = B()
print(x.a)
```

# No.2: method call
```
class A(object):
    a : int = 1
    def get(self: A)->int:
        return self.a
class B(A):
    pass
x : B = None
x = B()
print(x.get())
```

# No.3: wrong super class type (TC)
```
class Test(None):
    x : int = 0
```

# No.4: parent-child same field (TC)
```
class A(object):
    a : int = 1
class B(A):
    a: int = 0
```

# No.5: method overwrite
```
class Person(object):
      
    # Constructor
    def __init__(self, name):
        self.name = name
  
    # To get name
    def getName(self):
        return self.name
  
    # To check if this person is employee
    def isEmployee(self):
        return False
  
  
# Inherited or Sub class (Note Person in bracket)
class Employee(Person):
  
    # Here we return true
    def isEmployee(self):
        return True
  
# Driver code
emp = Person("Geek1")  # An Object of Person
print(emp.getName(), emp.isEmployee())

emp = Employee("Geek2") # An Object of Employee
print(emp.getName(), emp.isEmployee())
```

# No.6: method overwrite with different signature (TC)
```
class A(object):
    def test(self: A, arg: int):
        pass
class B(A):
    def test(self: B, arg: bool):
        pass
```

# No.7: method overwrite with different return type (TC)
```
class A(object):
    def test(self: A)->int:
        return 1
class B(A):
    def test(self: B)->bool:
        return False
```

# No.8: type conversion from subclass to superclass
```
class A(object):
    x : int = 1
class B(A):
    x: int = 0
def test(arg: A):
    print(arg.x)
x : B = None
x = B()
test(x)
```

# No.9: type conversion from superclass to subclass (TC)
```
class A(object):
    a : int = 1
class B(A):
    a: int = 0
def test(arg: B):
    pass
x : A = None
x = A()
test(x)
```

# No.10 Chained calls
```
class CL(object):
    def sum(self : CL) -> int:
        return 1 / 0
    def count(self : CL) -> int:
        return 1 / 0 > 0

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
```

