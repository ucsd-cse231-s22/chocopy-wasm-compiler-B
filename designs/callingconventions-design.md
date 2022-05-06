# Week 7: Default/Optional Arguments Milestone

## Test Cases

1. Functions without optional parameters _still work_

   TBD

2. A function with a non-default argument following default arguments will fail in parsing (ex `def test(x : int = 3, y : int)` will not be parsed, since `x` is a default and `y` is not a default)

   ```python
   def test(x : int = 3, y : int):
   ```

   _Expected result: Parse error_

3. We can call a function with default arguments without defining the default argument

   ```python
   def test(x : int, y : int = 3) -> int:
       return x + y

   print(test(3))
   ```

   _Expected result: 6_

4. We can call a function with default arguments _and_ redefine the default argument

   ```python
   def test(x : int, y : int = 3) -> int:
       return x + y

   print(test(3, 6))
   ```

   _Expected result: 9_

5. Default arguments are typechecked (`def test(x : bool = 3)` will fail in typechecking) assertTCFail

   ```python
   def test(x : bool = 3):
   ```

   _Expected result: TYPE ERROR: x is not a bool_

6. Calls that redefine default arguments are typechecked (using the same function from above, `def test(x : bool = False): …` `test(3)` will fail) assertTCFail

   ```python
   def test(x : bool = False) -> bool:
       return x

   print(test(3))
   ```

   _Expected result: TYPE ERROR: expected `bool`, got type `int` in parameter 0_

7. Calls that redefine default arguments with Expressions are typechecked. `def test(x : bool = 3 != 5)` typechecks, `def test(x : int = not True)` doesn’t)

   ```python
   def test(x : bool = 3 != 5) -> bool:
       return x

   print(test())
   ```

   _Expected result: True_

8. Arguments with the same name (default or not) will fail in typechecking (can’t have `def test(x : bool, x : bool = True)`)

   ```python
   def test(x : bool, x : bool = True):
   ```

   _Expected result: TYPE ERROR: duplicate declaration of variable `x`_

9. Unit test for parsing output in functions - parse default to have a Value

   ```python
   def test(x : bool, y : bool = False):
       pass
   ```

   _Expected parse result: TBD_

10. Use an expr as a default value (`def test(x : int = 1+2): return x` will return 3)

    ```python
    def test(x : int = 1+2) -> int:
        return x

    print(test())
    ```

    _Expected result: 3_

## Changes

### AST

- Parameter must hold an optional value: Expr.

### IR

- All default parameters are handled during typechecking/lowering. Therefore, a Parameter now doesn’t need to hold any default values/arguments. We restore the Parameter to its original state, without any Expr.

### Built-in Libraries

We do not need any new library functionality.

## Functions, Datatypes, New Files

New functionality in type checking:

- If a function has default values, typecheck as an Expr and make sure it has the right type (VarInit-ish)
- In lowering, for calls, check if default values are passed - if they aren’t, insert their default values to the call’s arguments
- In regards to merging conflicts with functions, we don't believe that we need to add any crucial changes to existing functions (including things like parameters) as we only need to focus on changing the parameter representation in the AST

## Memory Layout

We do not need to modify/use memory.
