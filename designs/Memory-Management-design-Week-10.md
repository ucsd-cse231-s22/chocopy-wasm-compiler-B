# Memory management design: Week 10
In week-10, we make some big changes to compiler B. I will introduce the idea via several questions:
 1. How to count the reference? Why do we need the type information?
 2. How to allocate in memory? 
 3. How to free the memory? 
## How to count the reference? Why do we need the type information?
Let me introduce the reference counting rules:
### 0. Do nothing on `None`
Since the address starts from 4, we won't do any inc/dec ref count on `None(0)`.
### 1. Assign `a = b`
We need to know `a` or `b` is a pointer or not. So we will search `a` in the `local` set or in the `global` set. If it's a `class` or `none`, we will inc/dec their ref count.

There are two pointers related to the assign stmt. The old pointer stored in `a`, and the new pointer stored in `b`. We will first decrease the ref count of `a`, then increase the ref count of `b`.

### 2. Store `c.x = val`
In current IR, we will lower this stmt to `store(start, offset, value)`. In this case, if the field `x` of `c` is `Class` type, we need to decrease the ref count of `c.x` first, then increase the ref count `val`.

But we cannot get the typo info based on `start` and `offset`, since we don't have Class->field Map in `GlobalEnv`. So we need to rely on the type info in `val`. We implement a function called `valueIsPointer` in `memory_management.ts` that tells us the `val` is pointer or not.

### 3. In the function call `f(a, b, c)`
We increase param's ref count in the begining of the function; decrease param's ref count before each `return` stmt. We will also decrease the ref count of local variable before each `return` stmt. If there is no `return`, we will insert at the end of the function.

In the implement, we will insert `(call $inc_refcount)` and `(call $dec_refcount)` in the function body.

### 4. When a class is freed
When we are going to free a class, we will visit all its fields. If the field is a pointer, we will decrease its ref count, since it losts one reference. But how do we know this field is a pointer or a primitive value? Notice that, now it's in the runtime memory. 

Our solution is to use the lsb(least significant bit) in every `i32`. If the lsb = 1, it is a primitive value; lsb = 0, it's a pointer. However, it's not good to change all the backend, so we made a decision. When we store a value to the memory, we need to encode it, i.e, shift left 1 bit and record the info in the lsb. This function is named as `$encode_value`. When we `$load` some value from the memory, before we return the value, we will `$decode_value`.

<!-- But when we are doing codegen for `call` expr, we don't know the type of the arguments, since we don't have a Func->Param Type map in `GlobalEnv`. We cannot know which arg is a pointer and whose ref count should be modified. -->

## How to allocate in memory? 
### 1. A freelist allocator
We implement a freelist allocator in `allocator.ts`. The two most important function is `alloc(size)` and `free(addr, size)`. It will split the free block in `alloc(size)` and merge the free blocks in `free(addr, size)`.

### 2. `$alloc` in `memory.wat`
In `memory.wat`, `$alloc` will firstly call `alloc(size)` to get the start address of the memory piece. Then it will write size info/type info/ref count info as the header of the object. Before returning the address, it will clean up all the rest of the memory piece, i.e., put 0s in the fields of the object.

## How to free the memory
### 1. `$free_no_ref` in `memory.wat`
This function will check the value is a pointer or not, then check its ref count. If the ref count is 0, we will free it.

In the most cases, we will call `$free_no_ref` after `$dec_refcount`. 




