# 知界 ZHIJIE 官网

公开地址：[www.yidianqibu.online](https://www.yidianqibu.online/)。这是无需构建的静态网站，`index.html`、`styles.css`、`script.js` 和 `assets/` 部署在 GitHub Pages。`privacy.html`、`terms.html`、`refund.html` 是独立政策页面。

首页以真实需求与可见交付为主线：首屏价值主张 → 产品与作品（ZhiFlow 重点展示）→ 可操作的数据整理演示 → 六类定制服务 → 合作步骤 → 常见问题 → 项目咨询。案例图片是功能演示截图，业务数据为测试数据，不应改写成真实客户业绩。

## 咨询与后台

- 首页按钮打开简短表单，先填写项目需求与联系方式；行业、使用频率和称呼收在选填区域。项目进度查询保留在联系区域的折叠面板。
- 表单复用现有 Cloudflare Worker、D1 订单后台和 Turnstile 安全验证。提交需求不等于付款或签约。
- ZhiFlow 在官网展示的是本地演示截图，不是公开可用的在线 SaaS。
- 支付宝和微信支付尚未接入；网站不会直接收款，也不会把提交需求显示成付款成功。

## 本地预览与检查

需要 Node.js 20+ 和 Python 3。在本目录运行 `npm run dev`（或 `python -m http.server 8080`），浏览器访问 `http://localhost:8080`。首次进入会看到 Turnstile 的本地域名验证错误，这是因为安全验证只允许已配置的正式域名；不要用本地报错判断线上提交是否有效。

前端不依赖框架或打包器，根目录 npm 命令无需安装第三方依赖：

- `npm run lint`：检查前后端 JavaScript 语法、页面本地资源、锚点、重复 ID 和 JSON-LD 的 CSP 哈希。
- `npm run build`：先执行上述校验，再将公开页面、样式、脚本和图片复制到 `dist/`；不复制后端、配置凭证或开发文件。
- `npm run dev`：本地静态预览。
- `npm test`：运行数据演示的 CSV 解析、字段检查、去重、导出与边界测试。

`dist/` 不提交，GitHub Pages 仍从 `main` 根目录发布，无需切换部署方式。前端已增加针对交互演示逻辑的 `test` 命令，后端仍未定义测试命令；静态校验和单元测试之外需进行浏览器交互验证。后端命令保持不变：`cd backend && npm ci` 后可运行 `npm run dev`；`deploy`、`db:remote` 会修改线上环境，只在后端发布时使用。

发布前需检查桌面和手机显示、全部可见链接、图片放大、FAQ、菜单、咨询表单与正式域名上的安全验证。

## 发布

GitHub 仓库为 `wodefake1123/zhijie-service-site`，`main` 分支推送后触发 GitHub Pages。发布时先确认 `git status`，不要把个人草稿或密钥一并提交；再等待 Pages 部署成功，检查公开首页与图片资源。Cloudflare Worker 是独立后端，本次前端改版不需要重新部署 Worker。

任何商户密钥或后台密码都不能写入静态网页或提交到 GitHub。正式支付接入前，还需确认签约商户主体、接口权限、服务端回调验签、退款与对账规则。

## 接手审计

见 [AUDIT.md](AUDIT.md)，记录 2026-10-01 接手时的技术栈、代码结构、Git 和部署证据，以及第一轮修改范围。

## 交互演示与设计 skill

`demo.js` 控制首页演示，`demo-data.mjs` 处理 CSV。所有演示输入仅在浏览器内处理，不上传、不保存、不写入业务系统；最多 100 条、8,000 字符。有效记录可导出，重复与异常记录保留在界面供检查。它是独立的规则处理示例，不是完整 ZhiFlow，也不调用 AI 模型。

仓库内 [frontend-design](.agents/skills/frontend-design/SKILL.md) 从 Anthropic 官方技能仓库下载，保留 [来源说明](.agents/skills/frontend-design/SOURCE.md) 和许可证。它用于前端视觉、排版与交互设计。每次任务先检查相关 skills 的工作约定见 [AGENTS.md](AGENTS.md)。
