# 知界 ZHIJIE 官网

公开地址：[www.yidianqibu.online](https://www.yidianqibu.online/)。这是无需构建的静态网站，`index.html`、`styles.css`、`script.js` 和 `assets/` 部署在 GitHub Pages。`privacy.html`、`terms.html`、`refund.html` 是独立政策页面。

首页以普通客户的业务问题为主线：重复工作 → 四项服务 → 前后流程示意 → 工作室演示 → 合作步骤 → 常见问题 → 免费初步判断。案例图片是功能演示截图，业务数据为测试数据，不应改写成真实客户业绩。

## 咨询与后台

- 首页按钮打开简短表单，采集行业、重复工作频率、问题描述、联系方式和可选称呼。
- 表单复用现有 Cloudflare Worker、D1 订单后台和 Turnstile 安全验证。提交需求不等于付款或签约。
- ZhiFlow 在官网展示的是本地演示截图，不是公开可用的在线 SaaS。
- 支付宝和微信支付尚未接入；网站不会直接收款，也不会把提交需求显示成付款成功。

## 本地预览与检查

在本目录运行 `python -m http.server 8080`，浏览器访问 `http://localhost:8080`。首次进入会看到 Turnstile 的本地域名验证错误，这是因为安全验证只允许已配置的正式域名；不要用本地报错判断线上提交是否有效。

前端无 `build` 或 `lint` 脚本。可执行 `node --check script.js` 检查脚本语法；`backend/package.json` 也未定义测试脚本。发布前需检查桌面和手机显示、全部可见链接、图片放大、FAQ、菜单、咨询表单与正式域名上的安全验证。

## 发布

GitHub 仓库为 `wodefake1123/zhijie-service-site`，`main` 分支推送后触发 GitHub Pages。发布时先确认 `git status`，不要把个人草稿或密钥一并提交；再等待 Pages 部署成功，检查公开首页与图片资源。Cloudflare Worker 是独立后端，本次前端改版不需要重新部署 Worker。

任何商户密钥或后台密码都不能写入静态网页或提交到 GitHub。正式支付接入前，还需确认签约商户主体、接口权限、服务端回调验签、退款与对账规则。
