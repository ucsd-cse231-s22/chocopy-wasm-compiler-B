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

    (func (export "list$slice") (param $self i32) (param $start i32) (param $end i32) (param $steps i32) (result i32)
        (local $newList i32)
        (local $newListLength i32)
        (local $newListElements i32)
        (local $selfLength i32)
        (local $i i32)
        (local $oldListElements i32)
        (local $currVal i32)
        (local $diff i32)
        (local $temp i32)
        ;; get the length of the self string
        (local.get $self)
        (i32.const 0)
        (call $load)
        (local.set $selfLength)
        ;; check whether the start_index is negative
        (i32.gt_s (i32.const 0) (local.get $start))
        (if
        (then
            (i32.add (local.get $start) (local.get $selfLength))
            (local.set $start)
        )
        )
        ;; check if we should shift start_index to 0 if it's still negative
        (i32.gt_s (i32.const 0) (local.get $start))
        (if
        (then
            (i32.const 0)
            (local.set $start)
        )
        )
        ;; check whether the end_index is negative
        (i32.gt_s (i32.const 0) (local.get $end))
        (if
        (then
            (i32.add (local.get $end) (local.get $selfLength))
            (local.set $end)
        )
        )
        ;; check if start greater than end
        (i32.ge_u (local.get $start) (local.get $end))
        (if
        (then
            (i32.const 2)
            (call $alloc)
            (local.set $newList)
            (local.get $newList)
            (i32.const 0)
            (i32.const 0)
            call $store
            (i32.const 0)
            call $alloc
            (local.set $newListElements)
            (local.get $newList)
            (i32.const 1)
            (local.get $newListElements)
            call $store
            (local.get $newList)
            (return)
        )
        )
        ;; check if end greater than length of self
        (i32.gt_u (local.get $end) (local.get $selfLength))
        (if
        (then
            (local.get $selfLength)
            (local.set $end)
        )
        )
        ;; calculate the length of newList
        (i32.sub (i32.sub (local.get $end) (local.get $start)) (i32.const 1))
        (local.set $temp)
        (i32.add (i32.div_u (local.get $temp) (local.get $steps)) (i32.const 1))
        (local.set $newListLength)
        ;; allocate the memory heap of newList
        (i32.const 2)
        (call $alloc)
        (local.set $newList)
        (local.get $newList)
        (i32.const 0)
        (local.get $newListLength)
        (call $store)
        (local.get $newListLength)
        (call $alloc)
        (local.set $newListElements)
        (local.get $newList)
        (i32.const 1)
        (local.get $newListElements)
        (call $store)
        ;;set count i and start the while loop
        (i32.const 0)
        (local.set $i)
        (local.get $self)
        (i32.const 1)
        (call $load)
        (local.set $oldListElements)
        ;; (i32.mul (local.get $i) (local.get $steps))
        ;; (i32.add (i32.mul (local.get $i) (local.get $steps)) (local.get $start))
        (loop $my_loop
            (local.get $oldListElements)
            (local.get $i)
            (local.get $steps)
            (i32.mul)
            (call $load)
            (local.set $currVal)
            (local.get $newListElements)
            (local.get $i)
            (local.get $currVal)
            (call $store)
            (local.set $i (i32.add (i32.const 1) (local.get $i)))
            (i32.lt_u (local.get $i) (local.get $newListLength))
            br_if $my_loop
        )

        (local.get $newList)
        (return)
    )
)