/**
 * PDF Compressor Engine using PDF.js and PDF-Lib
 * Runs 100% locally inside the user's browser.
 */

class PDFCompressor {
    /**
     * Compress a PDF File
     * @param {File} file - The original PDF file
     * @param {Object} options - { dpi: number, quality: number }
     * @param {Function} onProgress - Callback (pageIndex, totalPages, stage)
     * @returns {Promise<{ blob: Blob, originalSize: number, compressedSize: number, ratio: number }>}
     */
    static async compressPDF(file, options = { dpi: 110, quality: 0.65 }, onProgress = null) {
        const originalSize = file.size;
        const fileBuffer = await file.arrayBuffer();

        // 1. Load original PDF document with PDF.js
        const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
        const pdfDoc = await loadingTask.promise;
        const totalPages = pdfDoc.numPages;

        // 2. Create new PDF document with PDF-Lib
        const { PDFDocument } = PDFLib;
        const newPdfDoc = await PDFDocument.create();

        const dpi = options.dpi || 110;
        const quality = options.quality !== undefined ? options.quality : 0.65;
        // Standard PDF points are 72 per inch
        const scale = dpi / 72.0;

        for (let i = 1; i <= totalPages; i++) {
            if (onProgress) {
                onProgress(i, totalPages, `페이지 ${i} / ${totalPages} 렌더링 및 압축 중...`);
            }

            // Get PDF page
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale });

            // Create offscreen canvas
            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            const ctx = canvas.getContext('2d');

            // Render PDF page to Canvas
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            await page.render(renderContext).promise;

            // Export Canvas as compressed JPEG
            const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
            const jpegBytes = this.dataURLToUint8Array(jpegDataUrl);

            // Embed compressed JPEG into PDF-Lib
            const jpegImage = await newPdfDoc.embedJpg(jpegBytes);

            // Calculate original dimensions in points (72 DPI)
            const origViewport = page.getViewport({ scale: 1.0 });
            const pageWidth = origViewport.width;
            const pageHeight = origViewport.height;

            // Add new page & draw image
            const newPage = newPdfDoc.addPage([pageWidth, pageHeight]);
            newPage.drawImage(jpegImage, {
                x: 0,
                y: 0,
                width: pageWidth,
                height: pageHeight,
            });

            // Free canvas memory
            canvas.width = 0;
            canvas.height = 0;
        }

        if (onProgress) {
            onProgress(totalPages, totalPages, 'PDF 스트림 재구성 및 최종 압축 파일 생성 중...');
        }

        // Save PDF with object streams enabled for maximum compression
        const compressedBytes = await newPdfDoc.save({ useObjectStreams: true });
        const compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });
        const compressedSize = compressedBlob.size;

        const ratio = Math.round(((originalSize - compressedSize) / originalSize) * 100);

        return {
            blob: compressedBlob,
            originalSize,
            compressedSize,
            ratio: ratio > 0 ? ratio : 0
        };
    }

    /**
     * Convert Data URL to Uint8Array
     */
    static dataURLToUint8Array(dataUrl) {
        const base64 = dataUrl.split(',')[1];
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Format Bytes to Human Readable String (KB, MB)
     */
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}

window.PDFCompressor = PDFCompressor;
