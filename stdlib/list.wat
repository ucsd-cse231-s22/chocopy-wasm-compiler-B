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

    (func (export "list$append") (param $self i32) (param $arg i32) (result i32)
        (local $len1 i32)
        (local $newLen i32)
        (local $addr1 i32)
        (local $newAddr i32)
        (local $i i32)
        (local $val i32)
        ;;set newLen and allocate new address
        (local.get $self)
        (i32.const 0)
        (call $load)
        (local.set $len1)
        (i32.add (local.get $len1) (i32.const 1))
        (local.set $newLen)
        (local.get $newLen)
        (call $alloc)
        (local.set $newAddr)

        ;;load original address
        (call $load (local.get $self) (i32.const 1))
        (local.set $addr1)
        (local.set $i (i32.const 0))
        (loop $loop1
            (call $load (local.get $addr1) (local.get $i))
            (local.set $val)

            (local.get $newAddr)
            (local.get $i)
            (local.get $val)
            (call $store)
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (i32.lt_s (local.get $i) (local.get $len1))
            br_if $loop1
        )
        (local.get $newAddr)
        (local.get $i)
        (local.get $arg)
        (call $store)

        (local.get $self)
        (i32.const 0)
        (local.get $newLen)
        (call $store)

        (local.get $self)
        (i32.const 1)
        (local.get $newAddr)
        (call $store)

        (local.get $self)
        (return)
    )
)