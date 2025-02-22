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

      /**
       * This is a direct list of things to look up, not syntax tokens like above
       * so "x.y.z" would be ["x", "y", "z"]
       */
      const lookupPath = [] as string[]
      for (const token of objectPath) {
        if (isIdentifier(token)) lookupPath.push(token.text)
      }

      const scopeObject = objectPath.reduce((acc, token) => {
        if (isIdentifier(token) && acc[token.text]) return acc[token.text]
        return acc
      }, scope)

      let schemaInfo: any = undefined
      // We only support a schema with a core ref
      if (config?.schema) {
        if (!config.schema["$ref"]) {
          console.warn("Schema does not have a $ref, so we cannot provide schema information.")
        } else {
          // We  assume that "$ref" is the root of the schema
          const rootPointer = config.schema["$ref"].slice(1)
          const root = pointerMap.get(rootPointer)

          if (objectPath.length === 1) {
            schemaInfo = root
          } else {
            for (let i = 0; i < objectPath.length; i++) {
              const token = lookupPath[i]
              // Try appending directly. This is a bit naive, because I'm sure there
              // are many ways to describe a path in a schema but it works for now
              const appendedPointer = `${rootPointer}/properties/${token}`
              const child = pointerMap.get(appendedPointer)
              if (child) {
                schemaInfo = child
              }
            }
          }
        }
      }

      // A monaco partial
      type Completion = { label: string; documentation?: string }

      const scopeCompletion = Object.keys(scopeObject)
      const schemaCompletion: Completion[] = []
      for (const key of Object.keys(schemaInfo?.properties || {})) {
        schemaCompletion.push({ label: key, documentation: schemaInfo.properties[key].description })
      }

      const allCompletions: Completion[] = [...scopeCompletion.map((c) => ({ label: c })), ...schemaCompletion]
      // De-dupe
      const completions = allCompletions.filter((c, i) => allCompletions.findIndex((cc) => cc.label === c.label) === i)
      const lastToken = objectPath[objectPath.length - 1]

      return {
        char: expression[position],
        chain: objectPath,
        path: objectPath.map((token) => token.text).join(""),
        scopeObject,
        completions: onDot ? completions : completions.filter((c) => c.label.startsWith(lastToken.text)),
        schemaInfo,
      }
    },
    info: {
      tokens,
    },
  }
}

export type ExpressionInspector = ReturnType<typeof expressionInspector>
export type InfoAtPosition = ReturnType<ExpressionInspector["infoAtPosition"]>

type IdentifierToken = { index: number; text: string; identifier: true }
type DotToken = { index: number; text: "." }
