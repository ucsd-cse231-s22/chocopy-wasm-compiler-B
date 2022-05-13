# Week 7: Default/Optional Arguments Milestone

## Test Cases

1. Functions without optional parameters _still work_

   ```python
   def test(x : int, y : int):
      return x + y

   test(3,5)
   ```

   _Expected result: 8_

   This is just one example, we plan on testing a variety of the original functionality including errors.

2. A function with a non-default argument following default arguments will fail in parsing

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

5. Default arguments are typechecked

   ```python
   def test(x : bool = 3):
   ```

   _Expected result: TYPE ERROR: x is not a bool_

6. Calls that redefine default arguments are typechecked

   ```python
   def test(x : bool = False) -> bool:
       return x

   print(test(3))
   ```

   _Expected result: TYPE ERROR: expected `bool`, got type `int` in parameter 0_

7. Calls that redefine default arguments with Expressions are typechecked.

   ```python
   def test(x : bool = 1 + 2) -> bool:
       return x
   ```

   _Expected result: TYPE ERROR: Type mismatch for default value of argument x_

8. Arguments with the same name (default or not) will fail in typechecking

   ```python
   def test(x : bool, x : bool = True):
   ```

   _Expected result: TYPE ERROR: duplicate declaration of variable `x`_

9. Unit test for parsing output in functions - parse default to have a Value

   ```python
   def test(x : bool = False):
       pass
   ```

   _Expected parse result:_

   ```json
   {
    "funs": [
        {
            "name": "test",
            "parameters": [
                {
                    "name": "x",
                    "type": {
                        "tag": "bool"
                    }
                    "value": {
                       "tag": "bool",
                       "value": false
                    }
                }
            ],
            "ret": {
                "tag": "none"
            },
            "inits": [],
            "body": [
                {
                    "tag": "pass"
                }
            ]
        }
    ],
    "inits": [],
    "classes": [],
    "stmts": []
   }
   ```

10. Use an expr as a default value

    ```python
    def test(x : int = 1+2) -> int:
        return x

    print(test())
    ```

    _Expected result: 3_

### To Run Our Test Cases
This PR includes a new command in `package.json` - `npm run test-callconv`. This
will run our test suite located at `tests/callingconventions.test.ts`. The most
interesting use cases are default values that are defined via expressions:
functions such as `def test(x : int = 3 + 4)` can now use `x` which will be
defined as 7.

## Changes

### AST

- Parameter must hold an optional defaultValue of type Expr. This field will be
undefined if the parameter doesn't have a default value, and will hold the
parsed expression otherwise.

### IR

- During lowering from AST to IR, all calls that do not redefine default values
will have the default values added to their argument list. Therefore, a
Parameter now doesn’t need to hold any default values/arguments. We restore the
Parameter to its original state, without holding any Expr.

### Built-in Libraries

We do not require any new library functionality - this feature only impacts
function/method definitions and calls.

## Functions, Datatypes, New Files

### Changes in Parser

- `traverseParameters` is expanded to parse default values, and to throw a parse
error if parameters without a default value is defined after parameters with
default values (for example, `def test(x : int = 5, y : int` will throw an
error.)

### Changes in Type Checking

- `GlobalTypeEnv` is extended so that functions and classes hold the number of
required parameters, and `augmentTEnv` is extended to add this information. Without this information, we cannot distinguish between a
required and optional parameter in the `GlobalTypeEnv`, and typechecking must
ensure that all required parameters are called.

- All default value exprs are typechecked as valid exprs and matching the type of the parameter.

- Method and function calls are typechecked to ensure they call all required arguments, but are allowed to not define optional arguments.

### Changes in Lowering

- Two global variables, `funMeta` and `classMeta`, are defined to hold default arguments for functions and methods, and they are filled in `lowerProgram`.

- For function and method calls, any default parameters that were not defined in the call have the default value added to their argument list.

## Memory Layout

We do not need to modify or use memory - as mentioned before, our feature only
changes function/method definitions and calls.
