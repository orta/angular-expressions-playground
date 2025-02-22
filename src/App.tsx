import { use } from "react"
import "./App.scss"

import Container from "react-bootstrap/esm/Container"
import Row from "react-bootstrap/esm/Row"
import Col from "react-bootstrap/esm/Col"
import Form from "react-bootstrap/esm/Form"
import Card from "react-bootstrap/esm/Card"
import Tab from "react-bootstrap/esm/Tab"
import Tabs from "react-bootstrap/esm/Tabs"
import TextAreaAutosize from "react-textarea-autosize"
import { ASTPreview } from "./ASTPreview"
import { ExpressionEditor } from "./ExpressionEditor"

import "monaco-editor/esm/vs/editor/editor.all.js"

// Force monaco config for TS to load
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution"
// And json
import "monaco-editor/esm/vs/language/json/monaco.contribution"

import { SchemaEditor } from "./SchemaEditor"
import { getScopeResult, RootContext } from "./RootContext"

function App() {
  const ctx = use(RootContext)

  return (
    <Container fluid>
      <Row>
        <Col>
          <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
            <Form.Label>Expression</Form.Label>
            <ExpressionEditor
              expressionString={ctx.expressionString}
              setExpressionString={ctx.setExpressionString}
              scope={getScopeResult()}
              schema={ctx.schema}
            />
          </Form.Group>
        </Col>
      </Row>
      <Row>
        <Col xs={3}>
          <Form>
            <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
              <Form.Label>Expression Scope</Form.Label>

              <TextAreaAutosize
                defaultValue={ctx.scopeString}
                className="form-control font-monospace flex-1"
                rows={10}
                maxRows={20}
                onChange={(e) => ctx.setScopeString(e.target.value)}
              />

              <Form.Text className="text-muted">{ctx.scopeEvalError ? <pre>{ctx.scopeEvalError.message}</pre> : null}</Form.Text>
            </Form.Group>
          </Form>
        </Col>

        <Col>
          <Tabs defaultActiveKey="result" id="uncontrolled-tab-example" className="mb-3">
            <Tab eventKey="result" title="Result">
              <Card style={{ margin: "1em", wordWrap: "break-word" }}>
                <Card.Body>
                  <Card.Title>Result</Card.Title>

                  <RenderLiteral value={ctx.expressionRunResult?.result} />
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="schema" title="Documentation Schema" mountOnEnter>
              <SchemaEditor />
            </Tab>

            <Tab eventKey="ast" title="AST">
              {ctx.expressionRunResult && (
                <Card style={{ margin: "1em" }}>
                  <Card.Body>
                    <Card.Title>Syntax Tokens</Card.Title>

                    <pre style={{ whiteSpace: "pre-wrap", lineHeight: 2.2 }}>
                      {ctx.expressionRunResult.tokens.map((t: any) => (
                        <span
                          key={JSON.stringify(t)}
                          style={{
                            backgroundColor: "#aabbFF50",
                            padding: 4,
                            margin: 4,
                            borderRadius: 4,
                          }}
                        >
                          {JSON.stringify(t)}
                        </span>
                      ))}
                    </pre>
                  </Card.Body>
                </Card>
              )}

              {ctx.expressionRunResult && (
                <Card style={{ margin: "1em" }}>
                  <Card.Body>
                    <Card.Title>AST</Card.Title>

                    <ASTPreview ast={ctx.expressionRunResult.compiled.ast} />
                  </Card.Body>
                </Card>
              )}
            </Tab>
          </Tabs>

          {ctx.expressionEvalError && (
            <Form.Text className="text-muted">
              <pre>{ctx.expressionEvalError.message}</pre>
            </Form.Text>
          )}
        </Col>
      </Row>
    </Container>
  )
}

const RenderLiteral = ({ value }: { value: any }) => {
  if (typeof value === "string") {
    return <span className="text-primary">"{value}"</span>
  } else if (typeof value === "number") {
    return <span className="text-success">{value}</span>
  } else if (typeof value === "boolean") {
    return <span className="text-warning">{value ? "true" : "false"}</span>
  } else if (value === null) {
    return <span className="text-muted">null</span>
  } else if (value === undefined) {
    return <span className="text-muted">undefined</span>
  } else {
    return <span className="text-danger">{JSON.stringify(value)}</span>
  }
}

export default App
