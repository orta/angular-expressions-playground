import { useCallback, useRef, useState } from "react"
import MonacoEditor, { EditorDidMount, EditorWillMount, monaco } from "react-monaco-editor"

export const ExpressionEditor = (props: { expressionString: string; setExpressionString: (str: string) => void }) => {
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

  const editorMounted = useCallback<EditorDidMount>(
    (e, _m) => {
      // Handle width re-sizing
      if (wrapperElement.current) {
        const monacoWatcher = new ResizeObserver(() => e.layout())
        monacoWatcher.observe(wrapperElement.current)
      }

      e.onDidContentSizeChange(updateHeight)
    },
    [updateHeight]
  )

  const editorWillMount = useCallback<EditorWillMount>((m) => {}, [])

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
