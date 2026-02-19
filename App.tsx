import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, AlertCircle, ShieldCheck, FileType } from 'lucide-react';
import { Controls } from './components/Controls';
import { WatermarkSettings, DEFAULT_SETTINGS } from './types';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

const App: React.FC = () => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [settings, setSettings] = useState<WatermarkSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Handle Image/PDF Upload
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setIsLoading(true);

    try {
      if (file.type === 'application/pdf') {
        // Handle PDF
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const page = await pdf.getPage(1); // Render first page
        
        const scale = 3.0; // Render at high resolution
        const viewport = page.getViewport({ scale });
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error('Cannot get canvas context');
        
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        
        await page.render({
          canvasContext: tempCtx,
          viewport: viewport
        }).promise;
        
        const imgUrl = tempCanvas.toDataURL('image/png');
        const img = new Image();
        img.onload = () => {
          setImage(img);
          resetSettings(img.width, img.height);
          setIsLoading(false);
        };
        img.src = imgUrl;

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
      console.error("Error processing file:", error);
      alert("檔案處理失敗，請確認檔案格式是否正確。");
      setIsLoading(false);
    }
  };

  const resetSettings = (width: number, height: number) => {
    // Automatically adjust font size based on image resolution
    // Previous ratio was / 20, increased to / 12 for larger default text
    const newFontSize = Math.max(24, Math.floor(Math.min(width, height) / 12));
    
    // Previous gap multiplier was * 6, reduced to * 4 for tighter pattern
    const newGap = Math.max(100, newFontSize * 4);
    
    setSettings(prev => ({ 
      ...prev, 
      fontSize: newFontSize, 
      gap: newGap,
      offsetX: 0,
      offsetY: 0
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
    if (!image) return;
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !image || !canvasRef.current) return;
    e.preventDefault(); // Prevent scrolling on touch devices

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale factor between visual size and actual canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const dx = (e.clientX - lastPos.current.x) * scaleX;
    const dy = (e.clientY - lastPos.current.y) * scaleY;

    lastPos.current = { x: e.clientX, y: e.clientY };

    setSettings(prev => ({
      ...prev,
      offsetX: prev.offsetX + dx,
      offsetY: prev.offsetY + dy
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    if (e.target instanceof Element) {
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  const drawWatermark = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to original image size for high quality
    canvas.width = image.width;
    canvas.height = image.height;

    // Draw original image
    ctx.drawImage(image, 0, 0);

    ctx.save();

    // Setup Watermark Style
    ctx.font = `bold ${settings.fontSize}px 'Noto Sans TC', sans-serif`;
    ctx.fillStyle = settings.color;
    ctx.globalAlpha = settings.opacity;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (settings.style === 'single') {
        // Single Mode: Center + Offset
        ctx.translate(canvas.width / 2 + settings.offsetX, canvas.height / 2 + settings.offsetY);
        ctx.rotate((settings.rotation * Math.PI) / 180);
        ctx.fillText(settings.text, 0, 0);
    } else {
        // Tiled Mode: Grid Pattern
        
        // Apply user drag offset first
        ctx.translate(settings.offsetX, settings.offsetY);

        // Rotation logic
        const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((settings.rotation * Math.PI) / 180);
        ctx.translate(-diagonal, -diagonal);

        // Calculate Grid
        const textMetrics = ctx.measureText(settings.text);
        const textWidth = textMetrics.width;
        const stepX = textWidth + settings.gap;
        const stepY = settings.fontSize + settings.gap;

        // Draw Pattern
        for (let y = 0; y < diagonal * 2; y += stepY) {
            for (let x = 0; x < diagonal * 2; x += stepX) {
                // Stagger every other row
                const offsetX = (y / stepY) % 2 === 0 ? 0 : stepX / 2;
                ctx.fillText(settings.text, x + offsetX, y);
            }
        }
    }

    ctx.restore();

  }, [image, settings]);

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

  const handleDownloadPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    // Determine PDF orientation (A4 usually)
    // We stick to A4 Portrait unless the image is fit-to-page and landscape
    const isImageLandscape = image.width > image.height;
    
    // For specific physical sizes (ID Card, Passport), we usually want standard A4 Portrait
    // For 'fit' mode, we match the image orientation to maximize space
    const pdfOrientation = settings.printMode === 'fit' && isImageLandscape ? 'landscape' : 'portrait';

    const doc = new jsPDF({
      orientation: pdfOrientation,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10; // 10mm margin
    
    const imgRatio = image.width / image.height;
    
    let finalWidth, finalHeight;

    if (settings.printMode === 'id_card') {
        // Standard ISO 7810 ID-1 size: 85.60 mm width
        // We set width to 85.6mm, height is calculated by ratio
        finalWidth = 85.6;
        finalHeight = finalWidth / imgRatio;
    } else if (settings.printMode === 'passport') {
        // Standard width for 4x6 photo or similar (approx 10cm or 100mm)
        finalWidth = 100;
        finalHeight = finalWidth / imgRatio;
    } else {
        // Fit to page (Original Logic)
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);
        const pageRatio = maxWidth / maxHeight;
        
        if (imgRatio > pageRatio) {
            finalWidth = maxWidth;
            finalHeight = maxWidth / imgRatio;
        } else {
            finalHeight = maxHeight;
            finalWidth = maxHeight * imgRatio;
        }
    }
    
    // Center the image
    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;

    const imgData = canvas.toDataURL('image/png');
    
    doc.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
    
    // Add a small guide text if in ID/Passport mode
    if (settings.printMode !== 'fit') {
         doc.setFontSize(8);
         doc.setTextColor(150);
         doc.text(`Target Size: ${settings.printMode === 'id_card' ? 'ID Card (8.56cm)' : 'Width 10cm'} | Scale: 100%`, 10, pageHeight - 10);
    }

    doc.save(`secure-mark-${Date.now()}.pdf`);
  };

  const updateSettings = (newSettings: Partial<WatermarkSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-baseline gap-2">
              <span className="text-2xl">證件照浮水印</span>
              <span className="text-slate-400 font-normal text-sm hidden sm:inline">SecureMark</span>
            </h1>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          {/* Left: Canvas / Upload Area */}
          <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
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
                  <canvas 
                    ref={canvasRef} 
                    className={`max-w-full max-h-full object-contain shadow-2xl rounded-lg touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{ maxHeight: '80vh' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
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
            
            {/* Quick tips */}
            {!image && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        { title: '安全隱私', desc: '100% 本地端處理，無上傳風險' },
                        { title: '支援 PDF', desc: '可上傳 PDF 格式，自動轉換首頁' },
                        { title: '拖曳調整', desc: '直接拖曳畫面可調整浮水印位置' }
                    ].map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <h4 className="font-medium text-slate-900 mb-1 flex items-center gap-2">
                              {idx === 1 && <FileType className="w-4 h-4 text-blue-500" />}
                              {item.title}
                            </h4>
                            <p className="text-sm text-slate-500">{item.desc}</p>
                        </div>
                    ))}
                </div>
            )}
          </div>

          {/* Right: Controls */}
          <div className="lg:col-span-4 h-full">
            <Controls 
              settings={settings} 
              updateSettings={updateSettings} 
              onDownload={handleDownload}
              onDownloadPDF={handleDownloadPDF}
              hasImage={!!image}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;