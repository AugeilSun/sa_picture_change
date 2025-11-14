# SA图片格式转换器

一个功能强大的图片格式转换器Windows客户端，支持常规图片格式以及ICO和SVG格式的相互转换。

## 项目地址

[GitHub仓库](https://github.com/AugeilSun/sa_picture_change)

## 功能特点

- 支持多种图片格式转换：JPG、PNG、GIF、BMP、WebP、ICO、SVG
- 支持ICO和SVG格式的特殊处理
- 拖拽上传文件，方便快捷
- 批量转换功能，提高工作效率
- 可调节输出质量
- 自定义输出目录或保存到原文件目录
- 简洁美观的用户界面，采用淡紫色主题
- 自定义应用程序图标

## 项目结构

```
sa_picture_change/
├── main.js                 # Electron主进程文件
├── package.json            # 项目配置和依赖
├── converter-icon.ico      # 应用程序图标
├── src/                    # 前端源代码目录
│   ├── index.html          # 主界面HTML
│   ├── styles.css          # 样式文件
│   └── renderer.js         # 渲染进程JavaScript
├── assets/                 # 资源文件目录
│   └── icon.svg            # 原始SVG图标
├── dist/                   # 构建输出目录
│   ├── SA图片格式转换器 Setup 1.0.0.exe  # 安装包
│   └── win-unpacked/       # 未打包的可执行文件
└── README.md               # 项目说明文档
```

## 安装与运行

1. 确保已安装Node.js和pnpm
2. 在项目根目录下运行以下命令安装依赖：
   ```
   pnpm install
   ```
3. 启动应用：
   ```
   pnpm start
   ```

## 开发模式

在开发模式下运行，会打开开发者工具：
```
pnpm run dev
```

## 打包应用

构建可分发的应用程序包：
```
pnpm run build
```

构建完成后，可执行文件和安装包将生成在`dist`目录中：
- `SA图片格式转换器 Setup 1.0.0.exe` - 安装包
- `win-unpacked/SA图片格式转换器.exe` - 未打包的可执行文件

## 使用说明

1. 启动应用后，可以通过以下方式添加图片文件：
   - 点击"添加文件"按钮选择文件
   - 直接拖拽图片文件到拖拽区域

2. 在右侧设置区域：
   - 选择输出格式
   - 调整输出质量（适用于JPG、WebP等有损格式）
   - 设置输出目录或选择保存到原文件目录

3. 点击"开始转换"按钮开始批量转换

4. 转换完成后，会在右上角显示转换结果通知

## 技术栈

- Electron - 跨平台桌面应用框架
- Node.js - 后端运行时
- Sharp - 高性能图片处理库
- svg2png - SVG转PNG库
- icojs - ICO格式处理库

## 注意事项

- SVG转换为位图格式时，使用Sharp库进行高质量转换
- 位图转换为SVG格式时，会使用base64嵌入方式，不会真正转换为矢量图
- ICO格式转换会自动调整尺寸为256x256像素
- 应用程序使用自定义图标，显示在任务栏和窗口标题栏

## 许可证

MIT License