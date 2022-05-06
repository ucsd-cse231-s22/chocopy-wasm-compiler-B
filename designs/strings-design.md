## TEST CASES FOR WEEK 7:
* test case 1: var definition for string
```
s:str = "asdf"
```

* test case 2: print string
```
s:str = "asdf"
print(s)
```

* test case 3: index accessing
```
s:str = "asdf"
print(s[0])
```

* test case 4: index out of range error, should be a runtime error
```
s:str = "asdf"
print(s[5])
```

* test case 5: get the length of string
```
s:str = "asdf"
print(len(s))
```

* test case 6: immutable ???
```
s:str = "asdf"
s[1] = "p"
```

* test case 7: compare two strings using their ascii values, should print True
```
s1:str = "ab"
s2:str = "abc"
print(s1 < s2)
```

* test case 7.5: compare two strings using their ascii values, should print False ????
```print("abcd" < "abc")```

* test case 8: check if two strings are equal, should print False
```
s1:str = "ab"
s2:str = "abc"
print(s1 == s2)
```

* test case 8.5: check if two strings are equal, should print True
```
s1:str = "abc"
s2:str = "abc"
print(s1 == s2)
```

* test case 9: concat two strings
```
s1:str = "abc"
s2:str = "def"
print(s1+s2)
```

* test case 10: should report type error 
```
s:int = "asd"
```

* test case 11: use string as function parameters
```
def f(s:str)->str:
    return s
print(f("asd"))
``

* test case 11: use string as class fields
```
class C(object):
    s:str = "asd"
    def gets()->str:
        return s
c:C = None
c = C()
print(c.gets())     
``` 

## Changes to AST and IR
* ast: add ``` { tag: "str", value: string} // adding str to Literal``` to Literal
* ir: No changes
* New functions/files: add String.wat to codebase. String.wat would contain the implementation of the string class. The String class would include methods such as access, greater_than, equals_to etc.
* New value representation/memory layout: we are either going to implement strings are arrays of ascii bytes or unicode byte-string (which is how python actually implements them). If we are going to stick to the ascii representation, we are going to store strings in memory as arrays with byte-size-elements. If we are going to implement the unicode representation, we are going to store strings as byte-strings with variable length elements with sizes between 1 and 4 bytes. We will also need a codec to decode the byte-string.
