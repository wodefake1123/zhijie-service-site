(() => {
  const root = document.querySelector("#aiChat");
  const panel = document.querySelector("#aiChatPanel");
  const launcher = document.querySelector("[data-ai-chat-launcher]");
  const form = document.querySelector("#aiChatForm");
  const input = document.querySelector("#aiChatInput");
  const messages = document.querySelector("#aiChatMessages");
  const status = document.querySelector("#aiChatStatus");
  if (!root || !panel || !launcher || !form || !input || !messages || !status) return;

  const sessionKey = "zhijieAiSession";
  const conversationKey = "zhijieAiConversation";
  let sessionId = sessionStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(sessionKey, sessionId);
  }
  let conversationId = sessionStorage.getItem(conversationKey) || "";
  let sending = false;
  let chatTrigger = launcher;

  function openChat(event) {
    event?.preventDefault();
    chatTrigger = event?.currentTarget || launcher;
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    document.querySelectorAll("[data-open-ai-chat]").forEach(button => button.setAttribute("aria-expanded", "true"));
    input.focus();
  }
  function closeChat() {
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    document.querySelectorAll("[data-open-ai-chat]").forEach(button => button.setAttribute("aria-expanded", "false"));
    chatTrigger.focus();
  }
  function addMessage(text, who, pending = false) {
    const bubble = document.createElement("p");
    bubble.className = `ai-chat-message ${who}${pending ? " pending" : ""}`;
    bubble.textContent = text;
    messages.append(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  document.querySelectorAll("[data-open-ai-chat]").forEach((button) => button.addEventListener("click", openChat));
  panel.querySelectorAll("[data-close-ai-chat]").forEach((button) =>
    button.addEventListener("click", closeChat),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closeChat();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sending) return;
    const message = input.value.trim();
    if (!message) return;

    sending = true;
    status.textContent = "正在整理回复…";
    addMessage(message, "user");
    input.value = "";
    input.disabled = true;
    form.querySelector("button").disabled = true;
    const pending = addMessage("正在思考…", "assistant", true);

    try {
      const response = await fetch(
        "https://zhijie-orders.zhijie-orders-backend.workers.dev/api/ai-chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, sessionId, conversationId }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "暂时无法获取回复，请稍后再试。");
      if (data.conversationId) {
        conversationId = data.conversationId;
        sessionStorage.setItem(conversationKey, conversationId);
      }
      pending.textContent = data.reply || "这次没有生成文字回复，请换个问法试试。";
      pending.classList.remove("pending");
      status.textContent = "回复已发送";
    } catch (error) {
      pending.remove();
      const failure = addMessage(error.message || "连接暂时有问题，请稍后再试。", "assistant error");
      const contactLink = document.createElement("a");
      contactLink.href = "#contact";
      contactLink.textContent = "联系工作室，直接沟通 →";
      contactLink.addEventListener("click", closeChat);
      failure.append(document.createTextNode("\n"), contactLink);
      status.textContent = "回复失败，可修改问题后重试";
      input.value = message;
    } finally {
      sending = false;
      input.disabled = false;
      form.querySelector("button").disabled = false;
      if (!panel.hidden) input.focus();
    }
  });
})();
