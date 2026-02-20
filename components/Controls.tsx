import React, { useState } from 'react';
import {
  Sparkles, Type, Palette, Move, Maximize, FileText, RotateCcw,
  Grid3x3, Square, Download, FileDown, Ruler, Calendar, Columns,
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
  showOriginal: boolean;
  onTogglePreview: (show: boolean) => void;
}

// ── Section card with accent header ──────────────────────────────
const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="rounded-xl border border-slate-200 overflow-hidden">
    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
      <div className="w-0.5 h-3.5 rounded-full bg-blue-500" />
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
    <div className="px-4 py-4 space-y-4 bg-white">
      {children}
    </div>
  </div>
);

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
    <div className="flex flex-col gap-3 bg-slate-100 rounded-xl shadow-sm border border-slate-200 h-full overflow-y-auto p-3">

      {/* ── Header ────────────────────────────────── */}
      <div className="px-2 pt-1 pb-1">
        <h3 className="text-base font-bold text-slate-900">浮水印設定</h3>
        <p className="text-xs text-slate-400 mt-0.5">自定義您的浮水印樣式</p>
      </div>

      {/* ══ Section 1: 文字 ════════════════════════ */}
      <Section label="文字">

        {/* 1a. 模板快選 — dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">快速套用模板</label>
          <select
            value={WATERMARK_TEMPLATES.find(t => t.text === settings.text)?.text ?? ''}
            onChange={(e) => {
              if (e.target.value) updateSettings({ text: e.target.value });
            }}
            className="w-full text-sm rounded-md border border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 text-slate-700"
          >
            <option value="">── 選擇模板 ──</option>
            {WATERMARK_TEMPLATES.map((tpl) => (
              <option key={tpl.label} value={tpl.text}>
                {tpl.label}
              </option>
            ))}
          </select>
        </div>

        {/* 1b. AI 智慧撰寫 */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            AI 智慧撰寫
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={intentInput}
              onChange={(e) => setIntentInput(e.target.value)}
              placeholder="申請租屋、開銀行戶頭…"
              className="min-w-0 flex-1 text-sm rounded-md border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2"
              onKeyDown={(e) => e.key === 'Enter' && handleSuggestion()}
            />
            <Button
              variant="primary"
              onClick={handleSuggestion}
              isLoading={isSuggesting}
              className="shrink-0 text-xs px-3 py-2"
              disabled={!intentInput.trim()}
            >
              生成
            </Button>
          </div>
        </div>

        {/* 1c. 文字內容 */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5" />
            文字內容
          </label>
          <input
            type="text"
            value={settings.text}
            onChange={(e) => updateSettings({ text: e.target.value })}
            className="w-full rounded-md border border-slate-200 bg-white shadow-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 text-sm text-slate-900"
            placeholder="輸入浮水印文字…"
          />
        </div>

        {/* 1d. 自動加入今日日期 */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 cursor-pointer select-none">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            自動加入今日日期
            <span className="text-slate-400 font-normal">
              ({new Date().toLocaleDateString('zh-TW')})
            </span>
          </label>
          <button
            role="switch"
            aria-checked={settings.includeDate}
            onClick={() => updateSettings({ includeDate: !settings.includeDate })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${settings.includeDate ? 'bg-amber-500' : 'bg-slate-200'
              }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${settings.includeDate ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
            />
          </button>
        </div>
      </Section>

      {/* ══ Section 2: 樣式 ════════════════════════ */}
      <Section label="樣式">

        {/* 2a. 字型 */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">字型</label>
          <select
            value={settings.fontFamily}
            onChange={(e) => updateSettings({ fontFamily: e.target.value })}
            className="w-full text-sm rounded-md border border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 text-slate-700"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* 2b. 排版樣式 */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">排版</label>
          <div className="grid grid-cols-2 gap-2">
            {(['tiled', 'single'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => updateSettings({ style: mode })}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${settings.style === mode
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
              >
                {mode === 'tiled' ? <><Grid3x3 className="w-3.5 h-3.5" />滿版鋪滿</> : <><Square className="w-3.5 h-3.5" />單一置中</>}
              </button>
            ))}
          </div>
        </div>

        {/* 2c. 顏色 + 不透明度 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />顏色
            </label>
            <input
              type="color"
              value={settings.color}
              onChange={(e) => updateSettings({ color: e.target.value })}
              className="h-9 w-full cursor-pointer rounded border border-slate-200 p-1"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">
              透明度 {Math.round(settings.opacity * 100)}%
            </label>
            <input
              type="range" min="0.05" max="1" step="0.05"
              value={settings.opacity}
              onChange={(e) => updateSettings({ opacity: parseFloat(e.target.value) })}
              className="w-full mt-2 accent-blue-600"
            />
          </div>
        </div>

        {/* 2d. 字體大小 */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <Maximize className="w-3.5 h-3.5" />字體大小 ({settings.fontSize}px)
          </label>
          <input
            type="range" min="12" max="1000"
            value={settings.fontSize}
            onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
            className="w-full accent-blue-600"
          />
        </div>

        {/* 2e. 密度間距 (tiled only) */}
        {settings.style === 'tiled' && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5" />間距 ({settings.gap}px)
              </label>
              <button
                onClick={() => updateSettings({ offsetX: 0, offsetY: 0 })}
                className="text-[11px] text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />重置位置
              </button>
            </div>
            <input
              type="range" min="50" max="3000"
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
              className="text-[11px] text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />重置位置
            </button>
          </div>
        )}

        {/* 2f. 旋轉 */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />旋轉角度 ({settings.rotation}°)
          </label>
          <input
            type="range" min="-90" max="90"
            value={settings.rotation}
            onChange={(e) => updateSettings({ rotation: parseInt(e.target.value) })}
            className="w-full accent-blue-600"
          />
        </div>
      </Section>

      {/* ══ Section 3: 輸出 ════════════════════════ */}
      <Section label="輸出">

        {/* 3a. 預覽切換 */}
        {hasImage && (
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Columns className="w-3.5 h-3.5" />預覽模式
            </label>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 text-xs font-medium">
              <button
                onClick={() => onTogglePreview(false)}
                className={`px-3 py-1.5 transition-colors ${!showOriginal ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                含浮水印
              </button>
              <button
                onClick={() => onTogglePreview(true)}
                className={`px-3 py-1.5 transition-colors ${showOriginal ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                原始圖片
              </button>
            </div>
          </div>
        )}

        {/* 3b. PDF 列印尺寸 */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5" />PDF 列印尺寸
          </label>
          <select
            value={settings.printMode}
            onChange={(e) => updateSettings({ printMode: e.target.value as any })}
            className="w-full text-sm rounded-md border border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 text-slate-700"
          >
            <option value="fit">A4 滿版（自動縮放）</option>
            <option value="id_card">證件尺寸（寬 8.56cm）</option>
            <option value="passport">護照 / 照片（寬 10cm）</option>
          </select>
          {settings.printMode !== 'fit' && (
            <p className="text-[11px] text-amber-600">
              列印時請選「實際大小」，勿縮放。
            </p>
          )}
        </div>

        {/* 3c. Download buttons */}
        <Button
          variant="secondary"
          className="w-full py-2.5 shadow-sm"
          onClick={onDownload}
          disabled={!hasImage}
        >
          <Download className="w-4 h-4 mr-2" />
          下載 PNG
        </Button>

        <Button
          variant="outline"
          className="w-full py-2.5 border-slate-200 hover:bg-slate-50"
          onClick={onDownloadPDF}
          disabled={!hasImage}
        >
          <FileDown className="w-4 h-4 mr-2 text-red-500" />
          下載 PDF（A4 列印）
        </Button>
      </Section>
    </div>
  );
};