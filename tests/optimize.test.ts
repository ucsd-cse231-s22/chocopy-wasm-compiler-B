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
  assertOptimize("Constant Folding (add in print)", `print(100 + 20 + 3)`);
  // 2
  assertOptimize("Constant Folding (add)", `
x:int = 100
x = 1 + 2 + 3 + 4
print(x)
  `);
  // 3
  assertOptimize("Constant Folding (multiply)", `
x:int = 100
x = 1 * 2 * 3 * 4
print(x)
  `);
  // 4
  assertOptimize("Constant Folding (boolean)", `
x:bool = True
x = not True
print(x)
  `);
  // 5
  assertOptimize("Constant Folding (builtin-max)",
  `
x:int = 1
x = max(3,4)
print(x)
  `);
  // 6
  assertOptimize("Constant Folding (builtin-min)",
  `
x:int = 1
x = min(3,4)
print(x)
  `),
  // 7
  assertOptimize("Constant Folding (builtin-pow)",
  `
x:int = 1
x = pow(3,2)
print(x)
  `),
  // 8
  assertOptimize("Constant Folding (builtin-factorial)",
  `
x:int = 0
x = factorial(3) + 1
x = factorial(1+2) + x
x = factorial(1*2*3) + x
print(x)
  `),
  // 9
  assertOptimize("Constant Folding (builtin-randint)",
  `
x:int = 0
x = randint(3, 5) + 1
x = randint(1+2, 6*7) + x
x = randint(3*2*1, 5+6+7) + x
print(x)
  `),
  // 10
  assertOptimize("Constant Folding (builtin-gcd)",
  `
x:int = 0
x = gcd(25, 100) + 1
x = gcd(gcd(12, 9), gcd(4*4, 4+4)) + x
x = gcd((2+3)*5*6, 4+5+1+2+3) + x
print(x)
  `),
  // 11
  assertOptimize("Constant Folding (builtin-lcm)",
  `
x:int = 0
x = lcm(25, 100) + 1
x = lcm(lcm(12, 9), lcm(4*4, 4+4)) + x
x = lcm((2+3)*5*6, 4+5+1+2+3) + x
print(x)
  `),
  // 12
  assertOptimize("Constant Folding (builtin-comb)",
  `
x:int = 0
x = comb(5, 2) + 1
x = comb(comb(5+1, 2), comb(2*2, 1+1)) + x + 10
x = comb((2+3)*6, 1+2+3) + x
print(x)
  `),
  // 13
  assertOptimize("Constant Folding (builtin-perm)",
  `
x:int = 0
x = perm(5, 2) + 1
x = perm(perm(2+1, 2), perm(1*2, 1+1)) + x + 5
x = perm((2+3)*3, 1+2+3) + x
print(x)
  `),
  // 14
  assertOptimize("Constant Folding (builtin-randrange)",
  `
x:int = 0
x = randrange(2, 5, 1) + 1
x = randrange(randrange(2, 5, 2), randrange(12, (4+4)*2, 3), randrange(1+1, 5+1, 2+1)) + x
x = randrange((2+3)*5*6, (4+5+1+2+3)*10, 2*3*(1+2)) + x
print(x)
  `),
  // 15
  assertOptimize("Constant Folding (builtin-time)",
  `
x:int = 0
x = time() + time()
print(x)
  `),
  // 16
  assertOptimize("Constant Folding (builtin-int)",
  `
x:int = 0
y:int = 0
y = int(True)
x = int(True) + int(False) + int(True)
print(x+y)
  `),
  // 17
  assertOptimize("Constant Folding (builtin-bool)",
  `
x:bool = True
y:bool = False
y = bool(2*(1+2+3))
x = bool(0) or bool(1) and bool(2)
print(x or y)
  `),
  // 18
  assertOptimize("Constant Folding (builtin-abs)",
  `
x:int = 0
y:int = 0
z:int = 0
x = abs(-5) + abs(1*3)
y = abs(-2) * abs(3-5)
z = -x - y
print(x + y + abs(z))
  `),
  // 19
  assertOptimize("Constant Folding (mod)",
  `
x:int = 1
x = 8 % 3
print(x)
  `)
  // 20
  assertOptimize("Constant Folding (greater than)",
  `
x:bool = True
x = 0 > 1
print(x)
  `),
  // 21
  assertOptimize("Constant Folding (Not equal)",
  `
x:bool = True
x = 1 != 1
print(x)
  `),
  // 22
  assertOptimize("Dead code elimination (statements after return)",
  `
def f() -> int:
    return 100
    print(100)
f()
`),
  // 23
  assertOptimize("Dead code elimination (if branch)",
`
print(100)
if True:
    print(1+2+3+4)
else:
    print(5*6*7)
  
if False:
    print(10000)
else:
    print(1*2*3*4)
  `)
  // 24
  assertOptimize("Dead code elimination (while loop)",
  `
a:int = 0
while False:
    a = a + 100000
while a < 5:
    print(a)
    a = a + 1
`),
  // 25
  assertPass("Dead code elimination (pass statement)",
  `
a:int = 0
if a > 0:
    pass
else:
    pass
    print(100)
    pass
pass
print(1+2+3+4)
pass
while False:
    pass
pass
print(1*2*3*4)
`),
  // 26
  assertPass("Dead code elimination (pass statement with one line)",
  `
def f():
    pass

pass
f()
pass
`),
  // 27
  assertOptimize("Dead code elimination (Nested while and if)",
  `
a:int = 0
if a <= 0:
    if True:
        a = a + 1
    else:
        a = a - 1
else:
    pass

while a > 0:
    while False:
        print(a)
    a = a - 1
    pass
pass
print(a)
`),
  // 28
  assertOptimize("Optimization (Class definition)",
  `
class Rat(object):
    def __init__(self:Rat):
        pass
    def f(self:Rat):
        pass
        print(100)
        while False:
            print(123)
    def b(self:Rat):
        if True:
            print(1+2+3+4)
r:Rat = None
r = Rat()
r.f()
r.b()
`),
  // 29
  assertOptimize("Optimization (Anonymous Class)",
  `
class Rat(object):
    def __init__(self:Rat):
        pass
    def f(self:Rat):
        pass
        print(100)
        while False:
            print(123)
    def b(self:Rat):
        if True:
            print(1+2+3+4)
Rat().f()
Rat().b()
`),
  // 30
  assertOptimize("Optimization (UniOp)",
  `
a:int = 0
a = -2
if not True:
    print(111)
else:
    print(a)

if not False:
    print((1+2+3+4)*1*2*3)
`),
  // 31
  assertOptimize("Optimization (Return in if branch)",
  `
class C(object):
    def f(self: C) -> int:
        if True:
            return 0
        else:
            return 1
C().f()
`),
  // 32
  assertOptimize("Optimization (Return in while loop)",
  `
def f() -> int:
    a:int = 100
    while a > 0:
        return a
        print(a)
        pass
    pass
    return 100
`),
  // 33
  assertOptimize("Optimization (Linkedlist)",
  `
class LinkedList(object):
    value : int = 0
    next: LinkedList = None
    def new(self: LinkedList, value: int, next: LinkedList) -> LinkedList:
        self.value = value
        self.next = next
        return self
        print(1+2+3)

    def sum(self: LinkedList) -> int:
        if self.next is None:
            return self.value
            print(1+2+3)
        else:
            return self.value + self.next.sum()
            print(1+2+3)

    def f(self: LinkedList):
        pass
        print(100)

l: LinkedList = None
l = LinkedList().new(1, LinkedList().new(2, LinkedList().new(3, None)))
print(l.sum())
print(l.next.sum())
l.f()
while False:
    l = LinkedList()
`),
  // 34
  assertOptimize("Optimization (And/Or ops for boolean literals)",
  `
x:bool = True
y:bool = True
z:bool = True
a:bool = False

x = True and True and False
y = False or False or True or False
z = (True or False) and False or (True or False) and (False or False)
a = True or (False and (True or (False and True)))
`),
  // 35
  // Calculate the variance of [2, 3, 4]
  assertOptimize("Optimization (Calculate variance)",
  `
variance:int = 0
variance = pow(((2+3+4)//3 - 2), 2) + pow(((2+3+4)//3 - 2), 3) + pow(((2+3+4)//3 - 2), 4)
print(variance)
`),
  // 36
  // There is 5 balls, 3 red and 2 blue, what's the probability of taking 2 balls and all of them blue
  // Result should be 0 since there is no float division
  assertOptimize("Optimization (Calculate probability using builtin)",
`
a:int = 0
b:int = 0
a = comb(1, 1)
b = comb(5, 2)
print(a)
print(b)
print(a // b)
`),
  // 37
  assertOptimize("Optimization (Number comparison)",
  `
a:bool = False
b:bool = False
c:bool = False
a = a or (1 > 0)
b = True and (100 > 200)
c = c and True and (100!=200)
print(a)
print(b)
`),
  // 38
  assertOptimize("Optimization (Modulus)",
  `
b:int = 0
b = (100 % 3) % 10 % 2 % 1
print(b)
`);
  // 39
  assertOptimize("Optimization (Multiple while loop and if branch)",
`
a:int = 5
while a < 0:
    while False:
        print(a)
        pass
        if False:
            pass
        else:
            print(a)

        if a > 2:
            print(a+1+2+3)
    a = a - 1
    pass
pass
`),
  // 40
  assertOptimize("Optimization (Multiple builtins 1)",
`
a:int = 5
b:int = 0
a = pow(min(a, 100), max(2, 3))
b = min(a, 100000)
print(a)
print(b)
print(min(a, b))
`),
  // 41
  assertOptimize("Optimization (Multiple builtins 2)",
`
a:int = 5
b:int = 0
a = pow(comb(a, 2), gcd(2, 3+b+2))
b = factorial(3)
print(a)
print(b)
print(randrange(randint(3, 5), max(a, b), lcm(12, 2)))
`),
  // 42
  assertOptimize("Optimization (time and sleep)",
`
a:int = 5
b:int = 0
pass
a = time()
b = time()
if True:
    print(time())
sleep(1*2)
print(a)
sleep(1+2+3)
print(b)
print(a == b)
sleep(1+2)
`),
  // 43
  assertOptimize("Optimization (Field assignment 1)",
`
class X(object):
    x:int = 0
    def f(self:X) -> int:
        print(self.x)
        pass
        if self.x>0:
            print(self.x+10)
        
        if True:
            pass
        else:
            while False:
                print(self.x+10)
        return self.x

x1:X = None
a:int = 100
x1 = X()
print(x1.f())
x1.x = 1+2+3
print(x1.f())
x1.x = a
print(x1.f())
if True:
    x1.x = 1234
    print(x1.f())

print(X().f())
X().x = 100
`),
  // 44
  assertOptimize("Optimization (Field assignment 2)",
`
class C(object):
    a:int = 0
    b:int = 0
    def __init__(self:C):
        pass
    def new(self:C, new_a:int, new_b:int) -> C:
        self.a = new_a
        self.b = new_b
        return self
    def add(self:C)->int:
        c:int = 0
        result:int = 0
        c = pow((1+2+3+4) * 1 * 2 * 3 % 7, min(2, 3))
        result = self.a + self.b + c
        if True:
            print(result)
        return result

if True:
    print(C().new(1, 2).add())
`),
  // 45
  assertOptimize("Optimization (Neededness DCE)",
`
def f() -> int:
  p:int = 1
  x:int = 5
  z:int = 1
  while x > 0:
    p = p * x
    z = z + 1
    x = x - 1
  return p
`),


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
st:int = 0
ed:int = 0
st = time()
sleep(10)
ed = time()
print(ed-st)
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
// 33
assertOptimizeCorrect("Optimization Sanity Check (List 3)",
`
a: [int] = None
a = [1, 2, 3]
a = [4, 5, 6, 7, 8, 9]
print(a[4])`
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
print(len(set_1))`
),
// 37
assertOptimizeCorrect("Optimization Sanity Check (Set 2)",
`
set_1 : set[int] = None
set_1 = {1,2}
set_1.add(3)
print(len(set_1))`
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
print(len(set_1))`
),
// 40
assertOptimizeCorrect("Optimization Sanity Check (Set 5)",
`
set_1 : set[int] = None
set_1 = {1,2}
set_1.add(1)
print(len(set_1))`
)
});
