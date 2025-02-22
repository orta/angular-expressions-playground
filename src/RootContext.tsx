import { createContext, useEffect, useMemo, useState } from "react"
import lzstring, { decompressFromEncodedURIComponent } from "lz-string"
import { JSONSchema7 } from "json-schema"
import ts from "typescript"
import { createSystem, createVirtualTypeScriptEnvironment } from "@typescript/vfs"
import { CompletedConfig, Config, createFormatter, createParser, DEFAULT_CONFIG, SchemaGenerator } from "ts-json-schema-generator"
import { libDTS } from "./vendor/libDTS"

// Consolidated all faffing into the top level!

import expressions, { Lexer } from "angular-expressions"
// eslint-disable-next-line no-var
var scopeResult = {}

export const RootContext = createContext<{
  expressionString: string
  setExpressionString: (str: string) => void
  expressionEvalError: Error | null
  scopeString: string

  expressionRunResult: {
    compiled: expressions.EvaluatorFunc
    result: any
    astString: string
    tokens: any
    scopeResult: any
  } | null

  setScopeString: (str: string) => void
  scopeEvalError: Error | null

  tsInterfaceForSchema: string
  setTSInterfaceForSchema: (str: string) => void
  schema: JSONSchema7 | null
  schemaError: Error | null
}>({
  expressionString: "",
  setExpressionString: () => {},
  expressionEvalError: null,
  expressionRunResult: null,

  scopeString: "",
  setScopeString: () => {},
  scopeEvalError: null,

  tsInterfaceForSchema: "",
  setTSInterfaceForSchema: () => {},
  schema: null,
  schemaError: null,
})

export const getScopeResult = () => scopeResult

export const RootProvider = ({ children }: React.PropsWithChildren<object>) => {
  const [expressionString, setExpressionString] = useState(() => {
    const fromParams = new URLSearchParams(document.location.search).get("expression")
    const localData = localStorage.getItem("expressionString")
    return fromParams ? decompressFromEncodedURIComponent(fromParams) : localData || initialExpressionString
  })

  const [scopeString, setScopeString] = useState(() => {
    const fromParams = new URLSearchParams(document.location.search).get("scope")
    const localData = localStorage.getItem("scopeData")
    return fromParams ? decompressFromEncodedURIComponent(fromParams) : localData || initialScopeString
  })

  const [tsInterfaceForSchema, setTSInterfaceForSchema] = useState(() => {
    const fromParams = new URLSearchParams(document.location.search).get("ts")
    const localData = localStorage.getItem("ts")
    return fromParams ? decompressFromEncodedURIComponent(fromParams) : localData || initialTSInterfaceForSchema
  })

  const [scopeEvalError, setScopeEvalError] = useState<Error | null>(null)

  const [schemaError, setSchemaError] = useState<Error | null>(null)

  const schema = useMemo(() => {
    setSchemaError(null)

    const fsMap = new Map<string, string>()
    fsMap.set("/schema.ts", tsInterfaceForSchema)
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
      return result
    } catch (error: any) {
      setSchemaError(error)
      console.error(error)
    }
    return null
  }, [tsInterfaceForSchema, setSchemaError])

  // We want the global side-effect from this
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _scopeEvaled = useMemo(() => {
    try {
      setScopeEvalError(null)
      return eval(`scopeResult = ${scopeString}; scopeResult`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setScopeEvalError(e)
      return null
    }
  }, [scopeString])

  useEffect(() => {
    localStorage.setItem("expressionString", expressionString)
    localStorage.setItem("scopeData", scopeString)
    localStorage.setItem("ts", tsInterfaceForSchema)

    const options = new URLSearchParams(document.location.search)
    if (expressionString !== initialExpressionString) options.set("expression", lzstring.compressToEncodedURIComponent(expressionString))
    if (scopeString !== initialScopeString) options.set("scope", lzstring.compressToEncodedURIComponent(scopeString))
    if (tsInterfaceForSchema != initialTSInterfaceForSchema) options.set("ts", lzstring.compressToEncodedURIComponent(tsInterfaceForSchema))

    const newUrl = `${document.location.origin}${document.location.pathname}?${options.toString()}`
    window.history.replaceState({}, "", newUrl)
  }, [scopeString, expressionString, tsInterfaceForSchema])

  const [expressionEvalError, setExpressionEvalError] = useState<Error | null>(null)
  const expressionRunResult = useMemo(() => {
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
        scopeResult,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setExpressionEvalError(e)
      return null
    }
  }, [expressionString])

  return (
    <RootContext.Provider
      value={{
        schema,
        schemaError,
        tsInterfaceForSchema,
        setTSInterfaceForSchema,

        expressionString,
        expressionEvalError,
        setExpressionString,
        scopeString,
        setScopeString,
        scopeEvalError,
        expressionRunResult,
      }}
    >
      {children}
    </RootContext.Provider>
  )
}

const initialTSInterfaceForSchema = `export type Scope {
    /** Your user account */
    user: User
}

/** My Type */
type User {
    /** User's ID */
    id: string
    /** Their name */
    name: string
    /** Their first name + last name */
    displayName: string
}`
const initialExpressionString = "user.id"
const initialScopeString = '{ user: { id: "123", name: "Jane Doe" }, data: { a:[ 1, 2, 3]} }'
