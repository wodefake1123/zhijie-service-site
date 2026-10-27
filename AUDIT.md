# 知界官网接手审计（2026-10-01）

## 接手基线

仓库：`wodefake1123/zhijie-service-site`；分支：`main`；接手提交：`b3b632d2fd5ede8d9ee9df0e97ff0ecc64c46797`。拉取后工作区干净，无 AGENTS.md。读取 README、全部页面、前端脚本与样式、后端源码、迁移、包配置及站点配置后开展修改。

## 技术栈、命令与结构

前端是原生 HTML/CSS/JavaScript，无 React/Vue/Next.js、UI 库、前端依赖或原始构建流程。`index.html` 为首页；`privacy.html`、`terms.html`、`refund.html` 为政策页面。导航、咨询弹窗、图片放大、FAQ、项目查询和聊天窗口直接在页面中定义，没有组件框架。

- `styles.css`：CSS 变量、Grid/Flex、媒体查询、动画与历史覆盖样式。`legal.css`：政策页样式。
- `script.js`：导航、需求提交、Turnstile、项目进度、图片放大、FAQ 与访问记录。
- `chat.js`：通过现有 Worker 与扣子平台进行站内 AI 咨询。
- `assets/`：品牌标志、深色抽象首屏视觉、三张功能/流程演示图、两张 ZhiFlow 截图及微信二维码。保留现有资源，不虚构客户业绩。
- `backend/src/worker.js`：Cloudflare Worker 入口；订单提交、状态查询、后台管理、访问统计和扣子 OAuth/聊天代理。
- `backend/migrations/`：D1 订单、提交限流、客户查询凭证、访问记录和 AI 活动统计，共五个迁移。

接手时只有 `backend/package.json` 与 npm lockfile v3，开发依赖为 `wrangler ^4.34.0`。命令为 `dev`、`deploy`、`db:local`、`db:remote`，没有 build/lint/test。前端原有预览命令为 `python -m http.server 8080`。初始前后端脚本语法检查通过。

## 部署证据

GitHub Pages API 返回 `build_type: legacy`、`source.branch: main`、`source.path: /`、`status: built`、HTTPS 强制启用，绑定 `www.yidianqibu.online`。GitHub Actions 最新 `pages build and deployment` 在基线提交上成功：
https://github.com/wodefake1123/zhijie-service-site/actions/runs/36310415232

因此 push 到 main 会自动发布前端。根目录 CNAME 与 README 一致，线上首页 HTTP 200。Cloudflare Worker 独立发布，配置入口为 `backend/wrangler.toml`，D1 绑定名为 DB。现有 `/api/health` 返回 `{"ok":true}`。没有在本次修改中重新部署后端或执行远程迁移。健康接口正常并不等于每个业务接口均已验证。

## 主要问题

1. 首屏和咨询表单过于聚焦重复办公，没有充分表达软件、Web 产品和 MVP 开发能力。
2. 作品在问题、服务及流程对比之后，手机用户需要较长滚动才看到交付形态。
3. `.flow-line` 同时用作旧装饰连线和流程节点容器，继承绝对定位、旋转与装饰背景；浏览器确认流程容器为 absolute。
4. 历史 CSS 覆盖较多，维护时须注意作用域与响应式覆盖次序；本次只做必要局部修复。
5. 咨询与图片弹窗缺少焦点限制/恢复；AI 悬浮入口层级高于咨询弹窗。手机 AI 图标辨识度不足且可能遮挡正文。
6. 缺少标准 npm build/lint 入口，无法满足约定构建检查。

## 第一轮调整

沿用原生前端、资源、GitHub Pages 和 Cloudflare 后端；提前作品与 ZhiFlow，拓展六类服务、产品 FAQ 和项目需求表述；接入现有聊天体验按钮；修复流程样式、弹窗键盘焦点及手机咨询入口。手机底部统一放置 AI 咨询和项目咨询，避免额外浮窗遮挡内容。

增加根目录无第三方依赖的 npm dev/lint/build 命令。build 校验脚本语法、页面本地资源、锚点、重复 ID 与 CSP JSON-LD 哈希，并生成仅包含公开站点文件的 dist。Pages 继续发布根目录，后端命令与部署配置不变。

浏览器验证使用桌面、手机、小屏、平板与横屏尺寸，检查菜单、图片、FAQ、弹窗、焦点、咨询/查询/聊天成功与错误状态和政策页面。业务提交成功与错误路径使用本地模拟响应；不向线上创建测试订单。正式 Turnstile 与后端 CORS 只允许配置的域名，本地验证不能替代线上真实需求提交验收。

## 验证结果与限制

`npm run lint`、`npm run build`、`git diff --check` 通过。Chromium 在 1440×1000、390×844、320×700、820×1180 和 844×390 下完成布局及交互验证，无横向溢出、丢失图片或 JavaScript 异常；需求按钮、菜单、五个图片放大、FAQ、弹窗焦点、模拟订单提交/查询/聊天及三个政策页面验证通过。正式项目没有既有 test 命令。

对线上 AI 接口发送一条不含个人资料的服务咨询，返回“AI 暂时没有响应，请稍后重试或通过微信联系工作室”。这说明已有 AI 咨询目前不可用，健康接口无法证明扣子链路正常。已增加聊天错误中的人工联系入口；缺少 Cloudflare 日志及扣子配置访问能力，未推断或修改后端凭证，AI 恢复仍待后端排查。未通过正式 Turnstile 向生产数据库创建测试订单。

## 第二轮：整体视觉与交互改版

用户授权必要时整体重做，并要求任务开始前检查并采用相关 skills，允许下载新 skill。使用 Product Design audit 的流程/截图检查方式，并下载 Anthropic 官方 frontend-design 指导视觉与排版。规则记录在 AGENTS.md，下载的 skill、来源和 Apache 2.0 许可证保存在 .agents/skills/frontend-design/。

重做首页布局与样式：统一深色黑白灰，首屏使用“门与光”的构图，ZhiFlow 与实际产品截图作为主要内容；精简重复介绍，移除不必要的英文标签和装饰编号；项目进度改为折叠查询，政策页统一视觉。咨询先填写需求和联系方式，其余场景信息选填。保留所有既有作品、接口、表单安全验证、进度查询与 AI 咨询错误后的人工联系入口。

新增可实际操作的数据整理示例，支持修改 CSV、检查重复/缺失/数量、查看逐条结果、导出有效记录。输入只在本地浏览器处理，限制 100 条/8,000 字符；它不调用 AI，也不是完整 ZhiFlow 在线版。增加五项 Node 内置测试覆盖解析、校验、边界与导出行为。前端和后端框架、GitHub Pages 与 Worker 部署方式保持不变。

第二轮验证：五种桌面/移动/平板/横屏尺寸检查通过，图片与脚本加载正常；咨询、可选场景、进度折叠、FAQ、图片放大、聊天错误恢复以及 CSV 编辑/检查/导出均已验证。测试、静态校验与构建通过。手机作品优先展示产品截图，演示结果处理后可见；表单直接填写核心需求和联系方式。AI 后台与正式生产提交的验证限制仍如前述，未声称恢复 AI 服务。

## 第三轮：大陆可达性修复与表单迁移（2026-10-27）

**背景（实测）**：`*.workers.dev` 在中国大陆被 DNS 污染。本机解析与阿里 DoH 均返回 `199.16.156.7` / `202.160.128.96`（Twitter/Facebook 段），对照组 `example.workers.dev` 同样超时，而 `cloudflare.com`、`challenges.cloudflare.com` 可达。因此官网页面的**表单提交、订单查询、AI 咨询**对大陆访客全不可用；`/admin` 亦同（工作室自备代理可访问）。

**决策边界**：业主确认后台仅供自己使用（有代理），要求访客侧页面与咨询路径可用，且不接受新增费用。据此放弃"换国内云函数/迁 DNS"路线，改为**把表单外包给免费且大陆可达的第三方**。

**改动**：

1. 弹窗改为双入口：`#openFormLink`（腾讯文档收集表，新窗口）与 `#showWecom`（原地展开企业微信二维码）。
2. 原站内表单保留 DOM 但设 `hidden`，避免 `script.js` 的既有引用报错；Turnstile 仅在表单可见时加载，因此首页不再请求 `challenges.cloudflare.com`。
3. 访问统计（`/api/pageview`）暂停上报并保留恢复位置；该请求在大陆必然失败，只会产生控制台噪声。
4. README 的"表单复用 Worker + Turnstile"描述同步更新。

**验证**：`npm run lint/build/test` 全绿；Playwright 在 1440 与 390 宽度下确认链接、二维码展开、无横向溢出；线上 E2E 点击 CTA 打开 `docs.qq.com/form/page/…` 且标题为"需求咨询收集表"。

**仍未做**：Worker 线上版本落后仓库 1 个提交（缺 `ai_chat_activity` 计数写入）；因该接口依赖扣子链路且当前 AI 不可用，暂不重新部署，避免无收益的生产变更。支付仍未接入。
