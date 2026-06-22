"use client";

import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { latex } from "codemirror-lang-latex";
import { useEffect, useRef } from "react";

import { cmExtensions } from "./cm-theme";

interface LatexEditorCmProps {
  className?: string;
  onChange: (value: string) => void;
  onRecompile: () => void;
  onRedo: () => void;
  onSave: () => void;
  onUndo: () => void;
  value: string;
}

export function LatexEditorCm({
  value,
  onChange,
  onSave,
  onRecompile,
  onUndo,
  onRedo,
  className,
}: LatexEditorCmProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only setup, refs avoid stale closures
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const onChangeRef = { current: onChange };
    const saveRef = { current: onSave };
    const recompileRef = { current: onRecompile };
    const undoRef = { current: onUndo };
    const redoRef = { current: onRedo };
    const valueRef = { current: value };

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const cmKeymap = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          saveRef.current();
          return true;
        },
      },
      {
        key: "Mod-Shift-Enter",
        run: () => {
          recompileRef.current();
          return true;
        },
      },
      {
        key: "Mod-z",
        run: () => {
          undoRef.current();
          return true;
        },
      },
      {
        key: "Mod-y",
        run: () => {
          redoRef.current();
          return true;
        },
      },
      {
        key: "Mod-Shift-z",
        run: () => {
          redoRef.current();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: valueRef.current,
      extensions: [
        basicSetup,
        latex({
          autoCloseTags: true,
          autoCloseBrackets: true,
          enableLinting: true,
          enableTooltips: true,
          enableAutocomplete: true,
          fileName: "main.tex",
        }),
        EditorView.lineWrapping,
        ...cmExtensions,
        updateListener,
        cmKeymap,
      ],
    });

    const view = new EditorView({
      state,
      parent: container,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      className={`min-h-0 flex-1 overflow-auto ${className ?? ""}`}
      ref={containerRef}
    />
  );
}
