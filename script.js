const skylineMenu=document.querySelector(".menu"),skylineNav=document.querySelector(".nav");skylineMenu?.addEventListener("click",()=>skylineNav?.classList.toggle("open"));document.querySelectorAll(".nav nav a").forEach(a=>a.addEventListener("click",()=>skylineNav?.classList.remove("open")));document.getElementById("painForm")?.addEventListener("submit",e=>{e.preventDefault();const p=document.getElementById("problem").value,n=document.getElementById("name").value,ph=document.getElementById("phone").value;const msg=`Hello Skyline AI, I am ${n}. My main business problem is: ${p}. My contact number is ${ph}. I want to discuss my business gaps.`;window.open("https://wa.me/917075307450?text="+encodeURIComponent(msg),"_blank")});
// Skyline AI Chatbot
const chatbotToggle = document.getElementById("chatbot-toggle");
const chatbotWindow = document.getElementById("chatbot-window");
const chatbotClose = document.getElementById("chatbot-close");
const chatbotMessages = document.getElementById("chatbot-messages");
const chatbotInput = document.getElementById("chatbot-input");
const chatbotSend = document.getElementById("chatbot-send");
const languageButtons = document.querySelectorAll("[data-language]");

let chatbotLanguage = "en";
let chatbotHistory = [];
chatbotToggle?.addEventListener("click", () => {
  chatbotWindow.hidden = false;
  chatbotInput?.focus();
});

chatbotClose?.addEventListener("click", () => {
  chatbotWindow.hidden = true;
});

function addBotMessage(message) {
  const div = document.createElement("div");
  div.className = "bot-message";
  div.style.display = "block";
  div.style.marginTop = "12px";
  div.textContent = message;
  chatbotMessages.appendChild(div);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function addUserMessage(message) {
  const div = document.createElement("div");
  div.textContent = message;
  div.style.margin = "12px 0 12px auto";
  div.style.padding = "10px 14px";
  div.style.maxWidth = "80%";
  div.style.width = "fit-content";
  div.style.background = "#071b3c";
  div.style.color = "#fff";
  div.style.borderRadius = "14px 14px 4px 14px";
  chatbotMessages.appendChild(div);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chatbotLanguage = button.dataset.language;

    if (chatbotLanguage === "te") {
      addBotMessage(
        "నమస్కారం! నేను Skyline AI Assistant. మీ వ్యాపారం గురించి చెప్పండి. మీకు ఏ సమస్యను AI ద్వారా పరిష్కరించాలి?"
      );
      chatbotInput.placeholder = "మీ సందేశాన్ని టైప్ చేయండి...";
      chatbotSend.textContent = "పంపండి";
    } else {
      addBotMessage(
        "Hello! I'm the Skyline AI Assistant. Tell me about your business and the problem you would like to solve with AI."
      );
      chatbotInput.placeholder = "Type your message...";
      chatbotSend.textContent = "Send";
    }

    document.querySelector(".chatbot-language")?.remove();
    chatbotInput.focus();
  });
});

async function sendChatMessage() {
  const message = chatbotInput.value.trim();

  if (!message) return;

  addUserMessage(message);
  chatbotInput.value = "";

  chatbotSend.disabled = true;
  chatbotInput.disabled = true;

  const thinkingDiv = document.createElement("div");
  thinkingDiv.className = "bot-message";
  thinkingDiv.style.display = "block";
  thinkingDiv.style.marginTop = "12px";
  thinkingDiv.textContent =
    chatbotLanguage === "te" ? "ఒక్క క్షణం..." : "Thinking...";

  chatbotMessages.appendChild(thinkingDiv);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

  try {
    const response = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: message,
        language: chatbotLanguage
        history: chatbotHistory
      })
       });

    const data = await response.json();

    thinkingDiv.remove();

    if (!response.ok) {
      throw new Error(data.error || "AI request failed");
    }

    addBotMessage(data.reply);
    chatbotHistory.push({
  role: "user",
  text: message
});

chatbotHistory.push({
  role: "assistant",
  text: data.reply
});

// Keep only the latest 20 messages
if (chatbotHistory.length > 20) {
  chatbotHistory = chatbotHistory.slice(-20);
}

  } catch (error) {
    thinkingDiv.remove();

    if (chatbotLanguage === "te") {
      addBotMessage(
        "క్షమించండి. ప్రస్తుతం AI Assistant స్పందించలేకపోతోంది. దయచేసి కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి."
      );
    } else {
      addBotMessage(
        "Sorry, the AI Assistant is temporarily unavailable. Please try again shortly."
      );
    }

    console.error("Skyline AI chatbot error:", error);

  } finally {
    chatbotSend.disabled = false;
    chatbotInput.disabled = false;
    chatbotInput.focus();
  }
}

chatbotSend?.addEventListener("click", sendChatMessage);

chatbotInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendChatMessage();
  }
});

// End Skyline AI Chatbot
