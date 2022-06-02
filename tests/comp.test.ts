import { assertPrint } from "./asserts.test";

export const builtinClasses : string = `
class Range(object):
  cur : int = 0
  min : int = 0
  max : int = 0
  stp : int = 0
  def new(self : Range, min : int, max : int, stp : int)->Range:
    if stp == 0:
      return None
    if min <= max and stp < 0:
      stp = 1
    if min >= max and stp > 0:
      stp = -1
    self.min = min
    self.cur = min
    self.max = max
    self.stp = stp
    return self
  def next(self : Range)->int:
    c : int = 0
    c = self.cur
    self.cur = self.cur + self.stp
    return c
  def hasnext(self : Range)->bool:
    return self.cur < self.max if self.stp >=0 else self.cur > self.max

class generator(object):
  size : int = 0
  addr : int = 0
  def new(self : generator, size : int, addr : int)->generator:
    self.size = size
    self.addr = addr
    return self
  def next(self : generator)->int:
    c : int = 0
    c = self.addr
    self.size = self.size - 1
    self.addr = self.addr + 4
    return c
  def hasnext(self : generator)->bool:
    return self.size < 1

class ListIterable(object):
  lst : [int] = None
  cur : int = 0
  max : int = 0
  def new(self : ListIterable, lst : [int], lstlen : int)->ListIterable:
    self.lst = lst
    self.max = lstlen
    return self
  def next(self: ListIterable)->int:
    c : int = 0
    c = self.lst[self.cur]
    self.cur = self.cur + 1
    return c
  def hasnext(self : ListIterable)->bool:
    return self.cur < self.max
`

describe("Comprehension Tests", () => {

assertPrint("ternary assignTrue test", builtinClasses + `
a:int = 3
a = a + 3 if a > 0 else a - 3
print(a)`, ['6']);

assertPrint("ternary assignFalse test", builtinClasses + `
a:int = 3
a = a + 3 if a < 0 else a - 3
print(a)`, ['0']);

assertPrint("ternary comprehensive test", builtinClasses + `
a:int = 0
print(min(a - 1, 3) if a > 3 else max(a + 3, 4))`, ['4']);

assertPrint("range basic test 1", builtinClasses + `
r:Range = None
r = Range().new(0, 5, 1)
print(r.next())`, ['0']);

assertPrint("range basic test 2", builtinClasses + `
r:Range = None
r = Range().new(0, 5, 1)
r.next()
print(r.next())`, ['1']);

assertPrint("range basic test 3", builtinClasses + `
r:Range = None
r = Range().new(0, 5, 1)
r.next()
r.next()
r.next()
r.next()
r.next()
print(r.hasnext())`, ['False']);

assertPrint("range positive step test", builtinClasses + `
r:Range = None
r = Range().new(0, 5, 2)
r.next()
print(r.next())`, ['2']);

assertPrint("range negative step test", builtinClasses + `
r:Range = None
r = Range().new(5, 0, -2)
r.next()
print(r.next())`, ['3']);

assertPrint("comprehension basic test", builtinClasses + `
(print(num) for num in Range().new(0, 5, 1))`, ['0','1','2','3','4']);

assertPrint("comprehension if condition test", builtinClasses + `
(print(num) for num in Range().new(0, 5, 1) if num % 2 == 0)`, ['0','2','4']);

assertPrint("comprehension lhs expr test", builtinClasses + `
(print(min(num, 3)) for num in Range().new(0, 6, 1))`, ['0','1','2','3','3','3']);

assertPrint("comprehension lhs ternary test", builtinClasses + `
(print(num) if num % 4 == 0 else print(num + 100) for num in Range().new(0, 10, 1))`,
['0','101','102','103','4','105','106','107','8','109']);

assertPrint("comprehension comprehensive test", builtinClasses + `
(print(num if num % 4 == 0 else num + 100) for num in Range().new(0, 20, 1) if num % 2 == 0)`,
['0','102','4','106','8','110','12','114','16','118']);

assertPrint("comprehension int list iterable test 1", builtinClasses + `
lst:[int] = None
lst = [1, 2, 3, 4, 5]
(print(num) for num in lst)`,
['1','2','3','4','5']);

assertPrint("comprehension int list iterable test 2", builtinClasses + `
(print(num) for num in [1, 2, 3, 4, 5])`,
['1','2','3','4','5']);

assertPrint("comprehension int list iterable test 3", builtinClasses + `
(print(num if num % 3 == 0 else -1) for num in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] if num % 2 == 0)`,
['-1','-1','6','-1','-1']);

assertPrint("comprehension int list iterable test 4", builtinClasses + `
(print(num) for num in [])`,
['']);

assertPrint("comprehension bool list iterable test 1", builtinClasses + `
lst:[bool] = None
lst = [True, False, True, True]
(print(b) for b in lst)`,
['True','False','True','True']);

assertPrint("comprehension bool list iterable test 2", builtinClasses + `
(print(b) for b in [True, True, False, False, True])`,
['True','True','False','False','True']);

assertPrint("comprehension int set iterable test 1", builtinClasses + `
s:set[int] = None
s = {1, 2, 3, 4, 5}
(print(num) for num in s)`,
['1','2','3','4','5']);

assertPrint("comprehension int set iterable test 2", builtinClasses + `
(print(num) for num in {1, 2, 3, 4, 5})`,
['1','2','3','4','5']);

assertPrint("comprehension int set iterable test 3", builtinClasses + `
(print(num + 1) for num in {1, 2, 3, 4, 5, 6, 7, 8, 9, 10} if num % 2 == 0)`,
['11','3','5','7','9']);

assertPrint("comprehension int set iterable test 4", builtinClasses + `
(print(num) for num in {1})`,
['1']);

assertPrint("comprehension bool set iterable test 1", builtinClasses + `
s:set[bool] = None
s = {True, False}
(print(b) for b in s)`,
['False','True']);

assertPrint("comprehension bool set iterable test 2", builtinClasses + `
(print(b) for b in {False})`,
['False']);

assertPrint("set comprehension basic test", builtinClasses + `
s:set[int] = None
s = {num for num in {1, 2, 3, 4, 5}}
print(s)`,
['1','2','3','4','5']);

assertPrint("set comprehension comprehensive test", builtinClasses + `
s:set[int] = None
s = {num + 1 if num % 4 != 0 else num + 100 for num in {1, 2, 3, 4, 5, 6, 7, 8} if num % 2 == 0}
print(s)`,
['3','104','7','108']);

assertPrint("set comprehension unique element test 1", builtinClasses + `
s:set[int] = None
s = {num + 1 if num % 4 != 0 else 999 for num in {1, 2, 3, 4, 5, 6, 7, 8} if num % 2 == 0}
print(s)`,
['3','7','999']);

assertPrint("set comprehension unique element test 2", builtinClasses + `
s:set[int] = None
s = {999 if num < 2 else 1000 for num in [0, 1, 2, 3]}
print(s)`,
['1000','999']);

});