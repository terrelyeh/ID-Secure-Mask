export interface WatermarkSettings {
  text: string;
  color: string;
  fontSize: number;
  opacity: number;
  rotation: number;
  gap: number;
  offsetX: number;
  offsetY: number;
  style: 'single' | 'tiled';
  printMode: 'fit' | 'id_card' | 'passport';
  includeDate: boolean;         // Feature 2: auto-insert today's date
  fontFamily: string;           // Feature 4: font selection
}

export const DEFAULT_SETTINGS: WatermarkSettings = {
  text: '僅供身分驗證使用，他用無效',
  color: '#000000',
  fontSize: 24,
  opacity: 0.15,
  rotation: -30,
  gap: 150,
  offsetX: 0,
  offsetY: 0,
  style: 'tiled',
  printMode: 'fit',
  includeDate: false,
  fontFamily: 'Noto Sans TC',
};

// Feature 1: Preset watermark templates
export const WATERMARK_TEMPLATES = [
  { label: '申請租屋', text: '僅供租屋申請使用' },
  { label: '銀行開戶', text: '僅供銀行開戶使用' },
  { label: '應徵工作', text: '僅供求職應徵使用' },
  { label: '線上驗證', text: '僅供線上身分驗證使用' },
  { label: '政府申辦', text: '僅供政府業務申辦使用' },
  { label: '保險申請', text: '僅供保險申請使用' },
];

// Feature 4: Available fonts (all loaded via Google Fonts)
export const FONT_OPTIONS = [
  { label: 'Noto Sans TC（思源黑體）', value: 'Noto Sans TC' },
  { label: 'Noto Serif TC（思源宋體）', value: 'Noto Serif TC' },
  { label: 'Courier New（等寬）', value: 'Courier New' },
  { label: 'Arial', value: 'Arial' },
];