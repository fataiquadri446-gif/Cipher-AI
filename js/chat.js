/* ==========================================
   CIPHER CHAT ENGINE
   Created by Fatai Quadri
========================================== */

"use strict";

/* ==========================================
   CHAT OBJECT
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
   INITIALIZE CHAT
========================================== */

function initializeChat(){

    if(Chat.initialized) return;

    Chat.initialized = true;

    registerChatEvents();

    loadLastChat();

    loadDraft();

}


/* ==========================================
   REGISTER EVENTS
========================================== */

function registerChatEvents(){

    ChatUI.form.addEventListener(

        "submit",

        sendMessage

    );

    ChatUI.input.addEventListener(

        "keydown",

        handleTyping

    );

}


/* ==========================================
   TYPING
========================================== */

function handleTyping(event){

    Chat.typing = true;

    if(

        event.key === "Enter" &&

        !event.shiftKey

    ){

        event.preventDefault();

        sendMessage(event);

    }

}


/* ==========================================
   LOAD LAST CHAT
========================================== */

function loadLastChat(){

    const lastChat =

        loadLocal("last-chat");

    if(lastChat){

        Chat.currentChat = lastChat;

    }

}


/* ==========================================
   SEND MESSAGE
========================================== */

async function sendMessage(event) {

    if (event) {

        event.preventDefault();

    }

    if (Chat.sending) return;

    if (!Chat.currentChat) {

        showWarning("Start a new chat first.");

        return;

    }

    const message = ChatUI.input.value.trim();

    if (!message) return;

    Chat.sending = true;

    ChatUI.sendButton.disabled = true;

    addUserMessage(message);

    ChatUI.input.value = "";

    const thinkingMessage = addThinkingMessage();

    try {

        const response = await fetch("/chat", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                chat_id: Chat.currentChat,

                message: message

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

}


/* ==========================================
   SEND BUTTON
========================================== */

function disableSendButton() {

    ChatUI.sendButton.disabled = true;

}

function enableSendButton() {

    ChatUI.sendButton.disabled = false;

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

async function streamText(element, text) {

    Chat.streaming = true;

    element.textContent = "";

    for (const character of text) {

        element.textContent += character;

        scrollToBottom();

        await sleep(12);

    }

    Chat.streaming = false;

}


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


function addBotMessage(text) {

    const message = createMessageElement(

        "assistant",

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

        `message ${role}`;

    wrapper.dataset.role = role;

    wrapper.dataset.time = Date.now();


    wrapper.innerHTML = `

        <div class="message-avatar">

            ${role === "user" ? "👤" : "¢"}

        </div>

        <div class="message-content">

            <div class="message-text">

                ${escapeHTML(text)}

            </div>

            <div class="message-footer">

                <span class="message-time">

                    ${formatMessageTime()}

                </span>

                ${createMessageActions(role, text)}

            </div>

        </div>

    `;

    return wrapper;

}


/* ==========================================
   FORMAT TIME
========================================== */

function formatMessageTime() {

    return new Date().toLocaleTimeString([], {

        hour: "2-digit",

        minute: "2-digit"

    });

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

            renderHistoryMessage(message);

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
   RENDER HISTORY
========================================== */

function renderHistoryMessage(message) {

    if (

        message.role === "user"

    ) {

        ChatUI.container.appendChild(

            createMessageElement(

                "user",

                message.content

            )

        );

    }

    else {

        ChatUI.container.appendChild(

            createMessageElement(

                "assistant",

                message.content

            )

        );

    }

}


/* ==========================================
   NEW CHAT
========================================== */

async function createNewChat() {

    try {

        const response = await fetch(

            "/chats/new",

            {

                method: "POST"

            }

        );

        const chat = await response.json();

        Chat.currentChat = chat.id;

        Chat.messages = [];

        ChatUI.container.innerHTML = "";

        showWelcomeScreen();

        loadSidebarChats();

    }

    catch (error) {

        console.error(error);

        showError(

            "Unable to create chat."

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

    /* Code blocks */

    html = html.replace(

        /```([\s\S]*?)```/g,

        `<pre class="cipher-code"><code>$1</code></pre>`

    );

    /* Inline code */

    html = html.replace(

        /`([^`]+)`/g,

        `<code class="cipher-inline-code">$1</code>`

    );

    /* Bold */

    html = html.replace(

        /\*\*(.*?)\*\*/g,

        `<strong>$1</strong>`

    );

    /* Italic */

    html = html.replace(

        /\*(.*?)\*/g,

        `<em>$1</em>`

    );

    /* Headings */

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

    /* Bullet list */

    html = html.replace(

        /^\- (.*)$/gm,

        `<li>$1</li>`

    );

    html = html.replace(

        /(<li>.*<\/li>)/gs,

        `<ul>$1</ul>`

    );

    /* Line breaks */

    html = html.replace(/\n/g, "<br>");

    return html;

}


/* ==========================================
   RENDER BOT RESPONSE
========================================== */

function renderBotResponse(element, text) {

    element.innerHTML = renderMarkdown(text);

}


/* ==========================================
   COPY CODE
========================================== */

async function copyCode(button){

    const code =

        button.parentElement.querySelector("code");

    if(!code) return;

    try{

        await navigator.clipboard.writeText(

            code.innerText

        );

        showSuccess("Code copied.");

    }

    catch(error){

        console.error(error);

        showError("Unable to copy code.");

    }

}


/* ==========================================
   FILE & IMAGE ATTACHMENTS
========================================== */

const Attachment = {

    file: null,

    preview: null

};


/* ==========================================
   SELECT FILE
========================================== */

function selectAttachment() {

    let input = document.getElementById("attachment-input");

    if (!input) {

        input = document.createElement("input");

        input.type = "file";

        input.id = "attachment-input";

        input.accept = "image/*,.pdf,.txt,.doc,.docx";

        input.style.display = "none";

        input.addEventListener("change", handleAttachment);

        document.body.appendChild(input);

    }

    input.click();

}


/* ==========================================
   HANDLE FILE
========================================== */

function handleAttachment(event) {

    const file = event.target.files[0];

    if (!file) return;

    Attachment.file = file;

    showSuccess(`Selected: ${file.name}`);

}


/* ==========================================
   REMOVE FILE
========================================== */

function removeAttachment() {

    Attachment.file = null;

    showInfo("Attachment removed.");

}


/* ==========================================
   UPLOAD FILE
========================================== */

async function uploadAttachment(chatId) {

    if (!Attachment.file) return null;

    const formData = new FormData();

    formData.append(

        "file",

        Attachment.file

    );

    formData.append(

        "chat_id",

        chatId

    );

    try {

        const response = await fetch(

            "/upload",

            {

                method: "POST",

                body: formData

            }

        );

        const data = await response.json();

        if (data.success) {

            return data.file_url;

        }

        return null;

    }

    catch (error) {

        console.error(error);

        showError(

            "Unable to upload attachment."

        );

        return null;

    }

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
                class="message-action"
                onclick="copyMessage(this)"
                title="Copy">

                📋

            </button>

            <button
                class="message-action"
                onclick="regenerateResponse()"
                title="Regenerate">

                🔄

            </button>

            <button
                class="message-action"
                onclick="pinMessage(this)"
                title="Pin">

                📌

            </button>

            <button
                class="message-action"
                onclick="shareMessage(this)"
                title="Share">

                📤

            </button>

        </div>

    `;

}


/* ==========================================
   COPY MESSAGE
========================================== */

async function copyMessage(button) {

    const message =

        button.closest(".message")
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
   PIN MESSAGE
========================================== */

function pinMessage(button) {

    button.innerHTML = "📍";

    showSuccess(

        "Message pinned."

    );

}


/* ==========================================
   SHARE
========================================== */

async function shareMessage(button) {

    const message =

        button.closest(".message")
              .querySelector(".message-text")
              .innerText;

    if (navigator.share) {

        try {

            await navigator.share({

                title: "Cipher",

                text: message

            });

        }

        catch {

        }

    }

    else {

        await navigator.clipboard.writeText(

            message

        );

        showSuccess(

            "Copied for sharing."

        );

    }

}


/* ==========================================
   AUTO SAVE & DRAFT RECOVERY
========================================== */

const Draft = {

    key: "cipher-draft"

};


/* ==========================================
   SAVE DRAFT
========================================== */

function saveDraft() {

    if (!ChatUI.input) return;

    localStorage.setItem(

        Draft.key,

        ChatUI.input.value

    );

}


/* ==========================================
   LOAD DRAFT
========================================== */

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


/* ==========================================
   CLEAR DRAFT
========================================== */

function clearDraft() {

    localStorage.removeItem(

        Draft.key

    );

}


/* ==========================================
   AUTO SAVE EVENTS
========================================== */

if (ChatUI.input) {

    ChatUI.input.addEventListener(

        "input",

        saveDraft

    );

}


/* ==========================================
   CLEAR AFTER SEND
========================================== */

const originalSendMessage = sendMessage;

sendMessage = async function(event){

    await originalSendMessage(event);

    clearDraft();

};
