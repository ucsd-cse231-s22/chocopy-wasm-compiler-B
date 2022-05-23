# CSE 231 Milestone 2

## Potential Conflicts Between Other Groups

The file I/O is actually quite separated from the rest of the implementation. The dependency is quite one-sided. We rely on some other teams' work (e.g. String) but other teams rarely depend on us.

### Bignums
The only time any integers will be used in file I/O is when specifying the number of bytes to read or write. Since it is unlikely that we would be required to write number of bytes that falls in the BigNum range, there really isn't much interaction.

    
### Built-in libraries/Modules/FFI
In the current implementation, we defined the built-in function `open()` by appending python code to the beginning of the user input. Techniquely this should probably be merged into the built-ins. 

As long as there's no conflicting definition of the function, there should be no problems.


### Closures/first class/anonymous functions
There's no direct interaction.

### comprehensions
There isn't much chance for file I/O to interact with comprehensions.

### Destructuring assignment
Since file I/O functions only have single return values, there isn't much interaction with the destructuring assignment group.

### Error reporting
Since most of our I/O functionalities are handled by inported functions from Javascript, we currently directly rely on the JS side exception for the error reporting. 

### Fancy calling conventions
Technically the mode parameter for the `open()` function is a keyword argument, hence we would have to change the `open()` definition to support that.

```python=
open(file_name, mode='r'):
    # open file
```

However, since currently the definition of `open()` is in python, if the parsing of keyword arguments in function definitions is successful, future support should be fairly straight forward.

### for loops/iterators
In python, an opened file should also act as an iterable, for example:

```python=
f : File = None
f = open('file.txt', 'r')
for l in f:
    # `l` should loop thru all lines in `f`
```

We could make this work by implementing the `next()` and `has_next()` functionality for the `File` class. And it should perform read and advance the read/write head in a file.

### Front-end user interface 
There's no direct interaction.

### Generics and polymorphism
There's no direct interaction.

### Inheritance
There's no direct interaction.

### Lists
No, python deals with reads and writes in strings and byte strings. So there isn't direct interactions between the list group and us.

### Memory management
When `close()` is called on a file object, we could potentially release the memory occupied by the `File` object.
```python=
f.close() #-> no way of reopening or read/write, could free memory?
```

### Optimization
No, since most file I/O calls are done in single lines and are mostly calling imported JS functions, there isn't really much room for (compiler level) optimization.

### Sets and/or tuples and/or dictionaries
No, for similar reason as lists. Python deals with reads and writes in strings and byte strings. So there isn't direct interactions between the set/dict group and us.

### Strings
The file I/O implementation relies heavily on the string team. The file path, the mode, and the input/output are all instances of strings. 

```python=
open("some_string", mode="w"):
```

```python=
f.read() # returns strings
```

```python=
f.write("some content")
f.write(b"byte strings")
```

We might have to request support for byte strings to to byte-level manipulation of files.

