declare global {
    interface Window { 
        duplicated: any,
        fs: any
    }
}

export const fileObjectDefinition : string = 
`
class File(object):
    fd : int = 0          
    pointer : int = 0
    filelength : int = 0
    mode : str = 'r'

    def __init__(self : File):
        pass

    def read(self : File) -> str:
        res : str = ''
        if self.pointer == self.filelength:
            print("Error: EOF reached")
        res.s = jsread(self.fd, self.pointer)
        self.pointer = self.pointer + 1
        return res

    def write(self : File, s : str) -> int:
        n : int = 0
        n = jswrite(self.fd, s.s, self.pointer)
        self.pointer = self.pointer + n
        self.filelength = max(self.filelength, self.pointer)
        return n

    def tell(self : File) -> int:
        return self.pointer

    def seek(self : File, pos : int):
        if pos < 0:
            print("Error: seek() out of bounds")
            return
        if pos >= self.filelength:
            print("Error: seek() out of bounds")
            return
        self.pointer = pos
        
    def close(self : File) -> int:
        return jsclose(self.fd)

def open(mode : str) -> File:
    newFile : File = None
    newFile = File()
    newFile.mode = mode
    newFile.fd = jsopen(mode.s)
    newFile.filelength = -get length of newly opened file through js call?-
    return newFile

f : File = None
f = open(1)
f.write(1234)
f.close()
`
//need to set filelength of file if opening to read
//does fs.read,write,seek,close handle errors?

export function jsopen(filename : string, flag : string) : number {
    switch(flag) {
        case "r":
            break;
        case "w":
            break;
        default:
            throw new Error("Error: invalid file flag");
    }

    return window.fs.openSync(filename, flag);
}

export function jsclose(fd : number) : number {
    window.fs.closeSync(fd);
    return 0;
}

export function jswrite(fd : number, data: string, ptr : number) : number {
    // which arg of writeSync does ptr go into
    return window.fs.writeSync(fd, data); // returns the file length (assume clean file)
}

export function jsread(fd : number, ptr : number) : string {
    // the second argument is the number of characters to read at a time
    // return Number(window.fs.readSync(fd, 1)[0]);
    // which arg of readSync does ptr go into
    return window.fs.readSync(fd,1)[0];
}

