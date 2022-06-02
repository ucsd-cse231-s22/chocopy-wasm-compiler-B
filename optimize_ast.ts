import { Type, Program, SourceLocation, FunDef, Expr, Stmt, Literal, BinOp, UniOp, Class} from './ast';
import { BuiltinLib } from './builtinlib'

let isChanged = false;

export function optimizeAst(program: Program<[Type, SourceLocation]>) : Program<[Type, SourceLocation]> {
    
    var newProgram = {...program};
    do {
        isChanged = false;
        // Optimize function definitions
        const optFuns = newProgram.funs.map(fun => optimizeFuncDef(fun));
        // Optimize class definitions
        const optClasses = newProgram.classes.map(classDef => optimizeClassDef(classDef));
        // Dead code elimination for statements after definitions
        var optStmts = deadCodeElimination(newProgram.stmts);
        // Optimize statements
        optStmts = optStmts.map(stmt => optimizeStmt(stmt));
        newProgram = {...newProgram, funs: optFuns, stmts: optStmts, classes: optClasses}
    } while(isChanged);
    
    return newProgram;
}

function deadCodeElimination(stmts:Array<Stmt<[Type, SourceLocation]>>): Array<Stmt<[Type, SourceLocation]>> {
    // Eliminate unreachable codes after return
    var optCodeChunk = DCEForReturn(stmts);
    // Eliminate if branches with boolean literal condition and while loop with false literal as condition
    optCodeChunk = DCEForControlFlow(optCodeChunk);
    // Eliminate redundant pass statements
    optCodeChunk = DCEForPass(optCodeChunk);

    return optCodeChunk;
}

function optimizeFuncDef(funDef: FunDef<[Type, SourceLocation]>): FunDef<[Type, SourceLocation]> {
    // Dead code elimination
    var optBody = deadCodeElimination(funDef.body);
    // Constant folding
    optBody = optBody.map(stmt => optimizeStmt(stmt));
    return {...funDef, body: optBody};
}

function optimizeClassDef(classDef: Class<[Type, SourceLocation]>): Class<[Type, SourceLocation]> {
    // Dead code Elimination: Remove the statements after return inside method body
    const newMethods: Array<FunDef<[Type, SourceLocation]>> = classDef.methods.map(method => {
        return optimizeFuncDef(method);
    });

    return {...classDef, methods: newMethods};
}

/**
 * Dead code elimination: Remove the redundant pass statements
 * Besides the user-defined pass statements, other optimization operations may also generate pass statements
 * 
 * @param stmts 
 * @returns 
 */
function DCEForPass(stmts: Array<Stmt<[Type, SourceLocation]>>): Array<Stmt<[Type, SourceLocation]>> {
    const newStmts: Array<Stmt<[Type, SourceLocation]>> = [];
    for (let [index, stmt] of stmts.entries()) {
        // Only add pass statement when the last statement is pass statement and there is no other valid statements
        if (stmt.tag === 'pass' && index === stmts.length-1 && newStmts.length === 0) {
            newStmts.push(stmt);
        } else if (stmt.tag === 'pass') {
            continue;
        } else {
            newStmts.push(stmt);
        }
    }

    return newStmts;
}

/**
 * Dead code elimination: Remove the unreachable codes after return statement
 * 
 * Note: This function will return the exact same array if there were no return statement in the array
 * @param stmts An array of statements as the body of function/if-branch/loops
 * @returns an array statements with no statement after return statement
 */
function DCEForReturn(stmts: Array<Stmt<[Type, SourceLocation]>>): Array<Stmt<[Type, SourceLocation]>> {
    const newStmts: Array<Stmt<[Type, SourceLocation]>> = [];
    for (let [index, stmt] of stmts.entries()) {
        switch(stmt.tag) {
            case "return": {
                newStmts.push(stmt);
                if (index < stmts.length-1) {
                    isChanged = true;
                }
                return newStmts;
            } case "if": {
                const newThenBody = DCEForReturn(stmt.thn);
                const newElseBody = DCEForReturn(stmt.els);
                const newIfStmt = {...stmt, thn: newThenBody, els: newElseBody};
                newStmts.push(newIfStmt);
                break;
            } case "while": {
                const newLoopBody = DCEForReturn(stmt.body);
                const newWhileStmt = {...stmt, body: newLoopBody};
                newStmts.push(newWhileStmt);
                break;
            } default: {
                newStmts.push(stmt);
                break;
            }
        }
    }

    return newStmts;
}

function optimizeExpr(expr: Expr<[Type, SourceLocation]>): Expr<[Type, SourceLocation]> {
    switch (expr.tag){
        case "binop":
            var optLhs = optimizeExpr(expr.left);
            var optRhs = optimizeExpr(expr.right);
            if(optLhs.tag == "literal" && optRhs.tag == "literal"){
                var A = expr.a;
                var lit = foldBinop(optLhs.value, optRhs.value, expr.op);
                isChanged = true;
                return  { a: A, tag: "literal", value: lit};
            }
            return {...expr, left:optLhs, right:optRhs};
        case "uniop":
           var optExpr = optimizeExpr(expr.expr);
           if(optExpr.tag == "literal"){
               var A = expr.a;
               var lit = foldUniop(optExpr.value, expr.op);
               isChanged = true;
               return {a: A, tag: "literal", value: lit};
           }
           return {...expr, expr: optExpr};
        case "call":
            var optArgs = expr.arguments.map(e => optimizeExpr(e));
            if (checkBuiltin(expr.name)) {
                const exprResult = optimizeBuiltin(expr, optArgs);
                return exprResult;
            }
            return {...expr, arguments: optArgs};
        case "method-call":
            var optArgs = expr.arguments.map(e => optimizeExpr(e));
            return {...expr, arguments: optArgs};
        default:
            return {...expr};
    }
}

function checkBuiltin(name:string): boolean {
    for (let func of BuiltinLib) {
        if (name === func.name) {
            return true;
        }
    }
    return false;
}

function optimizeBuiltin(expr: Expr<[Type, SourceLocation]>, optArgs: Expr<[Type, SourceLocation]>[]): Expr<[Type, SourceLocation]> {
    if (expr.tag === "call") {
        switch (expr.name) {
            case "factorial": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "num") {
                    const result = BuiltinLib[0].body(optArgs[0].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            case "randint": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "num" && optArgs[1].tag === "literal" && optArgs[1].value.tag === "num") {
                    const result = BuiltinLib[1].body(optArgs[0].value.value, optArgs[1].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            case "gcd": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "num" && optArgs[1].tag === "literal" && optArgs[1].value.tag === "num") {
                    const result = BuiltinLib[2].body(optArgs[0].value.value, optArgs[1].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            case "lcm": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "num" && optArgs[1].tag === "literal" && optArgs[1].value.tag === "num") {
                    const result = BuiltinLib[3].body(optArgs[0].value.value, optArgs[1].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            case "comb": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "num" && optArgs[1].tag === "literal" && optArgs[1].value.tag === "num") {
                    const result = BuiltinLib[4].body(optArgs[0].value.value, optArgs[1].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            case "perm": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "num" && optArgs[1].tag === "literal" && optArgs[1].value.tag === "num") {
                    const result = BuiltinLib[5].body(optArgs[0].value.value, optArgs[1].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            case "randrange": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "num" && 
                optArgs[1].tag === "literal" && optArgs[1].value.tag === "num" &&
                optArgs[2].tag === "literal" && optArgs[2].value.tag === "num") {
                    const result = BuiltinLib[6].body(optArgs[0].value.value, optArgs[1].value.value, optArgs[2].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            case "time": {
                const result = BuiltinLib[7].body();
                return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
            }
            // sleep does not need optimization
            case "int": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "bool") {
                    const result = BuiltinLib[9].body(optArgs[0].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            case "bool": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "num") {
                    const result = BuiltinLib[10].body(optArgs[0].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"bool", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            case "abs": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "num") {
                    const result = BuiltinLib[11].body(optArgs[0].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            case "min": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "num" && optArgs[1].tag === "literal" && optArgs[1].value.tag === "num") {
                    const result = BuiltinLib[12].body(optArgs[0].value.value, optArgs[1].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            case "max": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "num" && optArgs[1].tag === "literal" && optArgs[1].value.tag === "num") {
                    const result = BuiltinLib[13].body(optArgs[0].value.value, optArgs[1].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            case "pow": {
                if (optArgs[0].tag === "literal" && optArgs[0].value.tag === "num" && optArgs[1].tag === "literal" && optArgs[1].value.tag === "num") {
                    const result = BuiltinLib[14].body(optArgs[0].value.value, optArgs[1].value.value);
                    return { a: expr.a, tag: "literal", value: { a: expr.a, tag:"num", value:result } };
                } else {
                    return { ...expr, arguments: optArgs };
                }
            }
            default: {
                return { ...expr, arguments: optArgs };
            }
        }
    }
}

function optimizeStmt(stmt: Stmt<[Type, SourceLocation]>): Stmt<[Type, SourceLocation]> {
    switch (stmt.tag){
        case "assign":
            var optValue = optimizeExpr(stmt.value);
            if (stmt.name === "a" && optValue.tag === "call" && optValue.name === "max") {
                console.log("****", optValue.arguments[1]);
            }
            return {...stmt, value: optValue};
        case "expr":
            var optExpr = optimizeExpr(stmt.expr);
            return {...stmt, expr: optExpr};
        case "if":
            return {...stmt};
        case "return":
            var optValue = optimizeExpr(stmt.value);
            return {...stmt, value: optValue};
        case "while":
            var optCond = optimizeExpr(stmt.cond);
            var optBody = stmt.body.map(stmt => optimizeStmt(stmt));
            return {...stmt, cond: optCond, body: optBody};
        case "field-assign":
            var optValue = optimizeExpr(stmt.value);
            return {...stmt, value: optValue};
        default:
            return {...stmt};
    }
}

function foldBuiltin2(lsh: Literal<[Type, SourceLocation]>, rhs: Literal<[Type, SourceLocation]>, name: string): Literal<[Type, SourceLocation]> {
    switch (name) {
        case "max":
            if (lsh.tag === "num" && rhs.tag === "num") {
                var value = lsh.value;
                if (rhs.value > value) {
                    value = rhs.value;
                }
                return {tag: "num", value};
            }
            return {tag: "none"};
        case "min":
            if (lsh.tag === "num" && rhs.tag === "num") {
                var value = lsh.value;
                if (rhs.value < value) {
                    value = rhs.value;
                }
                return {tag: "num", value};
            }
            return {tag: "none"};
        case "pow":
            if (lsh.tag === "num" && rhs.tag === "num")
                return {tag: "num", value: lsh.value ** rhs.value};
            return {tag: "none"};
        default:
            return {tag: "none"};
    }
}

function foldBinop(lhs: Literal<[Type, SourceLocation]>, rhs: Literal<[Type, SourceLocation]>, op: BinOp): Literal<[Type, SourceLocation]>{
    switch(op) {
        case BinOp.Plus:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }  
            return {tag: "num", value: lhs.value + rhs.value, a: lhs.a};
        case BinOp.Minus:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }  
            return {tag: "num", value: lhs.value - rhs.value, a: rhs.a};
        case BinOp.Mul:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }  
            return {tag: "num", value: lhs.value * rhs.value, a: lhs.a};
        case BinOp.IDiv:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }  
            return {tag: "num", value: lhs.value / rhs.value, a: lhs.a};
        case BinOp.Mod:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }  
            return {tag: "num", value: lhs.value % rhs.value, a: lhs.a};
        case BinOp.Eq:
            if(lhs.tag === "none" || rhs.tag === "none" || lhs.tag === "TypeVar" || rhs.tag === "TypeVar"){
                return {tag: "bool", value: true};
            }  
            return {tag: "bool", value: lhs.value === rhs.value, a: [{tag: "bool"}, lhs.a[1]]};
        case BinOp.Neq:
            if(lhs.tag === "none" || rhs.tag === "none" || lhs.tag === "TypeVar" || rhs.tag === "TypeVar"){
                return {tag: "bool", value: false};
            }  
            return {tag: "bool", value: lhs.value !== rhs.value, a: [{tag: "bool"}, lhs.a[1]]};
        case BinOp.Lte:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }   
            return {tag: "bool", value: lhs.value <= rhs.value, a: [{tag: "bool"}, lhs.a[1]]};
        case BinOp.Gte:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }    
            return {tag: "bool", value: lhs.value >= rhs.value, a: [{tag: "bool"}, lhs.a[1]]};
        case BinOp.Lt:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }   
            return {tag: "bool", value: lhs.value < rhs.value, a: [{tag: "bool"}, lhs.a[1]]};
        case BinOp.Gt:
            if(lhs.tag !== "num" || rhs.tag !== "num"){
                return {tag: "none"};
            }  
            return {tag: "bool", value: lhs.value > rhs.value, a: [{tag: "bool"}, lhs.a[1]]};
        case BinOp.And:
            if(lhs.tag !== "bool" || rhs.tag !== "bool"){
                return {tag: "none"};
            }   
            return {tag: "bool", value: lhs.value && rhs.value, a: lhs.a};
        case BinOp.Or:
            if(lhs.tag !== "bool" || rhs.tag !== "bool"){
                return {tag: "none"};
            }  
            return {tag: "bool", value: lhs.value || rhs.value, a: lhs.a};
        default:
            return {tag: "none", a: lhs.a};
      }
}

function foldUniop(expr: Literal<[Type, SourceLocation]>, op: UniOp): Literal<[Type, SourceLocation]>{
    switch (op){
        case UniOp.Neg:
            if(expr.tag != "num"){
                return {tag: "none"};
            }
            return {tag: "num", value: -expr.value, a: expr.a};
        case UniOp.Not:
            if(expr.tag != "bool"){
                return {tag: "none"};
            }
            return {tag: "bool", value: !(expr.value), a: expr.a};
        default:
            return {tag: "none", a: expr.a};
    }
}

function DCEForControlFlow(stmts: Array<Stmt<[Type, SourceLocation]>>): Array<Stmt<[Type, SourceLocation]>> {
    var rstmts : Stmt<[Type, SourceLocation]>[] = [];
    for (var stmt of stmts) {
        switch(stmt.tag) {
            case "if":
                if (stmt.cond.tag === "literal" && stmt.cond.value.tag === "bool" && stmt.cond.value.value === true) {
                    if (stmt.thn === null) {
                        break;
                    }
                    const optStmts = DCEForControlFlow(stmt.thn);
                    for (var optStmt of optStmts) {
                        rstmts.push(optStmt)
                    }
                    isChanged = true;
                } else if(stmt.cond.tag === "literal" && stmt.cond.value.tag === "bool" && stmt.cond.value.value !== true) {
                    if (stmt.els === null) {
                        break;
                    }
                    const optStmts = DCEForControlFlow(stmt.els);
                    for (var optStmt of optStmts) {
                        rstmts.push(optStmt)
                    }
                    isChanged = true;
                } else {
                    const ifBody = DCEForControlFlow(stmt.thn);
                    const elseBody = DCEForControlFlow(stmt.els);
                    rstmts.push({...stmt, thn: ifBody, els: elseBody});
                }
                break;
            case "while": 
                if (stmt.tag === "while" && stmt.cond.tag === "literal" && stmt.cond.value.tag === "bool" && stmt.cond.value.value === false) {
                    isChanged = true;
                    rstmts.push({ a: [{tag: "none"}, stmt.a[1]], tag: "pass"});
                } else {
                    const newWhileBody = DCEForControlFlow(stmt.body);
                    rstmts.push({...stmt, body:newWhileBody});
                }
                break;
            default:
                rstmts.push(stmt);
        }
    }

    return rstmts;
}
