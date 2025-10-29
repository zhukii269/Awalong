阿瓦隆主持 - 一键手机启动方式

本项目已集成 GitHub Pages 自动部署。你只需把代码推送到 GitHub（主分支为 main），GitHub Actions 会自动构建并发布到 Pages。完成后，用手机打开提供的公开链接即可，无需本地电脑启动。

步骤（仅需一次）
1. 在 GitHub 创建一个新仓库（可设为私有）。
2. 将本地代码推送到该仓库的 main 分支。
3. 进入 GitHub 仓库 → Settings → Pages：
   - Source 选择 GitHub Actions（默认即为本工作流）。
4. 首次 push 后，Actions 会自动构建并发布。几分钟后在 Pages 页面会出现访问链接（如 https://<你的账户>.github.io/<仓库名>/ ）。

之后每次 push 到 main 会自动更新页面。你只需用手机访问该链接，也可添加到主屏幕（PWA）。

本地（可选）
- 开发：npm install && npm run dev
- 生产预览：npm run build && npm run preview

说明
- vite.config.js 设置了 base: './'，确保 Pages 子路径下资源引用正常。
- 已包含 PWA manifest 与 Service Worker，可添加到主屏幕并在离线有基础可用能力。

