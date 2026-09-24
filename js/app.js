/**
 * DocuCompress Application UI Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        files: [], // Array of File objects
        compressedResults: [], // Array of { file, resultBlob, originalSize, compressedSize, ratio }
        activePreset: 'recommended',
        settings: {
            dpi: 110,
            quality: 0.65
        }
    };

    // Presets Definition
    const PRESETS = {
        light: { dpi: 150, quality: 0.85 },
        recommended: { dpi: 110, quality: 0.65 },
        extreme: { dpi: 80, quality: 0.45 },
        custom: { dpi: 110, quality: 0.65 }
    };

    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const btnSelectFile = document.getElementById('btn-select-file');
    
    const uploadSection = document.getElementById('upload-section');
    const workspaceSection = document.getElementById('workspace-section');
    const processingSection = document.getElementById('processing-section');
    const resultsSection = document.getElementById('results-section');

    const fileListEl = document.getElementById('file-list');
    const fileCountEl = document.getElementById('file-count');
    const totalOriginalSizeEl = document.getElementById('total-original-size');

    const btnAddMore = document.getElementById('btn-add-more');
    const btnClearAll = document.getElementById('btn-clear-all');
    const btnStartCompress = document.getElementById('btn-start-compress');
    const btnCompressMore = document.getElementById('btn-compress-more');
    const btnDownloadAll = document.getElementById('btn-download-all');

    const presetBtns = document.querySelectorAll('.preset-btn');
    const customControls = document.getElementById('custom-controls');
    const rangeDpi = document.getElementById('range-dpi');
    const rangeQuality = document.getElementById('range-quality');
    const valDpi = document.getElementById('val-dpi');
    const valQuality = document.getElementById('val-quality');

    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressCurrentFile = document.getElementById('progress-current-file');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressStatusTitle = document.getElementById('progress-status-title');
    const progressStatusSubtitle = document.getElementById('progress-status-subtitle');

    const resultsListEl = document.getElementById('results-list');
    const sumBeforeEl = document.getElementById('sum-before');
    const sumAfterEl = document.getElementById('sum-after');
    const sumPercentageEl = document.getElementById('sum-percentage');

    // Init Event Listeners
    initListeners();

    function initListeners() {
        // Dropzone & File Input Events
        btnSelectFile.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleFilesSelected(e.target.files));

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-over');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFilesSelected(e.dataTransfer.files);
            }
        });

        btnAddMore.addEventListener('click', () => fileInput.click());
        btnClearAll.addEventListener('click', clearAllFiles);

        // Preset Selection Events
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const presetKey = btn.getAttribute('data-preset');
                setPreset(presetKey);
            });
        });

        // Range Sliders
        rangeDpi.addEventListener('input', (e) => {
            valDpi.textContent = e.target.value;
            state.settings.dpi = parseInt(e.target.value, 10);
        });

        rangeQuality.addEventListener('input', (e) => {
            valQuality.textContent = e.target.value;
            state.settings.quality = parseInt(e.target.value, 10) / 100.0;
        });

        // Compression Trigger
        btnStartCompress.addEventListener('click', startCompressionProcess);

        // Results Actions
        btnCompressMore.addEventListener('click', resetToWorkspace);
        btnDownloadAll.addEventListener('click', downloadAllCompressedFiles);
    }

    // Handle Selected Files
    function handleFilesSelected(fileList) {
        const pdfFiles = Array.from(fileList).filter(file => file.type === 'application/pdf' || file.name.endsWith('.pdf'));
        if (pdfFiles.length === 0) {
            alert('PDF 파일만 선택이 가능합니다.');
            return;
        }

        // Add to state
        pdfFiles.forEach(file => {
            // Avoid duplicate file names if wanted
            state.files.push(file);
        });

        updateFileListUI();

        // Switch screen to workspace if files exist
        if (state.files.length > 0) {
            uploadSection.classList.add('hidden');
            workspaceSection.classList.remove('hidden');
            resultsSection.classList.add('hidden');
        }
    }

    // Update Selected Files UI
    function updateFileListUI() {
        fileListEl.innerHTML = '';
        let totalBytes = 0;

        state.files.forEach((file, index) => {
            totalBytes += file.size;

            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <i class="fa-solid fa-file-pdf file-icon"></i>
                    <div class="file-details">
                        <span class="file-name" title="${file.name}">${file.name}</span>
                        <span class="file-meta">${PDFCompressor.formatBytes(file.size)}</span>
                    </div>
                </div>
                <button class="btn-remove-file" data-index="${index}" title="삭제">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            fileListEl.appendChild(fileItem);
        });

        fileCountEl.textContent = state.files.length;
        totalOriginalSizeEl.textContent = `총 용량: ${PDFCompressor.formatBytes(totalBytes)}`;

        // Attach remove events
        document.querySelectorAll('.btn-remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                removeFileAt(idx);
            });
        });
    }

    function removeFileAt(index) {
        state.files.splice(index, 1);
        if (state.files.length === 0) {
            clearAllFiles();
        } else {
            updateFileListUI();
        }
    }

    function clearAllFiles() {
        state.files = [];
        fileInput.value = '';
        workspaceSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        resultsSection.classList.add('hidden');
    }

    // Preset Selection Management
    function setPreset(presetKey) {
        state.activePreset = presetKey;
        presetBtns.forEach(btn => {
            if (btn.getAttribute('data-preset') === presetKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (presetKey === 'custom') {
            customControls.classList.remove('hidden');
        } else {
            customControls.classList.add('hidden');
            const p = PRESETS[presetKey];
            state.settings.dpi = p.dpi;
            state.settings.quality = p.quality;
            rangeDpi.value = p.dpi;
            valDpi.textContent = p.dpi;
            rangeQuality.value = Math.round(p.quality * 100);
            valQuality.textContent = Math.round(p.quality * 100);
        }
    }

    // Compression Core Process
    async function startCompressionProcess() {
        if (state.files.length === 0) return;

        workspaceSection.classList.add('hidden');
        processingSection.classList.remove('hidden');
        state.compressedResults = [];

        const totalFiles = state.files.length;

        for (let i = 0; i < totalFiles; i++) {
            const file = state.files[i];
            const fileProgressRatio = 1 / totalFiles;
            const baseProgress = i * fileProgressRatio;

            progressCurrentFile.textContent = `[${i + 1}/${totalFiles}] ${file.name} 압축 중...`;

            try {
                const result = await PDFCompressor.compressPDF(
                    file,
                    state.settings,
                    (pageIndex, totalPages, stageMessage) => {
                        const filePercent = pageIndex / totalPages;
                        const overallPercent = Math.round((baseProgress + filePercent * fileProgressRatio) * 100);
                        progressBarFill.style.width = `${overallPercent}%`;
                        progressPercentage.textContent = `${overallPercent}%`;
                        progressStatusSubtitle.textContent = stageMessage;
                    }
                );

                state.compressedResults.push({
                    originalFile: file,
                    blob: result.blob,
                    originalSize: result.originalSize,
                    compressedSize: result.compressedSize,
                    ratio: result.ratio
                });
            } catch (err) {
                console.error('PDF compression error:', err);
                alert(`"${file.name}" 파일 처리 중 오류가 발생했습니다: ` + err.message);
            }
        }

        // Completion
        progressBarFill.style.width = '100%';
        progressPercentage.textContent = '100%';
        progressStatusSubtitle.textContent = '모든 파일 압축이 완료되었습니다!';

        setTimeout(() => {
            processingSection.classList.add('hidden');
            renderResultsView();
        }, 500);
    }

    // Render Results Section
    function renderResultsView() {
        resultsSection.classList.remove('hidden');
        resultsListEl.innerHTML = '';

        let totalOrig = 0;
        let totalComp = 0;

        state.compressedResults.forEach((res, index) => {
            totalOrig += res.originalSize;
            totalComp += res.compressedSize;

            const originalName = res.originalFile.name;
            const compressedName = originalName.replace(/\.pdf$/i, '_compressed.pdf');

            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `
                <div class="result-file-info">
                    <i class="fa-solid fa-file-pdf file-icon"></i>
                    <div class="result-file-details">
                        <span class="result-file-name">${originalName}</span>
                        <div class="result-comparison">
                            <span>${PDFCompressor.formatBytes(res.originalSize)}</span>
                            <i class="fa-solid fa-arrow-right"></i>
                            <strong>${PDFCompressor.formatBytes(res.compressedSize)}</strong>
                            <span class="result-chip">-${res.ratio}%</span>
                        </div>
                    </div>
                </div>
                <button class="btn btn-primary btn-sm btn-download-single" data-index="${index}">
                    <i class="fa-solid fa-download"></i> 다운로드
                </button>
            `;
            resultsListEl.appendChild(item);
        });

        // Total saved calculation
        const totalSavedRatio = totalOrig > 0 ? Math.round(((totalOrig - totalComp) / totalOrig) * 100) : 0;
        sumBeforeEl.textContent = PDFCompressor.formatBytes(totalOrig);
        sumAfterEl.textContent = PDFCompressor.formatBytes(totalComp);
        sumPercentageEl.textContent = `-${totalSavedRatio > 0 ? totalSavedRatio : 0}%`;

        // Attach download events for individual files
        document.querySelectorAll('.btn-download-single').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
                downloadSingleFile(idx);
            });
        });
    }

    // Download Single File
    function downloadSingleFile(index) {
        const res = state.compressedResults[index];
        if (!res) return;
        const filename = res.originalFile.name.replace(/\.pdf$/i, '_compressed.pdf');
        saveAs(res.blob, filename);
    }

    // Download All Files (ZIP if multiple, single if 1)
    async function downloadAllCompressedFiles() {
        if (state.compressedResults.length === 1) {
            downloadSingleFile(0);
            return;
        }

        const zip = new JSZip();
        state.compressedResults.forEach(res => {
            const filename = res.originalFile.name.replace(/\.pdf$/i, '_compressed.pdf');
            zip.file(filename, res.blob);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'docu_compressed_pdfs.zip');
    }

    function resetToWorkspace() {
        resultsSection.classList.add('hidden');
        workspaceSection.classList.remove('hidden');
    }
});
