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

9. Use an expr as a default value

    ```python
    def test(x : int = 1+2) -> int:
        return x

    print(test())
    ```

    _Expected result: 3_

10. Ensure same behavior for methods as with functions

    ```python
    class C(object):
        def test(self : C, x : int = 7+2):
            print(x)
        
    x : C = None
    x = C()
    x.test()
    ```

    _Expected result: 9_

### To Run Our Test Cases
This PR includes a new command in `package.json` - `npm run test-callconv`. This will run our test suite located at `tests/ callingconventions.test.ts`. The most interesting use cases are default values that are defined via expressions:
functions such as `def test(x : int = 3 + 4)` can now use `x` which will be defined as 7.

## Changes

### AST

- Parameter must hold an optional defaultValue of type Expr. This field will be undefined if the parameter doesn't have a default value, and will hold the parsed expression otherwise.

### IR

- During lowering from AST to IR, all calls that do not redefine default values will have the default values added to their argument list. Therefore, a Parameter now doesn’t need to hold any default values/arguments. We restore the Parameter to its original state, without holding any Expr.

### Built-in Libraries

We do not require any new library functionality - this feature only impacts function/method definitions and calls.

## Functions, Datatypes, New Files

### Changes in Parser

- `traverseParameters` is expanded to parse default values, and to throw a parse error if parameters without a default value is defined after parameters with default values (for example, `def test(x : int = 5, y : int)` will throw an error.)

### Changes in Type Checking

- `GlobalTypeEnv` is extended so that functions and classes hold the number of required parameters, and `augmentTEnv` is extended to add this information. Without this information, we cannot distinguish between a required and optional parameter in the `GlobalTypeEnv`, and typechecking must ensure that all required parameters are called.

- All default value exprs are typechecked as valid exprs and matching the type of the parameter.

- Method and function calls are typechecked to ensure they call all required arguments, but are allowed to not define optional arguments.

- If default arguments are passed they are also typechecked similar to non default arguments.

### Changes in Lowering

- Two global variables, `funMeta` and `classMeta`, are defined to hold the argument values for functions and methods, and they are filled in `lowerProgram`.

- `classMeta` ignores the first argument as it is Self and not needed for the method call itself

- The global variables are created as empty maps so that every call to lowering can add new information to the global variables without deleting previous data

- For function and method calls, any default parameters that were not defined in the call have the default value added to their argument list.

- For the flatten expression for "call", the arguments of the given function are retrieved from `funMeta` with their values (non default values are simply undefined). Since the call is already typechecked, we know that the number of arguments passed are between the number of non default arguments and total arguments, so we can simply loop through the arguments and add in the values of all remaining undefined default arguments. Once this is done the rest of the call implementation can act as normal with the newArgs variable, which hold the passed arguments and the remaining default arguments.

- For the flatten expression to "method-call", the logic is very similar but the method arguments are found by finding the class associated with the method and then getting the method all from the global variable `classMeta`. Following this, the arguments are added in the same fashion.
## Memory Layout

We do not need to modify or use memory - as mentioned before, our feature only changes function/method definitions and calls.

# Week 9: Named Arguments Milestone

## Testcases
1. Checks that the ordering of arguments is positional arguments before named arguments

   ```python
   def test(a : int, b : int, c : int = 5):
      print(a-b+c)
   test(7, c = 3, 5)
   ```
   
   _Expected result: Parse Error: positional argument follows keyword argument_

2. Checks that there are no double definitions of a single argument
   ```python
   def test(a : int, b : int, c : int = 5):
      print(a-b+c)
   test(7, 3, a = 5)
   ```

   _Expected result: Type Check Error: test() got multiple values for argument 'a'_

3. Checks that named arguments exist in the function argument definition

   ```python
   def test(a : int, b : int, c : int = 5)
      print(a-b+c)
   test(7, 3, f = 5)
   ```

   _Expected result: Type Check Error: test() got an unexpected keyword argument ‘f’_

4. Normal calls with unnamed arguments and default values still works

   ```python
   def test(a : int, b : int, c : int = 5)
	   return a + b + c
   test(7, 3)
   ```
   
   _Expected result: 15_

5. Named arguments can override non default arguments without needing to override default arguments

   ```python
   def test(a : int, b : int, c : int = 5)
	   return a - b + c
   test(b = 7, a = 3)
   ```

   _Expected result: 1_

6. Named arguments can override default arguments

   ```python
   def test(a : int, b : int, c : int = 5)
	   return a - b + c
   test(b = 7, a = 3, c = 0)
   ```
   
   _Expected result: -4_

7. Checks that all of the non default arguments are defined

   ```python
   def test(a : int, b : int, c : int = 5)
	   return a - b + c

   test(b = 7, c = 0)
   ```
   
   _Expected result: Type Check Error: test() missing 1 required argument: 'a'_

8. Correctly type checks named arguments overriding default arguments

   ```python
   def test(a : int, b : int, c : bool = True):
	   if(c):
		   return a
	   else:
		   return b
   test(c = 5, b = 1, a = 2)
   ```

   _Expected result: Type Check Error: argument ‘c’ expected ‘bool’ but got ‘int’_

9. Correctly type checks named arguments overriding non default arguments

   ```python
   def test(a : int, b : int, c : bool = True):
      if(c):
         return a
      else:
         return b

   test(b = True, a = 2)
   ```

   _Expected result: Type Check Error: argument ‘b’ expected ‘int’ but got ‘bool’_

10. Named arguments can take expressions as their value
   
      ```python
      def test(a : int, b : int):
         return a + b
      test(a = 1+2, b = 5-2)
      ```

      _Expected result: 6_
      
## Changes

### AST
* Call will be updated to hold an optional value `namedArguments?` of type `Map<string, Expr<A>>`, which will map named arguments to the corresponding expressions.

### IR
* Nothing needs to be changed in the IR. `Call` in IR already holds arguments of Value<A>, which will be provided.

### Built-in Libraries
We do not need to modify or use any builtin libraries, as this feature only impacts function/method calls.
