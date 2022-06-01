(module
    (memory (import "js" "mem") 1)
    (func $assert_not_none (import "imports" "assert_not_none") (param i32) (result i32))
    (func $alloc (import "libmemory" "alloc") (param i32) (result i32))
    (func $load (import "libmemory" "load") (param i32) (param i32) (result i32))
    (func $store (import "libmemory" "store") (param i32) (param i32) (param i32))

    
    (func (export "list$length") (param $self i32) (result i32)
        (local.get $self)
        (call $assert_not_none)
        (i32.const 0)
        (call $load)
        (return)
    )

    
)