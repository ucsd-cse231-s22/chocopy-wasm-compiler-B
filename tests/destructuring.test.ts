import { assert, assertPrint, assertFail, assertTCFail, assertTC, assertParserFail } from "./asserts.test";
import { NUM, BOOL, NONE, CLASS } from "./helpers.test"


describe("Destructuring Tests", () => {

assertTCFail("length mismatch - non Paren", `
x : bool = True
y : int = 12
x,y = 1,2,3`)

assertTCFail("length mismatch - non Paren", `
x : bool = True
y : int = 12
x,y,z = 1,2`);

assertTCFail("length mismatch - non Paren - binop", `
x : bool = True
y : int = 12
x,y = 1+2`);

assertTCFail("length mismatch - non Paren - binop", `
x : bool = True
y : int = 12
x,y,z = 1,2+3`);

assertTCFail("length mismatch - non Paren - ignore", `
x : bool = True
y : int = 12
x,y,_ = 1,2`);

assertTCFail("length mismatch - non Paren - ignore", `
x : bool = True
y : int = 12
x,y,_ = 1,2,3,4`);

assertTCFail("length mismatch - non Paren - ignore - binop", `
x : bool = True
y : int = 12
x,y,_ = 1,2+3`);

assertTCFail("length mismatch - non Paren - ignore - binop", `
x : bool = True
y : int = 12
x,y,_ = 1,2,3+4,5`);

assertTCFail("length mismatch - non Paren - ignore - star", `
x : bool = True
y : int = 12
x,y,_,*c = 2,3`);

assertTCFail("length mismatch - non Paren - star", `
x : bool = True
y : int = 12
x,y,*c = 2`);

assertTCFail("length mismatch - non Paren - ignore - star - binop", `
x : bool = True
y : int = 12
x,y,_,*c = 5+6`);

assertParserFail("Multiple starred", `
a : int = 0
b : int = 0
c : int = 0
d : int = 0
a, *b,c,*d = 3,4,5,6`)

assertParserFail("Unsupported Expr", `
a : int = 0
b : int = 0
a, b + 2 = 5, 6`)

assertPrint("basic-destr", `
x : int = 0
y : int  = 0
x, y = 5, 6
print(x)
print(y)` , ["5", "6"]);

assertPrint("basic-destr2", `
x : int = 0
x,  = 5, 
print(x)` , ["5"]);

assertPrint("destr-underscore", `
x : int = 0
y : int  = 0
x,_, y = 5, 6, 7
print(x)
print(y)` , ["5", "7"]);

assertPrint("destr-multiple-types", `
x : int = 0
y : bool  = False
x,_, y = 5, False, True
print(x)
print(y)` , ["5", "True"]);

assertPrint("destr-lookup", `
class C(object):
 x : int = 123

x : int = 0
y : bool = False
c : C = None
c = C()

x,c.x, y = 5, 10, True
print(x)
print(c.x)
print(y)` , ["5", "10", "True"]);

assertPrint("destr-expressions", `
class C(object):
 x : int = 123

x : int = 0
y : bool = False
c : C = None
c = C()

x,c.x, y = c.x, 10 + 20, True or False
print(x)
print(c.x)
print(y)` , ["123", "30", "True"]);

assertPrint("destr-starred", `
x : int = 0
y : [int] = None
z : int = 0

x, *y, z = 5, 10, 20
print(x)
print(y[0])
print(z)` , ["5", "10", "20"]);

assertPrint("destr-fnCallValid", `
def f() -> int:
 return 5

x : int = 0
y : int = 0
z : int = 0

x, y, z = f() + 20 , 10, -20
print(x)
print(y)
print(z)` , ["25", "10", "-20"]);

assertTCFail("destr-fnCallError", `
def f() -> bool:
 return True
 
x : int = 0
y : int = 0
z : int = 0

x, y, z = f(), 10, 20
print(x)
print(y)
print(z)`)

const rangeDef =`
class Range(object):
  current : int = 0
  start : int = 0
  end : int = 0
  def new(self:Range, start:int, end:int)->Range:
    self.start = start
    self.current = start
    self.end = end
    return self
  def next(self:Range)->int:
    c : int = 0
    c = self.current
    self.current = self.current + 1
    return c
  def hasNext(self:Range)->bool:
    return self.current < self.end
def range(s: int, e: int)->Range:
  r: Range = None
  r = Range().new(s,e)
  return r
`

assertPrint("range-test", `
${rangeDef}
a:int = 5
b:int = 3
a, b = range(1, 3)
print(a)
print(b)
`, ["1", "2"]
)

assertPrint("range-test", `
${rangeDef}
a:int = 5
b:int = 3
a, b = 2, range(1, 2)
print(a)
print(b)
`, ["2", "1"]
)

assertPrint("destr-fnCallValidParam", `
def f(a:int):
    x : int = 0
    y : int = 0
    z : int = 0

    x, y, z = a + 20 , a, -20
    print(x)
    print(y)
    print(z)

f(5)` , ["25", "5", "-20"]);

//Lists

assertTCFail("length mismatch - lists", `
x : int = 2
y : int = 12
x,y = [1,2,3]`)

assertTCFail("length mismatch - lists", `
x : int = 2
y : int = 12
x,y,z = [1,2]`);

assertTCFail("length mismatch - lists - binop", `
x : int = 2
y : int = 12
x,y = [1+2]`);

assertTCFail("length mismatch - lists - binop", `
x : int = 2
y : int = 12
x,y,z = [1,2+3]`);

assertTCFail("length mismatch - lists - ignore", `
x : int = 2
y : int = 12
x,y,_ = [1,2]`);

assertTCFail("length mismatch - lists - ignore", `
x : int = 2
y : int = 12
x,y,_ = [1,2,3,4]`);

assertTCFail("length mismatch - lists - ignore - binop", `
x : int = 2
y : int = 12
x,y,_ = [1,2+3]`);

assertTCFail("length mismatch - lists - ignore - binop", `
x : int = 2
y : int = 12
x,y,_ = [1,2,3+4,5]`);

assertPrint("basic-destr-list", `
x : int = 0
y : int  = 0
x, y = [5, 6]
print(x)
print(y)` , ["5", "6"]);

assertPrint("destr-underscore-list", `
x : int = 0
y : int  = 0
x,_, y = [5, 6, 7]
print(x)
print(y)` , ["5", "7"]);

assertPrint("destr-single-list", `
a: [int] = None
a = [1, 2, 3]
print(a[0])
print(a[1])
print(a[2])`, ["1","2","3"]);

assertTCFail("length mismatch - lists - ignore - star", `
x : int = 2
y : int = 12
c = [int] = None
x,y,_,*c = [2,3]`);

assertPrint("destr-list-star-1", `
x : int = 2
y : int = 12
z : [int] = None
x,y,*z = [1, 2, 3, 4, 5]
print(x)
print(y)
print(z[0])
print(z[1])
print(z[2])`, ["1","2","3","4","5"]);

assertPrint("destr-list-star-2", `
x : int = 2
y : int = 12
z : [int] = None
x,*z,y= [1, 2, 3, 4, 5]
print(x)
print(z[0])
print(z[1])
print(z[2])
print(y)`, ["1","2","3","4","5"]);

assertPrint("destr-list-star-2", `
x : int = 2
y : int = 12
z : [int] = None
*z,x,y= [1, 2, 3, 4, 5]
print(z[0])
print(z[1])
print(z[2])
print(x)
print(y)`, ["1","2","3","4","5"]);

assertPrint("destr-list-star-ignore-1", `
x : int = 2
y : int = 12
z : [int] = None
x,y,_,*z = [1, 2, 3, 4, 5, 6]
print(x)
print(y)
print(z[0])
print(z[1])
print(z[2])`, ["1","2","4","5","6"]);

assertPrint("destr-list-star-ignore-2", `
x : int = 2
y : int = 12
z : [int] = None
x,_,*z,y = [1, 2, 3, 4, 5, 6]
print(x)
print(z[0])
print(z[1])
print(z[2])
print(y)`, ["1","3","4","5","6"]);

assertTCFail("Type Mismatch - lists - star", `
x : int = 2
y : set[int] = None
x,*y = [2,3,6,7]`);

assertPrint("destr-fnCallValid", `
def f() -> int:
 return 5

x : int = 0
y : int = 0
z : int = 0

x, y, z = f() + 1 , f() + 2, f() + 3
print(x)
print(y)
print(z)` , ["6", "7", "8"]);

assertPrint("destr-fnCallValid-ignore-star", `
def f() -> int:
 return 5

x : int = 0
y : int = 0
z : [int] = None

x, y, _, *z = f() + 1 , f() + 2, f() + 3, f() + 4 , f() + 5, f() + 6
print(x)
print(y)
print(z[0])
print(z[1])
print(z[2])` , ["6", "7", "9", "10", "11"]);

assertPrint("destr-fnCallValidParam-lists", `
def f(a:int):
    x : int = 0
    y : int = 0
    z : int = 0

    x, y, z = [a + 1 , a + 2, a + 3]
    print(x)
    print(y)
    print(z)

f(5)` , ["6", "7", "8"]);

assertPrint("destr-fnCallValidParam-lists-ignore-star-1", `
def f(a:int):
    x : int = 0
    y : int = 0
    z : [int] = None

    x, y,_, *z = [a + 1 , a + 2, a + 3, a + 4, a + 5, a + 6 ]
    print(x)
    print(y)
    print(z[0])
    print(z[1])
    print(z[2])

f(5)` , ["6", "7", "9", "10", "11"]);


assertPrint("destr-fnCallValidParam-lists-ignore-star-2", `
def f(a:int):
    x : int = 0
    y : int = 0
    z : [int] = None

    x,_, *z, y = [a + 1 , a + 2, a + 3, a + 4, a + 5, a + 6 ]
    print(x)
    print(z[0])
    print(z[1])
    print(z[2])
    print(y)

f(5)` , ["6", "8", "9", "10", "11"]);

assertPrint("destr-fnCallValidParam-lists-ignore-star-3", `
def f(a:int):
    x : int = 0
    y : int = 0
    z : [int] = None

    x, *z, _, y = [a + 1 , a + 2, a + 3, a + 4, a + 5, a + 6 ]
    print(x)
    print(z[0])
    print(z[1])
    print(z[2])
    print(y)

f(5)` , ["6", "7", "8", "9", "11"]);

assertPrint("basic-destr-multiple-list-1", `
x : [int] = None
y : [int]  = None
x, y = [[5, 6],[7, 8]]
print(x[0])
print(x[1])
print(y[0])
print(y[1])` , ["5", "6", "7", "8"]);

assertPrint("basic-destr-multiple-list-3", `
x : [int] = None
y : [int] = None
z : [[int]] = None

x,_, *z, y = [[5, 6],[7, 8],[9, 10],[11, 12],[13, 14]]
print(x[0])
print(x[1])
print(z[0][0])
print(z[0][1])
print(z[1][0])
print(z[1][1])
print(y[0])
print(y[1])` , ["5", "6", "9", "10", "11", "12", "13", "14"]);

assertPrint("basic-destr-index-assign", `
x : int = 0
y : int = 5
a:[int] = None
b:[int] = None
a = [2,3]
b = [3,4]
x, a[0] = b[0], y
print(x)
print(a[0])
print(a[1])` , ["3", "5", "3"]);

// Different types not supported inside List
// assertPrint("destr-non paren-list", `
// x : int = 2
// y : int = 12
// z : [int] = None
// x,y,z = [1,2,[3,4]]
// print(x)
// print(y)
// print(z[0])
// print(z[1])`, ["1","2","3","4"]);


// We can't print list nor can we use is operator
// assertPrint("basic-destr-multiple-list-2", `
// x : [int] = None
// y : [int]  = None
// x, _, *y = [[5, 6],[7, 8]]
// print(x[0])
// print(x[1])
// print(y is None)` , ["5", "6", "True"]);


// Sets

assertTCFail("length mismatch - set", `
x : int = 2
y : int = 12
x,y = {1,2,3}`)

assertTCFail("length mismatch - set", `
x : int = 2
y : int = 12
x,y,z = {1,2}`);

assertTCFail("length mismatch - set - binop", `
x : int = 2
y : int = 12
x,y = {1+2}`);

assertTCFail("length mismatch - set - binop", `
x : int = 2
y : int = 12
x,y,z = {1,2+3}`);

assertTCFail("length mismatch - set - ignore", `
x : int = 2
y : int = 12
x,y,_ = {1,2}`);

assertTCFail("length mismatch - set - ignore", `
x : int = 2
y : int = 12
x,y,_ = {1,2,3,4}`);

assertTCFail("length mismatch - set - ignore - binop", `
x : int = 2
y : int = 12
x,y,_ = {1,2+3}`);

assertTCFail("length mismatch - set - ignore - binop", `
x : int = 2
y : int = 12
x,y,_ = {1,2,3+4,5}`);

assertPrint("basic-destr-multiple-set-ignore", `
a : set[int] = None
a,_ = {1,2},{3,4}
print(1 in a)
print(2 in a)` , ["True", "True"]);

// assertPrint("basic-destr-multiple-set-star-ignore", `
// a : set[int] = None
// c : set[int] = None
// a,_,*c = {{1,2},{3,4}}
// print(a[0])
// print(a[1])` , ["1", "2"]);

});

// [[1,2],[3,4]],sets
