
import React, { useState, useEffect } from 'react';
import { ApiSettings, ApiProvider } from '../types';
import { X, Save, Key, Globe, Box, RotateCcw, Server, Layout, Monitor } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ApiSettings;
  onSave: (newSettings: ApiSettings) => void;
}

const DEFAULT_GOOGLE_SETTINGS: ApiSettings = {
  provider: 'google',
  apiKey: '',
  baseUrl: '',
  model: 'gemini-2.5-flash',
  minimalUI: false
};

const DEFAULT_OPENAI_SETTINGS: ApiSettings = {
  provider: 'openai',
  apiKey: '',
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'google/gemini-flash-1.5', // Common OpenRouter model slug
  minimalUI: false
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<ApiSettings>(settings);

  // Sync with props when modal opens or settings change externally
  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
    }
  }, [isOpen, settings]);

  const handleChange = (key: keyof ApiSettings, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleProviderChange = (provider: ApiProvider) => {
    if (provider === formData.provider) return;
    
    if (provider === 'openai') {
       setFormData(prev => ({
          ...prev,
          provider: 'openai',
          baseUrl: DEFAULT_OPENAI_SETTINGS.baseUrl,
          model: DEFAULT_OPENAI_SETTINGS.model
       }));
    } else {
       setFormData(prev => ({
          ...prev,
          provider: 'google',
          baseUrl: '', 
          model: 'gemini-2.5-flash'
       }));
    }
  };

  const handleSave = () => {
    const cleanedData = { ...formData };
    if (cleanedData.baseUrl && cleanedData.baseUrl.endsWith('/')) {
       cleanedData.baseUrl = cleanedData.baseUrl.slice(0, -1);
    }
    onSave(cleanedData);
    onClose();
  };

  const handleReset = () => {
    if (confirm('重置将恢复默认设置。确定吗？')) {
      const defaults = formData.provider === 'google' ? DEFAULT_GOOGLE_SETTINGS : DEFAULT_OPENAI_SETTINGS;
      setFormData({
          ...defaults,
          minimalUI: formData.minimalUI // Preserve UI setting preference on API reset
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full h-full md:h-auto md:w-auto md:rounded-xl md:shadow-2xl md:max-w-md overflow-hidden flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            全局设置
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          
          {/* API Settings Section */}
          <div className="space-y-4">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 border-b border-slate-100 pb-1">
                <Server className="w-3.5 h-3.5" /> API 配置
             </label>

              {/* Provider Selector */}
              <div className="space-y-2">
                 <div className="flex gap-2">
                    <button 
                      onClick={() => handleProviderChange('google')}
                      className={`flex-1 py-3 md:py-2 px-3 rounded-lg border text-sm font-bold transition-all ${formData.provider === 'google' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                       Google GenAI
                    </button>
                    <button 
                      onClick={() => handleProviderChange('openai')}
                      className={`flex-1 py-3 md:py-2 px-3 rounded-lg border text-sm font-bold transition-all ${formData.provider === 'openai' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                       OpenAI / Compatible
                    </button>
                 </div>
              </div>

              {/* Base URL (Conditional) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Base URL (Reverse Proxy)
                </label>
                <input 
                  type="text"
                  value={formData.baseUrl}
                  onChange={e => handleChange('baseUrl', e.target.value)}
                  placeholder={formData.provider === 'google' ? "例如: https://my-proxy.com (解决 Region 问题)" : "https://openrouter.ai/api/v1"}
                  className="w-full px-3 py-3 md:py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
                <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                  {formData.provider === 'google' 
                     ? "如果您在 API 调用时遇到 Region not supported 错误，请在此填写反向代理地址。" 
                     : "OpenAI 兼容接口地址 (例如 OpenRouter, OneAPI)"}
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> API Key
                </label>
                <input 
                  type="password"
                  value={formData.apiKey}
                  onChange={e => handleChange('apiKey', e.target.value)}
                  placeholder={`输入 ${formData.provider === 'google' ? 'Google' : 'Provider'} API Key`}
                  className="w-full px-3 py-3 md:py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
              </div>

              {/* Model Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5" /> Model Name
                </label>
                <input 
                  type="text"
                  value={formData.model}
                  onChange={e => handleChange('model', asString(e.target.value))}
                  placeholder="e.g. gemini-2.5-flash"
                  className="w-full px-3 py-3 md:py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
                {formData.provider === 'google' && (
                  <div className="flex gap-2 text-[10px] text-indigo-600">
                    <span className="cursor-pointer hover:underline" onClick={() => handleChange('model', 'gemini-2.5-flash')}>Flash</span>
                    <span className="cursor-pointer hover:underline" onClick={() => handleChange('model', 'gemini-3-pro-preview')}>Pro</span>
                  </div>
                )}
                {formData.provider === 'openai' && (
                  <div className="flex gap-2 text-[10px] text-emerald-600">
                     <span className="cursor-pointer hover:underline" onClick={() => handleChange('model', 'google/gemini-flash-1.5')}>Gemini Flash</span>
                     <span className="cursor-pointer hover:underline" onClick={() => handleChange('model', 'gpt-4o')}>GPT-4o</span>
                  </div>
                )}
              </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0 safe-area-pb">
          <button 
             onClick={handleReset}
             className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
             <RotateCcw className="w-3 h-3" /> 重置默认
          </button>
          <button 
             onClick={handleSave}
             className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm flex items-center gap-2"
          >
             <Save className="w-4 h-4" /> 保存配置
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper for type safety if needed, though handleChange type handles it
const asString = (val: string | boolean) => String(val);

export default SettingsModal;
