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
```

* test case 12: use string as class fields
```
class C(object):
    s:str = "asd"
    def gets(self: C)->str:
        return self.s
c:C = None
c = C()
print(c.gets())
``` 

## Changes to code base
* ast: 
    * add ``` { tag: "str", value: string}``` to Literal: this is because strings are treated as literals in the python language
    * add ```{strarg?:string}``` field to the construct Expression node: this is because we are treating strings as objects and need to pass string literals as parameters to the constructor. However, since WAT does not support strings, we are passing them in the compiler with this field.
* ir: No changes
* New functions/files: add String.wat to codebase. String.wat would contain the implementation of the string class. The String class would include methods such as access, greater_than, equals_to etc.
* Compiler (Changes Pending): We made two minor yet crucial changes to the compiler. We understand that we should not tamper with the compiler lightly, but without these changes our design would not be able to function. We think there are no good work around for these changes. However, we do think that some of these work might be better suited for the Frontend Team or the Buildin Library Team. As for now, these changes are required for us to pass our tests.
    * added ```print_str``` function: the current printers cannot interface with the `str` class. We added a new printer to print strings. 
    * added a function that loads our string class implementation `string.wat` to the very front of the compiled code.
* New value representation/memory layout: we implemented our string as a consecutive chunk of bytes on the memory representing ascii values. The `str` class provides interface for the string. A psudocode representation of `str` class's variable members are as follows. The class occupies a consecutive chunk of memory, with the first four bytes always dedicated to storing the length of the string. The remaining bytes store the ascii vlaues of the string right after the length bytes.
```
class str:
    length:int
    s:string
``` 
* Implementation Notes: Strings are special in that they behave like both a literal and a class. This has two implications:
    1. When a string is assigned in an variable definition, its constructor is called. To fit this into the current framework where each literal in the python language is assumed to have a direct counterpart in WASM, we refactor the AST tree during the Type Checking step. ```s:str = "abc"``` is refactored into ```s:str = None, s = str("abc")```. If the string is declared in the main body, the constructor is call at the beginning of the main body. If the string is declared in a method of a function, the constructor is called at the beginning of the funciton. If the string is declared as a member of a class, the constructor is called at the beginning of the class's initializer.
    2. When certain operators are called with strings as operands, certain member methods are called. Similarly, we refactor the binop expression into a method call at the Type Checking step. For instance, ```"abc" + "abc"``` is refactored into ``` "abc".concat("abc")```.
    3. Some further notes: 
        * python strings are immutable. This means that ```s:str = "abc", s[0] = 'a'``` produces a type error in python. This is done for good reason as strings are considered to be literals, meaning that when we interact with them, we should not feel like we are interacting with memory. This is very different from languages such as C where strings are simply defined as null terminated arrays. We preserve this behavior, meaning that 
            1. We do not allow any manipulation to a string object. Once a string object is created, its fields stay constant until it is destroyed
            2. All methods that return strings (including constructors, the concatenate (+) operator etc.) create new string objects. They do not reuse memory from older string object.
        * We added some new files in the test folder to help with `npm test`. Some of these file contain important implementation for our tests, meaning that importing a function of the same from another test helper will not produce the correct results for strings.

