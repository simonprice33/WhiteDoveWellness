import { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Eraser, Check } from 'lucide-react';

export default function SignaturePad({ value, onChange, label = "Signature" }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Set up canvas
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Load existing signature if provided
    if (value && value.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSignature(true);
      };
      img.src = value;
    }
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.closePath();
    setIsDrawing(false);
    
    // Save signature as base64
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {hasSignature && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={clearSignature}
            className="text-slate-500 h-7 px-2"
          >
            <Eraser size={14} className="mr-1" /> Clear
          </Button>
        )}
      </div>
      <div className="relative border-2 border-dashed border-slate-200 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full h-[120px] touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-300 text-sm">Sign here</p>
          </div>
        )}
        {/* Signature line */}
        <div className="absolute bottom-4 left-4 right-4 border-b border-slate-200" />
      </div>
      {hasSignature && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <Check size={12} />
          <span>Signature captured</span>
        </div>
      )}
    </div>
  );
}
