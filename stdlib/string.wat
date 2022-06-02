(module
  (memory (import "js" "mem") 1)
  (func $assert_not_none (import "imports" "assert_not_none") (param i32) (result i32))
  (func $index_out_of_bounds (import "imports" "index_out_of_bounds") (param i32) (param i32) (param i32) (param i32) (result i32))
  (func $alloc (import "libmemory" "alloc") (param i32) (result i32))
  (func $load (import "libmemory" "load") (param i32) (param i32) (result i32))
  (func $store (import "libmemory" "store") (param i32) (param i32) (param i32))
  (func (export "str$access") (param $self i32) (param $index i32) (param $line i32) (param $col i32) (result i32)
    (local $newstr i32)
    (local $buffer i32)
    (local $selfLength i32)
    (local.get $self)
    (i32.const 0)
    (call $load)
    (local.set $selfLength)
    (i32.gt_s (i32.const 0) (local.get $index))
    (if
      (then
        (i32.add (local.get $index) (local.get $selfLength))
        (local.set $index)
      )
    )
    ;; check if index is out of range
    (local.get $selfLength)
    (local.get $index)
    (local.get $line)
    (local.get $col)
    (call $index_out_of_bounds)
    (local.set $newstr) ;; just scraping up the return
    ;; alloc space for new string and set 1 as length
    (i32.const 2)
    (call $alloc)
    (local.set $newstr)
    (local.get $newstr)
    (i32.const 0) ;;as
    (i32.const 1)
    (call $store)
    ;; get char from self and set it as the string for new string
    (i32.add (local.get $index) (local.get $self))
    (i32.const 1)
    (call $load)
    (local.set $buffer)
    (local.get $newstr)
    (i32.const 1)
    (local.get $buffer)
    (call $store)
    (local.get $newstr)
    (return))
  (func (export "str$length") (param $self i32) (result i32)
      (local.get $self)
      (call $assert_not_none)
      (i32.const 0)
      (call $load) ;; load the length of the string
      (return))
  (func (export "str$lessthan") (param $self i32) (param $rhs i32) (result i32)
      (local $selfLength i32)
      (local $i i32)
      (local.get $self)
      (i32.load)
      (local.set $selfLength)
      (i32.const 1)
      (local.set $i)
      (block 
          (loop 
              (br_if 1 (i32.le_s (local.get $i) (local.get $selfLength) )(i32.eqz) )
              (i32.load (i32.add (local.get $self) (local.get $i)))
              (i32.load (i32.add (local.get $rhs) (local.get $i)))
              (i32.gt_s)  ;;return false if l >= r
              (if (then (i32.const 0) (return)))
              (i32.add (local.get $i) (i32.const 1))(local.set $i)
              (br 0)
          )
      ) ;;end block and loop otherwise return 1
      (i32.const 1)
      (return))
  (func (export "str$greaterthan") (param $self i32) (param $rhs i32) (result i32)
      (local $selfLength i32)
      (local $rhsLength i32)
      (local $i i32)
      (local.get $self)
      (i32.load)
      (local.set $selfLength)
      
      (i32.const 1)
      (local.set $i)
      (block 
          (loop 
              (br_if 1 (i32.le_s (local.get $i) (local.get $selfLength) )(i32.eqz) )
              (i32.load (i32.add (local.get $self) (local.get $i)))
              (i32.load (i32.add (local.get $rhs) (local.get $i)))
              (i32.lt_s)  ;;return false if l < r
              (if (then (i32.const 0) (return)))
              (i32.add (local.get $i) (i32.const 1))(local.set $i)
              (br 0)
          )
      ) ;;end block and loop otherwise return 1
      (i32.const 1)
      (return))
  (func (export "str$equalsto") (param $self i32) (param $rhs i32) (result i32)
      (local $selfLength i32)
      (local $rhsLength i32)
      (local $i i32)
      (local.get $self)
      (i32.load)
      (local.set $selfLength)
      (local.get $rhs)
      (i32.load)
      (local.set $rhsLength)
      (i32.ne (local.get $selfLength) (local.get $rhsLength))
      (if
        (then
          i32.const 0
          return ;; if length is not equal, return false
        )
      )
      (i32.const 1)
      (local.set $i)
      (block 
          (loop 
              (br_if 1 (i32.le_s (local.get $i) (local.get $selfLength) )(i32.eqz) )
              (i32.load (i32.add (local.get $self) (local.get $i)))
              (i32.load (i32.add (local.get $rhs) (local.get $i)))
              (i32.ne)  ;;check if left and right character values are not equal
              (if (then (i32.const 0) (return)))
              (i32.add (local.get $i) (i32.const 1))(local.set $i)
              (br 0)
          )
      ) ;;end block and loop
      (i32.const 1)
      (return))

  (func (export "str$concat") (param $self i32) (param $rhs i32) (result i32)
    (local $newlen i32)
    (local $len1 i32)
    (local $len2 i32)
    (local $newstr i32)
    (local $i i32)
    (local $j i32)
    (local $char i32)
    (local.get $rhs)
    (call $assert_not_none)
    (local.get $self)
    (i32.const 0)
    (call $load)
    (local.set $len1)
    (local.get $rhs)
    (i32.const 0)
    (call $load)
    (local.set $len2)
    (i32.add (local.get $len1) (local.get $len2))
    (local.set $newlen)
    (local.get $newlen)
    (i32.const 4)
    (i32.div_s)
    (i32.const 1)
    (i32.add)
    (call $alloc)
    (local.set $newstr)
    ;; set length of new string
    (local.get $newstr)
    (i32.const 0)
    (local.get $newlen)
    (call $store)
    ;; concat from string 1
    (local.set $i (i32.const 0))
    (local.set $j (i32.const 0))
    (loop $loop1
      local.get $self
      (i32.add (i32.const 1) (local.get $i))
      (call $load)
      (local.set $char)
      (local.get $newstr)
      (i32.add (i32.const 1) (local.get $i))
      (local.get $char)
      (call $store)
      (local.set $i (i32.add (i32.const 1) (local.get $i)))
      (local.set $j (i32.add (i32.const 4) (local.get $j)))
      (i32.lt_s (local.get $j) (local.get $len1))
      br_if $loop1
    )

    ;; concat from string 2
    (local.set $i (i32.const 0))
    (local.set $j (i32.const 0))
    (loop $loop2
      local.get $rhs
      (i32.add (i32.const 1) (local.get $i))
      (call $load)
      (local.set $char)
      (i32.add (local.get $len1) (local.get $newstr))
      (i32.add (i32.const 1)(local.get $i))
      (local.get $char)
      (call $store)
      (local.set $i (i32.add (i32.const 1) (local.get $i)))
      (local.set $j (i32.add (i32.const 4) (local.get $j)))
      (i32.lt_s (local.get $j) (local.get $len2))
      br_if $loop2
    )

    (local.get $newstr)
    (return))
  (func (export "str$copyconstructor") (param $self i32) (param $rhs i32) (result i32)
  (i32.const 0)
  (return))
  (func (export "str$slicing") (param $self i32) (param $start i32) (param $end i32) (param $steps i32) (result i32)
    (local $newstr i32)
    (local $newstrlength i32)
    (local $selfLength i32)
    (local $i i32)
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
        (i32.const 1)
        (call $alloc)
        (local.set $newstr)
        (i32.store (local.get $newstr) (i32.const 0) (i32.const 0))
        (local.get $newstr)
        (i32.const 0)
        (i32.const 0)
        (call $store)
        (local.get $newstr)
        (return)
      )
    )
    ;;;;;;;;;;;;;;
    (i32.gt_u (local.get $end) (local.get $selfLength))
    (if
      (then
        (local.get $selfLength)
        (local.set $end)
      )
    )
    ;;;;;;;;;;;;;;;
    ;; calculate the length of newstr
    (i32.sub (i32.sub (local.get $end) (local.get $start)) (i32.const 1))
    (local.set $temp)
    (i32.add (i32.div_u (local.get $temp) (local.get $steps)) (i32.const 1))
    (local.set $newstrlength)
    ;; allocate the memory heap of newstr
    ;; (i32.add ((i32.div_u (i32.add (local.get $newstrlength) (i32.const 3)) (i32.const 4))) (i32.const 1))
    (i32.add (i32.div_u (i32.add (local.get $newstrlength) (i32.const 3)) (i32.const 4)) (i32.const 1))
    (call $alloc)
    (local.set $newstr)
    (local.get $newstr)
    (i32.const 0)
    (local.get $newstrlength)
    (call $store)
    ;;set count i and start the while loop
    (i32.const 0)
    (local.set $i)
    ;; (i32.mul (local.get $i) (local.get $steps))
    ;; (i32.add (i32.mul (local.get $i) (local.get $steps)) (local.get $start))
    (loop $my_loop
      (i32.load8_u (i32.add (local.get $self) (i32.add (i32.add (i32.mul (local.get $i) (local.get $steps)) (local.get $start)) (i32.const 4))))
      (local.set $currVal)
      (i32.store8 (i32.add (local.get $newstr) (i32.add (local.get $i) (i32.const 4))) (local.get $currVal))
      (local.set $i (i32.add (i32.const 1) (local.get $i)))
      (i32.lt_u (local.get $i) (local.get $newstrlength))
      br_if $my_loop
    )

    (local.get $newstr)
    (return))
  
  (func (export "str$upper") (param $self i32) (result i32)
      (local $newstr i32)
      (local $strLength i32)
      (local $currVal i32)
      (local $i i32)
      (i32.const 0)
      (local.set $i)
      (i32.load (i32.add (local.get $self) (i32.add (local.get $i) (i32.const 0))))
      (local.set $strLength) ;; get the length of the string
      (i32.add (local.get $strLength) (i32.const 1))
      (call $alloc)
      (local.set $newstr)
      (local.get $newstr)
      (i32.const 0)
      (local.get $strLength)
      (call $store)
      (loop $my_loop
        (i32.load8_u (i32.add (local.get $self) (i32.add (local.get $i) (i32.const 4))))
        (local.set $currVal)
        (i32.and (i32.le_u (local.get $currVal) (i32.const 123)) (i32.gt_u (local.get $currVal) (i32.const 96)))
        (if
          (then
            (i32.sub (local.get $currVal) (i32.const 32))
            (local.set $currVal)
            (i32.store8 (i32.add (local.get $newstr) (i32.add (local.get $i) (i32.const 4))) (local.get $currVal))
          )
          (else
            (i32.store8 (i32.add (local.get $newstr) (i32.add (local.get $i) (i32.const 4))) (local.get $currVal))
          )
        )
        (local.set $i (i32.add (i32.const 1) (local.get $i)))
        (i32.lt_u (local.get $i) (local.get $strLength))
        br_if $my_loop
      )
      (local.get $newstr)
      (return))
  
  (func (export "str$lower") (param $self i32) (result i32)
      (local $newstr i32)
      (local $strLength i32)
      (local $currVal i32)
      (local $i i32)
      (i32.const 0)
      (local.set $i)
      (i32.load (i32.add (local.get $self) (i32.add (local.get $i) (i32.const 0))))
      (local.set $strLength) ;; get the length of the string
      (i32.add (local.get $strLength) (i32.const 1))
      (call $alloc)
      (local.set $newstr)
      (local.get $newstr)
      (i32.const 0)
      (local.get $strLength)
      (call $store)
      (loop $my_loop
        (i32.load8_u (i32.add (local.get $self) (i32.add (local.get $i) (i32.const 4))))
        (local.set $currVal)
        (i32.and (i32.le_u (local.get $currVal) (i32.const 91)) (i32.gt_u (local.get $currVal) (i32.const 64)))
        (if
          (then
            (i32.add (local.get $currVal) (i32.const 32))
            (local.set $currVal)
            (i32.store8 (i32.add (local.get $newstr) (i32.add (local.get $i) (i32.const 4))) (local.get $currVal))
          )
          (else
            (i32.store8 (i32.add (local.get $newstr) (i32.add (local.get $i) (i32.const 4))) (local.get $currVal))
          )
        )
        (local.set $i (i32.add (i32.const 1) (local.get $i)))
        (i32.lt_u (local.get $i) (local.get $strLength))
        br_if $my_loop
      )
      (local.get $newstr)
      (return))
  
  (func (export "str$split") (param $self i32) (param $delim i32) (result i32)
  (i32.const 0)
  (return))
)