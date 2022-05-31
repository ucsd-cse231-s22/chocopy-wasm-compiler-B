## Testcases
    
First of all, there is a binary file `test` in the file system, with the following content:
    
```
\x00000001\x00000002\x00000003\x00000004\x00000005
```
    
### 1. 
Create a class `File` that supports various file operations:
```python=
f : File = None
f = open('test', 'rb')
```
Expected output:
```python=
# `open()` successfully returns a `File` class.
```
    
    
### 2.
    
```python=
f : File = None
f = open('test', 'rb')
f.close()
f.read()
```
    
Expected output:
```python=
# Attempt to read a closed file should report Runtime Error. (or other errors?)
    
ValueError: I/O operation on closed file.
```
    
### 3.
    
```python=
f : File = None
f = open('test', 'rb')
f.close()
f.closed == True
```
Expected output:
```python=
True
```
    
### 4.
```python=
f : File = None
f = open('test', 'wb')
f.read()
```

Expected output:
```python=
# Attempt to read a file that's set to write mode should result in error.
UnsupportedOperation: not readable
```
    
### 5.
```python=
f : File = None
f = open('test', 'rb')
    
print(f.read())
print(f.read())
```

Expected output:
```python=
# Since Python `read(size)` returns a byte string of `size` bytes, this would
# depend on the implementation of Strings.
 
# We made the temporary design choice to only allow `read()` to read one 
# integer (4 bytes).
1
2
```
    
### 6.
```python=
f : File = None
f = open('test', 'rb')

print(f.tell())
f.read()
print(f.tell())
```
Expected output:
```python=
# When the file is first opened, the current position of the file pointer is 0 bytes from the
# file beginning. After our first read, we will have read in 4 bytes, so the second f.tell() 
# should return 4
0
4
```
    
### 7.
```python=
f : File = None
f = open('test', 'rb')

print(f.read())
f.seek(0)
print(f.read())
```

Expected output:
```python=
# `seek(0)` resets the file ptr to the start of the file, so the second
# read should still return the first number.
1
1
```

### 8.
```python=
f : File = None
f = open('output', 'wb')
    
print(f.write(5))
print(f.write(4))
f.close()
```
    
Expected output:
```python=
4
4
    
# Additionally, the test should result in a new file `output`
# with the following content:

\x00000005\x00000004
```
    
### 9.
```python=
f : File = None
f = open('test', 'rb')
f.read()
f.read()
f.read()
f.read()
f.read()
f.read()
```

Expected output:
```python= 
# Right now we cannot recognize EOF of a file as we are only dealing with ints, so
# we will throw error when we try to read after we are done reading the file.
# Instead the user should check compare the length of the file to the current file pointer location to
# determine if EOF has been reached.

Runtime Error: Tried to read past end of file
```
    
### 10.
```python=
f: File = None
f = open('test', 'rb')
print(f.read())
print(f.read())
f.close()
f = open('test', 'wb')
print(f.write(7))
print(f.write(6))
f.close()
f = open('test', 'rb')
print(f.read())
print(f.read())
print(f.read())
```
 
Expected Output:
```
# First we read the first two integers, (outputting 0,1)
# Next, we overwrite the file with two write calls (outputting 4,4)
# Finally, we try to read the file again (outputting 7,6 then error)

1
2    
4
4
7
6
Runtime Error: Tried to read past end of file
```
    
## Change List
    
We will not touch AST/IR.
    
We will include a class definition of the `File` object in Python. Here's a rough outline of what that might look like:
```python=
class File(object):
    pointer : int = 0
    filename : str = ''
    filelength : int = 0
    mode : str = 'r'
    closed : bool = False
    
    def read(self : File) -> int:
    
    def write(self : File, x : int) -> int:
    
    def tell(self : File) -> int:
    
    def seek(self : File, pos : int):
    
    def close(self : File):

```
    
We plan to implement most of the I/O functionalities in JavaScript.