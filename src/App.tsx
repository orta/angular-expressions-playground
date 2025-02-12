import { useEffect, useMemo, useState } from "react"
import "./App.scss"

import Container from "react-bootstrap/esm/Container"
import Row from "react-bootstrap/esm/Row"
import Col from "react-bootstrap/esm/Col"
import Form from "react-bootstrap/esm/Form"
import Card from "react-bootstrap/esm/Card"
import TextAreaAutosize from "react-textarea-autosize"
import expressions, { Lexer } from "angular-expressions"
import { ASTPreview } from "./ASTPreview"
import { ExpressionEditor } from "./ExpressionEditor"
import lzstring, { decompressFromEncodedURIComponent } from "lz-string"

// eslint-disable-next-line no-var
var scopeResult = {}

function App() {
  const [scopeString, setScopeString] = useState(() => {
    const fromParams = new URLSearchParams(document.location.search).get("scope")
    const localData = localStorage.getItem("scopeData")
    return fromParams
      ? decompressFromEncodedURIComponent(fromParams)
      : localData || '{ user: { id: "123", name: "Jane Doe" }, data: { a:[ 1, 2, 3]} }'
  })

  const [scopeEvalError, setScopeEvalError] = useState<Error | null>(null)
  // const scopeEvaled = useMemo(() => {
  //   try {
  //     setScopeEvalError(null)
  //     return eval(`scopeResult = ${scopeString}; scopeResult`)
  //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   } catch (e: any) {
  //     setScopeEvalError(e)
  //     return null
  //   }
  // }, [scopeString])

  const [expressionString, setExpressionString] = useState(() => {
    const fromParams = new URLSearchParams(document.location.search).get("expression")
    const localData = localStorage.getItem("expressionString")
    return fromParams ? decompressFromEncodedURIComponent(fromParams) : localData || "user.id"
  })

  useEffect(() => {
    localStorage.setItem("scopeData", scopeString)
    localStorage.setItem("expressionString", expressionString)

    const options = new URLSearchParams(document.location.search)
    options.set("scope", lzstring.compressToEncodedURIComponent(scopeString))
    options.set("expression", lzstring.compressToEncodedURIComponent(expressionString))

    const newUrl = `${document.location.origin}${document.location.pathname}?${options.toString()}`
    window.history.replaceState({}, "", newUrl)
  }, [scopeString, expressionString])

  const [expressionEvalError, setExpressionEvalError] = useState<Error | null>(null)
  const expressionInfo = useMemo(() => {
    try {
      setExpressionEvalError(null)
      const expression = expressions.compile(expressionString)
      const seen: any[] = []
      const astString = JSON.stringify(expression.ast, function (key, val) {
        if (val != null && typeof val == "object") {
          if (seen.indexOf(val) >= 0) return
          seen.push(val)
        }
        return val
      })

      const lexer = new Lexer()
      // @ts-expect-error - Lexer does not have a type
      const tokens = lexer.lex(expressionString)

      return {
        compiled: expression,
        result: expression(scopeResult),
        astString,
        tokens,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setExpressionEvalError(e)
      return null
    }
  }, [expressionString])

  return (
    <Container fluid>
      <Row>
        <Col xs={3}>
          <Form>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label>Expression</Form.Label>
              <ExpressionEditor expressionString={expressionString} setExpressionString={setExpressionString} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
              <Form.Label>Scope</Form.Label>
              <TextAreaAutosize
                defaultValue={scopeString}
                className="form-control font-monospace"
                rows={10}
                onChange={(e) => setScopeString(e.target.value)}
              />

              <Form.Text className="text-muted">{scopeEvalError ? <pre>{scopeEvalError.message}</pre> : null}</Form.Text>
            </Form.Group>
          </Form>
        </Col>
        <Col>
          <Card style={{ margin: "1em" }}>
            <Card.Body>
              <Card.Title>Result</Card.Title>
              <Card.Text>
                <RenderLiteral value={expressionInfo?.result} />
              </Card.Text>
            </Card.Body>
          </Card>

          {expressionInfo && (
            <Card style={{ margin: "1em" }}>
              <Card.Body>
                <Card.Title>AST</Card.Title>
                <Card.Text>
                  <ASTPreview ast={expressionInfo.compiled.ast} />
                </Card.Text>
              </Card.Body>
            </Card>
          )}

          {expressionInfo && (
            <Card style={{ margin: "1em" }}>
              <Card.Body>
                <Card.Title>Syntax Tokens</Card.Title>
                <Card.Text>
                  <pre style={{ whiteSpace: "pre-wrap", lineHeight: 2.2 }}>
                    {expressionInfo.tokens.map((t) => (
                      <span
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
                </Card.Text>
              </Card.Body>
            </Card>
          )}

          {expressionEvalError && (
            <Form.Text className="text-muted">
              <pre>{expressionEvalError.message}</pre>
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
