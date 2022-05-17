import * as mocha from 'mocha';
import {expect} from 'chai';
import { parser } from 'lezer-python';
import { traverseImport, buildModulesContext } from '../parser';
import { fail } from 'assert'
import { ModuleData, ModulesContext, Modules,  } from '../ast';

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

  // Errors

  it('errors on "from mod import x, *"', () => {
    test_traverseImport_error("from mod import x, *", "TBD");
  })

  it('errors on "from mod.x import x"', () => {
    test_traverseImport_error("from mod.x import x", "TBD");
  })

  it('errors on "from mod import x.y"', () => {
    test_traverseImport_error("from mod import x.y", "TBD");
  })

});

describe('buildModulesContext(modules) function', () => {
  it('', () => {


  })
})
