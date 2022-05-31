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

    def __init__(self : File):
        pass

    def read(self : File) -> int:
        return jsread(self.fd)

    def write(self : File, s : int) -> int:
        return jswrite(self.fd, s)

    def tell(self : File) -> int:
        return self.pointer

    def seek(self : File, pos : int):
        if pos < 0:
            print(88888)
            return
        if pos >= self.filelength:
            print(55555)
            return
        self.pointer = pos
        
    def close(self : File):
        jsclose(self.fd)

def open(mode : int) -> File:
    newFile : File = None
    newFile = File()
    newFile.fd = jsopen(mode)
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

