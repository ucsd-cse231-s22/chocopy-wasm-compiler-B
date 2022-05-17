import * as mocha from 'mocha';
import {expect} from 'chai';
import { importObject } from "./import-object.test";
import { BasicREPL } from "../repl";
import { addLibs  } from "./import-object.test";


let repl : any = null
beforeEach(async function () {
  importObject.output = "";
  repl = new BasicREPL(await addLibs());
});

it('it runs basic import statements', async () => {
  let main = `
import lib
lib.out(1)
  `
  let lib = `
def out(i:int):
  print(i)
  `
  await repl.run({main, lib}).then((result:any) => {
    console.log("result", result)
  })

  expect(importObject.output.trim()).to.equal("1");
})