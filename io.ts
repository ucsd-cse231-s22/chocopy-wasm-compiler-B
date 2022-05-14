export const fileObjectDefinition : string = 
`class File(object):
    fd : int = 0          
    mode : int = 0
    closed : bool = False
    pointer : int = 0
    filelength : int = 0

    def __init__(self : File):
        pass
    
    def read(self : File) -> int:
        if self.mode != 0:
            print(44444)
            return -1
        else:
            pass
        if self.closed:
            print(33333)
            return -1
        else:
            pass
        return jsread(self.fd)
    
    def write(self : File, s : int) -> int:
        if self.mode != 1:
            print(77777)
            return -1
        else:
            pass
        if self.closed:
            print(66666)
            return -1
        else:
            pass
        return jswrite(self.fd, s)

    def tell(self : File) -> int:
        return self.pointer

    def seek(self : File, pos : int):
        if pos < 0:
            print(88888)
            return
        else:
            pass
        if pos >= self.filelength:
            print(55555)
            return
        else:
            pass
        self.pointer = pos
        
        
    def close(self : File):
        if self.closed:
            print(99999)
            print(self.closed)
            return
        else:
            pass
        jsclose(self.fd)
        self.closed = True

def open(mode : int) -> File:
    newFile : File = None
    newFile = File()
    newFile.fd = jsopen(mode)
    newFile.closed = False
    newFile.mode = mode
    return newFile

f : File = None
f = open(1)
f.write(1234)
f.close()
`

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

export function jswrite(fd : number, data: number) : number {
    const toWrite = String(data);
    return window.fs.writeSync(fd, toWrite); // returns the file length (assume clean file)
}

export function jsread(fd : number) : number {
    // the second argument is the number of characters to read at a time
    return Number(window.fs.readSync(fd, 1)[0]);
}

