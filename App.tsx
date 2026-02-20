import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, AlertCircle, ShieldCheck } from 'lucide-react';
import { Controls } from './components/Controls';
import { WatermarkSettings, DEFAULT_SETTINGS } from './types';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

const getTodayStr = () => new Date().toLocaleDateString('zh-TW');

const App: React.FC = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [settings, setSettings] = useState<WatermarkSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Feature 3: before/after preview toggle
  const [showOriginal, setShowOriginal] = useState(false);

  // Feature 5: store all PDF pages as images
  const [pdfPages, setPdfPages] = useState<HTMLImageElement[]>([]);

  // Handle Image/PDF Upload
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setPdfPages([]);
    setShowOriginal(false);

    try {
      if (file.type === 'application/pdf') {
        // Feature 5: render ALL pdf pages
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const scale = 3.0;

        const pages: HTMLImageElement[] = [];
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) throw new Error('Cannot get canvas context');

          tempCanvas.width = viewport.width;
          tempCanvas.height = viewport.height;

          await page.render({ canvasContext: tempCtx, viewport }).promise;

          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => { pages.push(img); resolve(); };
            img.src = tempCanvas.toDataURL('image/png');
          });
        }

        setPdfPages(pages);
        setImage(pages[0]);
        resetSettings(pages[0].width, pages[0].height);
        setIsLoading(false);

      } else {
        // Handle Image
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            setImage(img);
            resetSettings(img.width, img.height);
            setIsLoading(false);
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('檔案處理失敗，請確認檔案格式是否正確。');
      setIsLoading(false);
    }
  };

  const resetSettings = (width: number, height: number) => {
    const newFontSize = Math.max(24, Math.floor(Math.min(width, height) / 12));
    const newGap = Math.max(100, newFontSize * 4);
    setSettings((prev) => ({
      ...prev,
      fontSize: newFontSize,
      gap: newGap,
      offsetX: 0,
      offsetY: 0,
    }));
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image || showOriginal) return;
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !image || !canvasRef.current) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const dx = (e.clientX - lastPos.current.x) * scaleX;
    const dy = (e.clientY - lastPos.current.y) * scaleY;
    lastPos.current = { x: e.clientX, y: e.clientY };

    setSettings((prev) => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    if (e.target instanceof Element) {
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  const drawWatermarkOnCanvas = useCallback(
    (canvas: HTMLCanvasElement, img: HTMLImageElement, preview = false) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      if (preview) return;

      ctx.save();
      ctx.fillStyle = settings.color;
      ctx.globalAlpha = settings.opacity;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const mainText = settings.text;
      const dateText = settings.includeDate ? getTodayStr() : null;
      const dateFontSize = Math.round(settings.fontSize * 0.65);
      // Line spacing: half main font below baseline, half date font above
      const lineSpacing = Math.round(settings.fontSize * 0.15);
      // Vertical center offset so the two-line block is centered
      const blockHalfH = dateText
        ? (settings.fontSize / 2 + lineSpacing + dateFontSize / 2) / 2
        : 0;

      /** Draw one watermark unit at (cx, cy), already translated/rotated */
      const drawUnit = (cx: number, cy: number) => {
        ctx.font = `bold ${settings.fontSize}px '${settings.fontFamily}', sans-serif`;
        ctx.fillText(mainText, cx, cy - (dateText ? blockHalfH : 0));
        if (dateText) {
          ctx.font = `${dateFontSize}px '${settings.fontFamily}', sans-serif`;
          ctx.fillText(dateText, cx, cy + settings.fontSize / 2 + lineSpacing - blockHalfH + dateFontSize / 2);
        }
      };

      if (settings.style === 'single') {
        ctx.translate(canvas.width / 2 + settings.offsetX, canvas.height / 2 + settings.offsetY);
        ctx.rotate((settings.rotation * Math.PI) / 180);
        drawUnit(0, 0);
      } else {
        ctx.translate(settings.offsetX, settings.offsetY);
        const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((settings.rotation * Math.PI) / 180);
        ctx.translate(-diagonal, -diagonal);

        // Measure step size using main text
        ctx.font = `bold ${settings.fontSize}px '${settings.fontFamily}', sans-serif`;
        const textWidth = ctx.measureText(mainText).width;
        const stepX = textWidth + settings.gap;
        const blockH = dateText ? settings.fontSize + lineSpacing + dateFontSize : settings.fontSize;
        const stepY = blockH + settings.gap;

        for (let y = 0; y < diagonal * 2; y += stepY) {
          for (let x = 0; x < diagonal * 2; x += stepX) {
            const ox = (y / stepY) % 2 === 0 ? 0 : stepX / 2;
            drawUnit(x + ox, y + blockH / 2);
          }
        }
      }

      ctx.restore();
    },
    [settings]
  );

  const drawWatermark = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    drawWatermarkOnCanvas(canvas, image, showOriginal);
  }, [image, showOriginal, drawWatermarkOnCanvas]);

  useEffect(() => {
    if (image) {
      const rAF = requestAnimationFrame(drawWatermark);
      return () => cancelAnimationFrame(rAF);
    }
  }, [drawWatermark, image]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `secure-mark-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Feature 5: multi-page PDF download
  const handleDownloadPDF = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const isImageLandscape = image.width > image.height;
    const pdfOrientation =
      settings.printMode === 'fit' && isImageLandscape ? 'landscape' : 'portrait';

    const doc = new jsPDF({ orientation: pdfOrientation, unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Use all PDF pages when available, otherwise just the single image
    const imagesToRender = pdfPages.length > 0 ? pdfPages : [image];

    for (let i = 0; i < imagesToRender.length; i++) {
      const img = imagesToRender[i];
      const imgRatio = img.width / img.height;

      let finalWidth: number, finalHeight: number;

      if (settings.printMode === 'id_card') {
        finalWidth = 85.6;
        finalHeight = finalWidth / imgRatio;
      } else if (settings.printMode === 'passport') {
        finalWidth = 100;
        finalHeight = finalWidth / imgRatio;
      } else {
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;
        const pageRatio = maxWidth / maxHeight;
        if (imgRatio > pageRatio) {
          finalWidth = maxWidth;
          finalHeight = maxWidth / imgRatio;
        } else {
          finalHeight = maxHeight;
          finalWidth = maxHeight * imgRatio;
        }
      }

      const x = (pageWidth - finalWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      // Render watermark onto an offscreen canvas for this page
      const offscreen = document.createElement('canvas');
      drawWatermarkOnCanvas(offscreen, img, false);
      const imgData = offscreen.toDataURL('image/png');

      if (i > 0) doc.addPage();
      doc.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

      if (settings.printMode !== 'fit') {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Target Size: ${settings.printMode === 'id_card' ? 'ID Card (8.56cm)' : 'Width 10cm'} | Page ${i + 1}/${imagesToRender.length}`,
          10,
          pageHeight - 10
        );
      }
    }

    doc.save(`secure-mark-${Date.now()}.pdf`);
  };

  const updateSettings = (newSettings: Partial<WatermarkSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight whitespace-nowrap">
              證件照浮水印
              <span className="text-slate-400 font-normal text-sm ml-2 hidden sm:inline">SecureMark</span>
            </h1>
            <div className="hidden md:flex items-center gap-1.5 ml-2">
              {['🔒 本地處理', '📄 支援 PDF', '↕ 拖曳調整'].map((tag) => (
                <span key={tag} className="text-xs font-medium bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="hidden sm:flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              所有處理皆在瀏覽器端完成，照片不會上傳伺服器
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">

          {/* Left: Canvas / Upload Area */}
          <div className="lg:col-span-8 flex flex-col h-full min-h-[300px] lg:min-h-[500px]">
            <div
              className={`relative flex-1 bg-slate-200/50 rounded-2xl border-2 border-dashed overflow-hidden flex items-center justify-center transition-all duration-200
                ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300'}
                ${!image ? 'hover:border-slate-400 hover:bg-slate-100' : 'border-transparent bg-slate-900'}
              `}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
            >
              {!image ? (
                isLoading ? (
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-4 text-slate-600 font-medium">檔案處理中，請稍候...</p>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                      <Upload className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">上傳證件或 PDF</h3>
                    <p className="text-slate-500 mb-6 max-w-xs mx-auto">
                      拖放照片或 PDF 至此 (支援 JPG, PNG, PDF)
                    </p>
                    <label className="cursor-pointer inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">
                      選擇檔案
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={onFileChange}
                      />
                    </label>
                  </div>
                )
              ) : (
                <div className="relative w-full h-full flex items-center justify-center bg-slate-900/90 p-4">
                  {/* Feature 3: preview label badge */}
                  {showOriginal && (
                    <div className="absolute top-4 left-4 z-10 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow">
                      原始圖片預覽
                    </div>
                  )}
                  <canvas
                    ref={canvasRef}
                    className={`max-w-full max-h-full object-contain shadow-2xl rounded-lg touch-none ${isDragging ? 'cursor-grabbing' : showOriginal ? 'cursor-default' : 'cursor-grab'
                      }`}
                    style={{ maxHeight: '80vh' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    {/* Feature 5: show page count if multi-page */}
                    {pdfPages.length > 1 && (
                      <span className="bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-md text-sm border border-white/10">
                        PDF {pdfPages.length} 頁（下載 PDF 將含全部頁面）
                      </span>
                    )}
                    <label className="cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-md text-sm transition-colors border border-white/10">
                      更換檔案
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,application/pdf"
                        onChange={onFileChange}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right: Controls */}
          <div className="lg:col-span-4 h-full max-h-[85vh] lg:max-h-none overflow-y-auto lg:overflow-visible">
            <Controls
              settings={settings}
              updateSettings={updateSettings}
              onDownload={handleDownload}
              onDownloadPDF={handleDownloadPDF}
              hasImage={!!image}
              showOriginal={showOriginal}
              onTogglePreview={setShowOriginal}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;