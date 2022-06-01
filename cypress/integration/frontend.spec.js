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
    cy.get('div[class = "absolute-content-border"]')
      .click()
      .find('textarea[id = "user-code"]', { force: true })
      .type("class Rat(object):\n    a:int=1\n    b:Rat=None\n", { force: true })
      .type("x : Rat = None\nx = Rat()\nx.b=Rat()\nx.b", { force: true });
    cy.get('div[id="run"]').click();
    cy.get('#output').contains('button[class="accordion"]', "Rat");
  });

  // it("Pretty print list of lists", () => {
  //   cy.get('div[class = "absolute-content-border"]')
  //     .click()
  //     .find('textarea[id = "user-code"]', { force: true })
  //     .type("a : [[int]] = None\n", { force: true })
  //     .type("a = [[1],[2]]\na", { force: true });
  //   cy.get('div[id="run"]').click();
  //   cy.get('button[class="accordion"]').click({ multiple: true });
  //   cy.get('div[id="output"]').contains('b[class="tag"]', "0");
  //   cy.get('div[id="output"]').contains('p[class="val"]', "1");
  //   cy.get('div[id="output"]').contains('b[class="tag"]', "1");
  //   cy.get('div[id="output"]').contains('p[class="val"]', "2");
  // });

  it("Theme dropdown", () => {
    cy.get('#config-theme').select("nord");
    cy.get('div[class="CodeMirror CodeMirror-wrap cm-s-nord"]');
  });

  it("Clear REPL button", () => {
    cy.get('div[class = "absolute-content-border"]')
      .click()
      .find('textarea[id = "user-code"]', { force: true })
      .type("x:int = 1\nx", { force: true });
    cy.get('div[id="run"]').click();
    cy.get('a[id="clear"').click();
    cy.get('div[id="output"]').not("pre");
  });

});
