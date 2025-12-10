import React, { useState, useEffect } from 'react';
import { Scroll, BookText, Loader2 } from 'lucide-react';
import { WorldModel, StorySegment } from '../types';
import MilkdownEditor from './MilkdownEditor';

interface ChronicleViewProps {
  model: WorldModel;
  storySegments: StorySegment[];
  context: string;
  chronicleText: string;
  setChronicleText: (text: string) => void;
  isSyncing: boolean;
}

const ChronicleView: React.FC<ChronicleViewProps> = ({ 
  chronicleText, 
  setChronicleText,
  isSyncing
}) => {
  // Key to force remount when text changes externally (e.g. sync or load)
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (!isSyncing && chronicleText) {
       setEditorKey(prev => prev + 1);
    }
  }, [isSyncing, chronicleText === '']);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-0 overflow-hidden flex flex-col h-[calc(100vh-160px)] animate-fadeIn">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
        <div>
           <h2 className="text-xl font-serif font-bold text-slate-800 flex items-center gap-2">
             <BookText className="w-5 h-5 text-indigo-700" />
             史书视图 (Chronicle)
           </h2>
           <p className="text-slate-500 text-xs mt-1">
             基于当前的生态系统模型和已发生的故事，生成宏观的历史综述。
             {isSyncing && <span className="text-indigo-600 font-bold ml-2">正在同步最新世界状态...</span>}
           </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-white">
        {isSyncing ? (
             <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 backdrop-blur-sm z-10">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-600 font-serif text-lg">正在编撰新的历史篇章...</p>
             </div>
        ) : (
            chronicleText ? (
              <MilkdownEditor 
                key={editorKey}
                content={chronicleText}
                onChange={setChronicleText}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-stone-400 space-y-6 bg-[#fdfbf7]">
                <div className="w-24 h-24 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200">
                   <Scroll className="w-10 h-10 text-stone-300" />
                </div>
                <div className="text-center max-w-md px-4">
                  <h3 className="text-lg font-serif font-bold text-stone-600 mb-2">历史尚未被记录</h3>
                  <p className="text-sm">点击顶部的“同步世界状态”按钮，让 AI 历史学家为您撰写一部编年史。随后您可以像编辑文档一样直接修改它。</p>
                </div>
              </div>
            )
        )}
      </div>
    </div>
  );
};

export default ChronicleView;