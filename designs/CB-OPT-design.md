# Design of Optimization on Compiler B

## A. Test cases / Scenarios
> Analyses that extract useful guidance for potential transformations without altering the IR

### 1. Liveness Analysis
**Original**
```python
def f(x: int):
  if True:
    return x + 1
  else:
    x = x * 2
    return x + 1
```
**Tagged**
```python
def f(x: int):
  if True:
    return x + 1
  # Dead
  else:
    x = x * 2
    return x + 1
  # Dead
```

### 2. IR-CFG Visualization
**Pseudo IR-CFG**
```python
while True:
  A() # L-A
  if-goto L-C
  B() # L-B
  C() # L-C
```
**Dot-plot**

![plot](./graphviz.svg)

> Modifications on the ast / IR to improve efficiency 
### 3. Eliminate Unreachable Instructions After Return
**Before Optimization**
```python
def f(i:int):
    return i
    print(i+1)
```
**After Optimization**
```python
def f(i:int):
    return i
```

### 4. Eliminate Dead Branch
**Before Optimization**
```python
def f(i:int):
    if True:
      return i + 1
    else:
      return i * 2
```
**After Optimization**
```python
def f(i:int):
    return i + 1
```

### 5. Eliminate instructions that only affects dead variables

**Before Optimization**
```python
a: int = 1
b: int = 2
a = a + 1
b = b + a
return a
```

**After Optimization**
```python
a: int = 1
b: int = 2
a = a + 1
return a
```

### 6. Constant Propagation

**Before Optimization**
```python
x:int = 100
y:int = 10
y = x + 1
x = x + x
```
**After Optimization**

```python
y:int = 10
y = 100 + 1
x = 100 + 100
```

### 7. Constant Folding For Int

**Before Optimization**
```python
x:int = 5
x = x * 0
```
**After Optimization**
```python
x:int = 5
x = 0
```

### 8. Constant Folding For Bool

**Before Optimization**
```python
x: bool = True
x = False or (False and True)
```
**After Optimization**
```python
x: bool = True
x = False
```

### 9. Combine Redundant Code

**Before Optimization**
```python
x:int = 1
y:int = 2
a:int = 0
a = 2 * (x+y) + 3 * (y + x) + 5 * (x+y)
```

**After Optimization**
```python
x:int = 1
y:int = 2
a:int = 0
e:int = 0
e = x + y
a = 2 * e + 3 * e + 5 * e
```

### 10. Eliminate Redundant Code
**Before Optimization**
```python
x:int = 1
x = x
```

**After Optimization**
```python
x:int = 1
```

## B. Modification on AST and IR
We aim to leave `ast` and `IR` as intact as possible. We are expecting to compute useful informations out of current framework instead of attaching the information to their implementations.

## C. New Changes
Two new files `ast-opt` and `ir-opt` may be added to implement optimizations on `ast` and `ir` respectively.
Among these two options, a majority of optimizations will be implemented in the first one since we can take advantage of the existing informations and control-flow awareness. Once we move to the second stage where structured information is obfuscated, we can apply relatively simple and general schemes that optimize the CFG topologically. We may not change the process of *ast -> ir* or *ir -> wasm text* as this may complicate the implementation of optimizations.

## D. Value Rep and Memory Layout
Dynamic optimizations that happen at runtime or may rely on runtime informations are beyond our scope, so we may not introduce new modifications to the runtime environment. Overall, we aim to optimize the program without imposing restrictions or new assumptions on other groups.

# Compiler B - Optimization - Implementation Update In Week 9

## A. Implemented Passes And Scenarios

### 1. Liveness Analysis
### 2. Neededness Analysis
### 3. Dead-Code-Elimination
### 4. Reaching Analysis
We implemented reaching analysis to get reaching definitions of each variable in each line. We traversed every line in every blocks to propagate the definitions that begin at global or local `inits` , or the assignment statement in `BasicBlock`s. After running the reaching analysis algorithm, an array of maps is generated where each map contains current line's variables' reaching definitions.
We also differentiate the global variable inits and local variable inits when generating reaching definition as 
### 5. Constant Propagation
The constant propagation is implemented on the basis of reaching definition. We would propatate the constant value to an id only if it's reaching definition is unique. We performed constant propagation in Program, FunDef and Class's methods, and we would not propagate the global definitions (classes' fields or global variables) since they could be re-assigned in other function or methods' bodies. 

## B. Modification on AST and IR
we have no modifications on ast.ts and ir.ts

## C. Test
To conduct automatic testing, we implement two functions in the `./tests/asserts.test.ts`, which are `assertOptimize` and `assertPass` functions. For the `assertOptimize` function, we run the codes before and after optimization respectively. **When the runtime results of two generated WASM codes matched, and the length of the optimized WASM code is shorter than the original WASM codes, we consider a test case is passed.** Similarly, for `assertPass` function, the only difference with `assertOptimize` is that the test case is considered pass when the length of optimized WASM code is shorter or equal to the original WASM code. The purpose for this function is for the test cases of `pass` statements since such statements do not generate any WASM codes. For example, a test case like,

```python
def f():
    pass

pass
f()
pass
```

will generate the same exact results before and after optimization. Despite that the optimization for `pass` statement does not make a difference in this scenario, such step is still necessary because some of the optimization steps will generate new `pass` statements to the program (for example, for a `while` loop with `False` literal as its condition, we will replace the `while` loop with a `pass` statement to avoid an empty if/function/while/program body). 

We added 47 test cases in `optimize.test.ts` to test the optimization effect, which covers 
* constant folding for different binary operators and unary operators on number and boolean literals;
* constant folding on builtin functions; 
* dead code elimination after return
* dead code elimiation for if branches
* dead code elimination for while loops
* dead code elimination for pass statements
* dead code elimination for nested while and if structures
* Optimization for class methods
* Optimization for field assignments
* Constant propagation for programs with different kinds of branches 
* A few programs that combine the optimizations above

We also added 39 test cases in `optimize-sanity.test.ts` to make sure our optimization hasn't introduced new bugs into other group's implementation, which only checks the consistency of programs' running result before and after optimizing. Those test cases cover:
* Destructuring
* Comprehension
* Builtin
* For Loop
* Generic
* List
* Set

## E. Value Representation and Memory Layout
Dynamic optimizations that happen at runtime or may rely on runtime informations are beyond our scope, so we have not introduce new modifications to the runtime environment.
