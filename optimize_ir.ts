import { Type, Program, SourceLocation, FunDef, Expr, Stmt, Literal, BinOp, UniOp, Class} from './ast';
import * as IR from './ir';

export type Line = {block: string, line: number};
export type varant_in_line = {line: Line, varant: Map<string, Set<Line>>};
export type CFA = Array<varant_in_line>;

export function optimizeIr(program: IR.Program<[Type, SourceLocation]>) : IR.Program<[Type, SourceLocation]> {
    const cfa: CFA = flow_wklist(program.inits, program.body);
    printCFA(cfa);
    const optFuns = program.funs.map(optimizeFuncDef);
    const optClss = program.classes.map(optimizeClass);
    const optBody = program.body.map(optBasicBlock);
    return { ...program, funs: optFuns, classes: optClss, body: optBody };
}

const bfoldable = ["num", "bool", "none"];
const ufoldable = ["num", "bool"];
function bigMax(a: bigint, b: bigint): bigint {
    return a > b ? a : b;
}
function bigMin(a: bigint, b: bigint): bigint {
    return a < b ? a : b;
}
function bigPow(a: bigint, p: bigint): bigint {
    return a ** p;
}
function bigAbs(a: bigint): bigint {
    return a < 0 ? -a : a;
}

function optBasicBlock(bb: IR.BasicBlock<[Type, SourceLocation]>): IR.BasicBlock<[Type, SourceLocation]> {
    return {...bb, stmts: bb.stmts.map(optimizeIRStmt)};
}

function optimizeFuncDef(fun: IR.FunDef<[Type, SourceLocation]>): IR.FunDef<[Type, SourceLocation]> {
    return {...fun, body: fun.body.map(optBasicBlock)};
}

function optimizeClass(cls: IR.Class<[Type, SourceLocation]>): IR.Class<[Type, SourceLocation]> {
    return {...cls, methods: cls.methods.map(optimizeFuncDef)};
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
            if (bfoldable.includes(expr.left.tag) && bfoldable.includes(expr.right.tag)) 
                return {tag: "value", value: foldBinop(expr.left, expr.right, expr.op), a: expr.a};
            return expr;
        case "uniop":
            if (ufoldable.includes(expr.expr.tag)) 
                return {tag: "value", value: foldUniop(expr.expr, expr.op), a: expr.a};
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
export type live_predicate = Map<string, Set<string>>;

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
            const els_line_label = stmt.thn + '0';
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
                    live_arg.forEach(live_args.add);
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


function flow_wklist(inits: Array<IR.VarInit<[Type, SourceLocation]>>, blocks: Array<IR.BasicBlock<[Type, SourceLocation]>>): CFA{
    var result: CFA = new Array();
    var initialMap: Map<string, Set<Line>> = new Map();
    var line2num: Map<string, number> = new Map();
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