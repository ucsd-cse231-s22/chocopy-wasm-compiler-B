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
        self.closed = True
`

export function open(flag : number) : number {
    // fixed file path, until string is implemented
    const fixed_path : string = "test.txt";
    let flag_idx : string;
    switch(flag) {
        case 0: flag_idx = "r";
        case 1: flag_idx = "w";
    }
    return window.fs.openSync(fixed_path, flag_idx);
}

export function close(fd : number) {
    window.fs.closeSync(fd);
}

