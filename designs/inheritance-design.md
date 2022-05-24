######

# Week 6 Notes

## AST.ts
```
Added supers in class like below to store the super classes for each class. It's an array because we will support
multiple inheritance in future

export type Class<A> = { a?: A, name: string, supers: Array<string>, fields: Array<VarInit<A>>, methods: Array<FunDef<A>>}

```

## IR.ts
```
Added supers in class like below to store the super classes for each class. It's an array because we will support
multiple inheritance in future

export type Class<A> = { a?: A, name: string, supers: Array<string>, fields: Array<VarInit<A>>, methods: Array<FunDef<A>>}

```

## type-check.ts
```
1. Currently we have a map from className -> [{FieldNames,Type},{FuncName,{[ParameterTypes],RetType}}]

    We need to add super class info in the GlobalEnv, as below.

    className -> [{FieldNames,Type},{FuncName,{[ParameterTypes],RetType}},[SuperClassType]]

    classes: Map<string, [Map<string, Type>, Map<string, [Array<Type>, Type]>,Array<Type>]>

2. New function isSubClass(t1:Type,t2:Type)
    This will check if t1 is a subclass of t2

   Modify isSubtype to below:
    export function isSubtype(env: GlobalTypeEnv, t1: Type, t2: Type): boolean {
        return equalType(t1, t2) || isSubClass(t1,t2) ||t1.tag === "none" && t2.tag === "class" 
    }
```

## compiler.ts
For Week 7, we do not plan to support multiple inheritance yet. Thus, our approach for implementing inherited method calls follows from Lectures 9 and 10.
We will add a vtable and use ```call_indirect``` to reference the correct method calls.
The compiler will need to build a ```funcref``` table and populate it with all the class-prefixed methods.
Furthermore, each object struct will need to be augmented with a field that stores its class's offset into the table.
In the case that a subclass does not override a method of its superclass, we will probably populate the table with a dummy entry that allows the subclass to reference the superclass's method.

e.g. given the following classes
```
class A(object):
    def foo(self : A, arg : int):
        print(arg)

class B(A):
    def foo2(self : B, arg : bool):
        print(arg)
    # B does not override foo()
```

We think the resulting table should look something like
```
(table 3 funcref) <-- 3 because there's 3 function references (not 2)
(elem (i32.const 0) 
    A$foo
    A$foo
    B$foo2
)
```
We would put ```A$foo``` in twice and note A's offset as 0 while B's offset is 1.
This way, if something like ```B().foo(0)``` is called, then the WASM will know to reference the ```A$foo``` at offset 1.



# Test Cases

## No.1: field access
```
class A(object):
    a : int = 1
class B(A):
    b : int = 2
x : B = None
x = B()
print(x.a)
print(x.b)
```
Expected Output -> 1, 2

## No.2: method call
```
class A(object):
    a : int = 1
    def get(self: A)->int:
        return self.a
class B(A):
    c : int = 3
    b : int = 2
    
x : B = None
x = B()
print(x.get())
```
Expected Output -> 1

## No.3: wrong super class type (TC)
```
class Test(None):
    x : int = 0
```
Expected Output -> TYPE ERROR (Cannot extend None)

## No.4: parent-child same field (TC)
```
class A(object):
    a : int = 1
class B(A):
    a: int = 0
```

Expected Output -> TYPE ERROR: Parent-child cannot have same field

## No.5: method overwrite
```
class Person(object):
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
print(emp2.isEmployee())
```

Expected output:
```
40
False
30
True
```
The point of this test is to show that Employee can override new (in a pointless way) and isEmployee (in a meaningful way).

## No.6: method overwrite with different signature (TC)
```
class A(object):
    def test(self: A, arg: int):
        pass
class B(A):
    def test(self: B, arg: bool):
        pass
```
Expected output -> TYPE ERROR: Method overriden with different signature

## No.7: method overwrite with different return type (TC)
```
class A(object):
    def test(self: A)->int:
        return 1
class B(A):
    def test(self: B)->bool:
        return False
```

Expected output -> TYPE ERROR: Method overriden with different return

## No.8: type conversion from subclass to superclass
```
class A(object):
    x : int = 1
class B(A):
    y : int = 2
def test(arg: A):
    print(arg.x)
x : B = None
x = B()
print(test(x))
```
Expected output -> 1 



## No.9: cannot assign instance of superclass to variable of type subclass (TC)
```
class A(object):
    a : int = 1
class B(A):
    b : int = 2
def test(arg: B):
    pass
x : B = None
x = A()
```

Expected output -> TYPE ERROR: Assigning super class to subclass

## No.10 Chained calls
```
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
```
Expected output ->
```
1
0
```

# Week 7 Notes

We describe our progress on implementing inheritance across the four main parts of the compiler: parser, typechecker, IR, and code gen.

## Parser
Not much had to be done other than to future-proof ourselves a bit when it comes to multiple inheritance, so we parsed in superclasses like they were function arguments, basically.

## Typechecker
We had a ton more work to do than expected here. Our approach to handling inheritance ended up involving populating subclasses with all the inherited member fields and methods of their superclasses. Since we are not aiming to support multiple inheritance yet, the issue of ordering the inherited fields and methods was made simple: simply put the inherited ones first (if a method is overridden, then replace), and then append with the newly-defined ones.

We had to make changes to the GlobalTypeEnv to support inheritance. As mentioned last week, ```classes``` needed to track immediate superclasses for each class. Next, we added ```classOrder```, an array of class names, to enforce the rule that the Class of the superclass must occur before that of the subclass. Lastly, we added ```classMap``` in order to allow for accessing Class structs based on the class name.

Then, we typecheck the classes in the order that their definitions appear. As we go, we populate the global state so that any subclass has full access to its checked superclass's fields and methods. Ultimately, the typechecker outputs an AST program where each class contains every field and method it has access to, including everything inherited.

Because we copy over all inherited methods, this means that if a subclass ```B``` inherits method ```foo()``` from ```A```, then we should expect to see ```$B$foo``` explicitly defined in the WASM code.

## IR
To support the vtable, we need two kinds of offsets. The first is the class offset, which allows for indexing into the vtable for the start of a class's methods. The second is the method offset, which allows for indexing into a specific method within a class's method block in the table.

The first is stored on a per-object basis as the first field in its struct. To do this, inside ```augmentEnv```, we compute the class offset for each class and add an ```$offset``` field to every class with that value and intra-class offset 0 so that it's at the top when we alloc (that's a lot of offset types).

The method offsets are also added to the global environment during ```augmentEnv```. As mentioned above, we enforce an ordering of the fields and methods, so the method offsets are simply the methods' indices in the order they appear in.

Then, we also added the ```call_indirect``` type to the IR to support generating code for method calls. In ```lower.ts```, upon seeing an AST expr of type ```method-call```, we basically kept the initial lowering logic except changed the output to be ```call_indirect``` instead of ```call```. In particular, since the global environment has been populated by class offsets at this point, we can simply do a lookup to set the method offset.

## Compiler (code gen)
The two main parts of code gen that we had to implement were the vtable and handling the ```call_indirect``` IR expr.

The vtable was essentially built by iterating over the classes and just adding each one's methods in according to the order set by the typechecker.
There is some redundancy here in that we compute the class offsets in ```augmentEnv``` but only set up the actual table structure in ```compiler.ts```.

For ```call_indirect```, we push the method call arguments onto the stack as one would for any function call. Then, we push another copy of the calling object's address onto the stack by pushing the result of ```codeGenValue(<the self argument's value>)``` again. From here, we followed the professor's writeup on vtables, where we load the class offset of the object (the first field, at offset 0), add the method offset (grabbing this from the ```call_indirect``` expr), and then doing the actual ```call_indirect``` WASM call. The main caveat here was setting up the ```type``` constructs for each method. For this, we simply created one per class method according to WASM documentation.

# Week 7 Testing Updates

We had to clean up the tests we wrote for ourselves since many of them didn't actually compile the first time due to our own mistakes in writing them.

Some tests we added to the suite included the List/Empty/Link example from one of the lectures:
```
class List(object):
    def sum(self : List) -> int:
        return 1 // 0
class Empty(List):
    def sum(self : Empty) -> int:
        return 0
class Link(List):
    val : int = 0
    next : List = None
    def sum(self : Link) -> int:
        return self.val + self.next.sum()
    def new(self : Link, val : int, next : List) -> Link:
        self.val = val
        self.next = next
        return self

l : List = None
l = Link().new(5, Link().new(13, Empty()))
print(l.sum())
```
This should output 18, which it did for us.

We put this here as a general showcase of "hey we can do this thing from lecture" and as a sort of omnibus test to hopefully catch any offset-related errors. Luckily, it just worked on the first try :)

Another was chained inheritance:
```
class A(object):
    x : int = 1
    def foo(self : A):
        print(self.x)

class B(A):
    def foo2(self : B):
        print(self.x * 2)

class C(B):
    def foo3(self : C, arg : int):
        self.foo()
        self.foo2()
        print(self.x + arg)
c : C = None
c = C()
c.foo3(3)
```
This should output
```
1
2
4
```
This one was mainly interesting because it helped us catch a bug in how our typechecker was populating a subclass with superclass fields and methods.
Specifically, C was mysteriously not inheriting from A.
The bug itself originated as a result of us not updating the subclass state of B properly after typechecking it. Thus, when its subclass C was being typechecked, B was missing the fields and methods it inherited from A.

# Week 8 Notes

The remaining features we could try to implement are
1. fleshing out our test suite for inherited methods per TA comments on our Week 7 PR and making sure that it works correctly
2. making `__init__()` more robust
3. decide if we want to allow overriding of field initial values
4. multiple inheritance

## Test Suite
Regarding expanding the test suite, here are some test cases we can add:

This test checks that `b` and `c`, both instances of subclasses of `A`, can call both `func1` and `func2`, regardless of whether they overrode them or not.
```python
class A(object):
    def func1(self : A, arg1 : int, arg2 : bool) -> int:
        if arg2:
            return arg1
        else:
            return arg1 * 2
    def func2(self : A, arg : int) -> bool:
        return arg < 5

class B(A):
    # override func2
    def func2(self : B, arg : int) -> bool:
        return not (arg < 5)

class C(A):
    # override func1
    def func1(self : C, arg1 : int, arg2 : bool) -> int:
        if self.func2(arg1):
            return 5
        else:
            return 10

a : A = None
b : A = None
c : A = None
print(a.func1(5, True)) # should return 5
print(a.func2(3)) # should return True
print(b.func1(5, False)) # should return 10
print(b.func2(3)) # should return False
print(c.func1(81, True)) # should return 10
print(c.func2(7)) # should return False
```

This test has a grandchild subclass inherit a bunch of methods and call them all. This is mainly to check that the vtable is constructed properly and that we can offset into each class's section correctly. In particular, we vary the order of the methods within the Parent's body. However, when building the order of methods for Parent and Child, the order should obey the order set by Grandparent.
```python
class Grandparent(object):
    def method1(self : Grandparent):
        print(1)
    def method2(self : Grandparent):
        print(2)
    def method3(self : Grandparent):
        print(3)

class Parent(Grandparent):
    def method4(self : Parent):
        print(4)
    def method5(self : Parent):
        print(5)
    def method3(self : Parent):
        print(6)

class Child(Parent):
    def method5(self : Child):
        print(7)
    def method2(self : Child):
        print(8)

c : Child = None
c = Child()
c.method1()
c.method2()
c.method3()
c.method4()
c.method5()
```
This should output
```
1
8
6
4
5
```

## Expanding __init__

Currently, `__init__` is supplied automatically as a no-op void method if the user does not write it in explicitly, and it is called implicitly as part of the constructor. The user can, of course, write their own like so:
```python
class A(object):
    x : int = 0
    def __init__(self : A):
        self.x = 5

a : A = None
a = A() # this calls __init__
print(a.x)
```
This will print `5`.

We would like to allow the user to define `__init__` with arguments, like so:
```python
class A(object):
    x : int = 0
    def __init__(self : A, someArg : int):
        self.x = someArg

a : A = None
a = A(5) # notice how we supply the argument to the constructor, which passes it to __init__
print(a.x) # we want this to also print 5
```

To do this, we would need to change the "construct" AST type and go downstream from there.
From the typechecker's perspective, if a constructor is called with arguments, then there must be a user-defined `__init__` whose signature matches the supplied arguments. Of course, the same goes for any explicit `__init__` call.
For the IR, we would have to ensure that we pass any arguments to the implicit `__init__` call correctly.
From there, the compiler should be able to handle the `call` construction without any changes.

## Overriding field definitions

This extension is more tentative and kind of overlaps with the above in that both serve to deal with customizing field initialization.

Currently, doing something like
```python
class A(object):
    x : int = 0

class B(A):
    x : int = 5
```
results in a type error (this is Chocopy behavior). However, we can imagine another behavior where this is allowed, such that
```python
b : A = None
b = B()
print(b.x)
```
would compile and print 5 instead of 0.

The issue here is that our Python doesn't distinguish between class variables and instance variables currently; everything is an instance variable.
In CPython, one can do something like this to define a class variable:
```python
class A(object):
    x = 5
A.x # this returns 5
```
And then for instance variables, one defines them in `__init__` or other methods using `self.<blah>` like so:
```python
class A(object):
    def __init__(self):
        self.y = 3
    def foo(self):
        self.z = 5
A.y # this would error
a = A()
a.y # this would give us 3
a.z # this would error
a.foo()
a.z # this would give us 5
```

I don't think that it is tractable to support instance variable definition in this way in our statically-typed Python since we would have to run through every method definition and figure out all the potentially-defined instance variables. Better to keep the vardefs explicit in their own section.

Furthermore, if one wants to override the initial value of a field, they can do so using an explicit `__init__` method as above. That makes this feature mostly redundant, in my opinion.

Therefore, for now, we elect to not bother with this feature. If I'm missing something and there's a good use case for this, then pls tell me :)

## Multiple Inheritance
We have decided not to pursue multiple inheritance anymore, since it's quite complicated and likely would require a major redesign of how we pass inherited fields and methods into subclasses. Better to focus on getting single inheritance 100% right.
If this is bad, pls tell us :)