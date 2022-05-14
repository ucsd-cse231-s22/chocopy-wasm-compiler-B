(module
  (memory (import "js" "mem") 1)
  (global $heap (mut i32) (i32.const 4))

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
    (local.get $addr))

  ;; Given an address handle, return the value at that address
  (func (export "load") (param $addr i32) (param $offset i32) (result i32)
    ;; compute new offset: (i32.add (local.get $offset) (i32.const 3))
    (i32.load (i32.add (local.get $addr) (i32.mul (i32.add (local.get $offset) (i32.const 3)) (i32.const 4)))))

  ;; Given an address handle and a new value, update the value at that adress to
  ;; that value
  (func (export "store") (param $addr i32) (param $offset i32) (param $val i32)
    ;; compute new offset: (i32.add (local.get $offset) (i32.const 3))
    (i32.store (i32.add (local.get $addr) (i32.mul (i32.add (local.get $offset) (i32.const 3)) (i32.const 4))) (local.get $val)))


  (func $get_refcount (export "get_refcount") (param $addr i32) (result i32)
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