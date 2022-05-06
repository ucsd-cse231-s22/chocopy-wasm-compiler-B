# Changes to ast

1. A new field in Program: module name
2. A new statement for import.

# Changes to compilation passes

1. A pass that reduces module accesses to plain strings, ie

```
{tag: lookup, obj: {tag: id, name: MOD}, field: NAME}

-->

{tag:id, name: $MOD$NAME}
```

and

```
{tag: id, name: NAME}

-->

{tag: id, name: $MOD$NAME} where MOD is the current module's name

```

# Tests we’d like to pass

```
Should pass:

from mod import x
from mod immport x as y
from mod import *
from mod import x as y, m as n, z

Should fail:

from mod import x, *
from mod import x.y
from mod.n impport x.y
```
