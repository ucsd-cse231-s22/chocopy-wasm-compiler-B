# Comprehensions Design Document

---

## Test Cases

Comprehensions follow this format:
```
<expr> for <name> in <iterable-expr> [if <expr>]?
```
A comprehension expression could be placed in a pair of square brackets ```[]``` (list comprehension), a pair of curly brackets ```{}``` (set/dictionary comprehension), or a pair of parentheses ```()``` (generator).

The expression before the ```for``` keyword could be any valid expression -- plain literals or free variables, unary/binary operations, function calls, class fields or method calls, or ternary expressions which we haven't implemented yet.

The iterable object after the ```in``` keyword could be of various type -- ```list```, ```set```, ```dictionary```, ```tuple```, ```generator```, or even another comprehension expression.

In addition, we can have an optional ```if``` condition to filter the items in the iterable object.

Therefore, there are so many scenarios to write test cases for. Since this is the first milestone and many cases are dependent on the implementation of other groups (specifically, list, for-loop/iterator, string, set/tuple/dictionary, and built-in library), __we plan to only support a range of integers as the iterable object by the end of week 7__. However, we are looking into possible ways to implement an ```Iterable``` interface that supports ```next()``` and ```has_next()``` to facilitate iterating over the above types.

---

### List Comprehensions

#### Test Case #1
```python
print([3 for _ in range(5)])
```
Should print ```[3, 3, 3, 3, 3]```

#### Test Case #2
```python
print([num * 2 for num in range(5)])
```
Should print ```[0, 2, 4, 6, 8]```

#### Test Case #3
```python
print([num * 2 if num % 2 == 0 else num * 3 for num in range(5)])
```
Should print ```[0, 3, 4, 9, 8]```

#### Test Case #4
```python
print([num for num in range(20) if num % 3 == 0])
```
Should print ```[0, 3, 6, 9, 12, 15, 18]```

---

### Set/Dictionary Comprehension

#### Test Case #5
```python
print({3 for _ in range(5)})
```
Should print ```{3}```

#### Test Case #6
```python
print({3 if val % 3 == 0 else (2 if val % 2 == 0 else 1) for val in range(8)})
```
Should print ```{1, 2, 3}``` (not necessarily sorted)

#### Test Case #7
```python
print({val : min(val, 6) for val in range(4, 8)})
```
Should print ```{4: 4, 5: 5, 6: 6, 7: 6}```

#### Test Case #8
```python
print({val // 2 : val for val in range(8)})
```
Should print ```{0: 1, 1: 3, 2: 5, 3: 7}```

---

### Generator

#### Test Case #9
```python
gen : generator = None
gen = (val for val in range(2, 8, 2))
print(next(gen))
```
Should print ```2```

#### Test Case #10
```python
gen : generator = None
x : int = 3
gen = (val + x for val in range(2, 8) if val < 5)
print(next(gen))
print(next(gen))
print(next(gen))
print(next(gen))
```
Should print
```python
5
6
7
StopIteration
```

---
---

## Changes to AST, Parser, and Type-checker

We think that comprehension expressions only require changes to the top-level AST -- they can be transformed to the current IR, so here we are only listing changes we intend to make to ```ast.ts```.

---

### AST

```ts
export type Expr<A> = ...
    // comprehension expression
    | { 
        a?: A, 
        tag: "comprehension", 
        type: Type, // type of comprehension - list/set/dict/generator
        lhs: Expr<A>, 
        item: string, 
        iterable: Expr<A>, 
        ifcond?: Expr<A> 
    }
    // ternary expression - in case people want to write this on lhs above
    | {
        a?: A, 
        tag: "ternary", 
        exprIfTrue: Expr<A>, 
        ifcond: Expr<A>, 
        exprIfFalse: Expr<A>
    }
```

```ts
export type Type = ... // assume other groups add list/set/tuple/dict/string here
    | { 
        tag: "generator", 
        type: Type // type of item generated each time calling next()
    }
```

```ts
export type Class<A> = ...
    | Iterable<A> // iterable interface

// we hope that list/set/tuple/dict/string will implement (i.e. inherit) this Iterable interface, and provide implementations of next() and has_next(), so that we may parse comprehension expressions to IR by calling them
export type Iterable<A> = 
    {
        a?: A,
        type: Type // type of iterable object
    }
```

---

### Parser/Type-checker

We the changes above, we plan to add new cases under ```traverseExpr()``` to parse comprehension/ternary expressions, and new cases under ```tcExpr()``` to type-check comprehension/ternary expressions.

---

### Range class

For the first milestone, since we want to support comprehensions with a range of integers, we may need to add a built-in class Range (like the one posted by Joe on Piazza) and implement its ```new()```, ```next()``` and ```has_next()``` to test our features.

---

Other than the changes mentioned above, we do not plan to add any other new datatypes or change the memory layout at this point.