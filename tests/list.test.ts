import { assertFail, assertPrint, assertTC, assertTCFail } from "./asserts.test";
import { NONE } from "./helpers.test";

describe("List tests", () => {
    // 1
    assertTC("create-list", `
    a: [int] = None
    a = [1, 2, 3]`, NONE);

    // 2
    assertTC("create-list-empty", `
    a: [int] = None
    a = []`, NONE);

    // 3
    assertPrint("access-element", `
    a: [int] = None
    a = [2, 4, 6, 8]
    print(a[0])`, [`2`]);

    // 4
    assertFail("out-of-bounds", `
    a: [int] = None
    a = [2, 4, 6, 8]
    a[4]`);

    // 5    
    // assertFail("negative-index", `
    // a: [int] = None
    // a = [1, 2, 3]
    // a[-1]`);

    // 6
    assertPrint("expr-elements", `
    a: [int] = None
    b: int = 100
    a = [1 + 2, b, (-50)]
    print(a[0])
    print(a[1])
    print(a[2])`, [`3`, `100`, `-50`]);

    // 7
    assertPrint("store-element", `
    a: [int] = None
    a = [1, 2, 3]
    a[0] = 5
    print(a[0])`, [`5`]);

    // 8
    assertPrint("replace-list-reference", `
    a: [int] = None
    a = [1, 2, 3]
    a = [4, 5, 6, 7, 8, 9]
    print(a[4])`, [`8`]);

    // 9
    assertTCFail("assign-wrong-type", `
    a: [int] = None
    a = [1, 2, 3]
    a[2] = True`);

    // 10
    assertTC("create-bool-list", `
    a: [bool] = None
    a = [True]`, NONE);
});

describe("Extra list tests", () => {
    //////// new tests ////////

    assertPrint("list-as-param", `
    def f(lst: [int]) -> int:
      return lst[1]
    a: [int] = None
    a = [66, -5, 10]
    print(f(a))`, [`-5`])

    assertTCFail("assign-wrong-list-type", `
    a: [bool] = None
    a = [-0, -0, -0, -0]`);

    assertPrint("list-of-snek-objects", `
    class Snake(obj):
      num_teeth: int = 100

    snek1: Snake = None
    snek2: Snake = None
    snek3: Snake = None
    snek_list: [Snake] = None

    snek1 = Snake()
    snek1.num_teeth = 300
    snek2 = Snake()
    snek2.num_teeth = 0
    snek3 = Snake()
    snek_list = [snek1, snek2, snek3]

    print(snek_list[0].num_teeth)
    print(snek_list[1].num_teeth)
    print(snek_list[2].num_teeth)
    `, [`300`, `0`, `100`])

    assertPrint("list-of-objects-has-None", `
    class Snake(obj):
      num_teeth: int = 100
    snek_list: [Snake] = None
    snek_list = [Snake(), None, None]
    print(0)
    `, [`0`])

    assertPrint("use-element-in-expr", `
    a: [int] = None
    a = [1, 2, 4, 8, 16, 32, 64]
    print(a[2] + a[5])
    `, [`36`])

    assertFail("list-out-of-bounds", `
    a: [int] = None
    b: int = 100

    a = [1, 2, 3]
    a[3] = 999

    b`)

    assertPrint("list-index-not-literal", `
    a: [int] = None
    a = [66, -5, 10]
    print(a[1+0])
    `, [`-5`])

    assertPrint("list-allocate-enough-memory", `
    a: [[int]] = None
    a = [[100, 4], [5], [99, -7, 3]]
    print(a[0][1])
    print(a[1][0])
    print(a[2][2])`, [`4`, `5`, `3`])

    assertPrint("print-a-bool-list", `
    a: [bool] = None
    a = [True, False, True]
    print(a)`, [`[True, False, True]`])
    
    assertPrint("print-nested-lists", `
    a: [[[bool]]] = None
    a = [[[True], [False, True]]]
    print(a)`, [`[[[True], [False, True]]]`])

    assertPrint("list-concat-don't-modify", `
    a: [int] = None
    b: [int] = None
    c: [int] = None

    a = [100, -7, 9]
    b = [25, 4]
    c = a + b
    c[1] = 55555
    c[4] = 112

    print(a)
    print(b)
    print(c)`, [`[100, -7, 9]`, `[25, 4]`, `[100, 55555, 9, 25, 112]`])

    assertPrint("list-concat-in-function", `
    a: [int] = None
    b: [int] = None
    c: [int] = None

    def concat_lists(p: [int], q: [int]) -> [int]:
      return p + q

    a = [100, -7, 9]
    b = [25, 4]
    c = concat_lists(a, b)
    print(c)
`, [`[100, -7, 9, 25, 4]`])

    assertPrint("concat-lists-of-lists", `
    a: [[int]] = None
    b: [[int]] = None
    c: [[int]] = None

    a = [[-2, -1, 0], [9]]
    b = [[25, 4]]
    c = a + b
    print(c)
`, [`[[-2, -1, 0], [9], [25, 4]]`])

   assertPrint("concat-empty-list-left", `
   a: [int] = None
   b: [int] = None
   c: [int] = None

   a = []
   b = [25, 4]
   c = a + b
   print(c)
   `, [`[25, 4]`])

   assertPrint("concat-empty-list-right", `
   a: [int] = None
   b: [int] = None
   c: [int] = None

   a = [100]
   b = []
   c = a + b
   print(c)
   `, [`[100]`])
});

describe("Milestone 2 list tests", () => {
    // 1
    assertPrint("print-a-list", `
    a: [int] = None
    a = [1, 2, 3]
    print(a)`, [`[1, 2, 3]`])

    // 2
    assertPrint("obtain-list-length", `
    a: [int] = None
    a = [1, 2, 3]
    print(len(a))`, [`3`])

    // 3
    assertPrint("functional-negative-indexing", `
    a: [int] = None
    a = [1, 2, 3]
    print(a[-1])`, [`3`])

    // 4
    assertPrint("list-slicing", `
    a: [int] = None
    b: [int] = None
    a = [2, 4, 6, 8]
    b = a[0:2]
    print(b)`, [`[2, 4]`])

    // 5
    assertPrint("list-slicing-step", `
    a: [int] = None
    b: [int] = None
    a = [2, 4, 6, 8]
    b = a[0:3:2]
    print(b)`, [`[2, 6]`])

    // 6
    assertPrint("slicing-negative-step", `
    a: [int] = None
    b: [int] = None
    a = [2, 4, 6, 8]
    b = a[::-1]
    print(b)`, [`[8, 6, 4, 2]`])

    // 7
    assertPrint("list-append", `
    a: [int] = None
    a = [1, 2, 3]
    a.append(4)
    print(a)`, [`[1, 2, 3, 4]`])

    // 8
    assertPrint("list-copy", `
    a: [int] = None
    b: [int] = None
    a = [1, 2, 3]
    b = a.copy()
    a.append(4)
    print(b)`, [`[1, 2, 3]`])

    // 9
    assertPrint("list-insert", `
    a: [int] = None
    a = [1, 2, 3]
    a.insert(1, 4)
    print(a)`, [`[1, 4, 2, 3]`])

    // 10
    assertPrint("list-pop", `
    a: [int] = None
    a = [1, 2, 3]
    a.pop(-1)
    print(a)`, [`[1, 2]`])

    // 11
    assertPrint("list-concat", `
    a: [int] = None
    b: [int] = None
    c: [int] = None
    a = [1, 2, 3]
    b = [4, 5, 6]
    c = a + b
    print(c)`, [`[1, 2, 3, 4, 5, 6]`])

    // 12
    assertPrint("list-literal-concat", `
    a: [int] = None
    a = [1, 2, 3] + [4, 5, 6]
    print(a)`, [`[1, 2, 3, 4, 5, 6]`])

});