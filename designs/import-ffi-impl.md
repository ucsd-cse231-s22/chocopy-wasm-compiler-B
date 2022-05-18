
REQUIREMENTS
============

1. Make all the following cases work
  - import mod, lib
  - import mod as x, lib as y
  - from mod import x, y
  - from mod import x as y
  - from mod import *

Update : only one module import per line.
This is because lezer can't parse `import x, y` although it can parse `from mod import x, y`.

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

NOTE
====
- No code will executed when a module is imported. i.e. if any of the modules
    have statements in the global space, they won't be executed when imported.
- The main module will have to be named "main" these are the only module whose
    statements will be executed.

IMPLEMENTATION
==============

At the high level, the parser does most of the work and concatenates everything together.
We basically get treat the whole thing as a giant program, and any global variables in any
module are name mangled. The name mangled form of `<global_name>` in `<module_name>` is 
just `<module_name>$<global_name>`. i.e. The function `foo()` in module `lib` gets 
transformed to `lib$foo()`. All globals in a module are importable. Globals are variables,
functions and classes defined at a global scope in any given module.

This removes the need for having import statements/types in the AST.

1. The parser takes in a object of type Modules (see ast.ts)
    - keys => module name & value => source code
    - All module dependencies are contained within the object
    - one by one each module is traversed()
    - Before traversing a module, global ModuleContext is updated

2. The global modulesContext has 
    - the mapping of module name to some info about the module (modMap, nsMap and globals)
    - the modMap contain the mapping of every module imported into this module.
        eg. `import lib as bar` would create `modMap : {"bar" : "lib"}`
    - the nsMap contains mapping of globals to their name mangled form. so any time a global 
        is defined in a module, or imported into it, a mapping in `nsMap` is created.
        `nsMap : {x : "lib$x" } // from lib import x / from lib import *`
        `nsMap : {y : "lib$x" } // from lib import x as y`
        `nsMap : {z : "main$z"} // z is a global in 'main'`
    - the `gloabls` array contains a list of global symbols that are defined in the module.
        This includes global variables, functions and classes.

3. Automatic name conversion
    - During compilation, any global symbol (class/func/variable) is 
        changed to $mod$symbol. eg "add" func in lib becomes "$lib$add"
    - Similarly when a module in imported, it is automatically name mangled
        (eg. from x import y // now whenever y is referenced we replace with $x$y)
    - Note : no name mangling if the variable is redefined in a local context.
        (i.e. if y was redefined inside a function, don't convert it to $x$y as above)

4. The traversal returns `Program<SourceLocation>` object for each module

5. All of this is stitched to make one large program. This is done in mergeModules().

Note : We have updated SourceLocation to contain module name alongside the line number.


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
