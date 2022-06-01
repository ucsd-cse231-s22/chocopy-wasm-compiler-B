Cypress.on("uncaught:exception", (err, runnable) => {
  expect(err.message).to.include("wabt is not defined");
  return false;
});

describe("Frontend Tests", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("Simple Test Repl", () => {
    cy.get('textarea[id="next-code"]').type("x:int = 0\nx\n");
    cy.get('div[id="output"]').contains("pre", "0");
  });

  it("Pretty print nested objects", () => {
    cy.get('div[class="CodeMirror cm-s-neo CodeMirror-simplescroll"]')
      .click()
      .find("textarea", { force: true })
      .type("class Rat(object):\na:int=1\n{backspace}{backspace}b:Rat=None\n", { force: true })
      .type("{backspace}{backspace}{backspace}{backspace}")
      .type("x : Rat = None\n{backspace}{backspace}x = Rat()\nx.b=Rat()\nx.b", { force: true });
    cy.get('button[id="run"]').click();
    cy.get('button[class="accordion"]').click();
    cy.get('div[id="output"]').contains('b[class="tag"]', "a");
  });

  it("Pretty print list of lists", () => {
    cy.get('div[class="CodeMirror cm-s-neo CodeMirror-simplescroll"]')
      .click()
      .find("textarea", { force: true })
      .type("a : [[int]] = None\n{backspace}{backspace}", { force: true })
      .type("a = [[1],[2]]\na", { force: true });
    cy.get('button[id="run"]').click();
    cy.get('button[class="accordion"]').click({ multiple: true });
    cy.get('div[id="output"]').contains('b[class="tag"]', "0");
    cy.get('div[id="output"]').contains('p[class="val"]', "1");
    cy.get('div[id="output"]').contains('b[class="tag"]', "1");
    cy.get('div[id="output"]').contains('p[class="val"]', "2");
  });

  it("Theme dropdown", () => {
    cy.get('select[id="themes"]').select("nord");
    cy.get('div[class="CodeMirror CodeMirror-simplescroll cm-s-nord"');
  });

  it("Clear REPL button", () => {
    cy.get('div[class="CodeMirror cm-s-neo CodeMirror-simplescroll"]')
      .click()
      .find("textarea", { force: true })
      .type("x:int = 1\n{backspace}{backspace}x", { force: true });
    cy.get('button[id="run"]').click();
    cy.get('button[id="clear"').click();
    cy.get('div[id="output"]').not("pre[title='num']");
  });

});
