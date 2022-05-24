# Set/Tuple/Dictionary: Merges and Planning

## Week 8 Update
Read the other features’ pull requests for your compiler, and for each of them, either:

Describe in a few sentences why your feature and that feature don’t really interact much. Give an example of a program that showcases your feature and theirs without interacting, and justify why it’s representative (that is, why there isn’t some other interesting interaction between your features)

Identify a place where your features overlap and will need more implementation to make them work together. This might be an opportunity for cool new stuff, or something that’s broken.
Describe it with a representatitve test case/scenario. This could be a Python program that will have an issue and crash the compiler because the two features were combined, or a novel combination of features that need good behavior. It could also be a UI interaction, a reason libraries won’t work well together, etc.
Describe what changes you think are needed to make these features work together: What should the new expected output be? What new additions to the compiler are needed to make them work together? Does their design need to change a bit, or does yours? How? Treat this like the first
### Compiler B: Bignums
There is overlap between our group's implementation and bignums.
We need to store the big integer into the set. Our group have 
gone through their implementation, they store the big num as a 
built-in new class. So when our code is doing typechecking, we 
need to allow the big int value to be passed at that time. 

To be detailed, the most possible test case would be like:
```python
set_1 : set[int] = None
set_1 = {999999999999999999999999999999999999999999999999,
99999999999999999999999999999999999999999999998}
set_1.add(99999999999999999999999999999999999999999999997)
print(len(set_1)) # output 3
```

Above would be the simplest example testing on the big integer value.
Recalling back from their design, each time we find that we create a
big int, it is still an integer type. So for our code, when we add a
new integer value, we would first check if it is a big num value in the 
parser. When typechecking, we should allow the set[int] maintain a big
integer value. 

Meanwhile, there should be another testing example:
```python
set_1 : set[int] = None
set_1 = {1,
99999999999999999999999999999999999999999999998}
set_1.add(99999999999999999999999999999999999999999999997)
print(len(set_1)) # output 3
```
In this design, we suppose the big int value should be compatible with 
the small integer value. For our code implementation, we are able to 
store both of the value into the set[int]. Our group recognize this case
does not require us to do further amendment on our code if we complete the
case above. It would be a compatibility problem for big int group.
### Compiler B: Built-in libraries/Modules/FFI
Our group think their work has some overlaps with our feature. They support 
factorial, max, pow, randint, randrange, time, LCM, GCD, combination and perm. 
Most of these functions have no relationship with us, however, max/min operations
can be done on the set.
```python
set_1 : set[int] = None
set_1 = {1,2,3}
a: int = 0
a = max(set_1)
print(a) # output 3
b: int = 2
b = min(set_1)
print(b) # output 1
```
So max and min function can be done on the set[int]. Actually, if the data type
in the set is comparable, then the max and min function should be callable. For 
our implementation, we should go through the whole set to find out the maximum
value in it. When typechecking, if it is calling max/min on a non-comparable data
type, it should report an error. To be honest, we need to find out how to implement
them. As the max function is almost implemented by their group, we need to find out
how to use their code on the set. The details need to be determined after enough discussions.

### Compiler B: Closures/first class/anonymous functions
In this section, after going through their design.md. Our group supposes the closure
has no relationship with the set. The closure do operations on different function type.
They do no operations on the set type.
```python
a: int = 10
f: Callable[[int], int] = None
f = getAdder(1) 
f(2) 
```

Recalling their example, set does not need to support such kind of operation. So our
group may do not need to have any interactions with them.

### Compiler B: comprehensions

After going through their pull request, our group find out that their implementation is
not completed at this moment. However, they have listed the potential interaction with 
our group. I would give examples here:
```python
print({3 for _ in range(5)}) # output {3}
```

```python
print({3 if val % 3 == 0 else (2 if val % 2 == 0 else 1) for val in range(8)})
# output {1, 2, 3}
```

As our group only implements the set here, these are the cases our group would focus on more. 
Generally speaking, there would be no big adjustment on our code. We would have further
discussion after communicating with them after their completion.
### Compiler B: Destructuring assignment
Currently speaking, their group has no overlap with our work. They only support operations
on the built-in type such as int. In the future, as set is unordered, so there may be only
very simple overlap between us. We would give out some examples here:

```python
a:set[int] = None
b:set[int] = None
a = {1, 2, 3}
b = {2, 3, 4}
(a, b) = (b, a)
```

Because the set is unordered, so change the order inside a set is meaningless. Our group
thinks the case above would be the only one meaningful when testing. Our group wonder
if such kind of swap would be supported in the following version, if so, we would 
concentrate on supporting the example here. For our code, I think our implementation 
does need to be changed. For them, the key part is to determine whether the rhs can contain
the id.
