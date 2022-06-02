declare global {
    interface Window { 
        duplicated: any,
        fs: any
    }
}

export const fileObjectDefinition : string = 
`
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

class File(object):
    fd : int = 0          
    pointer : int = 0
    filelength : int = 0

    def __init__(self : File):
        pass
    
    def next(self : File) -> int:
        return self.read()
    
    def hasnext(self : File) -> bool:
        return self.pointer < self.filelength

    def read(self : File) -> int:
        res : int = 0
        if self.pointer == self.filelength:
            print(111)
            return res
        res = jsread(self.fd, self.pointer)
        self.pointer = self.pointer + 1
        return res

    def write(self : File, s : int) -> int:
        n : int = 0
        n = jswrite(self.fd, s, self.pointer)
        self.pointer = self.pointer + n
        self.filelength = max(self.filelength, self.pointer)
        return n

    def tell(self : File) -> int:
        return self.pointer

    def seek(self : File, pos : int):
        if pos < 0:
            print(222)
            return
        if pos >= self.filelength:
            print(333)
            return
        self.pointer = pos
        
    def close(self : File):
        jsclose(self.fd)

def open(mode : int) -> File:
    newFile : File = None
    newFile = File()
    newFile.fd = jsopen(mode)
    newFile.filelength = jslength(0)
    return newFile
`

export function jslength(dummy: number) : number {
    const fixed_path : string = "test.txt";
    var contents : string = window.fs.readFileSync(fixed_path, "utf8", "r");
    return contents.length;
}

export function jsopen(flag : number) : number {
    // fixed file path, until string is implemented
    const fixed_path : string = "test.txt";
    let flag_idx : string;
    switch(flag) {
        case 0:
            flag_idx = "r";
            break
        case 1: 
            flag_idx = "w";
            break
    }

    return window.fs.openSync(fixed_path, flag_idx);
}

export function jsclose(fd : number) : number {
    window.fs.closeSync(fd);
    return 0;
}

export function jswrite(fd : number, data: number, ptr: number) : number {
    const toWrite = String(data);
    return window.fs.writeSync(fd, toWrite, ptr);
}

export function jsread(fd : number, ptr: number) : number {
    // the second argument is the number of characters to read at a time
    return Number(window.fs.readSync(fd, 1, ptr)[0]);
}

