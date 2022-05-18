import * as mocha from 'mocha';
import {expect} from 'chai';
import { parser } from 'lezer-python';
import { traverseImport, buildModulesContext, modulesContext } from '../parser';
import { fail } from 'assert'
import { ModuleData, ModulesContext, Modules } from '../ast';
import { runModules } from './helpers.test';
import { importObject } from './import-object.test';

function test_traverseImport(source: string, expected: ModuleData) {
  const cursor = parser.parse(source).cursor();
  // go to statement
  cursor.firstChild();
  // go to expression
  cursor.firstChild();

  const parsedExpr = traverseImport(cursor, source);

  // Note: we have to use deep equality when comparing objects
  expect(parsedExpr).to.deep.equal(expected);
}

function test_traverseImport_error(source: string, expected: string) {
  const cursor = parser.parse(source).cursor();
  // go to statement
  cursor.firstChild();
  // go to expression
  cursor.firstChild();

  try {
    const parsedExpr = traverseImport(cursor, source);
    fail("Expected an exception");
  } catch (err) {
    expect(err.message).to.contain(expected);
  }
}

async function expect_error(modules: Modules, expected: string) {
  try {
    await runModules(modules);
    fail("Expected an exception");
  } catch (err) {
    expect(err.message).to.contain(expected);
  }
}

async function expect_output(modules: Modules, output: string) {
  await runModules(modules);
  expect(importObject.output).to.equal(output);
}

// We write tests for each function in parser.ts here. Each function gets its
// own describe statement. Each it statement represents a single test. You
// should write enough unit tests for each function until you are confident
// the parser works as expected.
describe('traverseImport(c, s) function', () => {
  it('from mod import x', () => {
    test_traverseImport("from mod import x", {
      modMap: {
      },
      nsMap: {
        x: "mod$x"
      },
      globals: [],
    })
  })

  it('from mod import x,y', () => {
    test_traverseImport("from mod import x,y", {
      modMap: {
      },
      nsMap: {
        x: "mod$x",
        y: "mod$y",
      },
      globals: [],
    })
  })

  it('from mod import *', () => {
    test_traverseImport("from mod import *", {
      modMap: {
      },
      nsMap: {
        "*": "mod$*",
      },
      globals: [],
    })
  })

  it('import mod', () => {
    test_traverseImport("import mod", {
      modMap: {
        mod: "mod",
      },
      nsMap: {
      },
      globals: [],
    })
  })

  it('import mod as nod', () => {
    test_traverseImport("import mod as nod", {
      modMap: {
        nod: "mod",
      },
      nsMap: {
      },
      globals: [],
    })
  })

  it('from mod import x as y', () => {
    test_traverseImport("from mod import x as y", {
      modMap: {
      },
      nsMap: {
        y: "mod$x"
      },
      globals: [],
    })
  })

  it('from mod import x as y, y as z', () => {
    test_traverseImport("from mod import x as y, y as z", {
      modMap: {
      },
      nsMap: {
        y: "mod$x",
        z: "mod$y",
      },
      globals: [],
    })
  })

  it('import mod, nod', () => {
    test_traverseImport("import mod, nod", {
      modMap: {
        mod: "mod",
        nod: "nod"
      },
      nsMap: {
      },
      globals: [],
    })
  })

  it('import mod as nod, cod as zod', () => {
    test_traverseImport("import mod as nod, cod as zod", {
      modMap: {
        nod: "mod",
        zod: "cod"
      },
      nsMap: {
      },
      globals: [],
    })
  })


  // Errors

  // it('errors on "from mod import x, *"', () => {
  //   test_traverseImport_error("from mod import x, *", "PARSE ERROR");
  // })

  // it('errors on "from mod.x import x"', () => {
  //   test_traverseImport_error("from mod.x import x", "PARSE ERROR");
  // })

  // it('errors on "from mod import x.y"', () => {
  //   test_traverseImport_error("from mod import x.y", "PARSE ERROR");
  // })

  // it('errors on "from mod import x,x"', () => {
  //   test_traverseImport_error("from mod import x,x", "PARSE ERROR");
  // })

});

describe('buildModulesContext(modules) function', () => {
  it('B imports x from A', () => {
    buildModulesContext({A: "x:int=0", B: "from A import x\nx"});
    expect(modulesContext).to.deep.equal({
      A: {
        modMap: {},
        nsMap: {x: "A$x"},
        globals: ["x"]
      },
      B: {
        modMap: {},
        nsMap: {x: "A$x"},
        globals: []
      }
    });
  })

  it('B imports A', () => {
    buildModulesContext({A: "x:int=0", B: "import A\nA.x"});
    expect(modulesContext).to.deep.equal({
      A: {
        modMap: {},
        nsMap: {x: "A$x"},
        globals: ["x"]
      },
      B: {
        modMap: {A: "A"},
        nsMap: {},
        globals: []
      }
    });
  })

  it('B imports A imports B', () => {
    buildModulesContext({
      A: "from B import y\nx:int=0",
      B: "from A import x\ny:int=0"
    });
    expect(modulesContext).to.deep.equal({
      A: {
        modMap: {},
        nsMap: {x: "A$x", y: "B$y"},
        globals: ["x"]
      },
      B: {
        modMap: {},
        nsMap: {x: "A$x", y: "B$y"},
        globals: ["y"]
      }
    });
  })

  it('B imports A with alias', () => {
    buildModulesContext({
      A: "x:int=0",
      B: "from A import x as y\nx:int=0"
    });
    expect(modulesContext).to.deep.equal({
      A: {
        modMap: {},
        nsMap: {x: "A$x"},
        globals: ["x"]
      },
      B: {
        modMap: {},
        nsMap: {x: "B$x", y: "A$x"},
        globals: ["x"]
      }
    });
  })

  // Errors

  it('errors on duplicate symbol import', async () => {
    await expect_error({
      A: "x:int=0",
      B: "x:int=0",
      C: "from A import x\nfrom B import x",
    }, "PARSE ERROR");
  })

  it('errors on duplicate module import', async () => {
    await expect_error({
      A: "x:int=0",
      B: "x:int=0",
      C: "import A\import A",
    }, "PARSE ERROR");
  })

  it('errors on non-exist import', async () => {
    await expect_error({
      A: "y:int=0",
      B: "from A import x",
    }, "TYPE ERROR");
  })

  // Outputs

  it('print imported integer x', async () => {
    importObject.output = "";
    await expect_output({
      A: "x:int=0",
      main: "from A import x\nprint(x)",
    }, "0\n");
  })

  it('print imported integer A.x', async () => {
    importObject.output = "";
    await expect_output({
      A: "x:int=0",
      main: "import A\nprint(A.x)",
    }, "0\n");
  })

  it('calls imported function f', async () => {
    importObject.output = "";
    await expect_output({
      A: `def f(a:int)->int:
    return a`,
      main: "from A import f\nprint(f(1))",
    }, "1\n");
  })

  it('calls imported aliased function f as g', async () => {
    importObject.output = "";
    await expect_output({
      A: `def f(a:int)->int:
    return a`,
      main: "from A import f as g\nprint(g(1))",
    }, "1\n");
  })

  it('access imported class G', async () => {
    importObject.output = "";
    await expect_output({
      A: `class G(object):
    g:int=20`,
      main: "from A import G \nprint(G().g)",
    }, "20\n");
  })

})
