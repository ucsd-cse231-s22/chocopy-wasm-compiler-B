(module
    (memory (import "js" "mem") 1)
    (func $alloc (import "libmemory" "alloc") (param i32) (param i32) (result i32))
    (func $load (import "libmemory" "load") (param i32) (param i32) (result i32))
    (func $store (import "libmemory" "store") (param i32) (param i32) (param i32) (param i32))
    (func $print_num (import "imports" "print_num") (param i32) (result i32))

    (func $set$add (param $baseAddr i32) (param $key i32) (result i32)
        (local $nodePtr i32)
        (local $tagHitFlag i32)
        (local $$allocPointer i32)
        (local.set $baseAddr (i32.add (i32.const 12) (local.get $baseAddr))) ;; MM
        (i32.const 0)
        (local.set $tagHitFlag)
        (local.get $baseAddr)
        (local.get $key)
        (i32.const 10)
        (i32.rem_u)
        (i32.mul (i32.const 4))
        (i32.add)
        (i32.load)
        (i32.const 0)
        (i32.eq)
        (if
            (then
                (i32.const 2)   ;; size in bytes
                (i32.const 0)   ;; type information
                (call $alloc)
                (i32.add (i32.const 12)) ;; MM
                (local.tee $$allocPointer)
                (local.get $key)
                (i32.store)
                (local.get $$allocPointer)
                (i32.const 4)
                (i32.add)
                (i32.const 0)
                (i32.store)
                (local.get $baseAddr)
                (local.get $key)
                (i32.const 10)
                (i32.rem_u)
                (i32.mul (i32.const 4))
                (i32.add)
                (local.get $$allocPointer)
                (i32.store)
            )
            (else
                (local.get $baseAddr)
                (local.get $key)
                (i32.const 10)
                (i32.rem_u)
                (i32.mul (i32.const 4))
                (i32.add)
                (i32.load)
                (i32.load)
                (local.get $key)
                (i32.eq)
                (if
                    (then
                    (i32.const 1)
                    (local.set $tagHitFlag)
                    )
                )
                (local.get $baseAddr)
                (local.get $key)
                (i32.const 10)
                (i32.rem_u)
                (i32.mul (i32.const 4))
                (i32.add)
                (i32.load)
                (i32.const 4)
                (i32.add)
                (local.set $nodePtr)
                (block
                    (loop
                        (local.get $nodePtr)
                        (i32.load)
                        (i32.const 0)
                        (i32.ne)
                        (if
                            (then
                            (local.get $nodePtr)
                            (i32.load)
                            (i32.load)
                            (local.get $key)
                            (i32.eq)
                            (if
                                (then
                                (i32.const 1)
                                (local.set $tagHitFlag)
                                )
                            )
                            (local.get $nodePtr)
                            (i32.load)
                            (i32.const 4)
                            (i32.add)
                            (local.set $nodePtr)
                            )
                        )
                        (br_if 0
                            (local.get $nodePtr)
                            (i32.load)
                            (i32.const 0)
                            (i32.ne)
                        )
                        (br 1)
                    )
                )
                (local.get $tagHitFlag)
                (i32.const 0)
                (i32.eq)
                (if
                    (then
                        (i32.const 2)   ;; size in bytes
                        (i32.const 0)   ;; type info
                        (call $alloc)
                        (i32.add (i32.const 12)) ;; MM
                        (local.tee $$allocPointer)
                        (local.get $key)
                        (i32.store)
                        (local.get $$allocPointer)
                        (i32.const 4)
                        (i32.add)
                        (i32.const 0)
                        (i32.store)
                        (local.get $nodePtr)
                        (local.get $$allocPointer)
                        (i32.store)
                    )
                )
            )
        )
        (i32.const 0)
        (return)
    )
    (export "set$add" (func $set$add))

    (func (export "set$contains") (param $baseAddr i32) (param $key i32) (result i32)
        (local $nodePtr i32)
        (local $tagHitFlag i32)
        (local $$allocPointer i32)
        ;; MM
        ;; (local.set $baseAddr (i32.add (i32.const 12) (local.get $baseAddr)))
        (i32.const 0)
        (local.set $tagHitFlag)
        (local.get $baseAddr)
        (local.get $key)
        (i32.const 10)
        (i32.rem_u)
        (call $load)
        (i32.const 0)
        (i32.eq)
        (if
            (then
            )
            (else
                (local.get $baseAddr)
                (local.get $key)
                (i32.const 10)
                (i32.rem_u)
                (call $load)
                (i32.load)
                (local.get $key)
                (i32.eq)
                (if
                    (then
                        (i32.const 1)
                        (local.set $tagHitFlag)
                    )
                )
                (local.get $baseAddr)
                (local.get $key)
                (i32.const 10)
                (i32.rem_u)
                (call $load)
                (i32.const 4)
                (i32.add)
                (local.set $nodePtr)
                (block
                    (loop
                        (local.get $nodePtr)
                        (i32.load)
                        (i32.const 0)
                        (i32.ne)
                        (if
                            (then
                                (local.get $nodePtr)
                                (i32.load)
                                (i32.load)
                                (local.get $key)
                                (i32.eq)
                                (if
                                    (then
                                        (i32.const 1)
                                        (local.set $tagHitFlag)
                                    )
                                )
                                (local.get $nodePtr)
                                (i32.load)
                                (i32.const 4)
                                (i32.add)
                                (local.set $nodePtr)
                            )
                        )
                        (br_if 0
                            (local.get $nodePtr)
                            (i32.load)
                            (i32.const 0)
                            (i32.ne)
                        )
                        (br 1)
                    )
                )
            )
        )
        (local.get $tagHitFlag)
        (return)
    )

    (func (export "set$length") (param $baseAddr i32) (result i32)
        (local $length i32)
        (local $nodePtr i32)
        (local $i i32)
        (loop $my_loop
            (local.get $baseAddr)
            (local.get $i)
            (call $load)
            (i32.const 0)
            (i32.eq)
            (if
                (then
                )
                (else
                    (i32.const 1)
                    (local.get $length)
                    (i32.add)
                    (local.set $length)
                    (local.get $baseAddr)
                    (local.get $i)
                    (call $load)
                    (i32.const 4)
                    (i32.add)
                    (local.set $nodePtr)
                    (block
                        (loop
                            (local.get $nodePtr)
                            (i32.load)
                            (i32.const 0)
                            (i32.ne)
                            (if
                                (then
                                    (local.get $length)
                                    (i32.const 1)
                                    (i32.add)
                                    (local.set $length)
                                    (local.get $nodePtr)
                                    (i32.load)
                                    (i32.const 4)
                                    (i32.add)
                                    (local.set $nodePtr)
                                )
                            )
                            (br_if 0
                                (local.get $nodePtr)
                                (i32.load)
                                (i32.const 0)
                                (i32.ne)
                            )
                            (br 1)
                        )
                    )
                )
            )
            (local.get $i)
            (i32.const 1)
            (i32.add)
            (local.set $i)
            (local.get $i)
            (i32.const 10)
            (i32.lt_s)
            (br_if $my_loop)
        )
        (local.get $length)
        (return)
    )

    (func (export "set$remove") (param $baseAddr i32) (param $key i32) (result i32)
        (local $prevPtr i32)
        (local $currPtr i32)

        (local.set $baseAddr (i32.add (i32.const 12) (local.get $baseAddr))) ;; MM

        (local.get $baseAddr)
        (local.get $key)
        (i32.const 10)
        (i32.rem_u)
        (i32.mul (i32.const 4))
        (i32.add)
        (local.tee $prevPtr)
        (i32.load)
        (i32.const 0)
        (i32.ne)
        ;; if the matched bucket is NOT empty
        (if
            (then
                ;; currPtr = *prevPtr
                (i32.load (local.get $prevPtr) )
                (local.set $currPtr)

                (block $bucket
                    (loop
                        (local.get $currPtr)
                        (i32.load)
                        (local.get $key)
                        (i32.eq)
                        ;; if *currPtr == key
                        (if
                            (then
                                (local.get $prevPtr) ;; addr
                                (i32.add (local.get $currPtr) (i32.const 4) )
                                (i32.load) ;; addr value to store in prevPtr
                                (i32.store)
                                ;; find match ==> do removal + update next ptr => exit loop
                                (br $bucket)
                            )
                            (else
                                ;; prevPtr = currPtr + 4
                                (i32.add (local.get $currPtr) (i32.const 4) )
                                (local.tee $prevPtr)
                                ;; currPtr = *(new prevPtr)
                                (i32.load)
                                (local.set $currPtr)
                            )
                        )
                        (br_if 0
                            (local.get $currPtr)
                            (i32.const 0)
                            (i32.ne)
                        )
                    )
                )
            )
        )
        ;; if the item to be removed is NOT found => return -1
        (i32.const -1)
        (return)
    )

    (func (export "set$print") (param $baseAddr i32) (result i32)
        (local $length i32)
        (local $nodePtr i32)
        (local $i i32)
        (local $temp i32)
        (loop $my_loop
            (local.get $baseAddr)
            (local.get $i)
            (call $load)
            (i32.const 0)
            (i32.eq)
            (if
                (then
                )
                (else
                    (i32.const 1)
                    (local.get $length)
                    (i32.add)
                    (local.set $length)
                    (local.get $baseAddr)
                    (local.get $i)
                    (call $load)
                    (i32.load)
                    (call $print_num)  ;; assume num for now
                    (local.set $temp)
                    (local.get $baseAddr)
                    (local.get $i)
                    (call $load)
                    (i32.const 4)
                    (i32.add)
                    (local.set $nodePtr)
                    (block
                        (loop
                            (local.get $nodePtr)
                            (i32.load)
                            (i32.const 0)
                            (i32.ne)
                            (if
                                (then
                                    (local.get $length)
                                    (i32.const 1)
                                    (i32.add)
                                    (local.set $length)

                                    (local.get $nodePtr)
                                    (i32.load)
                                    (i32.load)
                                    (call $print_num)
                                    (local.set $temp)
                                    (local.get $nodePtr)
                                    (i32.load)
                                    (i32.const 4)
                                    (i32.add)
                                    (local.set $nodePtr)
                                )
                            )
                            (br_if 0
                                (local.get $nodePtr)
                                (i32.load)
                                (i32.const 0)
                                (i32.ne)
                            )
                            (br 1)
                        )
                    )
                )
            )
            (local.get $i)
            (i32.const 1)
            (i32.add)
            (local.set $i)
            (local.get $i)
            (i32.const 10)
            (i32.lt_s)
            (br_if $my_loop)
        )
        (local.get $length)
        (return)
    )

    (func (export "set$clear") (param $baseAddr i32) (result i32)
        (local $i i32)
        (local.set $baseAddr (i32.add (i32.const 12) (local.get $baseAddr))) ;; MM
        (loop $my_loop
            ;; *(baseAddr + 4*i) = 0
            (local.get $baseAddr)
            (local.get $i)
            (i32.mul (i32.const 4))
            (i32.add)
            (i32.const 0)
            (i32.store)
            ;; i++
            (local.get $i)
            (i32.const 1)
            (i32.add)
            (local.set $i)
            ;; if i < 10: next iteration
            (local.get $i)
            (i32.const 10)
            (i32.lt_s)
            (br_if $my_loop)
        )
        (i32.const 0)
        (return)
    )

    (func (export "set$update") (param $newAddr i32) (param $baseAddr i32) (result i32)
        (local $nodePtr i32)
        (local $i i32)
        (local $temp i32)
        (loop $my_loop
            (local.get $baseAddr)
            (local.get $i)
            (call $load)
            (i32.const 0)
            (i32.eq)
            (if
                (then
                )
                (else
                    (local.get $newAddr)
                    (local.get $baseAddr)
                    (local.get $i)
                    (call $load)
                    (i32.load)
                    (call $set$add)
                    (local.set $temp)
                    (local.get $baseAddr)
                    (local.get $i)
                    (call $load)
                    (i32.const 4)
                    (i32.add)
                    (local.set $nodePtr)
                    (block
                        (loop
                            (local.get $nodePtr)
                            (i32.load)
                            (i32.const 0)
                            (i32.ne)
                            (if
                                (then
                                    (local.get $newAddr)
                                    (local.get $nodePtr)
                                    (i32.load)
                                    (i32.load)
                                    (call $set$add)
                                    (local.set $temp)
                                    (local.get $nodePtr)
                                    (i32.load)
                                    (i32.const 4)
                                    (i32.add)
                                    (local.set $nodePtr)
                                )
                            )
                            (br_if 0
                                (local.get $nodePtr)
                                (i32.load)
                                (i32.const 0)
                                (i32.ne)
                            )
                            (br 1)
                        )
                    )
                )
            )
            (local.get $i)
            (i32.const 1)
            (i32.add)
            (local.set $i)
            (local.get $i)
            (i32.const 10)
            (i32.lt_s)
            (br_if $my_loop)
        )
        (local.get $temp)
        (return)
    )

    ;; Return the first item of the bucket of the smallest index that's non-empty
    (func (export "set$firstItem") (param $baseAddr i32) (result i32)
        (local $i i32)
        (local $valueAddrHolder i32)
        (local.set $i (i32.const 0))

        (loop
            (local.get $baseAddr)
            (local.get $i)
            (call $load)
            (local.tee $valueAddrHolder)
            (i32.const 0)
            (i32.ne)
            (if
                (then
                    (i32.load (local.get $valueAddrHolder))
                    (return)
                )
            )
            ;; i++ ==> CANNOT be put in (else ...)
            (local.set $i (i32.add (local.get $i) (i32.const 1)) )
            (local.get $i)
            (i32.const 10)
            (i32.lt_s)
            (br_if 0)
        )
        ;; if set is empty: return -1 (temporary solution)
        (i32.const -1)
        (return)
    )

    ;; Check if currKey is the "last" item in the set
    (func (export "set$hasnext") (param $baseAddr i32) (param $currKey i32) (result i32)
        (local $i i32)
        (local $valueAddrHolder i32)
        (local $lastItem i32)
        ;; i = 9
        (local.set $i (i32.const 9))

        (loop $reverseLoop
            (local.get $baseAddr)
            (local.get $i)
            (call $load)
            (local.tee $valueAddrHolder)
            (i32.const 0)
            (i32.ne)
            ;; if bucket i is NOT empty
            (if
                (then
                    (loop
                        (i32.load (local.get $valueAddrHolder))
                        (local.set $lastItem)
                        (i32.load (i32.add (local.get $valueAddrHolder) (i32.const 4)) )
                        (local.tee $valueAddrHolder)
                        (i32.const 0)
                        (i32.ne)
                        (br_if 0)
                    )
                    (local.get $lastItem)
                    (local.get $currKey)
                    (i32.ne)
                    (return)
                )
                (else
                    ;; i--
                    (local.set $i (i32.sub (local.get $i) (i32.const 1)))
                    (local.get $i)
                    (i32.const 0)
                    (i32.ge_s)
                    ;; if i >=0: next iteration
                    (br_if $reverseLoop)
                )
            )
        )
        ;; if reached here: all buckets in set is empty =>hasnext return False
        (i32.const 0)
        (return)
    )

    ;; Return the next item in the set given the current item
    (func (export "set$next") (param $baseAddr i32) (param $currKey i32) (result i32)
        (local $i i32)
        (local $valueAddrHolder i32)

        (local.get $baseAddr)
        (local.get $currKey)
        (i32.const 10)
        (i32.rem_u)
        (local.tee $i) ;; locate which bucket currKey is in
        (call $load)
        (local.set $valueAddrHolder)

        (loop
            (i32.load (local.get $valueAddrHolder))
            (local.get $currKey)
            (i32.eq)
            ;; if this item == currKey
            (if
                (then
                    ;; Check if currKey is the last item in the bucket
                    (i32.add (local.get $valueAddrHolder) (i32.const 4) )
                    (i32.load)
                    (local.tee $valueAddrHolder)
                    (i32.eqz)
                    ;; if currKey.next = null => return 1st item of bucket i+1 (assuming it won't go out of bound)
                    (if
                        (then
                            ;; next non-empty bucket's 1st item
                            (loop
                                (local.get $i)
                                (i32.const 9)
                                (i32.ge_s)
                                ;; if this is the last item in the (last) 9th bucket => return -1
                                (if
                                    (then
                                        (i32.const -1)
                                        (return)
                                    )
                                )
                                (local.get $baseAddr)
                                (i32.add (local.get $i) (i32.const 1) )
                                (local.tee $i) ;; i = i + 1
                                (call $load)
                                (local.tee $valueAddrHolder)
                                (i32.const 0)
                                (i32.ne)
                                (if
                                    (then
                                        (i32.load (local.get $valueAddrHolder) )
                                        (return)
                                    )
                                )
                                (br 0) ;; continue bucket-loop
                            )
                        )
                        ;; if currKey.next is valid
                        (else
                            (i32.load (local.get $valueAddrHolder) )
                            (return)
                        )
                    )
                )
            )
            ;; Advance $valueAddrHolder
            (i32.add (local.get $valueAddrHolder) (i32.const 4))
            (i32.load)
            (local.tee $valueAddrHolder)
            (i32.const 0)
            (i32.ne)
            ;; if currItem.next != null ==> continue loop
            (br_if 0)
        )
        ;; Return -1 just for make sets.wat to compile => shouldn't be reached
        (i32.const -1)
        (return)
    )
)
