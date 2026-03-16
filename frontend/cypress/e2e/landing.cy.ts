describe('Landing Page', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('displays the app title', () => {
    cy.contains('CodeAtlas').should('be.visible')
  })

  it('displays the tagline', () => {
    cy.contains('Transform codebases into interactive knowledge graphs').should('be.visible')
  })

  it('has a GitHub URL input', () => {
    cy.get('input[placeholder="https://github.com/owner/repo"]').should('exist')
  })

  it('has a disabled Parse button when input is empty', () => {
    cy.contains('button', 'Parse').should('be.disabled')
  })

  it('enables Parse when URL is typed', () => {
    cy.get('input[placeholder="https://github.com/owner/repo"]')
      .type('https://github.com/test/repo')
    cy.contains('button', 'Parse').should('not.be.disabled')
  })

  it('has a demo button', () => {
    cy.contains('Try Demo Project').should('be.visible')
  })

  it('shows Sign in button for unauthenticated users', () => {
    cy.contains('Sign in').should('be.visible')
  })

  it('has a file drop zone', () => {
    cy.contains('Drop a .zip or exported .json file here').should('be.visible')
  })
})

describe('Demo Flow', () => {
  it('loads demo project and navigates to graph view', () => {
    cy.intercept('POST', '/api/ingest/demo', {
      statusCode: 200,
      body: { project_id: 'demo-123', status: 'ready' },
    }).as('ingestDemo')

    cy.visit('/')
    cy.contains('Try Demo Project').click()
    cy.wait('@ingestDemo')
    cy.url().should('include', '/graph/demo-123')
  })
})

describe('Graph View', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/graph/test-project', {
      statusCode: 200,
      body: {
        project_id: 'test-project',
        elements: {
          nodes: [
            { data: { id: 'n1', label: 'main.py', type: 'module', file: 'main.py', line: 0, connections: 2, directory: '' }, classes: 'module' },
            { data: { id: 'n2', label: 'MyClass', type: 'class', file: 'main.py', line: 10, connections: 1, directory: '' }, classes: 'class' },
          ],
          edges: [
            { data: { id: 'e1', source: 'n1', target: 'n2', relationship: 'contains' } },
          ],
        },
      },
    }).as('fetchGraph')

    cy.intercept('GET', '/api/history/test-project/timeline', { statusCode: 404 })

    cy.visit('/graph/test-project')
    cy.wait('@fetchGraph')
  })

  it('shows node count in header', () => {
    cy.contains('2n').should('be.visible')
  })

  it('has search input', () => {
    cy.get('input[placeholder="Search nodes..."]').should('exist')
  })

  it('has export buttons', () => {
    cy.contains('button', 'PNG').should('be.visible')
    cy.contains('button', 'JSON').should('be.visible')
  })

  it('has a share button', () => {
    cy.contains('button', 'Share').should('be.visible')
  })
})
