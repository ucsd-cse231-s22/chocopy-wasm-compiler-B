export const fileObjectDefinition : string = `
class File(object):
    fd : int = 0
    mode : int = 0
    closed : bool = False
    pointer : int = 0
    filelength : int = 0

    def __init__(self : File):
        pass
    
    def read(self : File) -> int:
        return 0
    
    def write(self : File, s : int) -> int:
        return 0

    def tell(self : File) -> int:
        return 0

    def seek(self : File, pos : int):
        pass
        
    def close(self : File):
        if self.closed:
            print(99999)
            return
        jsclose(self.fd)
        self.closed = True

def open(mode : int) -> File:
    newFile : File = None
    newFile = File()
    newFile.fd = jsopen(mode)
    newFile.closed = False
    newFile.mode = mode
    return newFile
`

export function jsopen(flag : number) : number {
    // fixed file path, until string is implemented
    const fixed_path : string = "test.txt";
    let flag_idx : string;
    switch(flag) {
        case 0: flag_idx = "r";
        case 1: flag_idx = "w";
    }

    console.log(typeof window.fs)

    return window.fs.openSync(fixed_path, flag_idx);
}

export function jsclose(fd : number) : number {
    window.fs.closeSync(fd);
    return 0;
}

export function jsRead(fd : number) : number {
    return 0;
}

