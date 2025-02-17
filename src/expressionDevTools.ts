import { Lexer } from "angular-expressions"
import traverse from "json-schema-traverse"

import { JSONSchema7 } from "json-schema"

export const expressionInspector = (expression: string, config?: { scope?: object; schema?: JSONSchema7 | null }) => {
  const scope: any = config?.scope || {}

  const lexer = new Lexer()
  if (!("lex" in lexer)) throw new Error("Angular Expressions' Lexer does not have an 'ast' method, which is needed for this tool.")

  // @ts-expect-error - we check above
  const tokens: any[] = lexer.lex(expression)

  const isIdentifier = (token: any): token is IdentifierToken => "index" in token && "text" in token && "identifier" in token
  const isDot = (token: any): token is DotToken => "index" in token && "text" in token && token.text === "."

  const pointerMap = new Map<string, traverse.SchemaObject>()
  if (config?.schema)
    traverse(config.schema, {
      cb: function (schema, pointer) {
        pointerMap.set(pointer, schema)
      },
    })

  return {
    /** 0-based  */
    infoAtPosition: (position: number) => {
      let foundIdentifier: IdentifierToken | DotToken | undefined

      // Jump to last if we know the cursor is at the end
      if (position === expression.length) {
        const lastToken = tokens[tokens.length - 1]
        if (isIdentifier(lastToken) || isDot(lastToken)) foundIdentifier = lastToken
      }

      // Go left to find the identifier
      for (const token of tokens) {
        if (!isIdentifier(token) && !isDot(token)) continue
        if (foundIdentifier) continue
        if (position >= token.index && position <= token.index + token.text.length - 1) {
          foundIdentifier = token
        }
      }

      if (!foundIdentifier) return undefined

      const onDot = foundIdentifier.text === "."

      // We need to be able to go backwards now to follow a dot pattern
      const objectPath: (IdentifierToken | DotToken)[] = onDot ? [] : [foundIdentifier]
      const startPoint = tokens.indexOf(foundIdentifier)
      for (let i = startPoint - 1; i >= 0; i--) {
        const token = tokens[i]
        if (isIdentifier(token) || isDot(token)) {
          objectPath.unshift(token)
        } else {
          break
        }
      }

      const scopeObject = objectPath.reduce((acc, token) => {
        if (isIdentifier(token) && acc[token.text]) return acc[token.text]
        return acc
      }, scope)

      let schemaInfo: any = undefined
      if (config?.schema) {
        // We assume that "$ref" is the root of the schema
        const rootSchemaObj = config.schema["$ref"] ? config.schema : config.schema["$ref"]
        // @ts-ignore - TODO: Remove
        const rootPointer = `${(rootSchemaObj?.["$ref"] || "").slice(1)}`

        const root = pointerMap.get(rootPointer)
        if (objectPath.length === 1) schemaInfo = root
        else {
          // TODO:
        }
      }

      const scopeCompletion = Object.keys(scopeObject)
      const schemaCompletion = schemaInfo && schemaInfo.properties ? Object.keys(schemaInfo.properties) : []
      const completions = [...scopeCompletion, ...schemaCompletion]

      const lastToken = objectPath[objectPath.length - 1]

      return {
        char: expression[position],
        chain: objectPath,
        path: objectPath.map((token) => token.text).join(""),
        scopeObject,
        completions: onDot ? completions : completions.filter((key) => key.startsWith(lastToken.text)),
        schemaInfo,
      }
    },
    info: {
      tokens,
    },
  }
}

type IdentifierToken = { index: number; text: string; identifier: true }
type DotToken = { index: number; text: "." }
