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
const firstInput = document.querySelector("#projectNeed");
let dialogTrigger = null;
let dialogInertStates = new Map();
function activateDialog(dialog) {
  dialogTrigger = document.activeElement;
  dialogInertStates = new Map();
  [...document.body.children].forEach((element) => {
    if (element === dialog || element.tagName === "SCRIPT") return;
    dialogInertStates.set(element, element.inert);
    element.inert = true;
  });
}
function deactivateDialog() {
  dialogInertStates.forEach((inert, element) => { element.inert = inert; });
  dialogInertStates.clear();
  if (dialogTrigger?.getClientRects().length) dialogTrigger.focus();
  else menuButton.focus();
}
document.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const dialog = document.querySelector(".modal.open, .lightbox.open");
  if (!dialog) return;
  const items = [...dialog.querySelectorAll("button, input, select, textarea, a[href]")]
    .filter((element) => !element.disabled && element.getClientRects().length);
  const first = items[0], last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
function openOrder(plan) {
  menuButton.setAttribute("aria-expanded", "false");
  nav.classList.remove("open");
  activateDialog(modal);
  planSelect.value = [...planSelect.options].some((o) => o.value === plan)
    ? plan
    : "待沟通方案";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  loadTurnstile();
  setTimeout(() => firstInput.focus(), 80);
}
function closeOrder() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  deactivateDialog();
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
let turnstileLoadStarted = false;
function loadTurnstile() {
  if (window.turnstile) {
    window.onTurnstileReady();
    return;
  }
  if (turnstileLoadStarted) return;
  turnstileLoadStarted = true;
  const script = document.createElement("script");
  script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileReady&render=explicit";
  script.async = true;
  script.onerror = () => {
    turnstileLoadStarted = false;
    turnstileStatus.textContent = "安全验证加载失败，请刷新后重试";
    script.remove();
  };
  document.head.appendChild(script);
}
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
  turnstileStatus.textContent = "请完成安全验证";
};
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submit = document.querySelector("#submitOrder");
  const name = document.querySelector("#customerName").value.trim() || "未填写";
  const contactInput = document.querySelector("#customerContact");
  const contact = contactInput.value.trim();
  const industry = document.querySelector("#industry").value;
  const frequency = document.querySelector("#frequency").value;
  const description = document.querySelector("#projectNeed").value.trim();
  const need = `行业：${industry}\n使用频率：${frequency}\n项目需求：${description}`;
  const timeline = "先沟通评估";
  const budget = "先沟通评估";
  if (!contact) {
    contactInput.focus();
    showToast("请填写可联系到你的微信号或其他方式");
    return;
  }
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
    summary.textContent = `知界信息技术服务工作室｜初步判断需求\n显示编号：${shortId}\n完整订单编号：${data.id}\n查询凭证：${data.lookupToken}\n\n请妥善保存完整订单编号和查询凭证，二者用于在官网查询进度。\n\n称呼：${name}\n联系方式：${contact}\n${need}\n\n状态：已提交至工作室后台，等待沟通确认。\n说明：提交需求不代表合同成立或已经付款。`;
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
    submit.textContent = "提交需求，获取初步建议";
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

const lightbox = document.querySelector("#lightbox"),
  lightboxImage = document.querySelector("#lightboxImage"),
  lightboxCaption = document.querySelector("#lightboxCaption");
function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  deactivateDialog();
}
document.querySelectorAll(".js-lightbox").forEach((btn) =>
  btn.addEventListener("click", () => {
    activateDialog(lightbox);
    lightboxImage.src = btn.dataset.src;
    lightboxImage.alt = btn.dataset.caption;
    lightboxCaption.textContent = btn.dataset.caption;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    lightbox.querySelector(".lightbox-close").focus();
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

// Reveal the existing progress form when navigating to it from the footer.
document.querySelectorAll('a[href="#order-query"]').forEach((link) => {
  link.addEventListener('click', () => { document.querySelector('#order-query').open = true; });
});
if (location.hash === '#order-query') document.querySelector('#order-query').open = true;
