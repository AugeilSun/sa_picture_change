// 注释掉全局导入，改为在需要时导入
// const { ipcRenderer } = require('electron');
// const path = require('path');
// const fs = require('fs');
// const sharp = require('sharp');
// const svg2png = require('svg2png');
// const icojs = require('icojs');

// 全局变量
let selectedFiles = [];
let isConverting = false;

// DOM元素 - 将在DOM加载后初始化
let dropZone, fileList, addFilesBtn, clearFilesBtn, outputFormat, outputQuality, qualityValue;
let outputDirectory, sameDirectoryCheckbox, browseDirectoryBtn, convertBtn;
let progressContainer, progressFill, progressText, statusMessage, fileCount;

// 初始化DOM元素
function initializeDOMElements() {
    dropZone = document.getElementById('drop-zone');
    fileList = document.getElementById('file-list');
    addFilesBtn = document.getElementById('add-files-btn');
    clearFilesBtn = document.getElementById('clear-files-btn');
    outputFormat = document.getElementById('output-format');
    outputQuality = document.getElementById('output-quality');
    qualityValue = document.getElementById('quality-value');
    outputDirectory = document.getElementById('output-directory');
    sameDirectoryCheckbox = document.getElementById('same-directory');
    browseDirectoryBtn = document.getElementById('browse-directory-btn');
    convertBtn = document.getElementById('convert-btn');
    progressContainer = document.getElementById('progress-container');
    progressFill = document.getElementById('progress-fill');
    progressText = document.getElementById('progress-text');
    statusMessage = document.getElementById('status-message');
    fileCount = document.getElementById('file-count');
    
    // 检查DOM元素是否正确获取
    if (!addFilesBtn) {
        console.error('无法获取add-files-btn元素');
    } else {
        console.log('成功获取add-files-btn元素');
    }
}

/**
 * 初始化应用
 */
function initApp() {
    // 首先初始化DOM元素
    initializeDOMElements();
    
    // 然后设置事件监听器
    setupEventListeners();
    
    // 最后更新UI
    updateUI();
}

// 确保在DOM完全加载后再初始化应用
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM已加载完成，开始初始化应用');
    initApp();
});

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    // 标题栏按钮
    setupTitlebarControls();
    
    // 通知关闭按钮
    const notificationClose = document.getElementById('notification-close');
    if (notificationClose) {
        notificationClose.addEventListener('click', hideNotification);
    }
    
    // 文件选择按钮
    if (addFilesBtn) {
        addFilesBtn.addEventListener('click', function() {
            console.log('添加文件按钮被点击');
            selectFiles();
        });
        console.log('已为添加文件按钮添加点击事件');
    } else {
        console.error('无法为添加文件按钮添加事件，元素不存在');
    }
    
    if (clearFilesBtn) {
        clearFilesBtn.addEventListener('click', clearFiles);
    }
    
    // 拖拽事件
    if (dropZone) {
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
    }
    
    // 质量滑块
    if (outputQuality) {
        outputQuality.addEventListener('input', updateQualityValue);
    }
    
    // 目录选择
    if (browseDirectoryBtn) {
        browseDirectoryBtn.addEventListener('click', selectOutputDirectory);
    }
    
    if (sameDirectoryCheckbox) {
        sameDirectoryCheckbox.addEventListener('change', toggleDirectoryInput);
    }
    
    // 转换按钮
    if (convertBtn) {
        convertBtn.addEventListener('click', convertFiles);
    }
    
    // 初始化质量值显示
    updateQualityValue();
}

/**
 * 设置标题栏控制按钮
 */
function setupTitlebarControls() {
    // 导入electron
    const { ipcRenderer } = require('electron');
    
    // 最小化按钮
    const minimizeBtn = document.getElementById('minimize-btn');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            ipcRenderer.send('minimize-window');
        });
    }
    
    // 最大化/还原按钮
    const maximizeBtn = document.getElementById('maximize-btn');
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            ipcRenderer.send('maximize-window');
        });
    }
    
    // 关闭按钮
    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            ipcRenderer.send('close-window');
        });
    }
}

/**
 * 选择文件
 */
async function selectFiles() {
    console.log('selectFiles函数被调用');
    try {
        // 在函数内部导入ipcRenderer
        const { ipcRenderer } = require('electron');
        console.log('正在调用ipcRenderer.invoke(select-files)');
        const filePaths = await ipcRenderer.invoke('select-files');
        console.log('获取到的文件路径:', filePaths);
        if (filePaths && filePaths.length > 0) {
            addFiles(filePaths);
        } else {
            console.log('没有选择文件或文件路径为空');
        }
    } catch (error) {
        console.error('选择文件失败:', error);
        updateStatus('选择文件失败', 'error');
    }
}

/**
 * 清空文件列表
 */
function clearFiles() {
    selectedFiles = [];
    updateUI();
    updateStatus('已清空文件列表');
}

/**
 * 处理拖拽悬停
 */
function handleDragOver(event) {
    event.preventDefault();
    dropZone.classList.add('dragover');
}

/**
 * 处理拖拽离开
 */
function handleDragLeave(event) {
    event.preventDefault();
    dropZone.classList.remove('dragover');
}

/**
 * 处理文件拖放
 */
function handleDrop(event) {
    event.preventDefault();
    dropZone.classList.remove('dragover');
    
    const filePaths = Array.from(event.dataTransfer.files).map(file => file.path);
    if (filePaths.length > 0) {
        addFiles(filePaths);
    }
}

/**
 * 添加文件到列表
 */
async function addFiles(filePaths) {
    // 在函数内部导入ipcRenderer
    const { ipcRenderer } = require('electron');
    
    for (const filePath of filePaths) {
        try {
            // 检查是否为图片文件
            const fileInfo = await ipcRenderer.invoke('get-file-info', filePath);
            if (!fileInfo) {
                console.error('无法获取文件信息:', filePath);
                continue;
            }
            
            // 检查是否为支持的图片格式
            const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico', 'svg'];
            if (!supportedFormats.includes(fileInfo.extension)) {
                console.warn('不支持的文件格式:', fileInfo.extension);
                continue;
            }
            
            // 检查是否已存在
            if (selectedFiles.some(file => file.fullPath === filePath)) {
                console.warn('文件已存在:', filePath);
                continue;
            }
            
            selectedFiles.push(fileInfo);
        } catch (error) {
            console.error('处理文件时出错:', filePath, error);
        }
    }
    
    updateUI();
    updateStatus(`已添加 ${filePaths.length} 个文件`);
}

/**
 * 更新质量值显示
 */
function updateQualityValue() {
    qualityValue.textContent = `${outputQuality.value}%`;
}

/**
 * 选择输出目录
 */
async function selectOutputDirectory() {
    try {
        // 在函数内部导入ipcRenderer
        const { ipcRenderer } = require('electron');
        const directory = await ipcRenderer.invoke('select-save-directory');
        if (directory) {
            outputDirectory.value = directory;
            sameDirectoryCheckbox.checked = false;
            toggleDirectoryInput();
        }
    } catch (error) {
        console.error('选择目录失败:', error);
        updateStatus('选择目录失败', 'error');
    }
}

/**
 * 切换目录输入状态
 */
function toggleDirectoryInput() {
    const isDisabled = sameDirectoryCheckbox.checked;
    outputDirectory.disabled = isDisabled;
    browseDirectoryBtn.disabled = isDisabled;
    
    if (isDisabled) {
        outputDirectory.value = '';
    }
}

/**
 * 转换文件
 */
async function convertFiles() {
    if (isConverting || selectedFiles.length === 0) {
        return;
    }
    
    isConverting = true;
    convertBtn.disabled = true;
    progressContainer.style.display = 'block';
    
    const format = outputFormat.value;
    const quality = parseInt(outputQuality.value) / 100;
    const saveToSameDirectory = sameDirectoryCheckbox.checked;
    const customOutputDirectory = outputDirectory.value;
    
    let successCount = 0;
    let errorCount = 0;
    
    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const progress = (i / selectedFiles.length) * 100;
            
            updateProgress(progress, `正在转换: ${file.name}`);
            
            try {
                const outputPath = await convertSingleFile(file, format, quality, saveToSameDirectory, customOutputDirectory);
                if (outputPath) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error(`转换文件失败: ${file.name}`, error);
                errorCount++;
            }
        }
        
        updateProgress(100, '转换完成');
        updateStatus(`转换完成: 成功 ${successCount} 个, 失败 ${errorCount} 个`, 
                    errorCount > 0 ? 'warning' : 'success');
        
        // 显示转换完成通知
        let notificationType = 'success';
        let notificationTitle = '转换完成';
        let notificationMessage = `成功转换 ${successCount} 个文件`;
        
        if (errorCount > 0) {
            if (successCount === 0) {
                notificationType = 'error';
                notificationTitle = '转换失败';
                notificationMessage = `所有 ${errorCount} 个文件转换失败`;
            } else {
                notificationType = 'warning';
                notificationTitle = '部分转换完成';
                notificationMessage = `成功 ${successCount} 个，失败 ${errorCount} 个`;
            }
        }
        
        showNotification(notificationTitle, notificationMessage, notificationType);
    } catch (error) {
        console.error('批量转换失败:', error);
        updateStatus('转换过程中发生错误', 'error');
    } finally {
        isConverting = false;
        convertBtn.disabled = false;
        
        // 3秒后隐藏进度条
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 3000);
    }
}

/**
 * 转换单个文件
 */
async function convertSingleFile(file, format, quality, saveToSameDirectory, customOutputDirectory) {
    try {
        // 导入需要的模块
        const path = require('path');
        const { ipcRenderer } = require('electron');
        
        // 确定输出目录
        let outputDir;
        if (saveToSameDirectory) {
            outputDir = path.dirname(file.fullPath);
        } else if (customOutputDirectory) {
            outputDir = customOutputDirectory;
            // 确保目录存在
            await ipcRenderer.invoke('ensure-directory', outputDir);
        } else {
            throw new Error('未指定输出目录');
        }
        
        // 构建输出文件路径
        const baseName = path.basename(file.fullPath, path.extname(file.fullPath));
        const outputPath = path.join(outputDir, `${baseName}.${format}`);
        
        // 根据源格式和目标格式选择转换方法
        if (file.extension === 'svg') {
            // SVG转换
            return await convertSvg(file.fullPath, outputPath, format);
        } else if (format === 'svg') {
            // 转换为SVG
            return await convertToSvg(file.fullPath, outputPath);
        } else if (format === 'ico') {
            // 转换为ICO
            return await convertToIco(file.fullPath, outputPath);
        } else {
            // 常规图片格式转换
            return await convertRegularImage(file.fullPath, outputPath, format, quality);
        }
    } catch (error) {
        console.error(`转换单个文件失败: ${file.name}`, error);
        return null;
    }
}

/**
 * 转换SVG文件
 */
async function convertSvg(inputPath, outputPath, format) {
    try {
        // 导入需要的模块
        const fs = require('fs');
        const path = require('path');
        const sharp = require('sharp');
        
        // 使用sharp库来转换SVG，它更可靠且支持更多功能
        const svgBuffer = fs.readFileSync(inputPath);
        
        if (format === 'png') {
            // 直接转换为PNG
            const pngBuffer = await sharp(svgBuffer)
                .png()
                .toBuffer();
            
            fs.writeFileSync(outputPath, pngBuffer);
            return outputPath;
        } else if (format === 'jpg' || format === 'jpeg') {
            // 转换为JPEG
            const jpegBuffer = await sharp(svgBuffer)
                .jpeg({ quality: 90 })
                .toBuffer();
            
            fs.writeFileSync(outputPath, jpegBuffer);
            return outputPath;
        } else if (format === 'webp') {
            // 转换为WebP
            const webpBuffer = await sharp(svgBuffer)
                .webp({ quality: 90 })
                .toBuffer();
            
            fs.writeFileSync(outputPath, webpBuffer);
            return outputPath;
        } else if (format === 'ico') {
            // 转换为ICO
            return await convertToIco(inputPath, outputPath);
        } else {
            // 对于其他格式，先转换为PNG，再转换为其他格式
            const tempPath = inputPath.replace('.svg', '.temp.png');
            const pngBuffer = await sharp(svgBuffer)
                .png()
                .toBuffer();
            
            fs.writeFileSync(tempPath, pngBuffer);
            
            const result = await convertRegularImage(tempPath, outputPath, format, 0.9);
            
            // 删除临时文件
            fs.unlinkSync(tempPath);
            
            return result;
        }
    } catch (error) {
        console.error('SVG转换失败:', error);
        throw error;
    }
}

/**
 * 转换为SVG格式
 */
async function convertToSvg(inputPath, outputPath) {
    // 注意：从位图转换为SVG会损失质量，这里使用简单的base64嵌入方式
    try {
        // 导入需要的模块
        const fs = require('fs');
        const path = require('path');
        
        const imageBuffer = fs.readFileSync(inputPath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = getMimeType(path.extname(inputPath));
        
        const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
    <image width="100%" height="100%" xlink:href="data:${mimeType};base64,${base64Image}" />
</svg>`;
        
        fs.writeFileSync(outputPath, svgContent);
        return outputPath;
    } catch (error) {
        console.error('转换为SVG失败:', error);
        throw error;
    }
}

/**
 * 转换为ICO格式
 */
async function convertToIco(inputPath, outputPath) {
    try {
        // 导入需要的模块
        const fs = require('fs');
        const path = require('path');
        const sharp = require('sharp');
        
        // 创建多个尺寸的图像，这是ICO文件的标准做法
        const sizes = [256, 128, 64, 48, 32, 16];
        const pngBuffers = [];
        
        // 为每个尺寸生成PNG图像
        for (const size of sizes) {
            const buffer = await sharp(inputPath)
                .resize(size, size, { fit: 'inside' })
                .png()
                .toBuffer();
            
            pngBuffers.push({
                size,
                buffer
            });
        }
        
        // 创建ICO文件
        const icoBuffer = await createIcoFile(pngBuffers);
        
        // 写入文件
        fs.writeFileSync(outputPath, icoBuffer);
        
        return outputPath;
    } catch (error) {
        console.error('转换为ICO失败:', error);
        throw error;
    }
}

/**
 * 创建ICO文件
 * @param {Array} pngBuffers 包含不同尺寸PNG图像的数组
 * @returns {Promise<Buffer>} ICO文件的Buffer
 */
async function createIcoFile(pngBuffers) {
    // 计算文件头和图像目录的大小
    const iconDirSize = 6 + pngBuffers.length * 16; // 文件头(6) + 图像目录(每个16字节)
    
    // 计算所有图像数据的大小
    let imageDataSize = 0;
    const imageDataInfo = [];
    
    for (const { buffer } of pngBuffers) {
        // PNG图像需要转换为BMP格式存储在ICO中
        const bmpInfo = await pngToBmp(buffer);
        imageDataInfo.push(bmpInfo);
        imageDataSize += bmpInfo.data.length;
    }
    
    // 创建ICO文件缓冲区 - 使用Buffer而不是ArrayBuffer
    const icoSize = iconDirSize + imageDataSize;
    const icoBuffer = Buffer.alloc(icoSize);
    
    // 写入文件头 (6字节)
    icoBuffer.writeUInt16LE(0, 0); // 保留字段
    icoBuffer.writeUInt16LE(1, 2); // 类型 (1 = ICO)
    icoBuffer.writeUInt16LE(pngBuffers.length, 4); // 图像数量
    
    // 写入图像目录和图像数据
    let offset = iconDirSize; // 图像数据的起始偏移量
    
    for (let i = 0; i < pngBuffers.length; i++) {
        const { size } = pngBuffers[i];
        const { width, height, data } = imageDataInfo[i];
        
        // 写入图像目录 (16字节)
        icoBuffer.writeUInt8(width === 256 ? 0 : width, 6 + i * 16); // 宽度 (0表示256)
        icoBuffer.writeUInt8(height === 256 ? 0 : height, 7 + i * 16); // 高度 (0表示256)
        icoBuffer.writeUInt8(0, 8 + i * 16); // 颜色数 (0表示超过256色)
        icoBuffer.writeUInt8(0, 9 + i * 16); // 保留字段
        icoBuffer.writeUInt16LE(1, 10 + i * 16); // 颜色平面数
        icoBuffer.writeUInt16LE(32, 12 + i * 16); // 每像素位数
        icoBuffer.writeUInt32LE(data.length, 14 + i * 16); // 图像数据大小
        icoBuffer.writeUInt32LE(offset, 18 + i * 16); // 图像数据偏移量
        
        // 写入图像数据
        data.copy(icoBuffer, offset, 0, data.length);
        
        offset += data.length;
    }
    
    return icoBuffer;
}

/**
 * 将PNG缓冲区转换为BMP格式
 * @param {Buffer} pngBuffer PNG图像缓冲区
 * @returns {Promise<Object>} 包含宽度、高度和BMP数据的对象
 */
async function pngToBmp(pngBuffer) {
    try {
        // 导入需要的模块
        const sharp = require('sharp');
        
        // 使用sharp获取PNG图像信息
        const metadata = await sharp(pngBuffer).metadata();
        
        // 转换为原始像素数据
        const { data, info } = await sharp(pngBuffer)
            .raw()
            .toBuffer({ resolveWithObject: true });
        
        const width = metadata.width;
        const height = metadata.height;
        const rowSize = Math.ceil((width * 32) / 8); // 每行字节数 (32位色)
        const imageDataSize = rowSize * height; // XOR掩码大小
        const andMaskSize = Math.ceil(width / 8) * height; // AND掩码大小
        const totalImageSize = imageDataSize + andMaskSize; // 总图像数据大小
        const fileSize = 40 + totalImageSize; // DIB头(40) + 像素数据 (ICO中不需要BMP文件头)
        
        // 创建BMP缓冲区 (ICO中的BMP格式，不需要BMP文件头)
        const bmpBuffer = Buffer.alloc(totalImageSize);
        
        // 复制像素数据 (BMP使用BGR顺序，并且是自下而上)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIndex = (y * width + x) * 4; // RGBA
                const destIndex = ((height - 1 - y) * width + x) * 4; // BMP是自下而上
                
                // BGRA格式
                bmpBuffer[destIndex + 0] = data[srcIndex + 2]; // B
                bmpBuffer[destIndex + 1] = data[srcIndex + 1]; // G
                bmpBuffer[destIndex + 2] = data[srcIndex + 0]; // R
                bmpBuffer[destIndex + 3] = data[srcIndex + 3]; // A
            }
        }
        
        // 创建AND掩码 (1位透明度掩码)
        const andMask = Buffer.alloc(andMaskSize, 0); // 默认全部设为不透明
        
        // 处理透明度 - 如果alpha值为0，则设置AND掩码对应位为1（透明）
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const srcIndex = (y * width + x) * 4; // RGBA
                const alpha = data[srcIndex + 3];
                
                if (alpha < 128) { // 如果alpha值小于128，认为是透明的
                    const byteIndex = Math.floor(x / 8) + y * Math.ceil(width / 8);
                    const bitIndex = 7 - (x % 8); // 位索引（从左到右）
                    andMask[byteIndex] |= (1 << bitIndex);
                }
            }
        }
        
        // 将AND掩码添加到XOR掩码后面
        andMask.copy(bmpBuffer, imageDataSize);
        
        // 创建包含DIB头的完整BMP数据
        const dibHeader = Buffer.alloc(40);
        
        // DIB头 (40字节)
        dibHeader.writeUInt32LE(40, 0); // 头大小
        dibHeader.writeInt32LE(width, 4); // 宽度
        dibHeader.writeInt32LE(height * 2, 8); // 高度 (ICO中需要乘以2，包括AND掩码)
        dibHeader.writeUInt16LE(1, 12); // 颜色平面数
        dibHeader.writeUInt16LE(32, 14); // 每像素位数
        dibHeader.writeUInt32LE(0, 16); // 压缩方式 (0=无压缩)
        dibHeader.writeUInt32LE(totalImageSize, 20); // 图像数据大小
        dibHeader.writeInt32LE(0, 24); // 水平分辨率
        dibHeader.writeInt32LE(0, 28); // 垂直分辨率
        dibHeader.writeUInt32LE(0, 32); // 调色板颜色数
        dibHeader.writeUInt32LE(0, 36); // 重要颜色数
        
        // 将DIB头和图像数据合并
        const finalBuffer = Buffer.concat([dibHeader, bmpBuffer]);
        
        return {
            width,
            height,
            data: finalBuffer
        };
    } catch (error) {
        console.error('PNG转BMP失败:', error);
        throw error;
    }
}

/**
 * 转换常规图片格式
 */
async function convertRegularImage(inputPath, outputPath, format, quality) {
    try {
        // 导入需要的模块
        const sharp = require('sharp');
        
        // 根据格式设置选项
        switch (format) {
            case 'jpg':
            case 'jpeg':
                await sharp(inputPath)
                    .jpeg({ quality: Math.round(quality * 100) })
                    .toFile(outputPath);
                break;
            case 'png':
                await sharp(inputPath)
                    .png({ compressionLevel: 9 })
                    .toFile(outputPath);
                break;
            case 'webp':
                await sharp(inputPath)
                    .webp({ quality: Math.round(quality * 100) })
                    .toFile(outputPath);
                break;
            case 'gif':
                await sharp(inputPath)
                    .gif()
                    .toFile(outputPath);
                break;
            case 'bmp':
                // BMP格式需要特殊处理，Sharp不直接支持BMP输出
                // 我们需要先转换为原始数据，然后手动创建BMP文件
                await convertToBmp(inputPath, outputPath);
                break;
            default:
                throw new Error(`不支持的输出格式: ${format}`);
        }
        
        return outputPath;
    } catch (error) {
        console.error('常规图片转换失败:', error);
        throw error;
    }
}

/**
 * 转换为BMP格式
 */
async function convertToBmp(inputPath, outputPath) {
    try {
        // 导入需要的模块
        const sharp = require('sharp');
        const fs = require('fs');
        
        // 先获取原始像素数据
        const { data, info } = await sharp(inputPath)
            .raw()
            .toBuffer({ resolveWithObject: true });
        
        // 创建BMP文件头
        const fileSize = 54 + data.length; // 54字节头 + 像素数据
        const headerSize = 40; // DIB头大小
        
        // 创建BMP缓冲区
        const bmpBuffer = Buffer.alloc(fileSize);
        
        // BMP文件头 (14字节)
        bmpBuffer.write('BM', 0); // 签名
        bmpBuffer.writeUInt32LE(fileSize, 2); // 文件大小
        bmpBuffer.writeUInt32LE(0, 6); // 保留字段
        bmpBuffer.writeUInt32LE(54, 10); // 像素数据偏移
        
        // DIB头 (40字节)
        bmpBuffer.writeUInt32LE(headerSize, 14); // 头大小
        bmpBuffer.writeInt32LE(info.width, 18); // 宽度
        bmpBuffer.writeInt32LE(info.height, 22); // 高度
        bmpBuffer.writeUInt16LE(1, 26); // 颜色平面数
        bmpBuffer.writeUInt16LE(24, 28); // 每像素位数
        bmpBuffer.writeUInt32LE(0, 30); // 压缩方式 (0=无压缩)
        bmpBuffer.writeUInt32LE(data.length, 34); // 像素数据大小
        bmpBuffer.writeInt32LE(2835, 38); // 水平分辨率 (像素/米)
        bmpBuffer.writeInt32LE(2835, 42); // 垂直分辨率 (像素/米)
        bmpBuffer.writeUInt32LE(0, 46); // 调色板颜色数
        bmpBuffer.writeUInt32LE(0, 50); // 重要颜色数
        
        // 复制像素数据 (BMP使用BGR顺序)
        for (let i = 0; i < data.length; i += 3) {
            // RGB转BGR
            bmpBuffer[54 + i] = data[i + 2]; // B
            bmpBuffer[54 + i + 1] = data[i + 1]; // G
            bmpBuffer[54 + i + 2] = data[i]; // R
        }
        
        // 写入文件
        fs.writeFileSync(outputPath, bmpBuffer);
        
        return outputPath;
    } catch (error) {
        console.error('BMP转换失败:', error);
        throw error;
    }
}

/**
 * 获取MIME类型
 */
function getMimeType(extension) {
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
}

/**
 * 更新UI
 */
function updateUI() {
    updateFileList();
    updateFileCount();
    updateConvertButton();
}

/**
 * 更新文件列表
 */
function updateFileList() {
    fileList.innerHTML = '';
    
    if (selectedFiles.length === 0) {
        fileList.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 16L4 17C4 18.1046 4.89543 19 6 19L18 19C19.1046 19 20 18.1046 20 17L20 16" stroke="#adb5bd" stroke-width="2" stroke-linecap="round"/>
                    <path d="M8 10L12 14L16 10" stroke="#adb5bd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M12 14L12 4" stroke="#adb5bd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>暂无文件</p>
                <p class="drop-zone-hint">拖拽图片文件到此处或点击"添加文件"按钮</p>
            </div>
        `;
        return;
    }
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        // 根据文件类型选择图标
        let iconSvg = getFileIcon(file.extension);
        
        fileItem.innerHTML = `
            <div class="file-icon">
                ${iconSvg}
            </div>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-details">${formatFileSize(file.size)} · ${file.extension.toUpperCase()}</div>
            </div>
            <button class="file-remove" data-index="${index}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        `;
        
        fileList.appendChild(fileItem);
    });
    
    // 添加删除按钮事件
    document.querySelectorAll('.file-remove').forEach(btn => {
        btn.addEventListener('click', (event) => {
            const index = parseInt(event.currentTarget.getAttribute('data-index'));
            selectedFiles.splice(index, 1);
            updateUI();
        });
    });
}

/**
 * 获取文件图标
 */
function getFileIcon(extension) {
    const icons = {
        'jpg': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'jpeg': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'png': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'gif': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M9 11H9.01M15 11H15.01M12 15C12 15 10 13 10 11C10 9 11 8 12 8C13 8 14 9 14 11C14 13 12 15 12 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'bmp': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 7H17M7 12H17M7 17H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        'webp': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M12 8L16 12L12 16L8 12L12 8Z" fill="currentColor"/></svg>',
        'ico': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="2"/></svg>',
        'svg': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7V12C2 16.5 4.23 20.68 7.62 23.15L12 21L16.38 23.15C19.77 20.68 22 16.5 22 12V7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
    
    return icons[extension.toLowerCase()] || icons['jpg'];
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 更新文件计数
 */
function updateFileCount() {
    fileCount.textContent = `${selectedFiles.length} 个文件`;
}

/**
 * 更新转换按钮状态
 */
function updateConvertButton() {
    convertBtn.disabled = selectedFiles.length === 0 || isConverting;
}

/**
 * 更新进度条
 */
function updateProgress(percent, text) {
    progressFill.style.width = `${percent}%`;
    progressText.textContent = text;
}

/**
 * 显示转换完成通知
 * @param {string} title - 通知标题
 * @param {string} message - 通知消息
 * @param {string} type - 通知类型 (success, error, warning)
 */
function showNotification(title, message, type = 'success') {
    const notification = document.getElementById('conversion-notification');
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');
    
    if (!notification || !notificationTitle || !notificationMessage) {
        console.error('通知元素不存在');
        return;
    }
    
    // 设置通知内容
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    
    // 设置通知类型
    notification.className = 'conversion-notification';
    if (type === 'error') {
        notification.classList.add('error');
    } else if (type === 'warning') {
        notification.classList.add('warning');
    }
    
    // 显示通知
    notification.classList.add('show');
    
    // 自动隐藏通知（5秒后）
    setTimeout(() => {
        hideNotification();
    }, 5000);
}

/**
 * 隐藏转换完成通知
 */
function hideNotification() {
    const notification = document.getElementById('conversion-notification');
    if (notification) {
        notification.classList.remove('show');
    }
}

/**
 * 更新状态消息
 */
function updateStatus(message, type = 'info') {
    statusMessage.textContent = message;
    
    // 根据类型设置样式
    statusMessage.className = 'status-message';
    if (type === 'error') {
        statusMessage.style.color = '#dc3545';
    } else if (type === 'warning') {
        statusMessage.style.color = '#ffc107';
    } else if (type === 'success') {
        statusMessage.style.color = '#28a745';
    } else {
        statusMessage.style.color = '#6c757d';
    }
}

// 注释掉旧的初始化调用，使用新的DOMContentLoaded事件监听器
// document.addEventListener('DOMContentLoaded', initApp);