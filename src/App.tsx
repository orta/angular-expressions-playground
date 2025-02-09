import { useMemo, useState } from "react";
import "./App.scss";

import Container from "react-bootstrap/esm/Container";
import Row from "react-bootstrap/esm/Row";
import Col from "react-bootstrap/esm/Col";
import Form from "react-bootstrap/esm/Form";
import Tabs from "react-bootstrap/esm/Tabs";
import Tab from "react-bootstrap/esm/Tab";
import Card from "react-bootstrap/esm/Card";

import expressions, { Lexer, Parser } from "angular-expressions";
import { ASTPreview } from "./ASTPreview";

// eslint-disable-next-line no-var
var scopeResult = {};

function App() {
  const [scopeString, setScopeString] = useState(
    '{ id: "123", name: "Jane Doe" }'
  );
  const [scopeEvalError, setScopeEvalError] = useState<Error | null>(null);
  const scopeEvaled = useMemo(() => {
    try {
      setScopeEvalError(null);
      return eval(`scopeResult = ${scopeString}; scopeResult`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setScopeEvalError(e);
      return null;
    }
  }, [scopeString]);

  const [expressionString, setExpressionString] = useState("id");
  const [expressionEvalError, setExpressionEvalError] = useState<Error | null>(
    null
  );
  const expressionInfo = useMemo(() => {
    try {
      setExpressionEvalError(null);
      const expression = expressions.compile(expressionString);
      const seen: any[] = [];
      const astString = JSON.stringify(expression.ast, function (key, val) {
        if (val != null && typeof val == "object") {
          if (seen.indexOf(val) >= 0) return;
          seen.push(val);
        }
        return val;
      });

      const lexer = new Lexer();

      return {
        compiled: expression,
        result: expression(scopeResult),
        astString,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setExpressionEvalError(e);
      return null;
    }
  }, [expressionString]);

  return (
    <Container fluid>
      <Row>
        <Col xs={3}>
          <Form>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label>Expression</Form.Label>
              <Form.Control
                placeholder="Expression string"
                className="font-monospace"
                value={expressionString}
                onChange={(e) => setExpressionString(e.target.value)}
              />
            </Form.Group>
            <Form.Group
              className="mb-3"
              controlId="exampleForm.ControlTextarea1"
            >
              <Form.Label>Scope</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                className="font-monospace"
                value={scopeString}
                onChange={(e) => setScopeString(e.target.value)}
              />
              <Form.Text className="text-muted">
                {scopeEvaled ? (
                  <pre>{JSON.stringify(scopeEvaled, null, 2)}</pre>
                ) : scopeEvalError ? (
                  <pre>{scopeEvalError.message}</pre>
                ) : null}
              </Form.Text>
            </Form.Group>
          </Form>
        </Col>
        <Col>

              <Card style={{ margin: "1em"}}>
                <Card.Body>
                  <Card.Title>Result</Card.Title>
                  <Card.Text>
                    <RenderLiteral value={expressionInfo?.result} />
                  </Card.Text>
                </Card.Body>
              </Card>

              {expressionInfo && (
                <Card style={{ margin: "1em"}}>
                  <Card.Body>
                    <Card.Title>AST</Card.Title>
                    <Card.Text>
                      <ASTPreview ast={expressionInfo.compiled.ast} />
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
  );
}

const RenderLiteral = ({ value }: { value: any }) => {
  if (typeof value === "string") {
    return <span className="text-primary">"{value}"</span>;
  } else if (typeof value === "number") {
    return <span className="text-success">{value}</span>;
  } else if (typeof value === "boolean") {
    return <span className="text-warning">{value ? "true" : "false"}</span>;
  } else if (value === null) {
    return <span className="text-muted">null</span>;
  } else if (value === undefined) {
    return <span className="text-muted">undefined</span>;
  } else {
    return <span className="text-danger">{JSON.stringify(value)}</span>;
  }
};

export default App;
