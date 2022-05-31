# CSE 231 Week 7 Project Milestone

## I. What We Got Working

For this week, we implemented the bare-bone functionalities of Python File-I/O, with some compromises to accomodate the current state of the compiler (no `string` class, no `list` class, etc.). In the following section, we will give a summary of the changes we've made.

### 1. The Framework
In our implementation, bascially most of the I/O functionality are implemented in Javascript. we implement some of the key functionalities as functions in JS, and import those functions to be called in the WASM code. Beneath the JS layer, the main file I/O is handled by a browser file system.

In Python, file I/O is mainly interfaced through a built-in `File` class. To keep the design modular, we choose to implement the `File` class in *Python*. The class difinition code is automatically visible in the *user-code* text area every time the website is reloaded. Additionally, an `open()` global function is also defined. This allow us the leverage the implemented part of the compiler and gives us much more flexibility.

On the WASM side, the `File` object calls the corresponding JS functions, and supply the file descripter (a number) to specifiy which file in the file system it is associated with. The following graph illustrates the whole framework:
![](https://i.imgur.com/BHwamYX.jpg)


### 2. The FileSystem

Originally, we tried to host the file on the browser's filesystem using `window.requestFileSystem`. But from the fact that the functionality is not adapted by all browsers, plus the many restrictions it posts, we ended up going with the using `BrowserFS` package.

For our Python runtime, we host the browserFS filesystem on the `LocalStorage`. To ensure a stateless testing environment, **all the tests should be run on private modes** (Chrome incognito mode or Firefox private mode.) This ensures that every time we restart the browser, the local storage will be cleared automatically.

We extended the `window` global with a new field `fs`, which allows all the scripts to access the file system.

### 3. The `File` class

The `File` class has the following definition:

```python=
class File(object):
    fd : int = 0            # Stores the file descriptor in the JS side
    mode : int = 0          # Stores the mode of the file object (read/write)
    closed : bool = False   # A flag recording of the JS side file is closed
    pointer : int = 0       # A number tracking the read/write head of the file
    filelength : int = 0    # A number tracking the file length

    def __init__(self : File):
        pass
    
    def read(self : File) -> int:
        # Checks if the file is opened and in read mode
        # Reads one i32 from file `self.fd` with the JS function
        # (note that the current read always read from position 0)
    
    def write(self : File, s : int) -> int:
        # Check if the file is opened and in write mode
        # Write one i32 to the file `self.fd` with the JS function
        # (note that the current write always write from position 0)

    def tell(self : File) -> int:
        # Return the current read pointer in the file

    def seek(self : File, pos : int):
        # Move the read/write pointer to `pos`
        
    def close(self : File):
        # Check if the file is already closed.
        # If not, close the file on the JS side.
```

Due to the limited time, the current implementation does not support reading from and writing to the position in the file specified by `self.pointer`. We plan the add this in the future.

Additionally, we also append an implementation of the python built-in `open()` function, which returns a `File` object.

```python=
def open(mode : int) -> File:
    newFile : File = None
    newFile = File()
    
    newFile.fd = jsopen(mode)
    newFile.closed = False
    newFile.mode = mode
    
    return newFile
```

### 4. The Javascript Side of Things

In the JS side, the functions calls the fileSystem APIs implemented by the BrowserFS class. Since currently the compiler does not support strings and lists, we made to choice to fix all the function to act on only one file: `test.txt`. The flags that specifies the file access mode are also limited to numbers (0 = read, 1 = write).

For similar reasons, the functions only allows reading and writing of a single number at the moment. In the future, as the string and list classes are implemented, we will gradually implement more sophisticated functionalities.


## II. Running in the IDE and Testing

Run `npm install` should install the required `browserfs` extension. And then you can run `npm run build-web` to build. After serving the website, you should bw able to see class definition code and some initialization code automatically appear in the user-code text area. After clicking Run, it writes out a `test.txt` file that has '1234' in it. Then in the REPL, you can type:

```
f = open(0)
```

which opens `test.txt` in read mode.
Then call:

```
f.read()
```

It should return the first chracter `1`.

If you call `f.read()` multiple times, it should return 2, 3 and 4.

Finally, you should call `f.close()`. Operating on a closed file or operating in the wrong mode will both result in errors. For now, we throw them by printing out special numbers like `99999`.

Note that since our solution uses a browser file storage system, the tests cannot be comlpeted using a single JS environment. So if other tests need to be done using `npm test`, the import statements appended at the beginning of WASM code should be removed (the `jsopen` functions etc.).