import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Crop, Image as ImageIcon } from 'lucide-react';

const ImageCropper = ({ imageSrc, onComplete, onCancel }) => {
    const canvasRef = useRef(null);
    const imgRef = useRef(null);
    const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [quality, setQuality] = useState(0.8);

    useEffect(() => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            imgRef.current = image;
            setCrop({ x: 0, y: 0, width: image.width, height: image.height });
            drawCanvas();
        };
    }, [imageSrc]);

    const drawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas || !imgRef.current) return;
        const ctx = canvas.getContext('2d');
        const img = imgRef.current;

        // Set canvas dimensions based on a max width to fit screen
        const maxWidth = Math.min(window.innerWidth - 80, 800);
        let scale = 1;
        if (img.width > maxWidth) {
            scale = maxWidth / img.width;
        }
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 0.5; // Dim the image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw cropped area
        ctx.globalAlpha = 1;
        const cx = crop.x * scale;
        const cy = crop.y * scale;
        const cw = crop.width * scale;
        const ch = crop.height * scale;

        ctx.save();
        ctx.beginPath();
        ctx.rect(cx, cy, cw, ch);
        ctx.clip();
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Draw crop border
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cw, ch);
    };

    useEffect(() => {
        drawCanvas();
    }, [crop]);

    const getMousePos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        const cssX = e.clientX - rect.left;
        const cssY = e.clientY - rect.top;
        
        // Map CSS display pixels directly to original image pixels
        const scaleX = imgRef.current.width / rect.width;
        const scaleY = imgRef.current.height / rect.height;
        
        return {
            x: cssX * scaleX,
            y: cssY * scaleY
        };
    };

    const handleMouseDown = (e) => {
        const pos = getMousePos(e);
        setDragStart({ x: pos.x, y: pos.y });
        setCrop({ x: pos.x, y: pos.y, width: 0, height: 0 });
        setIsDragging(true);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        const pos = getMousePos(e);
        
        const currentX = pos.x;
        const currentY = pos.y;
        
        const newX = Math.min(dragStart.x, currentX);
        const newY = Math.min(dragStart.y, currentY);
        const newWidth = Math.abs(currentX - dragStart.x);
        const newHeight = Math.abs(currentY - dragStart.y);

        setCrop({
            x: Math.max(0, newX),
            y: Math.max(0, newY),
            width: Math.min(imgRef.current.width - newX, newWidth),
            height: Math.min(imgRef.current.height - newY, newHeight)
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        // If crop is too small, reset to full image
        if (crop.width < 10 || crop.height < 10) {
            setCrop({ x: 0, y: 0, width: imgRef.current.width, height: imgRef.current.height });
        }
    };

    const handleDone = () => {
        // Create final cropped image
        const outCanvas = document.createElement('canvas');
        outCanvas.width = crop.width;
        outCanvas.height = crop.height;
        const outCtx = outCanvas.getContext('2d');
        outCtx.drawImage(
            imgRef.current,
            crop.x, crop.y, crop.width, crop.height,
            0, 0, crop.width, crop.height
        );
        const dataUrl = outCanvas.toDataURL('image/jpeg', quality);
        onComplete(dataUrl);
    };

    return (
        <div className="image-editor-modal">
            <div className="image-editor-content glass-panel animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Crop size={20} /> Edit Image Quality & Crop</h2>
                    <button onClick={onCancel} className="btn-icon"><X size={20} /></button>
                </div>
                
                <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                    Click and drag inside the image below to crop it. You can adjust the image quality using the slider to save database space.
                </p>

                <div className="canvas-container" style={{ textAlign: 'center', overflow: 'hidden', background: '#f8fafc', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{ cursor: 'crosshair', maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
                    />
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        <span>Image Quality (Compression)</span>
                        <span style={{ color: 'var(--color-primary)' }}>{Math.round(quality * 100)}%</span>
                    </label>
                    <input 
                        type="range" 
                        min="0.1" 
                        max="1" 
                        step="0.1" 
                        value={quality}
                        onChange={(e) => setQuality(parseFloat(e.target.value))}
                        style={{ width: '100%' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button className="btn btn-outline full-width" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-primary full-width" onClick={handleDone}>
                        <Check size={18} /> Apply Changes
                    </button>
                </div>
            </div>
            <style>{`
                .image-editor-modal {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.6);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(4px);
                    padding: 1rem;
                }
                .image-editor-content {
                    background: white;
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    width: 100%;
                    max-width: 900px;
                    max-height: 95vh;
                    overflow-y: auto;
                }
            `}</style>
        </div>
    );
};

export default ImageCropper;
