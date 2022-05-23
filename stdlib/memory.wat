(module
  (import "console" "log" (func $log (param i32)))
  (memory (import "js" "mem") 1)
  (global $heap (mut i32) (i32.const 4))

  (func $encode_value (export "encode_value") (param $value i32) (param $is_pointer i32) (result i32)
    (local $new_value i32)
    ;; x shift to left and pad 0
    (local.get $value)
    (i32.const 1)
    (i32.shl)
    (local.set $new_value)
    ;; if it's a prim value, add 1 to lsb
    (local.get $is_pointer)
    (i32.const 0)
    (i32.eq)
    (if
      (then
          (local.get $new_value)
          (i32.const 1)
          (i32.add)
          (return)
      )
    )
    (local.get $new_value)
    (return)
  )

  (func $decode_value (export "decode_value") (param $value i32) (result i32)
    ;; just shift one bit to right
    (local.get $value)
    (i32.const 1)
    (i32.shr_s)
  )

  (func $value_is_pointer (export "value_is_pointer") (param $value i32) (result i32)
    (local.get $value) ;; the lsb of value is 1 means prim value; 0 means pointer
    (i32.const 1)
    (i32.and) ;; 1 means pointer; 0 means prim value
    (i32.const 0)
    (i32.eq)
  )

  ;; Take an amount of blocks (4-byte words) to allocate, return an address
  ;; handle suitable for giving to other access methods
  (func (export "alloc") (param $amount i32) (param $type i32) (result i32)
    (local $addr i32)
    (local.set $addr (global.get $heap))
    ;; store size header
    (i32.store (i32.add (local.get $addr) (i32.const 0)) (local.get $amount))
    ;; store type header
    (i32.store (i32.add (local.get $addr) (i32.const 4)) (local.get $type))
    ;; store ref_count
    (i32.store (i32.add (local.get $addr) (i32.const 8)) (i32.const 0))
    ;; store original data
    (global.set $heap (i32.add (global.get $heap) (i32.mul (i32.add (local.get $amount) (i32.const 3)) (i32.const 4))))
    (local.get $addr)
    (i32.const 1) ;; it's a pointer
    (call $encode_value)
  )

  ;; Given an address handle, return the value at that address
  (func (export "load") (param $addr i32) (param $offset i32) (result i32)
    (local $ret i32)
    ;; decode addr
    (local.get $addr)
    (call $decode_value)
    (local.set $addr)
    ;; compute new offset: (i32.add (local.get $offset) (i32.const 3))
    (i32.load (i32.add (local.get $addr) (i32.mul (i32.add (local.get $offset) (i32.const 3)) (i32.const 4))))
    (local.set $ret)
    (local.get $ret)
    (call $value_is_pointer)
    (if
      (then
        (local.get $ret)
        (return)
      )
      (else
        (local.get $ret)
        (call $decode_value)
        (return)
      )
    )
    (local.get $ret)
    (return)
  )

  ;; Given an address handle and a new value, update the value at that adress to
  ;; that value
  (func (export "store") (param $addr i32) (param $offset i32) (param $val i32)
    ;; compute new offset: (i32.add (local.get $offset) (i32.const 3))
    (local $target_addr i32)
    (local $pre_val i32)
    ;; decode addr
    (local.get $addr)
    (call $decode_value)
    (local.set $addr)
    ;; compute the field address
    (i32.add (local.get $addr) (i32.mul (i32.add (local.get $offset) (i32.const 3)) (i32.const 4)))
    (local.set $target_addr)
    ;; load the previous val
    (i32.load (local.get $target_addr))
    (local.set $pre_val)
    
    ;; dec the ref_count in previous val
    (local.get $pre_val)
    (call $dec_refcount)
    (drop) ;; drop the ret val of dec_refcount
    
    ;; store the new value
    (i32.store (local.get $target_addr) (local.get $val))

    ;; inc the ref_count of new val
    (local.get $val)
    (call $inc_refcount)
    (drop)    
  )

  (func $inc_refcount (export "inc_refcount") (param $addr i32) (result i32)
    (local $decoded_addr i32)
    (local $refcount_addr i32)
    ;; decode address
    (local.get $addr)
    (call $decode_value)
    (local.set $decoded_addr)
    ;; if it is not a pointer return directly
    (local.get $addr)
    (call $value_is_pointer)
    (i32.const 0)
    (i32.eq)
    (if
      (then
        (local.get $addr)
        (return)
      )
    )
    ;; now it's a address    
    (local.get $decoded_addr)
    (i32.const 0)
    (i32.ne)
    (if ;; if the $addr == 0, it's None, we don't need to do anything
      (then
        (local.set $refcount_addr (i32.add (local.get $decoded_addr) (i32.const 8)))
        (local.get $refcount_addr)
        (i32.add (i32.load (local.get $refcount_addr)) (i32.const 1))
        (i32.store)
      )
    )
    (local.get $addr)
    return
  )

  (func $dec_refcount (export "dec_refcount") (param $addr i32) (result i32)
    (local $decoded_addr i32)
    (local $refcount_addr i32)
    ;; decode address
    (local.get $addr)
    (call $decode_value)
    (local.set $decoded_addr)
    ;; if it is not a pointer return directly
    (local.get $addr)
    (call $value_is_pointer)
    (i32.const 0)
    (i32.eq)
    (if
      (then
        (local.get $addr)
        (return)
      )
    )
    ;; now it's a address    
    (local.get $decoded_addr)
    (i32.const 0)
    (i32.ne)
    (if ;; if the $addr == 0, it's None, we don't need to do anything
      (then
        (local.set $refcount_addr (i32.add (local.get $decoded_addr) (i32.const 8)))
        (local.get $refcount_addr)
        (i32.sub (i32.load (local.get $refcount_addr)) (i32.const 1))
        (i32.store)
      )
    )
    (local.get $addr)
    return
  )

  (func $get_size (export "get_size") (param $addr i32) (result i32)
    ;; decode address
    (local.get $addr)
    (call $decode_value)
    (local.set $addr)
    ;; load size
    (i32.load (i32.add (local.get $addr) (i32.const 0)))
  )

  (func $get_type (export "get_type") (param $addr i32) (result i32)
    ;; decode address
    (local.get $addr)
    (call $decode_value)
    (local.set $addr)
    ;; load type
    (i32.load (i32.add (local.get $addr) (i32.const 4)))
  )

  (func $get_refcount (export "get_refcount") (param $addr i32) (result i32)
    ;; decode address
    (local.get $addr)
    (call $decode_value)
    (local.set $addr)
    ;; load refcount
    (i32.load (i32.add (local.get $addr) (i32.const 8)))
  )

  (func (export "test_refcount") (param $addr i32) (param $n i32) (result i32)
    ;; get ref_count
    (local.get $addr)
    call $get_refcount
    (local.get $n)
    (i32.eq)
  )
)
