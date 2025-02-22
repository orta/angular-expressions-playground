import { useCallback, useMemo, useRef, useState } from "react"
import MonacoEditor, { EditorDidMount, EditorWillMount, monaco } from "react-monaco-editor"
import { JSONSchema7 } from "json-schema"

import { expressionInspector } from "./expressionDevTools"
import { defaultMonacoSettings } from "./monacoConstants"

const language = "expression"

// We need a thunk to get access to the latest info from the expression editor.
// This technique is a hack, because it only works with one expression editor per page.
// However, thats fine for this sandbox.
let getEditorTools = (text: string) => expressionInspector(text)

export const ExpressionEditor = (props: {
  expressionString: string
  scope: object
  schema: JSONSchema7 | null
  setExpressionString: (str: string) => void
}) => {
  const [height, setHeight] = useState(34)
  const wrapperElement = useRef<HTMLDivElement>(null)
  const setDefaultHeight = useRef(false)

  // When the inner content height changes, handle the resize
  const updateHeight = useCallback((e: monaco.editor.IContentSizeChangedEvent) => {
    if (e.contentHeightChanged || !setDefaultHeight.current) {
      setHeight(e.contentHeight)
      setDefaultHeight.current = true
    }
  }, [])

  const tools = useMemo(() => {
    return expressionInspector(props.expressionString, { scope: props.scope })
  }, [props.expressionString, props.scope])

  const editorMounted = useCallback<EditorDidMount>(
    (e) => {
      // Handle width re-sizing
      if (wrapperElement.current) {
        const monacoWatcher = new ResizeObserver(() => e.layout())
        monacoWatcher.observe(wrapperElement.current)
      }

      e.onDidContentSizeChange(updateHeight)

      e.onDidChangeCursorPosition((e) => {
        const info = tools.infoAtPosition(e.position.column - 1)
        if (info) {
          console.log(info)
        }
      })
    },

    [updateHeight, tools]
  )

  getEditorTools = (text) => {
    const res = expressionInspector(text, { scope: props.scope, schema: props.schema })
    return res
  }

  const editorWillMount = useCallback<EditorWillMount>(
    (m) => {
      m.languages.register({ id: language })

      m.languages.setMonarchTokensProvider(language, {
        tokenizer: {
          root: [
            [/\d+/, "constant"],
            [/[a-zA-Z_]\w*/, "variable"],
            [/[+\-*/]/, "operator"],
            [/[()]/, "bracket"],
          ],
        },
      })
      m.languages.setLanguageConfiguration(language, {
        comments: { lineComment: "//", blockComment: ["/*", "*/"] },
        brackets: [
          ["{", "}"],
          ["[", "]"],
          ["(", ")"],
        ],
        autoClosingPairs: [
          { open: "{", close: "}" },
          { open: "[", close: "]" },
          { open: "(", close: ")" },
        ],
      })

      // auto complete
      m.languages.registerCompletionItemProvider(language, {
        triggerCharacters: [".", " "],
        provideCompletionItems: (model, position) => {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          })

          const tools = getEditorTools(textUntilPosition)
          const info = tools.infoAtPosition(textUntilPosition.length - 1)

          // Handle accepting the auto-complete mid-way through a word
          let overlappingLetters: number | undefined = undefined
          if (info)
            textUntilPosition
              .split("")
              .reverse()
              .forEach((char, index) => {
                if (typeof overlappingLetters !== "undefined") return
                if (char === " " || char === "." || char === "(" || char === ")" || char === "]") {
                  overlappingLetters = index
                }
              })

          return {
            incomplete: false,
            suggestions: (info?.completions || []).map((c) => ({
              ...c,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: c.label.slice(overlappingLetters),
              range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            })),
          }
        },
      })

      m.languages.registerHoverProvider(language, {
        provideHover: (model, position) => {
          const tools = getEditorTools(model.getValue())
          const info = tools.infoAtPosition(position.column - 1)

          if (info) {
            return {
              contents: [{ value: info.schemaInfo?.description }, { value: JSON.stringify(info.scopeObject, null, 2) }],
            }
          }
        },
      })
    },

    []
  )

  return (
    <div ref={wrapperElement} className="form-control me-2">
      <MonacoEditor
        width="100%"
        height={`${height}px`}
        language="expression"
        options={{
          // Style
          fontSize: 24,
          padding: { top: 5, bottom: 0 },

          // Single line mode
          wordWrap: "on",
          wrappingIndent: "none",
          wrappingStrategy: "advanced",
          scrollBeyondLastLine: false,
          overviewRulerLanes: 0,

          ...defaultMonacoSettings,
        }}
        onChange={props.setExpressionString}
        value={props.expressionString}
        editorWillMount={editorWillMount}
        editorDidMount={editorMounted}
      />
    </div>
  )
}
