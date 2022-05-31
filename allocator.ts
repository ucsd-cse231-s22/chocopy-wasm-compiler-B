import { start } from "repl";

export type Block = {start: number, size: number};

function compare_block(block1: Block, block2: Block){
    if(block1.start < block2.start){
        return -1;
    }
    if(block2.start > block2.start){
        return 1;
    }
    if(block2.start == block1.start){
        throw new Error("MemoryManagement Error: two memory pieces.")
    }
}

function print_block(block: Block){
    return `block ${block.start}-${block.start+block.size}`;
}

function insert_block(block1: Block, block2: Block, block3: Block): Array<Block> {
    const ret_blocks: Array<Block> = [];
    if(block1 !== undefined){
        if(block1.start + block1.size == block2.start){
            block2.start = block1.start;
            block2.size = block1.size + block2.size;
        } else {
            ret_blocks.push(block1);
        }
    }
    if(block3 !== undefined){
        if(block2.start + block2.size == block3.start){
            block2.size = block2.size + block3.size;
            ret_blocks.push(block2);
        } else {
            ret_blocks.push(block2);
            ret_blocks.push(block3);
        }
    } else {
        ret_blocks.push(block2);
    }
    return ret_blocks;
}

function getActualSize(size: number){
    return (size + 3) * 4;
}

export class FreeList {
    free_blocks: Array<Block>;

    constructor(max_byte: number){
        this.free_blocks = [];
        this.free_blocks.push({start: 4, size: max_byte - 4});
    }

    alloc(size: number): number{
        size = getActualSize(size);
        const new_free_blocks: Array<Block> = [];
        let addr: number = 0;
        this.free_blocks.forEach(block => {
            if(addr != 0 || block.size < size){
                new_free_blocks.push(block);
            } else {
                if(block.size > size){
                    new_free_blocks.push({start: block.start+size, size: block.size-size});
                }
                addr = block.start;
            }
        });
        if(addr == 0){
            // throw new Error("Out of memory.");
        }
        this.free_blocks = new_free_blocks;
        console.log(`Alloc ${size} byte: ${addr}-${addr+size}`);
        this.free_blocks.forEach(block =>{
            console.log(print_block(block));
        })
        return addr;
    }

    free(addr: number, size: number){
        size = getActualSize(size);
        const block = {start: addr, size: size};
        this.free_blocks.push(block);
        const sorted_blocks = this.free_blocks.sort(compare_block);
        var new_free_blocks: Array<Block> = [];
        const i = sorted_blocks.indexOf(block);
        if(i == 0){
            new_free_blocks = [
                ...insert_block(undefined, sorted_blocks[0], sorted_blocks[1]),
                ...sorted_blocks.slice(2)
            ];
        } else if(i == sorted_blocks.length - 1){
            new_free_blocks = [
                ...sorted_blocks.slice(0, -2),
                ...insert_block(sorted_blocks[-2], sorted_blocks[-1], undefined),
            ]
        } else {
            new_free_blocks = [
                ...sorted_blocks.slice(0, i-1),
                ...insert_block(sorted_blocks[i-1], sorted_blocks[i], sorted_blocks[i+1]),
                ...sorted_blocks.slice(i+2)
            ]
        }
        this.free_blocks = new_free_blocks;
        console.log(`Free ${size} byte: ${addr}-${addr+size}`);
        this.free_blocks.forEach(block =>{
            console.log(print_block(block));
        })
    }
}