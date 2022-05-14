import { parse } from "./parser";
import { BasicREPL } from "./repl";
import { importObject, addLibs  } from "./tests/import-object.test";


// entry point for debugging
async function debug() {
  // var source = `
  // class C(object):
  //   x : int = 1
  //   def get(self: C)->int:
  //       return self.x
  // class A(object):
  //   a:int = 0
  // class B(A,C):
  //   b:int = 0
  
  // x : B = None
  // x = B()
  // print(x.get())
  // `
  // var source = `
  // class A(object):
  //   a:int = 0
  //   def foo(self : A):
  //       pass
  // class B(A):
  //   b:int = 1
  //   def foo2(self : B):
  //       pass
  // class C(B):
  //   def foo3(self : C):
  //       self.foo()
  //       self.foo2()
  //       self.b = 1

  // x : C = None
  // x = C()
  // x.foo()
  // x.foo2()
  // x.foo3()
  // `

  var source = `
  
  class A(object):
    a : int = 1
    def get(self: A)->int:
        return self.a
  class B(A):
    b:int = 0
  x : B = None
  x = B()
  print(x.get())
  
  `

  const ast = parse(source);
  
  const repl = new BasicREPL(await addLibs());
  const result = repl.run(source).then(result => {
    console.log(result);    
  })  
}

try {
  debug();
} catch (err) {
  console.log(err);
}

