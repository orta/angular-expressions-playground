import { use } from "react"
import Card from "react-bootstrap/esm/Card"
import Container from "react-bootstrap/esm/Container"
import MonacoEditor from "react-monaco-editor"
import { defaultMonacoSettings } from "./monacoConstants"
import { RootContext } from "./RootContext"

export const SchemaEditor = () => {
  const ctx = use(RootContext)

  return (
    <Card style={{ margin: "1em" }}>
      <Card.Body>
        <Card.Title>Type Support via JSON Schema</Card.Title>
        <Container>
          <div className="d-flex justify-content-between" style={{ gap: "1em" }}>
            <div className="form-control">
              <MonacoEditor
                height="400"
                language="typescript"
                value={ctx.tsInterfaceForSchema}
                onChange={ctx.setTSInterfaceForSchema}
                options={{ ...defaultMonacoSettings, automaticLayout: true }}
              />
            </div>

            <div className="form-control">
              <MonacoEditor
                height="400"
                width={"100%"}
                language="json"
                value={JSON.stringify(ctx.schema, null, 2)}
                options={{ ...defaultMonacoSettings, readOnly: true, automaticLayout: true }}
              />
            </div>
          </div>
        </Container>
        {ctx.schemaError && (
          <Card.Text className="text-muted">
            <p>Schema failed to build</p>
            <pre>{ctx.schemaError.message}</pre>
          </Card.Text>
        )}
      </Card.Body>
    </Card>
  )
}
