import { assertPrint, assertFail, assertTCFail, assertTC, assertOptimize, assertPass, assertOptimizeCorrect } from "./asserts.test";
import { NUM, BOOL, NONE, CLASS } from "./helpers.test"
import { builtinClasses } from './comp.test'

// borrowed from `forloop-iterators.test.ts`
var rangeStr = `
class __range__(object):
    start: int = 0
    stop: int = 0
    step: int = 1
    hasNext: bool = False
    currval: int = 0
    def __init__(self: __range__):
        pass
    def new(self: __range__, start: int, stop: int, step: int) -> __range__:
        self.start = start
        self.stop = stop
        self.step = step
        self.currval = start
        return self

    def next(self: __range__) -> int:
        prev: int = 0
        prev = self.currval
        self.currval = prev+self.step
        return prev
        
    def hasnext(self: __range__) -> bool:
        nextval: int = 0
        nextval = self.currval
        if((self.step>0 and nextval<self.stop) or (self.step<0 and nextval>self.stop)):
            self.hasNext = True
        else:
            self.hasNext = False
        return self.hasNext

def range(start: int, stop: int, step: int) -> __range__:
    return __range__().new(start, stop, step)`

describe("Optimization tests", () => {
  // 1
  assertOptimizeCorrect("Optimization Sanity Check (Destructuring 1)",
`
def f(a:int):
    x : int = 0
    y : int = 0
    z : int = 0

    x, y, z = a + 20 , a, -20
    print(x)
    print(y)
    print(z)

f(5)
`),
  // 2
  assertOptimizeCorrect("Optimization Sanity Check (Destructuring 2)",
`
x : int = 0
y : int = 0
z : int = 0

x, *y, z = 5, 10, 20
print(x)
print(y)
print(z)`
),

  // 3
  assertOptimizeCorrect("Optimization Sanity Check (Destructuring 3)",
`
class C(object):
 x : int = 123

x : int = 0
y : bool = False
c : C = None
c = C()

x,c.x, y = c.x, 10 + 20, True or False
print(x)
print(c.x)
print(y)`
),
  // 4
  assertOptimizeCorrect("Optimization Sanity Check (Destructuring 4)",
`
class C(object):
 x : int = 123

x : int = 0
y : bool = False
c : C = None
c = C()

x,c.x, y = 5, 10, True
print(x)
print(c.x)
print(y)`
),
  // 5
  assertOptimizeCorrect("Optimization Sanity Check (Destructuring 5)",
`
x : int = 0
y : int  = 0
x, y = 5, 6
print(x)
print(y)`
),
  // 6
  assertOptimizeCorrect("Optimization Sanity Check (Comprehension 1)",
  builtinClasses + `
a:int = 3
a = a + 3 if a > 0 else a - 3
print(a)`
),
  // 7
  assertOptimizeCorrect("Optimization Sanity Check (Comprehension 2)",
  builtinClasses + `
a:int = 3
a = a + 3 if a < 0 else a - 3
print(a)`
),
  // 8
  assertOptimizeCorrect("Optimization Sanity Check (Comprehension 3)",
  builtinClasses + `
a:int = 0
print(min(a - 1, 3) if a > 3 else max(a + 3, 4))`
),
  // 9
  assertOptimizeCorrect("Optimization Sanity Check (Comprehension 4)",
  builtinClasses + `
r:Range = None
r = Range().new(0, 5, 1)
r.next()
print(r.next())`
),
  // 10
  assertOptimizeCorrect("Optimization Sanity Check (Comprehension 5)",
  builtinClasses + `
r:Range = None
r = Range().new(5, 0, -2)
r.next()
print(r.next())`
),
  // 11
  assertOptimizeCorrect("Optimization Sanity Check (Comprehension 6)",
  builtinClasses + `
(print(min(num, 3)) for num in Range().new(0, 6, 1))`
),
  // 12
  assertOptimizeCorrect("Optimization Sanity Check (Comprehension 7)",
  builtinClasses + `
(print(min(num, 3)) for num in Range().new(0, 6, 1))`
),
  // 13
 assertOptimizeCorrect("Optimization Sanity Check (Builtin 1)",
`
print(gcd(4,6))
print(gcd(3,5))
print(gcd(2,8))
`
),
  // 14
assertOptimizeCorrect("Optimization Sanity Check (Builtin 2)",
`
c : int = 4
print(factorial(c))
`
),
  // 15
assertOptimizeCorrect("Optimization Sanity Check (Builtin 3)",
`
c : int = 3
d: int = 2
print(max(factorial(c), factorial(d)))
`
),
  // 16
assertOptimizeCorrect("Optimization Sanity Check (Builtin 4)",
`
print(perm(4,2))
print(perm(10,3))
print(perm(20,5))
`
),
  // 17
assertOptimizeCorrect("Optimization Sanity Check (Builtin 5)",
`
c : int = 3
d: int = 2
print(pow(c, d))
`
),
// 18
assertOptimizeCorrect("Optimization Sanity Check (For Loop 1)",
rangeStr + `
i: int = 0
for i in range(0,10,2):
    print(i)
`
),
// 19
assertOptimizeCorrect("Optimization Sanity Check (For Loop 2)",
rangeStr + `
i: int = 0
for i in range(0,-10,-2):
    print(i)
    break
`
),
// 20
assertOptimizeCorrect("Optimization Sanity Check (For Loop 3)",
rangeStr + `
i: int = 0
for i in range(0,10,1):
    if i > 5:
        break
    else:
        print(i)
`
),
// 21
assertOptimizeCorrect("Optimization Sanity Check (For Loop 3)",
rangeStr + `
i: int = 0
for i in range(0,5,1):
    print(i*100)
    continue
    print(i)   
`
),
// 22
assertOptimizeCorrect("Optimization Sanity Check (For Loop 4)",
rangeStr + `
i: int = 0
j:int = 0
for i in range(0,5,1):
    print(i)
    for j in range(0,2,1):
        print(j) 
    break  
`
),
// 23
assertOptimizeCorrect("Optimization Sanity Check (For Loop 5)",
rangeStr + `
i: int = 0
j:int = 0
for i in range(0,5,1):
    j = 0
    print(i)
    while(j<i):
        print(j) 
        j=j+1
        if j%2==0:
            continue
    break  
`
),
// 24
assertOptimizeCorrect("Optimization Sanity Check (For Loop 6)",
rangeStr + `
i: int = 0
j:int = 0
for i in range(0,5,1):
    j = 0
    print(i)
    while(j<i):
        print(j) 
        j=j+1
        if i%2==0:
            continue
    if i%2==1:
        continue
`
),
// 25
assertOptimizeCorrect("Optimization Sanity Check (For Loop 7)",
rangeStr + `
i: int = 0
j:int  = 0
k: int = 0 
for i in range(5, -5, -1):
    for j in range(1, 5, 1):
        for k in range(1, 5, 2):
            if(i + j + k == 0):
                print(i)
                print(j)
                print(k)
                break
            else:
                continue
        if(i + j + k == 0):
            break
        else:
            continue
    if(i + j + k == 0):
        break
    else:
        continue
`
),
// 26
assertOptimizeCorrect("Optimization Sanity Check (Generic 1)",
`
T: TypeVar = TypeVar('T')

class Printer(Generic[T]):
    def print(self: Printer[T], x: T):
        print(x)
  
pInt: Printer[int] = None
pInt = Printer[int]()
pInt.print(10)`
),
// 27
assertOptimizeCorrect("Optimization Sanity Check (Generic 2)",
`
T: TypeVar = TypeVar('T')

class Printer(Generic[T]):
   def print(self: Printer[T], x: T):
       print(x)

pInt: Printer[int] = None
pBool: Printer[bool] = None

pInt = Printer[int]()
pInt.print(10)

pBool = Printer[bool]()
pBool.print(True)`
),
// 28
assertOptimizeCorrect("Optimization Sanity Check (Generic 3)",
`
T: TypeVar = TypeVar('T')

class Adder(Generic[T]):
    def add(self: Adder[T], x: T, y: T) -> T:
        return x + y
  
a: Adder[int] = None
a = Adder[int]()
print(a.add(4, 6))`
),
// 29
assertOptimizeCorrect("Optimization Sanity Check (Generic 4)",
`
T: TypeVar = TypeVar('T')
  
class Printer(Generic[T]):
  def print(self: Printer[T], x: T):
      print(x)

def print_ten(p: Printer[int]):
  p.print(10)
  
p: Printer[int] = None
p = Printer[int]()
print_ten(p)`
),
// 30
assertOptimizeCorrect("Optimization Sanity Check (Generic 5)",
`
T: TypeVar = TypeVar('T')
  
class IntPrinterWrapper(object):
    intPrinter: Printer[int] = None

    def print_int(self: IntPrinterWrapper, x: int):
        self.intPrinter.print(x)

class Printer(Generic[T]):
    def print(self: Printer[T], x: T):
        print(x)
    
ip: IntPrinterWrapper = None
ip = IntPrinterWrapper()
ip.intPrinter = Printer[int]()
ip.print_int(10)`
),
// 31
assertOptimizeCorrect("Optimization Sanity Check (List 1)",
`
a: [int] = None
b: int = 100
a = [1 + 2, b, (-50)]
print(a[0])
print(a[1])
print(a[2])`
),
// 32
assertOptimizeCorrect("Optimization Sanity Check (List 2)",
`
a: [int] = None
a = [1, 2, 3]
a[0] = 5
print(a[0])`
),

// 34
assertOptimizeCorrect("Optimization Sanity Check (List 4)",
`
def f(lst: [int]) -> int:
    return lst[1]
a: [int] = None
a = [66, -5, 10]
print(f(a))`
),

// 33
assertOptimizeCorrect("Optimization Sanity Check (List 3)",
`
a: [int] = None
a = [1, 2, 3]
a = [4, 5, 6, 7, 8, 9]
print(a[4])`
),

// 35
assertOptimizeCorrect("Optimization Sanity Check (List 5)",
`
class Snake(obj):
    num_teeth: int = 100

snek1: Snake = None
snek2: Snake = None
snek3: Snake = None
snek_list: [Snake] = None

snek1 = Snake()
snek1.num_teeth = 300
snek2 = Snake()
snek2.num_teeth = 0
snek3 = Snake()
snek_list = [snek1, snek2, snek3]

print(snek_list[0].num_teeth)
print(snek_list[1].num_teeth)
print(snek_list[2].num_teeth)`
),
// 36
assertOptimizeCorrect("Optimization Sanity Check (Set 1)",
`
set_1 : set[int] = None
set_1 = {1,2}
print(set_1.length())`
),
// 37
assertOptimizeCorrect("Optimization Sanity Check (Set 2)",
`
set_1 : set[int] = None
set_1 = {1,2}
set_1.add(3)
print(set_1.length())`
),
// 38
assertOptimizeCorrect("Optimization Sanity Check (Set 3)",
`
set_1 : set[int] = None
set_1 = {1,2}
set_1.add(3)
print(4 in set_1)`
),
// 39
assertOptimizeCorrect("Optimization Sanity Check (Set 4)",
`
set_1 : set[int] = None
set_1 = {1,2}
set_1.remove(1)
print(set_1.length())`
),
// 40
assertOptimizeCorrect("Optimization Sanity Check (Set 5)",
`
set_1 : set[int] = None
set_1 = {1,2}
set_1.add(1)
print(set_1.length())`
)
});
