
REQUIREMENTS
============

1. Make all the following cases work
  - import mod, lib
  - import mod as x, lib as y
  - from mod import x, y
  - from mod import x as y
  - from mod import *

2. Catch all cases that shouldn't work
  - Calling non existant imports
      (mod.x when imported module 'mod' has no property(?) 'x')
  - Type errors (mismatch - int vs bool or param mismatch)
  - Redefinitions 
      (global var of module is same as an import)
  - Name conflict between two modules 
      (two "import *" result in copies of globals)
  - Etc. (what else am I missing?)

3. Proper error messages
  - Right type of errors (ParseError vs TCError vs CompilerErr)
  - Right information (module name + line num + err msg)


IMPLEMENTATION
==============

At the high level, the parser does most of the work and concatenates everything together.
This removes the need for having import statements/types in the AST.

1. The parser takes in a object of type Modules (see ast.ts)
    - keys => module name & value => source code
    - All module dependencies are contained within the object
    - one by one each module is traversed()
    - Before traversing a module, global ModuleContext is updated

2. The global ModuleContext has 
    - the name of the current module being parsed
    - the object of imported references to the modules they belong to
        (eg. from x import y => ModuleContext.nsMap[y] = 'x')

3. Automatic name conversion
    - During compilation, any global symbol (class/func/variable) is 
        changed to $mod$symbol. eg "add" func in lib becomes "$lib$add"
    - Similarly when a module in imported, it is automatically name mangled
        (eg. from x import y // now whenever y is referenced we replace with $x$y)
    - Note : no name mangling if the variable is redefined in a local context.
        (i.e. if y was redefined inside a function, don't convert it to $x$y as above)

4. The traversal returns Program<SourceLocation> object for each module

5. All of this is stitched to make one large program. This is done in mergeModules().

Note : We should add the module name along with the line number. See update to SourceLocation.


ADVANTAGES
==========

1. Most of the stuff is done in the parser itself, we don't need to update any of
    the other files in a significant manner.
2. Output/program behaviour will be easier to reason about since -
    - the concatenation reflects the runtime. i.e. everything is one big program,
        shared global space and modules are just namespaces.
    - Easy to debug by just looking through a linear source code.
3. Deals with circular dependencies - no problem!
4. FFI/Dynamic linking is also done easily - we need a ".h" equivalent for 
    type declarations. Then in the compiler just replace with a cross module call.


DISADVANTAGES
=============

1. Parser will have to be smart while "name mangling" - ensure local names are used
    if they are defined, etc.
2. Since we won't be keeping any import info maybe it makes it less flexible in the
    future? (Can't think of any concrete example for this though)


EXAMPLE
=======

```py
# main.py

from lib import *   # max(), min()
import math         # add(), sub(), PI

gamma : SomeObj = SomeObj()
def foo():   # $main$foo created
  pass

math.add()   # $math$add()
foo()        # $main$foo()
max()        # $lib$max()

math.PI      # $math$PI
gamma.x      # $main$gamma.x
```

input to parse -
`parse({main: "...", lib: "...", math: "..."})`

Note : while lib.py and math.py are parsed the functions 
  max, min -> $lib$max, $lib$min
  add, sub, pi -> $math$add, $math$sub, $math$PI
This is what makes the concatenation work!
