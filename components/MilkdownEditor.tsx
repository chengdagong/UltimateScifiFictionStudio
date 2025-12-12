
import React, { useEffect } from 'react';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { nord } from '@milkdown/theme-nord';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { history } from '@milkdown/plugin-history';

import { useWorldAdminMenu } from '../hooks/useWorldAdminMenu';

interface MilkdownEditorProps {
  content: string;
  onChange: (text: string) => void;
  readOnly?: boolean;
  onAnalysisRequest?: (text: string) => void;
}

const InnerEditor: React.FC<MilkdownEditorProps> = ({ content, onChange, readOnly }) => {
  useEditor((root) => {
    return Editor.make()
      .config(nord)
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);

        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          onChange(markdown);
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener);
  }, []);

  return <Milkdown />;
};

const MilkdownEditor: React.FC<MilkdownEditorProps> = (props) => {
  const { handleContextMenu, renderMenu } = useWorldAdminMenu({
    onAnalyze: (text) => props.onAnalysisRequest?.(text)
  });

  return (
    <div
      className="h-full relative group"
      onContextMenu={(e) => {
        if (props.onAnalysisRequest) {
          handleContextMenu(e, props.content);
        }
      }}
    >
      {renderMenu()}
      <div className="h-full overflow-y-auto custom-editor-wrapper">
        <MilkdownProvider>
          <InnerEditor {...props} />
        </MilkdownProvider>
      </div>
      <style>{`
        :root {
          --nord0: #ffffff;
          --nord1: #f1f5f9;
          --nord2: #e2e8f0;
          --nord3: #cbd5e1;
          --nord4: #334155;
          --nord5: #475569;
          --nord6: #64748b;
          --nord10: #4f46e5;
        }
        .milkdown .editor {
           max-width: 800px;
           margin: 0 auto;
           padding: 2rem 1.5rem !important; /* Mobile padding */
           font-family: "Noto Serif SC", serif;
           color: #1e293b;
           line-height: 1.8;
           min-height: 100% !important; 
           height: auto !important;
           background: white !important;
        }
        @media (min-width: 768px) {
          .milkdown .editor {
            padding: 4rem 2rem !important; /* Desktop padding */
          }
        }
        .milkdown {
          height: auto;
          min-height: 100%;
          overflow: visible; 
        }
        .milkdown h1, .milkdown h2, .milkdown h3 {
           color: #0f172a;
           font-weight: 700;
        }
        .milkdown h1 { font-size: 2em; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; margin-top: 1rem; }
        .milkdown h2 { font-size: 1.5em; margin-top: 2rem; }
        .milkdown h3 { font-size: 1.25em; margin-top: 1.5rem; color: #334155; }
        .milkdown blockquote {
           border-left: 4px solid #cbd5e1;
           padding-left: 1rem;
           color: #64748b;
           font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default MilkdownEditor;
