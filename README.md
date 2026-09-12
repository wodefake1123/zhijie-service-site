# 知界信息技术服务工作室｜公开服务网站

这是一个无需数据库、无需后端、无需付费插件的静态网站，可部署到 Vercel、Cloudflare Pages 或 GitHub Pages。

## 发布前仅需替换两处

1. 当前咨询入口指向 GitHub 公开主页。业务邮箱准备好后，可在 `index.html` 中将该链接替换为真实的咨询邮箱。
2. PayPal 审核通过并在商家后台生成**官方**付款链接/按钮后，搜索 `payment-placeholder`，将这一块替换为 PayPal 后台提供的官方链接或嵌入代码。不要自行仿造 PayPal 按钮。

## 本地预览

直接双击 `index.html` 即可在浏览器中查看。若需要用本地地址预览，可在本文件夹打开 PowerShell 后运行：

```powershell
python -m http.server 8080
```

随后访问 `http://localhost:8080`。停止预览时，在该窗口按 `Ctrl+C`。

## 最快免费部署：Vercel

1. 注册或登录 [Vercel](https://vercel.com/)。
2. 新建一个 GitHub 仓库，将本文件夹中的 `index.html`、`styles.css`、`script.js`、`README.md` 上传到仓库根目录。
3. 在 Vercel 点 **Add New → Project**，导入该 GitHub 仓库。
4. Framework Preset 选择 **Other**，Build Command 和 Output Directory 都留空，然后点 **Deploy**。
5. 部署完成后会得到一个 `https://...vercel.app` 的公开网址。用手机和电脑各打开一次确认页面、邮件按钮和付款说明正常。

## Cloudflare Pages / GitHub Pages

- **Cloudflare Pages：** 创建 Pages 项目并连接同一 GitHub 仓库；Framework preset 选 **None**；构建命令留空，输出目录填 `/`。
- **GitHub Pages：** 在仓库 Settings → Pages，Source 选 **Deploy from a branch**，选择 `main` 分支与 `/(root)`，保存后等待公开网址生成。

## 给 PayPal 审核前的核对

- 公开网址能直接打开，并且移动端显示正常。
- 已设置真实可用的 GitHub 联系入口；有业务邮箱后可再替换。
- 服务描述、价格和付款流程均真实且与你实际提供的服务一致。
- 只在获得 PayPal 商家后台生成的官方链接/代码后才接入收款；不要放伪造按钮。
- 提交审核时，可说明：该网站用于展示技术服务；客户先沟通确认服务，再通过 PayPal 官方付款链接完成付款。
