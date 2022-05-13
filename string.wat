(func $str$access (param $self i32) (param $index i32) (result i32)
(i32.const 0)
(return))
(func $str$length (param $self i32) (result i32)
    (local.get $self)
    (call $assert_not_none)
    (i32.const 0)
    (call $load) ;; load the length of the string
    (return))
(func $str$lessthan (param $self i32) (param $rhs i32) (result i32)
(i32.const 0)
(return))
(func $str$greaterthan (param $self i32) (param $rhs i32) (result i32)
(i32.const 0)
(return))
(func $str$equalsto (param $self i32) (param $rhs i32) (result i32)
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

(func $str$concat (param $self i32) (param $rhs i32) (result i32)
(i32.const 0)
(return))