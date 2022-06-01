(module
    (memory (import "js" "mem") 1)
    (func $alloc (import "libmemory" "alloc") (param i32) (result i32))
    (func $load (import "libmemory" "load") (param i32) (param i32) (result i32))
    (func $store (import "libmemory" "store") (param i32) (param i32) (param i32))
    (func $jsopen (import "imports" "jsopen") (param i32) (result i32))
    (func $jsclose (import "imports" "jsclose") (param i32) (result i32))
    (func $jsread (import "imports" "jsread") (param i32) (param i32) (result i32))
    (func $jswrite (import "imports" "jswrite") (param i32) (param i32) (param i32) (result i32))
    (func $jslength (import "imports" "jslength") (param i32) (result i32))
    
    (func $open (param $mode i32) (result i32)
    (local $newObj1 i32)
(local $valname1 i32)
(local $valname2 i32)
(local $newFile i32)
(local $$last i32)
(local $$selector i32)
    (i32.const 0)
(local.set $newObj1)
(i32.const 0)
(local.set $valname1)
(i32.const 0)
(local.set $valname2)
(i32.const 0)
(local.set $newFile)
    (local.set $$selector (i32.const 0))
(loop $loop
(block $startFun1
              (local.get $$selector)
(br_table $startFun1)    
            ) ;; end $startFun1
            (i32.const 3)
call $alloc
(local.set $newObj1)
(local.get $newObj1)
(i32.const 0)
(i32.const 0)
call $store
(local.get $newObj1)
(i32.const 1)
(i32.const 0)
call $store
(local.get $newObj1)
(i32.const 2)
(i32.const 0)
call $store
(local.get $newObj1)
(call $File$__init__)
(local.set $$last)
(local.get $newObj1)
(local.set $newFile)
(local.get $mode)
(call $jsopen)
(local.set $valname1)
(local.get $newFile)
(i32.const 0)
(local.get $valname1)
call $store
(i32.const 0)
(call $jslength)
(local.set $valname2)
(local.get $newFile)
(i32.const 2)
(local.get $valname2)
call $store
(local.get $newFile)
return
            ) ;; end $loop
    (i32.const 0)
    (return))
    
(func $File$__init__ (param $self i32) (result i32)
    (local $$last i32)
(local $$selector i32)
    
    (local.set $$selector (i32.const 0))
(loop $loop
(block $startFun2
              (local.get $$selector)
(br_table $startFun2)    
            ) ;; end $startFun2
            
            ) ;; end $loop
    (i32.const 0)
    (return))

(func $File$read (param $self i32) (result i32)
    (local $valname3 i32)
(local $valname4 i32)
(local $valname5 i32)
(local $valname6 i32)
(local $valname7 i32)
(local $valname8 i32)
(local $valname9 i32)
(local $res i32)
(local $$last i32)
(local $$selector i32)
    (i32.const 0)
(local.set $valname3)
(i32.const 0)
(local.set $valname4)
(i32.const 0)
(local.set $valname5)
(i32.const 0)
(local.set $valname6)
(i32.const 0)
(local.set $valname7)
(i32.const 0)
(local.set $valname8)
(i32.const 0)
(local.set $valname9)
(i32.const 0)
(local.set $res)
    (local.set $$selector (i32.const 0))
(loop $loop
(block $end1
              (block $else1
              (block $then1
              (block $startFun3
              (local.get $$selector)
(br_table $startFun3 $then1 $else1 $end1)    
            ) ;; end $startFun3
            (local.get $self)
call $assert_not_none
(i32.const 1)
call $load
(local.set $valname3)
(local.get $self)
call $assert_not_none
(i32.const 2)
call $load
(local.set $valname4)
(local.get $valname3)
(local.get $valname4)
(i32.eq)
(local.set $valname5)
(local.get $valname5)
(if 
          (then
            (local.set $$selector (i32.const 1))
            (br $loop)
          ) 
          (else 
            (local.set $$selector (i32.const 2))
            (br $loop)
          )
         )
                
            ) ;; end $then1
            (i32.const 111)
(call $print_num)
(local.set $$last)
(local.get $res)
return
(local.set $$selector (i32.const 3))
(br $loop)
                
            ) ;; end $else1
            (local.set $$selector (i32.const 3))
(br $loop)
                
            ) ;; end $end1
            (local.get $self)
call $assert_not_none
(i32.const 0)
call $load
(local.set $valname6)
(local.get $self)
call $assert_not_none
(i32.const 1)
call $load
(local.set $valname7)
(local.get $valname6)
(local.get $valname7)
(call $jsread)
(local.set $res)
(local.get $self)
call $assert_not_none
(i32.const 1)
call $load
(local.set $valname8)
(local.get $valname8)
(i32.const 1)
(i32.add)
(local.set $valname9)
(local.get $self)
(i32.const 1)
(local.get $valname9)
call $store
(local.get $res)
return
            ) ;; end $loop
    (i32.const 0)
    (return))

(func $File$write (param $self i32) (param $s i32) (result i32)
    (local $valname10 i32)
(local $valname11 i32)
(local $valname12 i32)
(local $valname13 i32)
(local $valname14 i32)
(local $valname15 i32)
(local $valname16 i32)
(local $n i32)
(local $$last i32)
(local $$selector i32)
    (i32.const 0)
(local.set $valname10)
(i32.const 0)
(local.set $valname11)
(i32.const 0)
(local.set $valname12)
(i32.const 0)
(local.set $valname13)
(i32.const 0)
(local.set $valname14)
(i32.const 0)
(local.set $valname15)
(i32.const 0)
(local.set $valname16)
(i32.const 0)
(local.set $n)
    (local.set $$selector (i32.const 0))
(loop $loop
(block $startFun4
              (local.get $$selector)
(br_table $startFun4)    
            ) ;; end $startFun4
            (local.get $self)
call $assert_not_none
(i32.const 0)
call $load
(local.set $valname10)
(local.get $self)
call $assert_not_none
(i32.const 1)
call $load
(local.set $valname11)
(local.get $valname10)
(local.get $s)
(local.get $valname11)
(call $jswrite)
(local.set $n)
(local.get $self)
call $assert_not_none
(i32.const 1)
call $load
(local.set $valname12)
(local.get $valname12)
(local.get $n)
(i32.add)
(local.set $valname13)
(local.get $self)
(i32.const 1)
(local.get $valname13)
call $store
(local.get $self)
call $assert_not_none
(i32.const 2)
call $load
(local.set $valname14)
(local.get $self)
call $assert_not_none
(i32.const 1)
call $load
(local.set $valname15)
(local.get $valname14)
(local.get $valname15)
(call $max)
(local.set $valname16)
(local.get $self)
(i32.const 2)
(local.get $valname16)
call $store
(local.get $n)
return
            ) ;; end $loop
    (i32.const 0)
    (return))

(func $File$tell (param $self i32) (result i32)
    (local $valname17 i32)
(local $$last i32)
(local $$selector i32)
    (i32.const 0)
(local.set $valname17)
    (local.set $$selector (i32.const 0))
(loop $loop
(block $startFun5
              (local.get $$selector)
(br_table $startFun5)    
            ) ;; end $startFun5
            (local.get $self)
call $assert_not_none
(i32.const 1)
call $load
(local.set $valname17)
(local.get $valname17)
return
            ) ;; end $loop
    (i32.const 0)
    (return))

(func $File$seek (param $self i32) (param $pos i32) (result i32)
    (local $valname18 i32)
(local $valname19 i32)
(local $valname20 i32)
(local $$last i32)
(local $$selector i32)
    (i32.const 0)
(local.set $valname18)
(i32.const 0)
(local.set $valname19)
(i32.const 0)
(local.set $valname20)
    (local.set $$selector (i32.const 0))
(loop $loop
(block $end3
              (block $else3
              (block $then3
              (block $end2
              (block $else2
              (block $then2
              (block $startFun6
              (local.get $$selector)
(br_table $startFun6 $then2 $else2 $end2 $then3 $else3 $end3)    
            ) ;; end $startFun6
            (local.get $pos)
(i32.const 0)
(i32.lt_s)
(local.set $valname18)
(local.get $valname18)
(if 
          (then
            (local.set $$selector (i32.const 1))
            (br $loop)
          ) 
          (else 
            (local.set $$selector (i32.const 2))
            (br $loop)
          )
         )
                
            ) ;; end $then2
            (i32.const 222)
(call $print_num)
(local.set $$last)
(i32.const 0)
return
(local.set $$selector (i32.const 3))
(br $loop)
                
            ) ;; end $else2
            (local.set $$selector (i32.const 3))
(br $loop)
                
            ) ;; end $end2
            (local.get $self)
call $assert_not_none
(i32.const 2)
call $load
(local.set $valname19)
(local.get $pos)
(local.get $valname19)
(i32.ge_s)
(local.set $valname20)
(local.get $valname20)
(if 
          (then
            (local.set $$selector (i32.const 4))
            (br $loop)
          ) 
          (else 
            (local.set $$selector (i32.const 5))
            (br $loop)
          )
         )
                
            ) ;; end $then3
            (i32.const 333)
(call $print_num)
(local.set $$last)
(i32.const 0)
return
(local.set $$selector (i32.const 6))
(br $loop)
                
            ) ;; end $else3
            (local.set $$selector (i32.const 6))
(br $loop)
                
            ) ;; end $end3
            (local.get $self)
(i32.const 1)
(local.get $pos)
call $store
            ) ;; end $loop
    (i32.const 0)
    (return))

(func $File$close (param $self i32) (result i32)
    (local $valname21 i32)
(local $$last i32)
(local $$selector i32)
    (i32.const 0)
(local.set $valname21)
    (local.set $$selector (i32.const 0))
(loop $loop
(block $startFun7
              (local.get $$selector)
(br_table $startFun7)    
            ) ;; end $startFun7
            (local.get $self)
call $assert_not_none
(i32.const 0)
call $load
(local.set $valname21)
(local.get $valname21)
(call $jsclose)
(local.set $$last)
            ) ;; end $loop
    (i32.const 0)
    (return))
    (func (export "exported_func") 
      (local $$last i32)
(local $$selector i32)
(i32.const 0)
(global.set $f)
(local.set $$selector (i32.const 0))
(loop $loop
(block $startProg1
              (local.get $$selector)
(br_table $startProg1)    
            ) ;; end $startProg1
            (i32.const 1)
(call $open)
(global.set $f)
(global.get $f)
(call $assert_not_none)
(local.set $$last)
(global.get $f)
(i32.const 1234)
(call $File$write)
(local.set $$last)
(global.get $f)
(call $assert_not_none)
(local.set $$last)
(global.get $f)
(call $File$close)
(local.set $$last)
            ) ;; end $loop
      
    )
  )