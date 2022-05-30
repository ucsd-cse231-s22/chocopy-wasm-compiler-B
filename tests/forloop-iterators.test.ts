import { expect } from "chai";
import { parse } from "../parser";
import { assert, assertPrint, assertTC, assertFail } from "./asserts.test";
import { NUM, BOOL, NONE, CLASS, typeCheck } from "./helpers.test";
import { TypeCheckError } from '../error_reporting'
import { TypeError } from "../type-check";
import { PyInt, PyBool, PyNone, PyObj } from '../utils';

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
    return __range__().new(start, stop, step)

`

describe("Basic range and custom iteratable functionalities", () => {
    
    assertPrint('range: three parameters', rangeStr + `
i: int = 0
for i in range(0,10,2):
    print(i)`, ["0","2","4","6", "8"]);

    assertPrint('range: called inside a fucntion with function parameters', rangeStr + `
def f(x: int, y: int):
    i: int = 0
    for i in range(x*1,y*1,1*2*abs(1)):
        print(i)
f(0,10)`, ["0","2","4","6", "8"]);
    
    assertPrint('range: negative step', rangeStr + `
i: int = 0
for i in range(0,-10,-2):
    print(i)`, ["0","-2","-4", "-6", "-8"]);


    assertPrint('range: for loop with break', rangeStr + `
i: int = 0
for i in range(0,-10,-2):
    print(i)
    break
`, ["0"]);

    assertPrint('range: for loop with break with an if and else statement', rangeStr + `
i: int = 0
for i in range(0,10,1):
    if i > 5:
        break
    else:
        print(i)
`, ["0", "1", "2", "3", "4","5"]);

    assertPrint('range: for loop with continue inside the main body', rangeStr + `
i: int = 0
for i in range(0,5,1):
    print(i*100)
    continue
    print(i)    
`, ["0", "100", "200", "300", "400"]);    

    assertPrint('range: for loop with continue inside a if statement', rangeStr + `
i : int = 0
for i in range(0, 10, 1):
    if i % 2 == 0:
        continue
    else:
        print(i)
`, ["1", "3", "5", "7", "9"]);  

    assertPrint('range: nested for loop with break', rangeStr + `
i: int = 0
j:int = 0
for i in range(0,5,1):
    print(i)
    for j in range(0,2,1):
        print(j) 
    break   
`, ["0", "0", "1"]);   

assertPrint('range: complex break, continue 1', rangeStr + `
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
`, ["0"]);   

assertPrint('range: complex break, continue 2', rangeStr + `
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
`, ["0","1","0","2","0","1","3","0","1","2","4","0","1","2","3"]);   

assertPrint('range: complex break, continue 3', rangeStr + `
i: int = 0
j:int = 0
k: int =0
for i in range(0,5,1):
    j = 0
    print(i)
    while(j<i):
        print(j) 
        j=j+1
        if i%2==0:
            continue
        else:
        	pass
        for k in range(100,0,-10):
            if k%30==0:
                print(k)
                continue
            else:
            	pass
    if i%2==1:
        continue
`, ["0","1","0","90","60","30","2","0","1","3","0","90","60","30","1","90","60","30","2","90","60","30","4","0","1","2","3"]); 

assertPrint('range: complex break, continue 4', rangeStr + `
i: int = 0
j:int = 0
k: int =0
for i in range(0,5,1):
    j = 0
    print(i)
    while(j<i):
        print(j) 
        j=j+1
        if i%2==0:
            continue
        else:
        	pass
        for k in range(100,0,-10):
            if k%30==0:
                print(k)
                break
            else:
            	pass
    if i%2==1:
        continue
`, ["0","1","0","90","2","0","1","3","0","90","1","90","2","90","4","0","1","2","3"]);


assertPrint('range: complex break, continue 5' , rangeStr + `
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

` ,["-2", "1", "1"])

    assertPrint('range: for else construct 1', rangeStr + `
i : int = 0
for i in range(10, 0, -1):
    if i < 5:
        break
    else:
        print(i)
else:
    print(123456)
`, ["10", "9", "8", "7", "6", "5"]);  
        
    assertPrint('range: for else construct 2', rangeStr + `
i : int = 0
for i in range(10, 5, -1):
    if i < 5:
        break
    else:
        print(i)
else:
    print(123456)
`, ["10", "9", "8", "7", "6", "123456"]);  

assertPrint('Custom Iterator 1' , rangeStr + `
class EvenNumbers(object):
    num:int = 0
    def __init__(self: EvenNumbers):
        pass
    def next(self: EvenNumbers) -> int:
        ret: int  = 0 
        ret = self.num
        self.num = self.num + 2
        return ret
    def hasnext(self: EvenNumbers) -> bool:
        if self.num > 10:
            return False
        else:
            return True

i: int = 0
for i in EvenNumbers():
    print(i)

` ,["0", "2", "4", "6", "8", "10"])

assertPrint('Custom Iterator called range' , rangeStr + `
class range(object):
    num:int = 1
    def __init__(self: range):
        pass
    def next(self: range) -> int:
        ret: int  = 0 
        ret = self.num
        self.num = self.num * 2
        return ret
    def hasnext(self: range) -> bool:
        if self.num > 16:
            return False
        else:
            return True

i: int = 0
for i in range():
    print(i)

` ,["1", "2", "4", "8", "16"])

assertPrint('Custom Bool Iterator' , rangeStr + `

class BoolIterable(object):
    val:bool = True
    num:int = 0
    def __init__(self: BoolIterable):
        pass
    def next(self: BoolIterable) -> bool:
        ret: bool = True
        ret = self.val
        self.num = self.num + 1
        self.val = not self.val
        return ret
    def hasnext(self: BoolIterable) -> bool:
        if self.num > 5:
            return False
        else:
            return True

i: bool = True
for i in BoolIterable():
    print(i)

` ,["True", "False","True", "False","True", "False"]);

    assertTCFail('range: type checking for loop variable ', rangeStr + `

i : bool = False
for i in range(0,10,1):
    print(i)
`);   

assertTCFail('range: type checking for loop variable ', rangeStr + `

for i in range(0,10,1):
    print(i)
`);   

    assertTCFail('range: type checking for one parameter', rangeStr + `
i: int = 0
for i in range(5):
    print(i)
`);
    
    assertTCFail('range: type checking for two parameters', rangeStr + `
i: int = 0
for i in range(5,10):
    print(i)
`);

    assertTCFail('range: type checking for range parameters', rangeStr + `
i : int = 0
for i in range(10, 20, 1, 1):
    print(i)
`);   

assertTCFail('Type Checking: not an iterator 1', rangeStr + `

class range(object):
    num:int = 1
    def __init__(self: range):
        pass
    def hasnext(self: range) -> bool:
        if self.num > 16:
            return False
        else:
            return True

i: int = 0
for i in range():
    print(i)

`);   

assertTCFail('Type Checking: not an iterator 2', rangeStr + `

class range(object):
    num:int = 1
    def __init__(self: range):
        pass
    def next(self: range) -> int:
        ret: int  = 0 
        ret = self.num
        self.num = self.num * 2
        return ret
i: int = 0
for i in range():
    print(i)
`);   

assertTCFail('TypeError: check iterable type', rangeStr + `

class BoolIterable(object):
  val:bool = True
  num:int = 0
  def __init__(self: BoolIterable):
      pass
  def next(self: BoolIterable) -> bool:
      ret: bool = True
      ret = self.val
      self.num = self.num + 1
      self.val = not self.val
      return ret
  def hasnext(self: BoolIterable) -> bool:
      if self.num > 5:
          return False
      else:
          return True

i: int = 0
for i in BoolIterable():
  print(i)
  `); 

  assertTCFail('range: type checking for break outside loop', rangeStr + `
i: int = 0
for i in range(0,5,10):
    print(i)
break
`);

assertTCFail('range: type checking for continue outside loop', rangeStr + `
i: int = 0
for i in range(0,5,10):
    print(i)
continue
`);
});

/**
 * Ensure during typechecking, a TypeError is thrown.
 */
 function assertTCFuncCallFail(name: string, source: string) {
    it(name, async () => {
        expect(() => typeCheck(source)).to.throw(TypeError);
    });
}

function assertTCFail(name: string, source: string) {
    it(name, async () => {
        expect(() => typeCheck(source)).to.throw(TypeCheckError);
    });
}
