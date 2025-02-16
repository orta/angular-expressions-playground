import { useCallback, useMemo, useRef, useState } from "react"
import MonacoEditor, { EditorDidMount, EditorWillMount, monaco } from "react-monaco-editor"
// https://github.com/react-monaco-editor/react-monaco-editor/issues/316#issuecomment-2132159796
import "monaco-editor/esm/vs/editor/editor.all.js"

import { expressionInspector } from "./expressionDevTools"

const language = "expression"

export const ExpressionEditor = (props: { expressionString: string; scope: object; setExpressionString: (str: string) => void }) => {
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
    (e, m) => {
      console.log("editor mounted")
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
        triggerCharacters: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
        provideCompletionItems: (model, position) => {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          })

          const tools = expressionInspector(props.expressionString, { scope: props.scope })
          const info = tools.infoAtPosition(textUntilPosition.length - 1)

          return {
            incomplete: false,
            suggestions: Object.keys(info?.completions || {}).map((label) => ({
              label,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: label,
              range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            })),
          }
        },
      })

      m.languages.registerHoverProvider(language, {
        provideHover: (model, position) => {
          console.log("hover")
          console.log(position)
          const tools = expressionInspector(model.getValue(), { scope: props.scope })
          const info = tools.infoAtPosition(position.column - 1)

          if (info) {
            return {
              contents: [{ value: info.path }, { value: JSON.stringify(info.scopeObject, null, 2) }],
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
          fontSize: 16,
          padding: { top: 5, bottom: 0 },
          minimap: { enabled: false },
          selectionHighlight: false,

          // Single line mode
          wordWrap: "on",
          wrappingIndent: "none",
          wrappingStrategy: "advanced",
          scrollBeyondLastLine: false,
          overviewRulerLanes: 0,

          // Hide left gutter, https://github.com/Microsoft/vscode/issues/30795
          lineNumbers: "off",
          showFoldingControls: "never",
          folding: false,
          glyphMargin: false,
          renderLineHighlight: "none",
          lineNumbersMinChars: 0,
        }}
        onChange={props.setExpressionString}
        value={props.expressionString}
        editorWillMount={editorWillMount}
        editorDidMount={editorMounted}
      />
    </div>
  )
}
