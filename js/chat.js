/* ==========================================
   CIPHER CHAT ENGINE
   Created by Fatai Quadri
========================================== */

"use strict";

/* ==========================================
   CHAT OBJECT
   This is the single source of truth for
   which chat is currently open. sidebar.js
   reads/writes Chat.currentChat directly
   instead of keeping its own copy.
========================================== */

const Chat = {

    currentChat: null,

    messages: [],

    sending: false,

    streaming: false,

    typing: false,

    initialized: false

};


/* ==========================================
   CHAT ELEMENTS
========================================== */

const ChatUI = {

    container: document.getElementById("chat"),

    input: document.getElementById("input"),

    form: document.getElementById("form"),

    sendButton: document.getElementById("send"),

    sidebar: document.getElementById("chat-list")

};


/* ==========================================
   LOAD LAST CHAT
   NOTE: registerChatEvents() is intentionally
   NOT called anymore -- app.js already owns
   the form submit and input keydown listeners.
   Calling both would send every message twice.
========================================== */

function loadLastChat(){

    const lastChat =

        loadLocal("last-chat");

    if(lastChat){

        Chat.currentChat = lastChat;

    }

}


document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadLastChat();

        loadDraft();

    }
);


/* ==========================================
   SEND MESSAGE
   Called by app.js's handleSendMessage() with
   no arguments. Reads the message from the
   input itself. No longer blocks when there's
   no current chat -- the backend /chat route
   auto-creates one and returns its id, which
   we then adopt as the current chat everywhere.
========================================== */

async function sendMessage(event) {

    if (event && typeof event.preventDefault === "function") {

        event.preventDefault();

    }

    if (Chat.sending) return;

    const message = ChatUI.input.value.trim();

    const pendingImage =
        (typeof Cipher !== "undefined")
            ? Cipher.pendingImage
            : null;


    if (!message && !pendingImage) return;

    Chat.sending = true;

    ChatUI.sendButton.disabled = true;

    addUserMessage(
        message
        || `📎 ${pendingImage.name}`
    );

    ChatUI.input.value = "";

    if (typeof autoResizeInput === "function") {

        autoResizeInput();

    }

    if (typeof clearPendingImage === "function") {

        clearPendingImage();

    }

    const thinkingMessage = addThinkingMessage();

    try {

        const response = await fetch("/chat", {

            method: "POST",

            credentials: "same-origin",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                chat_id: Chat.currentChat,

                message: message,

                image_base64:
                    pendingImage
                        ? pendingImage.base64
                        : null,

                image_mime_type:
                    pendingImage
                        ? pendingImage.mimeType
                        : null

            })

        });

        if (!response.ok) {

            throw new Error(

                `Server returned ${response.status}`

            );

        }

        const data = await response.json();

        updateThinkingMessage(

            thinkingMessage,

            data.reply || "No response received."

        );

        Chat.messages.push({

            role: "user",

            content: message

        });

        Chat.messages.push({

            role: "assistant",

            content: data.reply

        });

        /*
         * Adopt the chat_id the backend created
         * (or confirmed) as the current chat, and
         * keep the sidebar in sync with it.
         */

        if (data.chat_id) {

            const isNewChat =
                Chat.currentChat !== data.chat_id;

            Chat.currentChat = data.chat_id;

            if (
                typeof Sidebar !== "undefined"
            ) {

                Sidebar.currentChat = data.chat_id;

            }

            if (
                isNewChat &&
                typeof loadSidebarChats === "function"
            ) {

                await loadSidebarChats();

            }

            if (
                typeof highlightActiveChat === "function"
            ) {

                highlightActiveChat(data.chat_id);

            }

        }

    }

    catch (error) {

        console.error(error);

        updateThinkingMessage(

            thinkingMessage,

            "⚠ Unable to contact Cipher."

        );

    }

    Chat.sending = false;

    ChatUI.sendButton.disabled = false;

    ChatUI.input.focus();

    clearDraft();

}


/* ==========================================
   STREAMING RESPONSES
========================================== */

function addThinkingMessage() {

    const message = document.createElement("div");

    message.className = "msg bot thinking";

    message.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `;

    ChatUI.container.appendChild(message);

    scrollToBottom();

    return message;

}


/* ==========================================
   UPDATE BOT MESSAGE
========================================== */

function updateThinkingMessage(element, text) {

    element.classList.remove("thinking");

    element.innerHTML = "";

    streamMarkdown(element, text);

}


/* ==========================================
   STREAM TEXT
========================================== */

async function streamMarkdown(element, text){

    Chat.streaming = true;

    let current = "";

    for(const character of text){

        current += character;

        element.innerHTML = renderMarkdown(current);

        scrollToBottom();

        await sleep(10);

    }

    Chat.streaming = false;

}


/* ==========================================
   SCROLL
========================================== */

function scrollToBottom() {

    ChatUI.container.scrollTop =

        ChatUI.container.scrollHeight;

}


/* ==========================================
   MESSAGE RENDERING
========================================== */

function addUserMessage(text) {

    const message = createMessageElement(

        "user",

        text

    );

    ChatUI.container.appendChild(message);

    scrollToBottom();

    return message;

}


/* ==========================================
   CREATE MESSAGE
========================================== */

function createMessageElement(role, text) {

    const wrapper = document.createElement("div");

    wrapper.className =

        `msg ${role === "user" ? "user" : "bot"}`;

    wrapper.dataset.role = role;

    wrapper.dataset.time = Date.now();


    wrapper.innerHTML = `

        <div class="message-text">

            ${escapeHTML(text)}

        </div>

        ${createMessageActions(role, text)}

    `;

    return wrapper;

}


/* ==========================================
   CHAT HISTORY
========================================== */

async function loadChat(chatId) {

    if (!chatId) return;

    try {

        Chat.currentChat = chatId;

        Chat.messages = [];

        ChatUI.container.innerHTML = "";

        const response = await fetch(

            `/chats/${chatId}/messages`

        );

        if (!response.ok) {

            throw new Error("Unable to load chat.");

        }

        const messages = await response.json();

        if (!messages.length) {

            showWelcomeScreen();

            return;

        }

        messages.forEach(message => {

            ChatUI.container.appendChild(
                createMessageElement(
                    message.role,
                    message.content
                )
            );

            Chat.messages.push(message);

        });

        scrollToBottom();

    }

    catch (error) {

        console.error(error);

        showError(

            "Unable to load chat history."

        );

    }

}


/* ==========================================
   WELCOME
========================================== */

function showWelcomeScreen() {

    ChatUI.container.innerHTML = `

        <div class="welcome">

            <div class="welcome-logo">
                ¢
            </div>

            <h2>

                Welcome to Cipher

            </h2>

            <p>

                Ask anything.
                Solve problems.
                Create reminders.
                Learn faster.

            </p>

        </div>

    `;

}


/* ==========================================
   MARKDOWN RENDERER
========================================== */

function renderMarkdown(text) {

    if (!text) return "";

    let html = escapeHTML(text);

    html = html.replace(

        /```([\s\S]*?)```/g,

        `<pre class="cipher-code"><code>$1</code></pre>`

    );

    html = html.replace(

        /`([^`]+)`/g,

        `<code class="cipher-inline-code">$1</code>`

    );

    html = html.replace(

        /\*\*(.*?)\*\*/g,

        `<strong>$1</strong>`

    );

    html = html.replace(

        /\*(.*?)\*/g,

        `<em>$1</em>`

    );

    html = html.replace(

        /^### (.*)$/gm,

        `<h3>$1</h3>`

    );

    html = html.replace(

        /^## (.*)$/gm,

        `<h2>$1</h2>`

    );

    html = html.replace(

        /^# (.*)$/gm,

        `<h1>$1</h1>`

    );

    html = html.replace(

        /^\- (.*)$/gm,

        `<li>$1</li>`

    );

    html = html.replace(

        /(<li>.*<\/li>)/gs,

        `<ul>$1</ul>`

    );

    html = html.replace(/\n/g, "<br>");

    return html;

}


/* ==========================================
   MESSAGE ACTIONS
========================================== */

function createMessageActions(role, text) {

    if (role !== "assistant") {

        return "";

    }

    return `

        <div class="message-actions">

            <button
                class="message-btn"
                onclick="copyMessage(this)"
                title="Copy"
                type="button">

                📋

            </button>

            <button
                class="message-btn"
                onclick="regenerateResponse()"
                title="Regenerate"
                type="button">

                🔄

            </button>

        </div>

    `;

}


/* ==========================================
   COPY MESSAGE
========================================== */

async function copyMessage(button) {

    const message =

        button.closest(".msg")
              .querySelector(".message-text");

    try {

        await navigator.clipboard.writeText(

            message.innerText

        );

        showSuccess(

            "Copied to clipboard."

        );

    }

    catch {

        showError(

            "Unable to copy."

        );

    }

}


/* ==========================================
   REGENERATE
========================================== */

function regenerateResponse() {

    showInfo(

        "Regeneration will be enabled after backend integration."

    );

}


/* ==========================================
   AUTO SAVE & DRAFT RECOVERY
========================================== */

const Draft = {

    key: "cipher-draft"

};


function saveDraft() {

    if (!ChatUI.input) return;

    localStorage.setItem(

        Draft.key,

        ChatUI.input.value

    );

}


function loadDraft() {

    const draft =

        localStorage.getItem(

            Draft.key

        );

    if (

        draft &&

        ChatUI.input

    ) {

        ChatUI.input.value = draft;

    }

}


function clearDraft() {

    localStorage.removeItem(

        Draft.key

    );

}


if (ChatUI.input) {

    ChatUI.input.addEventListener(

        "input",

        saveDraft

    );

}


/* ==========================================
   END OF CHAT.JS
========================================== */
