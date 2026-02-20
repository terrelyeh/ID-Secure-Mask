import React, { useState } from 'react';
import {
  Sparkles, Type, Palette, Move, Maximize, FileText, RotateCcw,
  Grid3x3, Square, Download, FileDown, Ruler, Calendar, Columns,
  AlignLeft
} from 'lucide-react';
import { WatermarkSettings, WATERMARK_TEMPLATES, FONT_OPTIONS } from '../types';
import { Button } from './Button';
import { getWatermarkSuggestion } from '../services/geminiService';

interface ControlsProps {
  settings: WatermarkSettings;
  updateSettings: (newSettings: Partial<WatermarkSettings>) => void;
  onDownload: () => void;
  onDownloadPDF: () => void;
  hasImage: boolean;
  // Feature 3: before/after preview toggle
  showOriginal: boolean;
  onTogglePreview: (show: boolean) => void;
}

export const Controls: React.FC<ControlsProps> = ({
  settings,
  updateSettings,
  onDownload,
  onDownloadPDF,
  hasImage,
  showOriginal,
  onTogglePreview,
}) => {
  const [intentInput, setIntentInput] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSuggestion = async () => {
    if (!intentInput.trim()) return;
    setIsSuggesting(true);
    try {
      const suggestion = await getWatermarkSuggestion(intentInput);
      updateSettings({ text: suggestion });
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-xl shadow-sm border border-slate-200 h-full overflow-y-auto">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">浮水印設定</h3>
        <p className="text-sm text-slate-500">自定義您的浮水印樣式</p>
      </div>

      {/* Feature 1: Template Quick-Select */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <AlignLeft className="w-4 h-4" /> 快速套用模板
        </label>
        <div className="flex flex-wrap gap-2">
          {WATERMARK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => updateSettings({ text: tpl.text })}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${settings.text === tpl.text
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                }`}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Suggestion Section */}
      <div className="bg-blue-50 p-4 rounded-lg space-y-3 border border-blue-100">
        <label className="text-sm font-medium text-blue-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          AI 智慧撰寫
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={intentInput}
            onChange={(e) => setIntentInput(e.target.value)}
            placeholder="例如：申請租屋、開銀行戶頭..."
            className="flex-1 text-sm rounded-md border-blue-200 focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            onKeyDown={(e) => e.key === 'Enter' && handleSuggestion()}
          />
          <Button
            variant="primary"
            onClick={handleSuggestion}
            isLoading={isSuggesting}
            className="shrink-0"
            disabled={!intentInput.trim()}
          >
            生成
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Text Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Type className="w-4 h-4" /> 文字內容
          </label>
          <input
            type="text"
            value={settings.text}
            onChange={(e) => updateSettings({ text: e.target.value })}
            className="w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 text-slate-900"
          />
        </div>

        {/* Feature 2: Auto-insert date */}
        <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
          <label className="text-sm font-medium text-amber-800 flex items-center gap-2 cursor-pointer select-none">
            <Calendar className="w-4 h-4 text-amber-600" />
            自動加入今日日期
            <span className="text-xs text-amber-500 font-normal">
              ({new Date().toLocaleDateString('zh-TW')})
            </span>
          </label>
          <button
            role="switch"
            aria-checked={settings.includeDate}
            onClick={() => updateSettings({ includeDate: !settings.includeDate })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 ${settings.includeDate ? 'bg-amber-500' : 'bg-slate-200'
              }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.includeDate ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
          </button>
        </div>

        {/* Feature 3: Before/After Preview toggle (only when image loaded) */}
        {hasImage && (
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Columns className="w-4 h-4" />
              預覽模式
            </label>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs font-medium">
              <button
                onClick={() => onTogglePreview(false)}
                className={`px-3 py-1.5 transition-colors ${!showOriginal ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
              >
                含浮水印
              </button>
              <button
                onClick={() => onTogglePreview(true)}
                className={`px-3 py-1.5 transition-colors ${showOriginal ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
              >
                原始圖片
              </button>
            </div>
          </div>
        )}

        {/* Feature 4: Font Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Type className="w-4 h-4" /> 字型
          </label>
          <select
            value={settings.fontFamily}
            onChange={(e) => updateSettings({ fontFamily: e.target.value })}
            className="w-full text-sm rounded-md border-slate-300 focus:border-blue-500 focus:ring-blue-500 p-2"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Style Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">排版樣式</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateSettings({ style: 'tiled' })}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${settings.style === 'tiled'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Grid3x3 className="w-4 h-4" />
              滿版鋪滿
            </button>
            <button
              onClick={() => updateSettings({ style: 'single' })}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${settings.style === 'single'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Square className="w-4 h-4" />
              單一置中
            </button>
          </div>
        </div>

        {/* Color & Opacity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Palette className="w-4 h-4" /> 顏色
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.color}
                onChange={(e) => updateSettings({ color: e.target.value })}
                className="h-10 w-full cursor-pointer rounded border border-slate-200 p-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              不透明度 ({Math.round(settings.opacity * 100)}%)
            </label>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={settings.opacity}
              onChange={(e) => updateSettings({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

        {/* Size & Gap */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Maximize className="w-4 h-4" /> 字體大小 ({settings.fontSize}px)
            </label>
            <input
              type="range"
              min="12"
              max="1000"
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>

          {settings.style === 'tiled' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Move className="w-4 h-4" /> 密度間距 ({settings.gap}px)
                </label>
                <button
                  onClick={() => updateSettings({ offsetX: 0, offsetY: 0 })}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                  title="重置位置"
                >
                  <RotateCcw className="w-3 h-3" /> 重置位置
                </button>
              </div>
              <input
                type="range"
                min="50"
                max="3000"
                value={settings.gap}
                onChange={(e) => updateSettings({ gap: parseInt(e.target.value) })}
                className="w-full accent-blue-600"
              />
            </div>
          )}

          {settings.style === 'single' && (
            <div className="flex justify-end">
              <button
                onClick={() => updateSettings({ offsetX: 0, offsetY: 0 })}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                title="重置位置"
              >
                <RotateCcw className="w-3 h-3" /> 重置位置
              </button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4" /> 旋轉角度 ({settings.rotation}°)
            </label>
            <input
              type="range"
              min="-90"
              max="90"
              value={settings.rotation}
              onChange={(e) => updateSettings({ rotation: parseInt(e.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
        {/* PDF Print Size Selection */}
        <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Ruler className="w-4 h-4" /> PDF 列印尺寸
          </label>
          <select
            value={settings.printMode}
            onChange={(e) => updateSettings({ printMode: e.target.value as any })}
            className="w-full text-sm rounded-md border-slate-300 focus:border-blue-500 focus:ring-blue-500 p-2"
          >
            <option value="fit">A4 滿版 (自動縮放)</option>
            <option value="id_card">證件尺寸 (寬 8.56cm)</option>
            <option value="passport">護照/照片 (寬 10cm)</option>
          </select>
          {settings.printMode !== 'fit' && (
            <p className="text-xs text-amber-600">
              *請確保照片已裁切至邊緣，列印時請選「實際大小」。
            </p>
          )}
        </div>

        <Button
          variant="secondary"
          className="w-full py-3 text-lg shadow-md"
          onClick={onDownload}
          disabled={!hasImage}
        >
          <Download className="w-5 h-5 mr-2" />
          原始畫質 (PNG)
        </Button>

        <Button
          variant="outline"
          className="w-full py-2.5 text-base border-slate-300 hover:bg-slate-50"
          onClick={onDownloadPDF}
          disabled={!hasImage}
        >
          <FileDown className="w-5 h-5 mr-2 text-red-600" />
          A4 列印用 (PDF)
        </Button>
      </div>
    </div>
  );
};