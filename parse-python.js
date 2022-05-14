const python = require('lezer-python');

const input = `
def foo():
  return 1
`;

const tree = python.parser.parse(input);

const cursor = tree.cursor();

do {
//  console.log(cursor.node);
  console.log(cursor.node.type.name);
  console.log(input.substring(cursor.node.from, cursor.node.to));
} while(cursor.next());

let c = tree.cursor()
console.log(cursor.node.name)
console.log(c.node.name)