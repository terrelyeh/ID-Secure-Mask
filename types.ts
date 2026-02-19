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
  printMode: 'fit' | 'id_card' | 'passport'; // New setting
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
};