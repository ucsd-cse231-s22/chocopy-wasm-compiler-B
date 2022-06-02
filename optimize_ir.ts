import exp from 'constants';
import { Block, isCallOrNewExpression } from 'typescript';
import { wasm } from 'webpack';
import { Type, Program, SourceLocation, FunDef, Expr, Stmt, Literal, BinOp, UniOp, Class, Value} from './ast';
import * as IR from './ir';
import { lowerProgram } from './lower';
import { NONE } from './utils';

export type Line = {block: string, line: number};
export type varant_in_line = {line: Line, varant: Map<string, Set<Line>>};
export type CFA = Array<varant_in_line>;
export type live_predicate = Map<string, Set<string>>;
export type needed_predicate = Map<string, Set<string>>;

const bfoldable = ["num", "bool", "none"];
const ufoldable = ["num", "bool"];
let isChanged = false;

export function optimizeIr(program: IR.Program<[Type, SourceLocation]>) : IR.Program<[Type, SourceLocation]> {
    var newProgram = {...program};
    let counter = 1;
    do {
        isChanged = false;
        const optFuns = newProgram.funs.map(funDef => optimizeFuncDef([], funDef, newProgram));
        const optClss = newProgram.classes.map(classDef => optimizeClass(classDef, newProgram));
        var optStmts = newProgram.body.map(optBasicBlock);
        optStmts = needednessDCE(optStmts);
        // optStmts = livenessDCE(optStmts);
        const cfa: CFA = flow_wklist([], newProgram.inits, optStmts);
        // printCFA(cfa);
        optStmts = constantPropagation([], newProgram.inits, optStmts, cfa);
        newProgram = {...newProgram, funs: optFuns, classes: optClss, body: optStmts};
        // console.log(counter++);
    } while(isChanged);
    console.log("**** IR optimization over")
    
    return newProgram;
}

/**
 * Calculate necessary values to calculate needed values
 * @param value 
 * @returns 
 */
function getNeededValue(value: IR.Value<[Type, SourceLocation]>): Set<string> {
    if (value.tag == "id") {
        return new Set([value.name]);
    } else {
        return new Set([]);
    }
}

/**
 * Find the needed values in an expression to calculate needed values
 * A necessary variable at line l is needed at line 1 (Rule 1)
 * Implement based on https://www.cs.cmu.edu/~rjsimmon/15411-f15/lec/07-dataflow.pdf
 * @param expr 
 * @returns 
 */
function getNeededExpr(expr: IR.Expr<[Type, SourceLocation]>): Set<string> {
    switch(expr.tag) {
        case "binop": {
            // BinOp with effect
            // LHS & RHS is necessary because // and mod could not have 0 as RHS
            if (expr.op == BinOp.IDiv || expr.op == BinOp.Mod) {
                return new Set([...getNeededValue(expr.left), ...getNeededValue(expr.right)]);
            } else {
                // effect free operation
                return new Set([]);
            }
        }
        case "call": {
            var necArg: Set<string> = new Set();
            for(let arg of expr.arguments) {
                let necValue = getNeededValue(arg);
                necArg = new Set([...necArg, ...necValue]);
            }
            return necArg;
        }
        case "alloc": {
            return getNeededValue(expr.amount);
        }
        case "load": {
            return getNeededValue(expr.offset);
        }
        case "value":
        case "uniop":
        default:
            return new Set();
    }
}

/**
 * Find used variables in an expression
 * For Rule 3 in neededness analysis
 * @param expr 
 */
function getUsedValue(expr: IR.Expr<[Type, SourceLocation]>): Set<string> {
    switch(expr.tag) {
        case "value":
            return getNeededValue(expr.value);
        case "binop":
            return new Set([...getNeededValue(expr.left), ...getNeededValue(expr.right)]);
        case "uniop":
            return getNeededValue(expr.expr);
        case "call": {
            const argSet: Set<string> = new Set();
            for (let arg of expr.arguments) {
                const argVal = getNeededValue(arg);
                argVal.forEach(arg => argSet.add(arg));
            }
            return argSet;
        }
        case "alloc":
            return getNeededValue(expr.amount);
        case "load":
            return new Set([...getNeededValue(expr.start), ...getNeededValue(expr.offset)])
    }
}

/**
 * Calculate needed values in a statement
 * A necessary variable at line l is needed at line l (Rule 1)
 * Implement based on https://www.cs.cmu.edu/~rjsimmon/15411-f15/lec/07-dataflow.pdf
 * @param stmt 
 */
function getNeededStmt(stmt: IR.Stmt<[Type, SourceLocation]>, nextLineNec: Set<string>, np: needed_predicate): Set<string> {
    switch(stmt.tag) {
        case "assign": {
            const currentNeeded: Set<string> = new Set();
            // Rule 2
            nextLineNec.forEach(nec => {
                if (nec !== stmt.name) {
                    currentNeeded.add(nec);
                }
            })
            // Rule 3
            if(nextLineNec.has(stmt.name)) {
                getUsedValue(stmt.value).forEach(val => {currentNeeded.add(val)});
            }
            getNeededExpr(stmt.value).forEach(val => {currentNeeded.add(val)});
            return currentNeeded;
        }
        case "return": {
            // there will not be any stmts after return
            // after DCE in AST
            return getNeededValue(stmt.value);
        }
        case "expr": {
            return new Set([...getNeededExpr(stmt.expr), ...nextLineNec]);
        }
        case "ifjmp": {
            const ifNeeded: Set<string> = new Set();
            const thnLabel = stmt.thn + '0';
            const elsLabel = stmt.els + '0';
            if (np.has(thnLabel)) {
                np.get(thnLabel).forEach(val => {ifNeeded.add(val)});
            }
            if (np.has(elsLabel)) {
                np.get(elsLabel).forEach(val => {ifNeeded.add(val)});
            }
            return new Set([...ifNeeded, ...getNeededValue(stmt.cond)]);
        }
        case "store": {
            return new Set([...getNeededValue(stmt.offset), ...getNeededValue(stmt.value), ...nextLineNec]);
        }
        case "jmp":
            const jmpNeeded: Set<string> = new Set();
            const jmpLabel = stmt.lbl + '0';
            if (np.has(jmpLabel)) {
                np.get(jmpLabel).forEach(val => jmpNeeded.add(val));
            }
            return jmpNeeded;
        case "pass":
            return nextLineNec;
        default:
            return new Set();
    }
}

export function needednessAnalysis(blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>): needed_predicate {
    var saturated = false;
    var np: needed_predicate = new Map();
    // backward propagation
    while (!saturated) {
        var changed = false;
        // slice() returns a new copy
        blocks.slice().reverse().forEach(block => {
            const label_prefix = block.label;
            for (let i = block.stmts.length - 1; i >= 0; i--) {
                const cur_line_label = label_prefix + i.toString();
                const succ_line_label = label_prefix + (i+1).toString();
                const cur_stmt = block.stmts[i];
                const nextLineNeeded: Set<string> = (np.has(succ_line_label) ? np.get(succ_line_label) : new Set());
                const cur_this_need = getNeededStmt(cur_stmt, nextLineNeeded, np);
                // If the predicate at current line is changed
                if (!np.has(cur_line_label) || 
                    !eqSet(cur_this_need, np.get(cur_line_label))) {
                    np.set(cur_line_label, cur_this_need);
                    changed = true;
                }  
            }
        });
        saturated = !changed;
    }
    const reverseNp = new Map();
    for (let newKey of Array.from(np.keys()).reverse()) {
        reverseNp.set(newKey, np.get(newKey));
    }
    return reverseNp;
}

function isCurValNeeded(val: IR.Value<[Type, SourceLocation]>, curNp: Set<string>): boolean {
    if (val.tag === "id" && curNp.has(val.name)) return true;
    return false;
}

function isCurStmtNeeded(stmt: IR.Stmt<[Type, SourceLocation]>, np: needed_predicate, curLabel: string, idx: number): boolean {
    const curNp = np.get(curLabel + idx.toString());
    switch (stmt.tag) {
        case "assign": {
            const next_label = curLabel + (idx+1).toString();
            let left_needed = false;
            if (np.has(next_label) && np.get(next_label).has(stmt.name)) left_needed = true;
            if (left_needed || isCurExprNeeded(stmt.value, curNp)) return true;
            return false;
        }
        case "return": {
            return true;
        }
        case "expr": {
            return isCurExprNeeded(stmt.expr, curNp);
        }
        case "pass": {
            return false;
        }
        case "ifjmp": {
            return true;
        }
        case "jmp": {
            return true;
        }
        case "store": {
            return true;
        }
        default: 
            return true;
    }
}

function isCurExprNeeded(expr: IR.Expr<[Type, SourceLocation]>, curNp: Set<string>): boolean {
    switch (expr.tag) {
        case "value": {
            return isCurValNeeded(expr.value, curNp);
        }
        case "binop": {
            return isCurValNeeded(expr.left, curNp) || isCurValNeeded(expr.right, curNp);
        }
        case "uniop": {
            return isCurValNeeded(expr.expr, curNp);
        }
        case "call": {
            return true;
        }
        case "alloc": {
            return true;
        }
        case "load": {
            return true;
        }
    }
}

export function needednessDCE(blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>): Array<IR.BasicBlock<[Type, SourceLocation]>> {
    const np: needed_predicate = needednessAnalysis(blocks);
    const lp: live_predicate = liveness_analysis(blocks);
    //console.log(np);
    //console.log(lp);
    var blockStmts = [];
    const newBlocks = [];
    for (let block of blocks) {
        blockStmts = [];
        for (const [stmtIndex, stmt] of block.stmts.entries()) {
            let stmtLabel = block.label+stmtIndex.toString();           
            if (np.has(stmtLabel) && !isCurStmtNeeded(stmt, np, block.label, stmtIndex)) {
                isChanged = true;
                continue;
            }
            blockStmts.push(stmt);
            // if (stmt.tag === "assign" && stmt.value.tag != "call" && !np.get(stmtLabel).has(stmt.name)) {
            //     let isFound = false;
            //     for (let valueSet of np.values()) {
            //         if (valueSet.has(stmt.name)) {
            //             isFound = true;
            //             break;
            //         }
            //     }
            //     if (isFound) {
            //         blockStmts.push(stmt);
            //     } else {
            //         isChanged = true;
            //     }
            // } else {
            //     blockStmts.push(stmt);
            // }
        }
        let newBlock = {...block, stmts:blockStmts};
        newBlocks.push(newBlock);
    }
    return newBlocks;
}

export function livenessDCE(blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>): Array<IR.BasicBlock<[Type, SourceLocation]>>{
    const lp: live_predicate = liveness_analysis(blocks);
    var blockStmts = [];
    const newBlocks = [];
    for (let block of blocks) {
        blockStmts = [];
        for (const [stmtIndex, stmt] of block.stmts.entries()) {
            let stmtLabel = block.label+stmtIndex.toString();
            if (stmt.tag === "assign") {                
                for (let key of lp.keys()){
                    // no var is found in successor line
                    if (key === stmtLabel) {
                        isChanged = true;
                        break;
                    } else {
                        let value = lp.get(key);
                        if (value.has(stmt.name)) {
                            blockStmts.push(stmt);
                            break;
                        } 
                    }
                }
            } else {
                blockStmts.push(stmt);
            }
        }
        let newBlock = {...block, stmts:blockStmts};
        newBlocks.push(newBlock);
    }
    return newBlocks;
}

function constantPropagationValue(value: IR.Value<[Type, SourceLocation]>, cfa: CFA, line: Line, gInits: Array<IR.VarInit<[Type, SourceLocation]>>, inits: Array<IR.VarInit<[Type, SourceLocation]>>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>): IR.Value<[Type, SourceLocation]> {
    switch(value.tag) {
        case "id": {
            var defVal = findReachingDef(cfa, value.name, line, gInits, inits, blocks);
            if (defVal.tag !== 'none' && defVal.tag !== 'id') {
                // Do not consider load for now
                // Convert all numeric to num, not wasmint
                switch(defVal.tag) {
                    case "num": {
                        isChanged = true;
                        return {a:value.a, tag: "num", value: defVal.value};
                    }
                    case "bool": {
                        isChanged = true;
                        return {a:value.a, tag: "bool", value: defVal.value};
                    }
                    default:
                        return value;
                } 
            }else {
                return value;
            }
        }
        case "num":
        case "wasmint":
        case "bool":
        case "none":
        default:
            return value;
    }
}

function constantPropagationExpr(expr: IR.Expr<[Type, SourceLocation]>, cfa: CFA, line: Line, gInits: Array<IR.VarInit<[Type, SourceLocation]>>, inits: Array<IR.VarInit<[Type, SourceLocation]>>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>): IR.Expr<[Type, SourceLocation]> {
    switch(expr.tag) {
        case "value": {
            let newValue = constantPropagationValue(expr.value, cfa, line, gInits, inits, blocks);
            return {...expr, value: newValue};
        }
        case "binop": {
            let newLHS = constantPropagationValue(expr.left, cfa, line, gInits, inits, blocks);
            let newRHS = constantPropagationValue(expr.right, cfa, line, gInits, inits, blocks);
            return {...expr, left: newLHS, right: newRHS};
        }
        case "uniop": {
            let newExpr = constantPropagationValue(expr.expr, cfa, line, gInits, inits, blocks);
            return {...expr, expr: newExpr};
        }
        case "call": {
            let newArgs = expr.arguments.map(arg => constantPropagationValue(arg, cfa, line, gInits, inits, blocks));
            return {...expr, arguments: newArgs};
        }
        case "alloc":
        case "load":
        default:
            return expr;
    }
}

function constantPropagationStmt(stmt: IR.Stmt<[Type, SourceLocation]>, cfa: CFA, line: Line, gInits: Array<IR.VarInit<[Type, SourceLocation]>>, inits: Array<IR.VarInit<[Type, SourceLocation]>>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>): IR.Stmt<[Type, SourceLocation]> {
    switch(stmt.tag) {
        case "assign": {
            let newValue = constantPropagationExpr(stmt.value, cfa, line, gInits, inits, blocks);
            return {...stmt, value: newValue};
        }
        case "return": {
            let newValue = constantPropagationValue(stmt.value, cfa, line, gInits, inits, blocks);
            return {...stmt, value: newValue};
        }
        case "expr": {
            let newExpr = constantPropagationExpr(stmt.expr, cfa, line, gInits, inits, blocks);
            return {...stmt, expr: newExpr};
        }
        case "ifjmp": {
            let newCond = constantPropagationValue(stmt.cond, cfa, line, gInits, inits, blocks);
            return {...stmt, cond:newCond};
        }
        case "pass":
        case "jmp":
        case "store":
        default:
            return stmt;
    }
}

export function constantPropagation(ginits: Array<IR.VarInit<[Type, SourceLocation]>>, inits: Array<IR.VarInit<[Type, SourceLocation]>>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>, cfa:CFA): Array<IR.BasicBlock<[Type, SourceLocation]>>{
    const newBlocks = [];
    for (let block of blocks) {
        var blockStmts = [];
        for(let i = 0; i < block.stmts.length; ++i)
        {
            var line: Line = {block: block.label, line: i};
            blockStmts.push(constantPropagationStmt(block.stmts[i], cfa, line, ginits, inits, blocks));
        }
        //blockStmts = block.stmts.map(stmt => constantPropagationStmt(stmt, cfa, block, program));
        let newBlock = {...block, stmts:blockStmts};
        newBlocks.push(newBlock);
    }
    return newBlocks;
}

export function findReachingDef(cfa: CFA, id: string, line: Line, gInits: Array<IR.VarInit<[Type, SourceLocation]>>, inits: Array<IR.VarInit<[Type, SourceLocation]>>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>): IR.Value<[Type, SourceLocation]>{
    for (let l of cfa) {
        if (l.line.block === line.block && l.line.line === line.line) {
            for(let key of l.varant.keys()){
                if(key === id){
                    var defSet = l.varant.get(key);
                    if(defSet.size == 1){
                        var defLine = defSet.values().next().value;
                        return getDefFromLine(id, defLine, gInits, inits, blocks);
                    }
                }
            }
        } 
    }
    return {tag: "none"};
}

function getDefFromLine(id: string, line: Line, gInits: Array<IR.VarInit<[Type, SourceLocation]>>, inits: Array<IR.VarInit<[Type, SourceLocation]>>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>): IR.Value<[Type, SourceLocation]>{
    if(line.block === '$varInit'){
        for(let varini of inits){
            if(varini.name === id){
                return varini.value;
            }
        }
    }else if(line.block === '$gInit'){
        return {tag: 'none'};
    }else{
        for (let block of blocks) {
            if(block.label == line.block){
                var defSrc = block.stmts[line.line];
                if(defSrc.tag === 'assign' && defSrc.value.tag === 'value'){
                    return defSrc.value.value;
                }
            }
        }
    }
    return {tag: 'none'};
}

function optBasicBlock(bb: IR.BasicBlock<[Type, SourceLocation]>): IR.BasicBlock<[Type, SourceLocation]> {
    return {...bb, stmts: bb.stmts.map(optimizeIRStmt)};
}

function optimizeFuncDef(gInits: Array<IR.VarInit<[Type, SourceLocation]>>, fun: IR.FunDef<[Type, SourceLocation]>, program: IR.Program<[Type, SourceLocation]>): IR.FunDef<[Type, SourceLocation]> {
    let newFunBody = fun.body.map(optBasicBlock);
    newFunBody = needednessDCE(newFunBody);
    var cfa_fun: CFA = flow_wklist(gInits, fun.inits, newFunBody);
    newFunBody = constantPropagation(gInits, fun.inits, newFunBody, cfa_fun);
    return {...fun, body: newFunBody};
}

function optimizeClass(cls: IR.Class<[Type, SourceLocation]>, program: IR.Program<[Type, SourceLocation]>): IR.Class<[Type, SourceLocation]> {
    return {...cls, methods: cls.methods.map(method => optimizeFuncDef(cls.fields, method, program))};
}

function optimizeIRStmt(stmt: IR.Stmt<[Type, SourceLocation]>): IR.Stmt<[Type, SourceLocation]> {
    switch (stmt.tag) {
        case "assign":
            return {...stmt, value: optimizeIRExpr(stmt.value)};
        case "expr":
            return {...stmt, expr: optimizeIRExpr(stmt.expr)};
        case "return":
        case "pass":
        case "ifjmp":
        case "jmp":
        case "store":
            return stmt;
        default:
            return stmt;
    }
}

function optimizeIRExpr(expr: IR.Expr<[Type, SourceLocation]>): IR.Expr<[Type, SourceLocation]> {
    switch (expr.tag) {
        case "value":
            return expr;
        case "binop": 
            if (bfoldable.includes(expr.left.tag) && bfoldable.includes(expr.right.tag)) {
                isChanged = true;
                return {tag: "value", value: foldBinop(expr.left, expr.right, expr.op), a: expr.a};
            }
            return expr;
        case "uniop":
            if (ufoldable.includes(expr.expr.tag)) {
                isChanged = true;
                return {tag: "value", value: foldUniop(expr.expr, expr.op), a: expr.a};
            }
            return expr;
        case "call":
            return expr;
        case "alloc":
            return expr;
        case "load" :
            return expr;
        default:
            return expr;
    }
}

function foldBinop(lhs: IR.Value<[Type, SourceLocation]>, rhs: IR.Value<[Type, SourceLocation]>, op: BinOp): IR.Value<[Type, SourceLocation]> {
    switch(op) {
        case BinOp.Plus: {
            if (lhs.tag != "num" || rhs.tag != "num") {
                return {tag: "none", a: lhs.a};
            }
            return {tag: "num", value: lhs.value + rhs.value, a: lhs.a};
        }
        case BinOp.Minus:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }  
            return {tag: "num", value: lhs.value - rhs.value, a: lhs.a};
        case BinOp.Mul:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }  
            return {tag: "num", value: lhs.value * rhs.value, a: lhs.a};
        case BinOp.IDiv:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }  
            // bigint do intDiv
            return {tag: "num", value: lhs.value / rhs.value, a: lhs.a};
        case BinOp.Mod:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }  
            return {tag: "num", value: lhs.value + rhs.value, a: lhs.a};
        case BinOp.Eq:
            if(lhs.tag === "none" || rhs.tag === "none"){
                return {tag: "bool", value: true, a: lhs.a};
            } else if(lhs.tag === "id" || rhs.tag === "id") {
                return {tag: "none", a: lhs.a};
            }
            return {tag: "bool", value: lhs.value === rhs.value};
        case BinOp.Neq:
            if(lhs.tag === "none" || rhs.tag === "none"){
                return {tag: "bool", value: false, a: lhs.a};
            } else if(lhs.tag === "id" || rhs.tag === "id") {
                return {tag: "none", a: lhs.a};
            } 
            return {tag: "bool", value: lhs.value !== rhs.value, a: lhs.a};
        case BinOp.Lte:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }   
            return {tag: "bool", value: lhs.value <= rhs.value, a: lhs.a};
        case BinOp.Gte:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }    
            return {tag: "bool", value: lhs.value >= rhs.value, a: lhs.a};
        case BinOp.Lt:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }   
            return {tag: "bool", value: lhs.value < rhs.value, a: lhs.a};
        case BinOp.Gt:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none", a: lhs.a};
            }  
            return {tag: "bool", value: lhs.value > rhs.value, a: lhs.a};
        case BinOp.And:
            if(lhs.tag !== "bool" || rhs.tag !== "bool"){
                return {tag: "none", a: lhs.a};
            }   
            return {tag: "bool", value: lhs.value && rhs.value, a: lhs.a};
        case BinOp.Or:
            if(lhs.tag !== "bool" || rhs.tag !== "bool"){
                return {tag: "none", a: lhs.a};
            }  
            return {tag: "bool", value: lhs.value || rhs.value, a: lhs.a};
        default:
            return {tag: "none", a: lhs.a};
      }
}

function foldUniop(val: IR.Value<[Type, SourceLocation]>, op: UniOp): IR.Value<[Type, SourceLocation]>{
    switch (op){
        case UniOp.Neg:
            if(val.tag != "num"){
                return {tag: "none", a: val.a};
            }
            return {tag: "num", value: BigInt(-1) *val.value, a: val.a};
        case UniOp.Not:
            if(val.tag != "bool"){
                return {tag: "none", a: val.a};
            }
            return {tag: "bool", value: !(val.value), a: val.a};
        default:
            return {tag: "none", a: val.a};
    }
}

// {linelabel: set(vars)}

function eqSet(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size)
        return false;
    a.forEach(ae => {
        if (!b.has(ae))
            return false;
    });
    return true;
}

export function liveness_analysis(bbs: Array<IR.BasicBlock<[Type, SourceLocation]>>): live_predicate {
    var saturated = false;
    var lp: live_predicate = new Map();
    // backward propagation
    while (!saturated) {
        var changed = false;
        bbs.slice().reverse().forEach(bb => {
            const label_prefix = bb.label;
            for (let i = bb.stmts.length - 1; i >= 0; i--) {
                const cur_line_label = label_prefix + i.toString();
                // console.log(cur_line_label);
                const succ_line_label = label_prefix + (i+1).toString();
                const cur_stmt = bb.stmts[i];
                const live_u: Set<string> = (lp.has(succ_line_label) ? lp.get(succ_line_label) : new Set());
                const cur_this_live = live_stmt(cur_stmt, live_u, lp);
                // console.log(cur_this_live);
                if (!lp.has(cur_line_label) || 
                    !eqSet(cur_this_live, lp.get(cur_line_label))) {
                    lp.set(cur_line_label, cur_this_live);
                    changed = true;
                }  
                // console.log(lp);
            }
        });
        saturated = !changed;
    }
    return lp;
}

function live_stmt(stmt: IR.Stmt<[Type, SourceLocation]>, live_u: Set<string>, lp: live_predicate): Set<string> {
    switch(stmt.tag) {
        case "assign": {
            const live_asgn: Set<string> = new Set();
            live_u.forEach(u => {
                if (u !== stmt.name)
                    live_asgn.add(u);
            });
            live_expr(stmt.value).forEach(live_asgn.add, live_asgn);
            return live_asgn;
        }
        case "return":
            return live_val(stmt.value);
        case "expr":
            return live_expr(stmt.expr);
        case "pass":
            return live_u;
        case "ifjmp": {
            const live_dest: Set<string> = new Set();
            const thn_line_label = stmt.thn + '0';
            const els_line_label = stmt.els + '0';
            if (lp.has(thn_line_label)) {
                // console.log(lp.get(thn_line_label));
                lp.get(thn_line_label).forEach(live_dest.add, live_dest);
            }
            if (lp.has(els_line_label))
                lp.get(els_line_label).forEach(live_dest.add, live_dest); 
            return new Set([...live_dest, ...live_val(stmt.cond)]);
        }
        case "jmp": {
            const live_dest: Set<string> = new Set();
            const lbl_line_label = stmt.lbl + '0';
            if (lp.has(lbl_line_label)) 
                lp.get(lbl_line_label).forEach(live_dest.add, live_dest);
            return new Set([...live_dest]);
        }
        case "store":
            const live_vars = new Set([...live_val(stmt.start), ...live_val(stmt.offset), ...live_val(stmt.value)]);
            return new Set([...live_vars, ...live_u]);
        default:
            return live_u;
    }
}

function live_expr(expr: IR.Expr<[Type, SourceLocation]>): Set<string> {
    switch (expr.tag) {
        case "value":
            return live_val(expr.value);
        case "binop": 
            var live_left = live_val(expr.left);
            var live_right = live_val(expr.right);
            return new Set([...live_left, ...live_right]);
        case "uniop":
            return live_val(expr.expr);
        case "call":
            const live_args: Set<string>= new Set();
            expr.arguments.forEach(arg => {
                const live_arg = live_val(arg);
                if (live_arg.size != 0)
                    // live_arg.forEach(live_args.add);
                    live_arg.forEach(arg => live_args.add(arg));
            });
            return live_args;
        case "alloc":
            return live_val(expr.amount);
        case "load":
            return new Set([...live_val(expr.start), ...live_val(expr.offset)]);
        default:
            return new Set();
    }
}

function live_val(val: IR.Value<[Type, SourceLocation]>): Set<string> {
    if (val.tag == "id")
        return new Set([val.name]);
    else
        return new Set();
}


function flow_wklist(gInits: Array<IR.VarInit<[Type, SourceLocation]>>, inits: Array<IR.VarInit<[Type, SourceLocation]>>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>): CFA{
    var result: CFA = new Array();
    var initialMap: Map<string, Set<Line>> = new Map();
    var line2num: Map<string, number> = new Map();

    for(let i = 0; i < gInits.length; ++i){
        var theSet: Set<Line> = new Set();
        if(gInits[i].value.tag !== 'none'){
            theSet.add({
                block: '$gInit',
                line: 0 
            });
        }
        initialMap.set(gInits[i].name, theSet);
    }

    for(let i = 0; i < inits.length; ++i){
        var theSet: Set<Line> = new Set();
        if(inits[i].value.tag !== 'none'){
            theSet.add({
                block: '$varInit',
                line: 0 
            });
        }
        initialMap.set(inits[i].name, theSet);
    }

    var lineCnt = 0;
    for(let i = 0; i < blocks.length; ++i)
    {
        for(let j = 0; j < blocks[i].stmts.length; ++j)
        {
            var theLine = {block: blocks[i].label, line: j};
            var var_in_line: varant_in_line = {
                line: theLine,
                varant: new Map()
            }
            result.push(var_in_line);
            line2num.set(theLine.block + theLine.line.toString(), lineCnt);
            lineCnt++;
        }
    }

    result[0] = {
        line: {block: blocks[0].label, line: 0},
        varant: initialMap
    }

    var wklist: Array<number> = [0];
    while(wklist.length != 0){
        var curLine = wklist.pop();
        var curStmt = getStmt(result[curLine].line, blocks);
        var changed = false;
        if(curStmt.tag === 'assign'){
            if(curLine >= result.length-1){
                continue;
            }
            var nxt = curLine+1;
            var newSet: Set<Line> = new Set();
            changed = false;
            if(result[nxt].varant.has(curStmt.name)){
                newSet = result[nxt].varant.get(curStmt.name);
            }
            if(!newSet.has(result[curLine].line)){
                changed = true;
            }
            result[nxt].varant.set(curStmt.name, new Set([...newSet, result[curLine].line]));
            for(let key of result[curLine].varant.keys()){
                if(key !== curStmt.name){
                    var nxtSet: Set<Line> = new Set();
                    if(result[nxt].varant.has(key)){
                        nxtSet = result[nxt].varant.get(key);
                    }
                    var curSet: Set<Line> = result[curLine].varant.get(key);
                    if(!isSubSet(curSet, nxtSet)){
                        changed = true;
                    }
                    result[nxt].varant.set(key, new Set([...nxtSet, ...curSet]));
                }
            }
            if(changed){
                wklist.push(nxt);
            }
        }else{
            var nxts: Array<number> = [];
            if(curStmt.tag !== 'ifjmp' && curStmt.tag !== 'jmp' && curLine < result.length-1){
                nxts.push(curLine+1);
            }else{
                nxts = getNexts(curStmt, line2num);
            }
            for(let n of nxts){
                changed = false;
                for(let key of result[curLine].varant.keys()){
                    var nxtSet: Set<Line> = new Set();
                    if(result[n].varant.has(key)){
                        nxtSet = result[n].varant.get(key);
                    }
                    var curSet: Set<Line> = result[curLine].varant.get(key);
                    if(!isSubSet(curSet, nxtSet)){
                        changed = true;
                    }
                    result[n].varant.set(key, new Set([...nxtSet, ...curSet]));
                }
                if(changed){
                    wklist.push(n);
                }
            }
        }
    }
    return result;
}

function getStmt(line: Line, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>): IR.Stmt<[Type, SourceLocation]> {
    for(let i = 0; i < blocks.length; ++i)
    {
        if(blocks[i].label === line.block){
            for(let j = 0; j < blocks[i].stmts.length; ++j)
            {
                if(j === line.line){
                    return blocks[i].stmts[j];
                }
            }
        }
    }
    return {tag:'pass'};
}

function getNexts(stmt: IR.Stmt<[Type, SourceLocation]>, line2num: Map<string, number>): Array<number> {
    var res: Array<number> = [];
    var lineName;
    if(stmt.tag === 'ifjmp'){
        lineName = stmt.thn + '0';
        if(line2num.has(lineName)){
            res.push(line2num.get(lineName));
        }
        lineName = stmt.els + '0';
        if(line2num.has(lineName)){
            res.push(line2num.get(lineName));
        }
    }else if(stmt.tag === 'jmp'){
        lineName = stmt.lbl + '0';
        if(line2num.has(lineName)){
            res.push(line2num.get(lineName));
        }
    }
    return res;
}

function isSubSet(s1: Set<Line>, s2: Set<Line>): boolean{
    return (
        s1.size <= s2.size && [...s1].every((item) => s2.has(item))
    );
}

function printCFA(cfa: CFA){
    for(let l of cfa){
        console.log(l.line.block + '_' + l.line.line);
        var str: string = '';
        l.varant.forEach((val, key)=>{
            str += key;
            str += ': (';
            val.forEach(line => {
                str += (line.block+'_'+line.line);
                str += ', '
            })
            str += ')  ';
        })
        console.log(str);
    }
}