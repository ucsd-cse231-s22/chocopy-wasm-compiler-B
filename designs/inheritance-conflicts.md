# Discussion of Conflicts between Inheritance and other features of CompilerB

## Bignums
https://github.com/ucsd-cse231-s22/chocopy-wasm-compiler-B/pull/34

I don't foresee any conflicts between Bignums and Inheritance, since Bignums are treated separately from objects in both the AST and IR.
However, the main thing I would want to test is how Bignums as class fields work. If I understand their implementation correctly, all numbers (integers) are stored on the heap. Therefore, if a class has a Bignum as a field, the value at that offset should really be an address into the heap for where the Bignum is stored. If this is all true, then there shouldn't be any problems:

```python
class ABigNum(object):
    x : int = 100011010101413342423413
    dummyField : bool = True

class BBigNum(ABigNum):
    y : int = 9129341943934239429

b : BBigNum = None
print(b.x)
print(b.y)
print(b.dummyField)
```
This should just print
```
100011010101413342423413
9129341943934239429
True
```
without any weirdness.

## Built-in libraries/Modules/FFI
https://github.com/ucsd-cse231-s22/chocopy-wasm-compiler-B/pull/27

The initial iteration of built-ins covers math functions only. Therefore, objects and this flavor of built-ins should not interact much.
For example,
```python
class A(object):
    x : int = 0
    def foo(self : A, x_param : int):
        self.x = x_param
        print(factorial(x))
class B(A):
    y : int = 0

b : B = None
b = B()
b.foo(5)
```
should just output
```
120
```
without any weirdness.

Notably, built-ins are called with ```call```, not ```call_indirect```, so there shouldn't be any overlap on the WASM side at all regarding the vtable structure.

## Closures/first class/anonymous functions
https://github.com/ucsd-cse231-s22/chocopy-wasm-compiler-B/pull/25

I'm confused about where the ```Callable``` class(es) are defined. If I understand correctly, ```closure.ts``` generates a class definition for each closure, but I don't see where the actual superclass is defined.

Borrowing this example from their design doc,
```python
class Closure1(Callable[[int], int]):
    a: int = 0
    def __call__(self: Closure1, b: int) -> int:
        return self.a + b
def getAdder(a:int) -> Callable[[int], int]:
    adder: Closure1 = None
    adder = Closure1()
    adder.a = a
    return adder
f: Callable[[int], int] = None
f = getAdder(1)
f.__call__(2)  # need inheritance to work
```
From an inheritance perspective, `Closure1` inherits from `Callable`, which is why `__call__` works. If there is a `Callable` definition somewhere, then there should be no conflicts with inheritance, since there would be entries in the vtable for each closure just like any other class.

However, if `Callable` isn't actually given a class definition in the AST, then this code wouldn't pass our typechecker.

To fix this, we would need to create an actual `Callable` class, and either we'd need to support overloading of `__call__` to account for the different kinds of `Callable`s or we'd need to make 1 class for each kind.

## Comprehensions
https://github.com/ucsd-cse231-s22/chocopy-wasm-compiler-B/pull/39

As far as I understand, comprehensions should support any class that has `next` and `hasnext` methods. From an inheritance perspective, as we do not currently support multiple inheritance, this sounds like it is equivalent to saying "all subclasses that extend `Range` or `Generator`." I don't believe there would be any conflicts on the inheritance end in terms of the class definitions, since the built-in `Range` and `Generator` are tacked onto the python source before parsing.
However, we need to clarify whether a comprehension should support some object of class `Foo` that defines `next` and `hasnext` but does not explicitly extend `Range`, for example. If the former, then it makes the typechecking for comprehensions a bit more awkward. If the latter, then `isAssignable` should be sufficient.

e.g.
```python
# a silly infinite singleton iterator
class Range2(Range):
    def next(self : Range2) -> int:
        return 0
    def hasnext(self : Range2) -> bool:
        return True
r : Range = None
r = Range2()
print(r.next())
```

The point of this example is to 1) make sure it typechecks 2) make sure it gives us an infinite loop when it runs. Like I said above, I don't expect this to have any issues compiling and running.

## Destructuring assignment
https://github.com/ucsd-cse231-s22/chocopy-wasm-compiler-B/pull/8
https://github.com/ucsd-cse231-s22/chocopy-wasm-compiler-B/pull/48/

I started with the original PR but moved to the new one for the updated design doc.

I don't believe there should be any conflicts between destructuring assignment and inheritance. Since the RHS of a destructuring assignment is just an expression, it should handle any class-related lookup or method call. Furthermore, the LHS also generalizes since it covers both expressions and IDs. As long as the individual pieces get handled correctly, the destructuring code should be able to construct the assignments correctly.

This program should run without any changes, I believe:
```python
class Foo(object):
    x : int = 0
    y : bool = True
    def func(self : Foo, arg : int) -> bool:
        return arg < 1
class Foo2(Foo):
    z : int = 5
    def func2(self : Foo2, arg : int) -> int:
        return arg + self.z

f : Foo2 = None
a : bool = 0
b : int = 1
f.x, f.y, f.z = 5+3, 2<1, 3
a, b = f.func(3), f.func2(5)
print(f.x)
print(f.y)
print(f.z)
print(a)
print(b)
```
And output
```
8
False
3
False
8
```

## Fancy calling conventions
https://github.com/ucsd-cse231-s22/chocopy-wasm-compiler-B/pull/50

We should have no major conflicts with calling conventions. An inherited method should retain the default arguments defined in the original method definition. Since our version of inheritance essentially copies the method definition into the subclass for any inherited methods, the default arguments should be preserved.

The main source of overlap lies in the typechecker, where we both change the global environment:
Theirs:
```typescript
classes: Map<string, [Map<string, Type>, Map<string, [Array<Type>, Type, number]>]>
```

Ours:
```typescript
classes: Map<string, [Array<string>, Map<string, Type>, Map<string, [Array<Type>, Type]>]>
```

Our map maps class names to assorted class data: superclasses, fields, and method signature data.
My understanding of theirs is that they map class names to fields and methods (though methods now track the number of required arguments).
These two can be merged together without issue, since superclasses just adds another element to the tuple, and we can add the number of required arguments to the method data easily as well.

Thsi is a simple program involving calling an inherited method with an default argument that should work after resolving the typechecker merge conflict:
```python
class A(object):
    x : int = 82
    def foo(self : A, arg : int, defArg: int = 5) -> int:
        return arg + defArg + self.x
class B(A):
    y : int = 3
    def foo2(self : B) -> int:
        return self.foo(self.y)

b : B = None
print(b.foo2())
```
Expected output is `3 + 5 + 82 = 90`.