import { Lexer } from "angular-expressions"

export const expressionInspector = (expression: string, config?: { scope: object }) => {
  const scope: any = config?.scope || {}

  const lexer = new Lexer()
  // console.log(lexer)
  if (!("lex" in lexer)) throw new Error("Angular Expressions' Lexer does not have an 'ast' method, which is needed for this tool.")

  // @ts-expect-error - we check above
  const tokens: any[] = lexer.lex(expression)

  const isIdentifier = (token: any): token is IdentifierToken => "index" in token && "text" in token && "identifier" in token
  const isDot = (token: any): token is DotToken => "index" in token && "text" in token && token.text === "."

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

      return {
        char: expression[position],
        chain: objectPath,
        path: objectPath.map((token) => token.text).join(""),
        scopeObject,
        completions: onDot ? Object.keys(scopeObject) : Object.keys(scopeObject).filter((key) => key.startsWith(expression[position])),
      }
    },
    info: {
      tokens,
    },
  }
}

type IdentifierToken = { index: number; text: string; identifier: true }
type DotToken = { index: number; text: "." }
type OperatorToken = { index: number; text: string; operator: true }
