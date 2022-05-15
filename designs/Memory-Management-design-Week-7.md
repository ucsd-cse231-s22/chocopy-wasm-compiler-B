# Memory management design: Week 7

## How to test the reference counting

Run `npm test`. Tests are included in `tests/memory_management.test.ts`.

These tests run several scenarios with variables and functions, ensuring that
their reference counts are correct.

## Summary of concrete changes

- Add basic reference counting tests
- Change the layout of an allocation: now there is a header, containing:
    - the size
    - type info: a tag for the destructor
    - the reference count
- Modify the allocation, load, and store routines to account for the header
- Modify the compiler to keep around type information for allocations and for
  all variables, and use it in allocation
- Implement reference count incrementing and decrementing functions in
  `memory.wat`
- Modify the compiler to call these functions
- Add new built-ins to get and test reference counts

## Refcounting Rules
- When we assign a value to a var, like `x = C()`, or to a field, `x.c = C()`,
  first we will decrease the ref_count of the old pointer which is used to stored in `x`, then increase the ref_count of the new pointer.
- When we start a method call, we will increase the ref_count of func params.
  At the end of the function, we will decrease the ref_count of all func params and local vars.

## Design Lessons Learned

**Type info is hard!**

It's hard in the compiler: we had to change many parts of the compiler that had
mistakenly dropped type info.  All of `lower.ts`, `runner.ts`, and `compiler.ts`
needed to be fixed to keep type info around.

It's hard at runtime: at first we thought about having a table that stores type
info of fields, to use when freeing classes. But WASM doesn't actually have
tables of constant data like that! So instead we are using a table of
*destructor functions*. This means three things:
 - For each class, we generate a `$ThatClass$$delete` function, and make a big
   table of them.
 - When an object is allocated, it gets a tag that says what index it is into
   the table.
 - Lastly, when an object is freed at runtime, the destructor should be called.

**Counting references is hard!**

Specifically, it's hard for us humans! This is because the number of live
references is not a function of the AST, but a function of the IR, which has
more variables than the AST, which can hold references.

This makes it unintuitive to know how many references something actually has,
and we had to correct our tests.

**Type checking is hard!**

We added built-in functions to get and test the reference count of a heap object.
They take objects as their parameters.

However, the type checker does not support inheritance yet, so when we defined a
new class `C` and gave it a `C`, it complained that it was not an `object`!

Since we expect this to be fixed soon, we patched our functions in as special
cases in the type checker.
