import ts from "typescript"
import { createSystem, createVirtualTypeScriptEnvironment } from "@typescript/vfs"
import { CompletedConfig, Config, createFormatter, createParser, DEFAULT_CONFIG, SchemaGenerator } from "ts-json-schema-generator"
import { libDTS } from "./vendor/libDTS"
import { decompressFromEncodedURIComponent } from "lz-string"
import { useState, useMemo } from "react"
import Card from "react-bootstrap/esm/Card"
import Container from "react-bootstrap/esm/Container"
import MonacoEditor from "react-monaco-editor"
import { defaultMonacoSettings } from "./monacoConstants"
import { JSONSchema7 } from "json-schema"

export const SchemaEditor = (props: { setSchema: (obj: JSONSchema7) => void }) => {
  const { setSchema } = props
  const [tsInterface, setTSInterface] = useState(() => {
    const fromParams = new URLSearchParams(document.location.search).get("ts")
    const localData = localStorage.getItem("ts")
    return fromParams
      ? decompressFromEncodedURIComponent(fromParams)
      : localData || "/** My Type */\nexport type MyType {\n  /** User's ID */\n  id: string\n  /** Their name */\n  name: string\n}"
  })

  const [schemaError, setSchemaError] = useState<Error | null>(null)

  const schema = useMemo(() => {
    setSchemaError(null)

    const fsMap = new Map<string, string>()
    fsMap.set("/schema.ts", tsInterface)
    fsMap.set("/lib.d.ts", libDTS)
    const system = createSystem(fsMap)
    const env = createVirtualTypeScriptEnvironment(system, ["/schema.ts"], ts)
    const program = env.languageService.getProgram()
    if (!program) throw new Error("No program")

    const schemaConfig: Config = { path: "/schema.ts" }
    const config: CompletedConfig = { ...schemaConfig, ...DEFAULT_CONFIG }

    const parser = createParser(program, config)
    const formatter = createFormatter(config)
    const generator = new SchemaGenerator(program, parser, formatter, schemaConfig)

    try {
      const result = generator.createSchema()
      props.setSchema(result)
      return result
    } catch (error: any) {
      setSchemaError(error)
      console.error(error)
    }
  }, [tsInterface, setSchema])

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
                value={tsInterface}
                onChange={setTSInterface}
                options={defaultMonacoSettings}
              />
            </div>

            <div className="form-control">
              <MonacoEditor
                height="400"
                width={"100%"}
                language="json"
                value={JSON.stringify(schema, null, 2)}
                onChange={setTSInterface}
                options={{ ...defaultMonacoSettings, readOnly: true }}
              />
            </div>
          </div>
        </Container>
        {schemaError && (
          <Card.Text className="text-muted">
            <p>Schema failed to build</p>
            <pre>{schemaError.message}</pre>
          </Card.Text>
        )}
      </Card.Body>
    </Card>
  )
}
