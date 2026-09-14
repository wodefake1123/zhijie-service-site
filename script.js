const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  nav.classList.toggle("open", !open);
});
nav.querySelectorAll("a").forEach((link) =>
  link.addEventListener("click", () => {
    menuButton.setAttribute("aria-expanded", "false");
    nav.classList.remove("open");
  }),
);
document.querySelector("#year").textContent = new Date().getFullYear();
if (!sessionStorage.getItem("zhijiePageview")) {
  sessionStorage.setItem("zhijiePageview", "1");
  fetch("https://zhijie-orders.zhijie-orders-backend.workers.dev/api/pageview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: location.pathname, device: matchMedia("(max-width:720px)").matches ? "mobile" : "desktop" }), keepalive: true }).catch(() => {});
}
const observer = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    }),
  { threshold: 0.08 },
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
const modal = document.querySelector("#orderModal");
const form = document.querySelector("#orderForm");
const planSelect = document.querySelector("#orderPlan");
const result = document.querySelector("#orderResult");
const summary = document.querySelector("#orderSummary");
const firstInput = document.querySelector("#customerName");
function openOrder(plan) {
  planSelect.value = [...planSelect.options].some((o) => o.value === plan)
    ? plan
    : "待沟通方案";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  setTimeout(() => firstInput.focus(), 80);
}
function closeOrder() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}
document
  .querySelectorAll(".js-order")
  .forEach((btn) =>
    btn.addEventListener("click", () => openOrder(btn.dataset.plan)),
  );
document
  .querySelectorAll("[data-close]")
  .forEach((el) => el.addEventListener("click", closeOrder));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("open")) closeOrder();
});
const ORDER_API =
  "https://zhijie-orders.zhijie-orders-backend.workers.dev/api/orders";
const TURNSTILE_SITE_KEY = "0x4AAAAAAEzkn5xVLHLN5K76";
let turnstileWidgetId = null;
let turnstileToken = "";
const turnstileStatus = document.querySelector("#turnstileStatus");
window.onTurnstileReady = () => {
  if (turnstileWidgetId !== null || !window.turnstile) return;
  turnstileWidgetId = window.turnstile.render("#turnstileWidget", {
    sitekey: TURNSTILE_SITE_KEY,
    theme: "light",
    size: "flexible",
    appearance: "interaction-only",
    action: "submit_order",
    callback: (token) => {
      turnstileToken = token;
      turnstileStatus.textContent = "安全验证已完成";
    },
    "expired-callback": () => {
      turnstileToken = "";
      turnstileStatus.textContent = "验证已过期，请重新验证";
    },
    "error-callback": () => {
      turnstileToken = "";
      turnstileStatus.textContent = "安全验证加载失败，请刷新后重试";
    },
  });
};
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submit = document.querySelector("#submitOrder");
  const name = document.querySelector("#customerName").value.trim() || "未填写";
  const contact =
    document.querySelector("#customerContact").value.trim() || "未填写";
  const need = document.querySelector("#projectNeed").value.trim();
  const timeline = document.querySelector("#timeline").value;
  const budget = document.querySelector("#budget").value;
  if (!turnstileToken) {
    turnstileStatus.textContent = "请先完成安全验证";
    showToast("请先完成安全验证");
    return;
  }
  submit.disabled = true;
  submit.textContent = "正在安全提交…";
  result.hidden = true;
  try {
    const response = await fetch(ORDER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: name,
        contact,
        plan: planSelect.value,
        timeline,
        budget,
        need,
        turnstileToken,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "提交失败，请稍后再试");
    const shortId =
      data.id.split("-")[0].toUpperCase() +
      "-" +
      data.id.slice(-8).toUpperCase();
    summary.textContent = `知界信息技术服务工作室｜合作需求\n显示编号：${shortId}\n完整订单编号：${data.id}\n查询凭证：${data.lookupToken}\n\n请妥善保存完整订单编号和查询凭证，二者用于在官网查询项目进度。\n\n称呼：${name}\n联系方式：${contact}\n意向方案：${planSelect.value}\n期望时间：${timeline}\n预算范围：${budget}\n需求说明：${need}\n\n状态：已提交至工作室后台，等待沟通确认。\n说明：提交需求不代表合同成立或已经付款。`;
    localStorage.setItem("zhijieLastOrder", JSON.stringify({ id: data.id, lookupToken: data.lookupToken }));
    document.querySelector("#orderHint").textContent =
      "需求已安全保存。建议复制摘要并通过微信发送给工作室，方便及时沟通。";
    result.hidden = false;
    showToast("需求已提交，订单编号已生成");
  } catch (error) {
    summary.textContent = `本次需求尚未保存到后台。\n原因：${error.message}\n\n请稍后重试，或复制你的需求后通过微信联系工作室。`;
    document.querySelector("#orderHint").textContent =
      "没有生成订单，也没有发生扣款。你可以稍后重试或直接微信联系。";
    result.hidden = false;
    showToast("提交未完成，请查看提示");
  } finally {
    turnstileToken = "";
    if (window.turnstile && turnstileWidgetId !== null)
      window.turnstile.reset(turnstileWidgetId);
    turnstileStatus.textContent = "请完成安全验证后再次提交";
    submit.disabled = false;
    submit.textContent = "提交需求并生成订单编号";
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
});
document.querySelector("#copyOrder").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(summary.textContent);
    showToast("已复制订单摘要");
  } catch {
    const range = document.createRange();
    range.selectNode(summary);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    showToast("请长按或右键复制摘要");
  }
});
function showToast(text) {
  const toast = document.querySelector("#toast");
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

const queryForm = document.querySelector("#queryForm");
const queryMessage = document.querySelector("#queryMessage");
const queryResult = document.querySelector("#queryResult");
const statusLabels = { new: "待沟通", quoted: "已报价", awaiting_payment: "待付款", paid: "已付款", in_progress: "制作中", completed: "已完成", cancelled: "已取消" };
try {
  const saved = JSON.parse(localStorage.getItem("zhijieLastOrder") || "null");
  if (saved?.id && saved?.lookupToken) {
    document.querySelector("#queryOrderId").value = saved.id;
    document.querySelector("#queryToken").value = saved.lookupToken;
  }
} catch {}
queryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = queryForm.querySelector("button");
  button.disabled = true;
  queryMessage.textContent = "正在安全查询…";
  queryResult.hidden = true;
  try {
    const response = await fetch("https://zhijie-orders.zhijie-orders-backend.workers.dev/api/order-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: document.querySelector("#queryOrderId").value.trim(), lookupToken: document.querySelector("#queryToken").value.trim() }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "暂时无法查询");
    const order = data.order;
    queryResult.replaceChildren();
    const title = document.createElement("h3");
    title.textContent = `${statusLabels[order.status] || "处理中"} · ${order.plan}`;
    const meta = document.createElement("p");
    meta.textContent = `提交：${new Date(order.created_at).toLocaleString()}　更新：${new Date(order.updated_at).toLocaleString()}`;
    const amount = document.createElement("p");
    amount.textContent = order.quoted_amount == null ? "确认金额：尚未报价" : `确认金额：¥${(order.quoted_amount / 100).toFixed(2)}`;
    const note = document.createElement("p");
    note.textContent = order.public_note || "工作室尚未发布新的客户进度说明。";
    queryResult.append(title, meta, amount, note);
    queryResult.hidden = false;
    queryMessage.textContent = "查询成功";
  } catch (error) {
    queryMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

const solutions = {
  office: {
    code: "01 / OFFICE EFFICIENCY",
    title: "办公提效与批量处理",
    desc: "适合每天反复整理文件、表格、文档或复制信息的个人与团队，把固定规则变成一键执行流程。",
    fit: "批量改名、表格合并、格式转换、文档生成",
    deliver: "可运行工具、规则配置、使用说明、测试样例",
    time: "3–7 个工作日",
    plan: "基础方案",
  },
  data: {
    code: "02 / DATA APPLICATION",
    title: "数据清洗、分析与可视化",
    desc: "适合数据来源杂乱、每周反复统计或需要经营看板的场景，让数据从“堆在表里”变成可检查的结论。",
    fit: "多表合并、数据去重、销售分析、经营看板",
    deliver: "清洗规则、标准数据、分析结果、可视化界面",
    time: "5–12 个工作日",
    plan: "标准方案",
  },
  ai: {
    code: "03 / AI WORKFLOW",
    title: "AI 信息处理与业务工作流",
    desc: "把大模型放入明确的业务节点，完成提取、分类、整理、生成和通知，并保留必要的人工确认。",
    fit: "资料分类、内容提取、知识问答、自动通知",
    deliver: "工作流配置、提示规则、结构化结果、运行说明",
    time: "7–15 个工作日",
    plan: "标准方案",
  },
  tool: {
    code: "04 / CUSTOM TOOL",
    title: "脚本、网页与专用小工具",
    desc: "针对一个明确卡点制作轻量工具，减少对通用软件的迁就，形成更贴合自身工作方式的操作界面。",
    fit: "桌面小工具、网页表单、内部工具、流程衔接",
    deliver: "工具程序、操作界面、测试版本、交付文档",
    time: "7–20 个工作日",
    plan: "定制方案",
  },
};
const panelFields = {
  code: document.querySelector("#solutionCode"),
  title: document.querySelector("#solutionTitle"),
  desc: document.querySelector("#solutionDesc"),
  fit: document.querySelector("#solutionFit"),
  deliver: document.querySelector("#solutionDeliver"),
  time: document.querySelector("#solutionTime"),
};
document.querySelectorAll(".solution-tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    const item = solutions[tab.dataset.solution];
    document.querySelectorAll(".solution-tab").forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", String(t === tab));
    });
    Object.keys(panelFields).forEach(
      (key) => (panelFields[key].textContent = item[key]),
    );
    const order = document.querySelector(".js-solution-order");
    order.dataset.plan = item.plan;
    document.querySelector("#solutionPanel").animate(
      [
        { opacity: 0.55, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 320, easing: "ease-out" },
    );
  }),
);
document
  .querySelector(".js-solution-order")
  .addEventListener("click", (e) => openOrder(e.currentTarget.dataset.plan));

const estimateInputs = ["estimateType", "estimateComplexity", "estimateUI"].map(
  (id) => document.querySelector("#" + id),
);
function updateEstimate() {
  const type = document.querySelector("#estimateType").value,
    complexity = document.querySelector("#estimateComplexity").value,
    ui = document.querySelector("#estimateUI").value;
  let score =
    { simple: 0, medium: 1, complex: 2 }[complexity] +
    { no: 0, yes: 1, advanced: 2 }[ui] +
    (type === "ai" ? 1 : 0);
  let data =
    score <= 1
      ? ["基础方案", "¥300–800", "预计 3–7 个工作日"]
      : score <= 3
        ? ["标准方案", "¥800–1,500", "预计 5–12 个工作日"]
        : ["定制方案", "¥1,500 起", "预计 10–20 个工作日"];
  document.querySelector("#estimatePlan").textContent = data[0];
  document.querySelector("#estimatePrice").textContent = data[1];
  document.querySelector("#estimateTime").textContent = data[2];
  return data;
}
estimateInputs.forEach((input) =>
  input.addEventListener("change", updateEstimate),
);
updateEstimate();
document.querySelector(".js-estimate-order").addEventListener("click", () => {
  const data = updateEstimate();
  openOrder(data[0]);
  document.querySelector("#projectNeed").value =
    `初步估算：${data.join("，")}\n需求类型：${document.querySelector("#estimateType").selectedOptions[0].text}\n复杂程度：${document.querySelector("#estimateComplexity").selectedOptions[0].text}\n界面需求：${document.querySelector("#estimateUI").selectedOptions[0].text}\n补充说明：`;
});

const lightbox = document.querySelector("#lightbox"),
  lightboxImage = document.querySelector("#lightboxImage"),
  lightboxCaption = document.querySelector("#lightboxCaption");
function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}
document.querySelectorAll(".js-lightbox").forEach((btn) =>
  btn.addEventListener("click", () => {
    lightboxImage.src = btn.dataset.src;
    lightboxImage.alt = btn.dataset.caption;
    lightboxCaption.textContent = btn.dataset.caption;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }),
);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox || e.target.closest(".lightbox-close"))
    closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox.classList.contains("open"))
    closeLightbox();
});

document.querySelectorAll(".faq details").forEach((item) =>
  item.addEventListener("toggle", () => {
    if (item.open)
      document.querySelectorAll(".faq details").forEach((other) => {
        if (other !== item) other.open = false;
      });
  }),
);
const glow = document.querySelector(".cursor-glow");
if (matchMedia("(pointer:fine)").matches)
  document.addEventListener(
    "pointermove",
    (e) => {
      glow.style.transform = `translate(${e.clientX - 180}px,${e.clientY - 180}px)`;
    },
    { passive: true },
  );
