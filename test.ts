import {parse} from './parser'
// import {tcProgram} from "./tc"
// import {compile} from './compiler'
// import {run} from './run-cli'

let s1 = `a, b = range(1, 3)`

let prog = parse({main: s1})

function printProg(p: any){
  console.log("STATEMENTS")
  console.log(JSON.stringify(p.stmts, null, 1))
}
