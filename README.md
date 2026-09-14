# 知界信息技术服务工作室｜公开服务网站

官网前端由 GitHub Pages 免费托管；订单接口、管理后台和 D1 数据库运行在 Cloudflare 免费额度内。订单提交已接入 Cloudflare Turnstile，并由服务端再次验证。

## 当前支付路线

- 仅计划接入支付宝与微信支付，不再使用 PayPal。
- 在官方商户接口、签约主体、密钥和支付回调均准备完成前，官网只允许提交合作需求，不显示付款成功。
- 不把个人收款码伪装成自动支付系统；订单的“已付款”状态必须来自支付平台的服务端通知或经管理员人工核实。

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

## 正式接入支付宝或微信支付前的核对

- 公开网址能直接打开，并且移动端显示正常。
- 已设置真实可用的微信联系入口；有业务邮箱后可再补充。
- 服务描述、价格和付款流程均真实且与你实际提供的服务一致。
- 确认签约商户主体、开放的支付产品、回调域名、退款规则和账单对账方式。
- 商户私钥、平台密钥和 API 密钥只能保存为服务端 Secret，不能写入网页或提交到 GitHub。
- 以支付宝或微信支付的服务端通知验签结果更新订单，不以页面跳转或客户截图作为自动确认依据。
