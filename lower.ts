import * as AST from './ast';
import * as IR from './ir';
import { Type, SourceLocation } from './ast';
import { GlobalEnv } from './compiler';
import { NUM, BOOL, NONE, CLASS } from "./utils";

const nameCounters : Map<string, number> = new Map();
function generateName(base : string) : string {
  if(nameCounters.has(base)) {
    var cur = nameCounters.get(base);
    nameCounters.set(base, cur + 1);
    return base + (cur + 1);
  }
  else {
    nameCounters.set(base, 1);
    return base + 1;
  }
}

// function lbl(a: Type, base: string) : [string, IR.Stmt<[Type, SourceLocation]>] {
//   const name = generateName(base);
//   return [name, {tag: "label", a: a, name: name}];
// }

export function lowerProgram(p : AST.Program<[Type, SourceLocation]>, env : GlobalEnv) : IR.Program<[Type, SourceLocation]> {
    var blocks : Array<IR.BasicBlock<[Type, SourceLocation]>> = [];
    var firstBlock : IR.BasicBlock<[Type, SourceLocation]> = {  a: p.a, label: generateName("$startProg"), stmts: [] }
    blocks.push(firstBlock);
    var inits = flattenStmts(p.stmts, blocks, env);
    return {
        a: p.a,
        funs: lowerFunDefs(p.funs, env),
        inits: [...inits, ...lowerVarInits(p.inits, env)],
        classes: lowerClasses(p.classes, env),
        body: blocks
    }
}

function lowerFunDefs(fs : Array<AST.FunDef<[Type, SourceLocation]>>, env : GlobalEnv) : Array<IR.FunDef<[Type, SourceLocation]>> {
    return fs.map(f => lowerFunDef(f, env)).flat();
}

function lowerFunDef(f : AST.FunDef<[Type, SourceLocation]>, env : GlobalEnv) : IR.FunDef<[Type, SourceLocation]> {
  var blocks : Array<IR.BasicBlock<[Type, SourceLocation]>> = [];
  var firstBlock : IR.BasicBlock<[Type, SourceLocation]> = {  a: f.a, label: generateName("$startFun"), stmts: [] }
  blocks.push(firstBlock);
  var bodyinits = flattenStmts(f.body, blocks, env);
    return {...f, inits: [...bodyinits, ...lowerVarInits(f.inits, env)], body: blocks}
}

function lowerVarInits(inits: Array<AST.VarInit<[Type, SourceLocation]>>, env: GlobalEnv) : Array<IR.VarInit<[Type, SourceLocation]>> {
    return inits.map(i => lowerVarInit(i, env));
}

function lowerVarInit(init: AST.VarInit<[Type, SourceLocation]>, env: GlobalEnv) : IR.VarInit<[Type, SourceLocation]> {
    return {
        ...init,
        value: literalToVal(init.value)
    }
}

function lowerClasses(classes: Array<AST.Class<[Type, SourceLocation]>>, env : GlobalEnv) : Array<IR.Class<[Type, SourceLocation]>> {
    return classes.map(c => lowerClass(c, env));
}

function lowerClass(cls: AST.Class<[Type, SourceLocation]>, env : GlobalEnv) : IR.Class<[Type, SourceLocation]> {
    return {
        ...cls,
        fields: lowerVarInits(cls.fields, env),
        methods: lowerFunDefs(cls.methods, env)
    }
}

function literalToVal(lit: AST.Literal<[Type, SourceLocation]>) : IR.Value<[Type, SourceLocation]> {
    switch(lit.tag) {
        case "num":
            return { ...lit, value: BigInt(lit.value) }
        case "bool":
            return lit
        case "none":
            return lit        
    }
}

function flattenStmts(s : Array<AST.Stmt<[Type, SourceLocation]>>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>, env : GlobalEnv) : Array<IR.VarInit<[Type, SourceLocation]>> {
  var inits: Array<IR.VarInit<[Type, SourceLocation]>> = [];
  s.forEach(stmt => {
    inits.push(...flattenStmt(stmt, blocks, env));
  });
  return inits;
}

function flattenStmt(s : AST.Stmt<[Type, SourceLocation]>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>, env : GlobalEnv) : Array<IR.VarInit<[Type, SourceLocation]>> {
  switch(s.tag) {
    case "assign":
      var [valinits, valstmts, vale] = flattenExprToExpr(s.value, blocks, env);
      blocks[blocks.length - 1].stmts.push(...valstmts, { a: s.a, tag: "assign", name: s.name, value: vale});
      return valinits
      // return [valinits, [
      //   ...valstmts,
      //   { a: s.a, tag: "assign", name: s.name, value: vale}
      // ]];

    case "return":
    var [valinits, valstmts, val] = flattenExprToVal(s.value, blocks, env);
    blocks[blocks.length - 1].stmts.push(
         ...valstmts,
         {tag: "return", a: s.a, value: val}
    );
    return valinits;
    // return [valinits, [
    //     ...valstmts,
    //     {tag: "return", a: s.a, value: val}
    // ]];
  
    case "expr":
      var [inits, stmts, e] = flattenExprToExpr(s.expr, blocks, env);
      blocks[blocks.length - 1].stmts.push(
        ...stmts, {tag: "expr", a: s.a, expr: e }
      );
      return inits;
    //  return [inits, [ ...stmts, {tag: "expr", a: s.a, expr: e } ]];

    case "pass":
      return [];

    case "field-assign": {
      var [oinits, ostmts, oval] = flattenExprToVal(s.obj, blocks, env);
      var [ninits, nstmts, nval] = flattenExprToVal(s.value, blocks, env);
      if(s.obj.a[0].tag !== "class") { throw new Error("Compiler's cursed, go home."); }
      const classdata = env.classes.get(s.obj.a[0].name);
      const offset : IR.Value<[Type, SourceLocation]> = { a:s.a, tag: "wasmint", value: classdata.get(s.field)[0] };
      pushStmtsToLastBlock(blocks,
        ...ostmts, ...nstmts, {
          tag: "store",
          a: s.a,
          start: oval,
          offset: offset,
          value: nval
        });
      return [...oinits, ...ninits];
    }
    
    case "index-assign": {
      var [oinits, ostmts, oval] = flattenExprToVal(s.obj, blocks, env);
      const [iinits, istmts, ival] = flattenExprToVal(s.index, blocks, env);
      var [ninits, nstmts, nval] = flattenExprToVal(s.value, blocks, env);

      const offsetValue: IR.Value<[Type, SourceLocation]> = listIndexOffsets(iinits, istmts, ival, oval);

      if (s.obj.a[0].tag === "list") {
        pushStmtsToLastBlock(blocks,
          ...ostmts, ...istmts, ...nstmts, {
            tag: "store",
            a: s.a,
            start: oval,
            offset: offsetValue,
            value: nval
          });
        return [...oinits, ...iinits, ...ninits];
      }
      // if (s.obj.a[0].tag === "dict") {
      //   ...
      // }

      else { throw new Error("Compiler's cursed, go home."); }
    }

    case "if":
      var thenLbl = generateName("$then")
      var elseLbl = generateName("$else")
      var endLbl = generateName("$end")
      var endjmp : IR.Stmt<[Type, SourceLocation]> = { a:s.a, tag: "jmp", lbl: endLbl };
      var [cinits, cstmts, cexpr] = flattenExprToVal(s.cond, blocks, env);
      var condjmp : IR.Stmt<[Type, SourceLocation]> = { a:s.a, tag: "ifjmp", cond: cexpr, thn: thenLbl, els: elseLbl };
      pushStmtsToLastBlock(blocks, ...cstmts, condjmp);
      blocks.push({  a: s.a, label: thenLbl, stmts: [] })
      var theninits = flattenStmts(s.thn, blocks, env);
      pushStmtsToLastBlock(blocks, endjmp);
      blocks.push({  a: s.a, label: elseLbl, stmts: [] })
      var elseinits = flattenStmts(s.els, blocks, env);
      pushStmtsToLastBlock(blocks, endjmp);
      blocks.push({  a: s.a, label: endLbl, stmts: [] })
      return [...cinits, ...theninits, ...elseinits]

      // return [[...cinits, ...theninits, ...elseinits], [
      //   ...cstmts, 
      //   condjmp,
      //   startlbl,
      //   ...thenstmts,
      //   endjmp,
      //   elslbl,
      //   ...elsestmts,
      //   endjmp,
      //   endlbl,
      // ]];
    
    case "while":
      var whileStartLbl = generateName("$whilestart");
      var whilebodyLbl = generateName("$whilebody");
      var whileEndLbl = generateName("$whileend");

      pushStmtsToLastBlock(blocks, { a: s.a, tag: "jmp", lbl: whileStartLbl })
      blocks.push({  a: s.a, label: whileStartLbl, stmts: [] })
      var [cinits, cstmts, cexpr] = flattenExprToVal(s.cond, blocks, env);
      pushStmtsToLastBlock(blocks, ...cstmts, { a: s.a, tag: "ifjmp", cond: cexpr, thn: whilebodyLbl, els: whileEndLbl });

      blocks.push({  a: s.a, label: whilebodyLbl, stmts: [] })
      var bodyinits = flattenStmts(s.body, blocks, env);
      pushStmtsToLastBlock(blocks, { a:s.a, tag: "jmp", lbl: whileStartLbl });

      blocks.push({  a: s.a, label: whileEndLbl, stmts: [] })

      return [...cinits, ...bodyinits]
  }
}

function flattenExprToExpr(e : AST.Expr<[Type, SourceLocation]>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>, env : GlobalEnv) : [Array<IR.VarInit<[Type, SourceLocation]>>, Array<IR.Stmt<[Type, SourceLocation]>>, IR.Expr<[Type, SourceLocation]>] {
  switch(e.tag) {
    case "uniop":
      var [inits, stmts, val] = flattenExprToVal(e.expr, blocks, env);
      return [inits, stmts, {
        ...e,
        expr: val
      }];
    case "binop":
      var [linits, lstmts, lval] = flattenExprToVal(e.left, blocks, env);
      var [rinits, rstmts, rval] = flattenExprToVal(e.right, blocks, env);
      return [[...linits, ...rinits], [...lstmts, ...rstmts], {
          ...e,
          left: lval,
          right: rval
        }];
    case "builtin1":
      var [inits, stmts, val] = flattenExprToVal(e.arg, blocks, env);
      return [inits, stmts, {tag: "builtin1", a: e.a, name: e.name, arg: val}];
    case "builtin2":
      var [linits, lstmts, lval] = flattenExprToVal(e.left, blocks, env);
      var [rinits, rstmts, rval] = flattenExprToVal(e.right, blocks, env);
      return [[...linits, ...rinits], [...lstmts, ...rstmts], {
          ...e,
          left: lval,
          right: rval
        }];
    case "call":
      const callpairs = e.arguments.map(a => flattenExprToVal(a, blocks, env));
      const callinits = callpairs.map(cp => cp[0]).flat();
      const callstmts = callpairs.map(cp => cp[1]).flat();
      const callvals = callpairs.map(cp => cp[2]).flat();
      return [ callinits, callstmts,
        {
          ...e,
          arguments: callvals
        }
      ];
    case "method-call": {
      const [objinits, objstmts, objval] = flattenExprToVal(e.obj, blocks, env);
      const argpairs = e.arguments.map(a => flattenExprToVal(a, blocks, env));
      const arginits = argpairs.map(cp => cp[0]).flat();
      const argstmts = argpairs.map(cp => cp[1]).flat();
      const argvals = argpairs.map(cp => cp[2]).flat();
      var objTyp = e.obj.a[0];
      if(objTyp.tag !== "class") { // I don't think this error can happen
        throw new Error("Report this as a bug to the compiler developer, this shouldn't happen " + objTyp.tag);
      }
      const className = objTyp.name;
      const checkObj : IR.Stmt<[Type, SourceLocation]> = { a: e.a, tag: "expr", expr: { a: e.a, tag: "call", name: `assert_not_none`, arguments: [objval]}}
      const callMethod : IR.Expr<[Type, SourceLocation]> = { a:e.a, tag: "call", name: `${className}$${e.method}`, arguments: [objval, ...argvals] }
      return [
        [...objinits, ...arginits],
        [...objstmts, checkObj, ...argstmts],
        callMethod
      ];
    }
    case "lookup": {
      const [oinits, ostmts, oval] = flattenExprToVal(e.obj, blocks, env);
      if(e.obj.a[0].tag !== "class") { throw new Error("Compiler's cursed, go home"); }
      const classdata = env.classes.get(e.obj.a[0].name);
      const [offset, _] = classdata.get(e.field);
      return [oinits, ostmts, {
        a: e.a,
        tag: "load",
        start: oval,
        offset: { tag: "wasmint", value: offset }}];
    }
    case "index":
      const [oinits, ostmts, oval] = flattenExprToVal(e.obj, blocks, env);
      const [iinits, istmts, ival] = flattenExprToVal(e.index, blocks, env);

      // if(equalType(e.a[0], CLASS("str"))){
      //   return [[...oinits, ...iinits], [...ostmts, ...istmts], {tag: "call", name: "str$access", arguments: [oval, ival]} ]
      // }
      if (e.obj.a[0].tag === "list") { 
        const offsetValue: IR.Value<[Type, SourceLocation]> = listIndexOffsets(iinits, istmts, ival, oval);
        return [[...oinits, ...iinits], [...ostmts, ...istmts], {
          a: e.a,
          tag: "load",
          start: oval,
          offset: offsetValue
        }];
      }
      // if(e.obj.a[0].tag === "dict")){
      //   ...
      // }
      // if(e.obj.a[0].tag === "tuple")){
      //   ...
      // }
      throw new Error("Compiler's cursed, go home");
    case "construct":
      const classdata = env.classes.get(e.name);
      const fields = [...classdata.entries()];
      const newName = generateName("newObj");
      const alloc : IR.Expr<[Type, SourceLocation]> = { a:e.a, tag: "alloc", amount: { a:e.a, tag: "wasmint", value: fields.length } };
      const assigns : IR.Stmt<[Type, SourceLocation]>[] = fields.map(f => {
        const [_, [index, value]] = f;
        return {
          a: e.a,
          tag: "store",
          start: { tag: "id", name: newName },
          offset: { tag: "wasmint", value: index },
          value: value
        }
      });

      return [
        [ { name: newName, type: e.a[0], value: { a: e.a, tag: "none" } }],
        [ { a: e.a, tag: "assign", name: newName, value: alloc }, ...assigns,
          { a: e.a, tag: "expr", expr: { a: e.a, tag: "call", name: `${e.name}$__init__`, arguments: [{ a: e.a, tag: "id", name: newName }] } }
        ],
        { a: e.a, tag: "value", value: { a: e.a, tag: "id", name: newName } }
      ];
    case "listliteral":
      const newListName = generateName("newList");
      const allocList : IR.Expr<[Type, SourceLocation]> = { tag: "alloc", amount: { tag: "wasmint", value: e.elements.length + 1 } };
      var inits : Array<IR.VarInit<[Type, SourceLocation]>> = [];
      var stmts : Array<IR.Stmt<[Type, SourceLocation]>> = [];
      var storeLength : IR.Stmt<[Type, SourceLocation]> = {
        tag: "store",
        start: { tag: "id", name: newListName },
        offset: { tag: "wasmint", value: 0 },
        value: { a: [{tag: "number"}, e.a[1]], tag: "num", value: BigInt(e.elements.length) }
      }
      const assignsList : IR.Stmt<[Type, SourceLocation]>[] = e.elements.map((e, i) => {
        const [init, stmt, val] = flattenExprToVal(e, blocks, env);
        inits = [...inits, ...init];
        stmts = [...stmts, ...stmt];
        return {
          tag: "store",
          start: { tag: "id", name: newListName },
          offset: { tag: "wasmint", value: i+1 },
          value: val
        }
      })
      return [
        [ { name: newListName, type: e.a[0], value: { tag: "none" } }, ...inits ],
        [ { a: e.a, tag: "assign", name: newListName, value: allocList }, ...stmts, storeLength, ...assignsList ],
        { a: e.a, tag: "value", value: { a: e.a, tag: "id", name: newListName } }
      ];
    case "id":
      return [[], [], {a: e.a, tag: "value", value: { ...e }} ];
    case "literal":
      return [[], [], {a: e.a, tag: "value", value: literalToVal(e.value) } ];
    case "ternary":
    case "comprehension":
      return flattenExprToExprWithBlocks(e, blocks, env);
  }
}

function flattenExprToExprWithBlocks(e : AST.Expr<[Type, SourceLocation]>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>, env : GlobalEnv) : [Array<IR.VarInit<[Type, SourceLocation]>>, Array<IR.Stmt<[Type, SourceLocation]>>, IR.Expr<[Type, SourceLocation]>] {
  switch(e.tag) {
    case "ternary":
      var [tinits, tstmts, tval] = flattenExprToExpr(e.exprIfTrue, blocks, env);
      var [finits, fstmts, fval] = flattenExprToExpr(e.exprIfFalse, blocks, env);
      var [condinits, condstmts, condval] = flattenExprToVal(e.ifcond, blocks, env);

      const resultName = generateName("resultVal");
      const resultInit : IR.VarInit<[Type, SourceLocation]> = { name: resultName, type: e.a[0], value: { tag: "none" } };

      var thenLbl = generateName("$ternaryThen");
      var elseLbl = generateName("$ternaryElse");
      var endLbl = generateName("$ternaryEnd");
      
      const condjmp : IR.Stmt<[Type, SourceLocation]> = { tag: "ifjmp", cond: condval, thn: thenLbl, els: elseLbl };
      const endjmp : IR.Stmt<[Type, SourceLocation]> = { tag: "jmp", lbl: endLbl };

      const assignTrue : IR.Stmt<[Type, SourceLocation]> = { tag: "assign", name: resultName, value: tval };
      const assignFalse : IR.Stmt<[Type, SourceLocation]> = { tag: "assign", name: resultName, value: fval };

      // in case of a lonely ternary expression in the program
      if (blocks.length == 0) {
        blocks.push({ a: e.a, label: generateName("$ternaryBlock"), stmts: [] });
      }
      
      pushStmtsToLastBlock(blocks, ...condstmts)
      pushStmtsToLastBlock(blocks, condjmp);
      blocks.push({ a: e.a, label: thenLbl, stmts: [...tstmts, assignTrue] });
      pushStmtsToLastBlock(blocks, endjmp);
      blocks.push({ a: e.a, label: elseLbl, stmts: [...fstmts, assignFalse] });
      pushStmtsToLastBlock(blocks, endjmp);
      blocks.push({ a: e.a, label: endLbl, stmts: [] });

      return [[...tinits, ...condinits, ...finits, resultInit],
        [],
        { a: e.a, tag: "value", value: { a: e.a, tag: "id", name: resultName } }
      ];
    case "comprehension":
      // obtain the iterable obj
      const [objinits, objstmts, objval] = flattenExprToVal(e.iterable, blocks, env);
      var objTyp = e.iterable.a[0];
      if(objTyp.tag !== "class") { // I don't think this error can happen
        throw new Error("Report this as a bug to the compiler developer, this shouldn't happen " + objTyp.tag);
      }
      const objClassName = objTyp.name;
      const checkObj : IR.Stmt<[Type, SourceLocation]> = { a: e.a, tag: "expr", expr: { a: e.a, tag: "call", name: `assert_not_none`, arguments: [objval]}};
      // method calls
      const callHasnext : IR.Expr<[Type, SourceLocation]> = { a: e.a, tag: "call", name: `${objClassName}$hasnext`, arguments: [objval] };
      const callNext : IR.Expr<[Type, SourceLocation]> = { a: e.a, tag: "call", name: `${objClassName}$next`, arguments: [objval] }

      const whileStartLbl = generateName("$whilestart");
      const whilebodyLbl = generateName("$whilebody");
      const whileEndLbl = generateName("$whileend");

      // jump to start
      pushStmtsToLastBlock(blocks, ...objstmts, checkObj, { tag: "jmp", lbl: whileStartLbl });
      blocks.push({  a: e.a, label: whileStartLbl, stmts: [] });
      // call hasnext
      const hasnextValName = generateName("condVal");
      const hasnextVal : IR.VarInit<[Type, SourceLocation]> = { name: hasnextValName, type: { tag: "bool" }, value: { tag: "bool", value: false } };
      const hasnextValAssign : IR.Stmt<[Type, SourceLocation]> =  { tag: "assign", name: hasnextValName, value: callHasnext };
      const hasnext : IR.Value<[Type, SourceLocation]> = { a: e.a, tag: "id", name: hasnextValName };
      const hasnextjmp : IR.Stmt<[Type, SourceLocation]> = { tag: "ifjmp", cond: hasnext, thn: whilebodyLbl, els: whileEndLbl };
      pushStmtsToLastBlock(blocks, hasnextValAssign, hasnextjmp);

      // body: call next and print result
      blocks.push({  a: e.a, label: whilebodyLbl, stmts: [] })
      const nextValName = e.item;
      var nextValType = undefined;
      switch (e.a[0].tag) {
        case "generator":
        case "list":
          nextValType = e.a[0].type;
          break;
        case "set":
        // case "dictionary":
          nextValType = e.a[0].valueType;
          break;
        case "class":
          nextValType = NONE; // any way to access type info here?
          break;
        default:
          throw new Error("Iterable is cursed, go home!");
      }
      const nextVal : IR.VarInit<[Type, SourceLocation]> = { name: nextValName, type: nextValType, value: { tag: "none" } };
      const nextValAssign : IR.Stmt<[Type, SourceLocation]> =  { tag: "assign", name: nextValName, value: callNext };

      // push call to next to blocks before lhs statements get pushed on the next line
      pushStmtsToLastBlock(blocks, nextValAssign);

      // TODO: assign-destructure
      // evaluate lhs
      const [linits, lstmts, lval] = flattenExprToExpr(e.lhs, blocks, env); // careful with ternary case
      const nextYieldName = generateName("nextYield");
      const nextYield : IR.VarInit<[Type, SourceLocation]> = { name: nextYieldName, type: lval.a[0], value: { tag: "none" } };
      const nextYieldAssign : IR.Stmt<[Type, SourceLocation]> =  { tag: "assign", name: nextYieldName, value: lval };
      // for this milestone, we just print out the values
      const callPrint : IR.Stmt<[Type, SourceLocation]> = { tag: "expr", expr: { tag: "call", name: "print_num", arguments: [{ a: e.a, tag: "id", name: nextYieldName }] } };

      // if condition
      const condThenLbl = generateName("$then");
      const condEndLbl = generateName("$end");
      const condElseLbl = generateName("$else");
      var cinits : IR.VarInit<[Type, SourceLocation]>[] = []
      var cstmts : IR.Stmt<[Type, SourceLocation]>[] = []
      var cval : IR.Value<[Type, SourceLocation]> = { tag: "bool", value: true };
      if (e.ifcond != undefined) {
        [cinits, cstmts, cval] = flattenExprToVal(e.ifcond, blocks, env);
      }

      // TODO: store generated values on heap
      if (e.a[0].tag === "generator") {
        const newName = generateName("newGen");
        // generator has two fields: size (number of elements generated), and addr (start address)
        const size = 0; // TODO: how to know the number of elements generated at this level?
        const startAddr = 0; // TODO: decide start address of generator, might need help from list data structure
        const alloc : IR.Expr<[Type, SourceLocation]> = { tag: "alloc", amount: { tag: "wasmint", value: 2 } };
        const assigns : IR.Stmt<[Type, SourceLocation]>[] = [
          {
            tag: "store",
            start: { tag: "id", name: newName },
            offset: { tag: "wasmint", value: 0 },
            value: { tag: "wasmint", value: size }
          },
          {
            tag: "store",
            start: { tag: "id", name: newName },
            offset: { tag: "wasmint", value: 1 },
            value: { tag: "wasmint", value: startAddr }
          }
        ];
      }

      const condJmp : IR.Stmt<[Type, SourceLocation]> = { tag: "ifjmp", cond: cval, thn: condThenLbl, els: condElseLbl };
      const endJmp : IR.Stmt<[Type, SourceLocation]> = { tag: "jmp", lbl: condEndLbl };

      pushStmtsToLastBlock(blocks, ...lstmts, ...cstmts, condJmp);
      blocks.push({ a: e.a, label: condThenLbl, stmts: [nextYieldAssign] });
      pushStmtsToLastBlock(blocks, endJmp);
      blocks.push({ a: e.a, label: condElseLbl, stmts: [] });
      pushStmtsToLastBlock(blocks, endJmp);
      blocks.push({ a: e.a, label: condEndLbl, stmts: [{ tag: "jmp", lbl: whileStartLbl }] });

      blocks.push({  a: e.a, label: whileEndLbl, stmts: [] });

      return [
        [...objinits, ...cinits, ...linits, hasnextVal, nextVal, nextYield],
        [],
        { tag: "value", value: {tag: "bool", value: false} } // what should I return here?
      ]
  }
}

function flattenExprToVal(e : AST.Expr<[Type, SourceLocation]>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>, env : GlobalEnv) : [Array<IR.VarInit<[Type, SourceLocation]>>, Array<IR.Stmt<[Type, SourceLocation]>>, IR.Value<[Type, SourceLocation]>] {
  var [binits, bstmts, bexpr] = flattenExprToExpr(e, blocks, env);
  if(bexpr.tag === "value") {
    return [binits, bstmts, bexpr.value];
  }
  else {
    var newName = generateName("valname");
    var setNewName : IR.Stmt<[Type, SourceLocation]> = {
      tag: "assign",
      a: e.a,
      name: newName,
      value: bexpr 
    };
    // TODO: we have to add a new var init for the new variable we're creating here.
    // but what should the default value be?
    return [
      [...binits, { a: e.a, name: newName, type: e.a[0], value: { a: e.a, tag: "none" } }],
      [...bstmts, setNewName],  
      {tag: "id", name: newName, a: e.a}
    ];
  }
}


function listIndexOffsets(iinits: IR.VarInit<[AST.Type, AST.SourceLocation]>[], istmts: IR.Stmt<[AST.Type, AST.SourceLocation]>[], ival: IR.Value<[AST.Type, AST.SourceLocation]>, oval: IR.Value<[AST.Type, AST.SourceLocation]>) : IR.Value<[AST.Type, AST.SourceLocation]> {
  // Check index is in bounds
  var listLength = generateName("listlength");
  var setLength : IR.Stmt<[Type, SourceLocation]> = {
    tag: "assign",
    a: ival.a,
    name: listLength,
    value: {
      a: ival.a,
      tag: "load",
      start: oval,
      offset: { tag: "wasmint", value: 0 }} 
  };
  iinits.push({ a: ival.a, name: listLength, type: {tag: "number"}, value: { tag: "none" } })
  istmts.push(setLength);
  const checkIndex: IR.Stmt<[Type, SourceLocation]> = { a: ival.a, tag: "expr", expr: { a: ival.a, tag: "call", name: `index_out_of_bounds`, arguments: [{tag: "id", name: listLength, a: ival.a}, ival]}}
  istmts.push(checkIndex);

  // Get rest of index offsets
  const value1: IR.Value<[Type, SourceLocation]> = { a: ival.a, tag: "wasmint", value: 1 };
  const indexAdd1Expr: IR.Expr<[Type, SourceLocation]> = {  a: ival.a, tag: "binop", op: AST.BinOp.Plus, left: ival, right: value1};
  const offsetName = generateName("offsetname");
  const offsetInit: IR.VarInit<[Type, SourceLocation]> = { a: ival.a, name: offsetName, type: {tag: "number"}, value: { tag: "none" } }
  iinits.push(offsetInit);
  const setOffset : IR.Stmt<[Type, SourceLocation]> = { tag: "assign", a: ival.a, name: offsetName, value: indexAdd1Expr };
  istmts.push(setOffset);
  const offsetValue: IR.Value<[Type, SourceLocation]> = {tag: "id", name: offsetName, a: ival.a}
  return offsetValue;
}

function pushStmtsToLastBlock(blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>, ...stmts: Array<IR.Stmt<[Type, SourceLocation]>>) {
  blocks[blocks.length - 1].stmts.push(...stmts);
}