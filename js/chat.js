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

    /*
     * Check for a theme-change request before anything
     * else -- this is instant and local, so the person
     * sees the interface respond immediately rather than
     * waiting on a network round trip. The message still
     * gets sent to Cipher normally afterward either way.
     */

    if (typeof window.CipherThemeCommand === "function") {

        window.CipherThemeCommand(message);

    }


    Chat.sending = true;

    ChatUI.sendButton.disabled = true;

    const imageDataUrl =
        pendingImage
            ? `data:${pendingImage.mimeType};base64,${pendingImage.base64}`
            : null;


    addUserMessage(
        message,
        imageDataUrl
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


    const hasCode = /```/.test(text);


    /*
     * Code blocks render as instant tappable cards, not
     * animated text -- typing out a full code file one
     * character at a time is exactly the slowness this
     * was built to fix. Long plain-text replies also skip
     * the animation so they don't feel sluggish.
     */

    if (hasCode || text.length > 240) {

        element.innerHTML = renderMarkdown(text);

        scrollToBottom();

        Chat.streaming = false;

        return;

    }


    /*
     * Short, code-free replies keep a light typing effect.
     * We only touch textContent while animating (cheap) and
     * do the real markdown parse once at the end, instead of
     * re-parsing the whole growing string on every character.
     */

    let current = "";

    for(const character of text){

        current += character;

        element.textContent = current;

        scrollToBottom();

        await sleep(8);

    }


    element.innerHTML = renderMarkdown(text);

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

function addUserMessage(text, imageDataUrl = null) {

    const message = createMessageElement(

        "user",

        text,

        imageDataUrl

    );

    ChatUI.container.appendChild(message);

    scrollToBottom();

    return message;

}


/* ==========================================
   CREATE MESSAGE
========================================== */

function createMessageElement(role, text, imageDataUrl = null) {

    const wrapper = document.createElement("div");

    wrapper.className =

        `msg ${role === "user" ? "user" : "bot"}`;

    wrapper.dataset.role = role;

    wrapper.dataset.time = Date.now();


    const imageHTML =
        imageDataUrl
            ? `<img class="msg-image" src="${imageDataUrl}" alt="Uploaded image">`
            : "";


    const messageBodyHTML =
        text
            ? (
                role === "user"
                    ? `<div class="message-text">${escapeHTML(text)}</div>`
                    : `<div class="message-text">${renderMarkdown(text)}</div>`
            )
            : "";


    wrapper.innerHTML = `

        ${imageHTML}

        ${messageBodyHTML}

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
   CODE BLOCKS
   Fenced code blocks are pulled out before any
   other markdown processing (so bold/italic/etc.
   regexes never touch code) and rendered as a
   tappable card instead of a wall of monospace
   text. The raw code is kept in this map so the
   viewer modal can show/copy/download it exactly
   as written.
========================================== */

const CipherCodeBlocks = new Map();

let cipherCodeBlockCounter = 0;


const CODE_EXTENSIONS = {

    python: "py", py: "py",
    javascript: "js", js: "js",
    typescript: "ts", ts: "ts",
    html: "html",
    css: "css",
    json: "json",
    bash: "sh", shell: "sh", sh: "sh",
    sql: "sql",
    java: "java",
    c: "c",
    cpp: "cpp", "c++": "cpp",
    csharp: "cs", "c#": "cs",
    go: "go",
    rust: "rs",
    php: "php",
    ruby: "rb",
    swift: "swift",
    kotlin: "kt",
    yaml: "yml", yml: "yml",
    xml: "xml",
    markdown: "md", md: "md"

};


function extensionForLanguage(lang) {

    return CODE_EXTENSIONS[(lang || "").toLowerCase()] || "txt";

}


function createCodeCardHTML(id, lang) {

    const label =
        (lang || "code").toUpperCase();


    return `

        <div
            class="code-card"
            data-code-id="${id}"
            role="button"
            tabindex="0"
        >

            <div class="code-card-icon">
                &lt;/&gt;
            </div>

            <div class="code-card-info">

                <strong>Code</strong>

                <small>Code · ${escapeHTML(label)}</small>

            </div>

        </div>

    `;

}


/* ==========================================
   OPEN CODE VIEWER
========================================== */

function openCodeModal(id) {

    const block = CipherCodeBlocks.get(id);

    if (!block) return;


    let modal =
        document.getElementById("code-viewer-modal");


    if (!modal) {

        modal = document.createElement("div");

        modal.id = "code-viewer-modal";

        modal.className = "code-viewer-overlay";


        modal.innerHTML = `

            <div class="code-viewer">

                <div class="code-viewer-header">

                    <strong id="code-viewer-lang"></strong>

                    <div class="code-viewer-actions">

                        <button type="button" id="code-viewer-copy">
                            Copy
                        </button>

                        <button type="button" id="code-viewer-download">
                            Download
                        </button>

                        <button type="button" id="code-viewer-close">
                            ×
                        </button>

                    </div>

                </div>

                <pre class="code-viewer-body"><code id="code-viewer-code"></code></pre>

            </div>

        `;


        document.body.appendChild(modal);


        modal.addEventListener("click", event => {

            if (event.target === modal) {

                modal.classList.remove("open");

            }

        });


        document
            .getElementById("code-viewer-close")
            .addEventListener("click", () => {

                modal.classList.remove("open");

            });

    }


    document.getElementById("code-viewer-lang").textContent =
        (block.lang || "code").toUpperCase();

    document.getElementById("code-viewer-code").textContent =
        block.code;


    const copyButton =
        document.getElementById("code-viewer-copy");

    copyButton.onclick = async () => {

        try {

            await navigator.clipboard.writeText(block.code);

            copyButton.textContent = "Copied!";

            setTimeout(() => {

                copyButton.textContent = "Copy";

            }, 1500);

        } catch {

            showError("Unable to copy.");

        }

    };


    const downloadButton =
        document.getElementById("code-viewer-download");

    downloadButton.onclick = () => {

        const ext = extensionForLanguage(block.lang);

        const blob = new Blob([block.code], { type: "text/plain" });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;

        link.download = `code.${ext}`;

        link.click();

        URL.revokeObjectURL(url);

    };


    modal.classList.add("open");

}


/*
 * Delegated once at load -- works for cards inside
 * messages added at any point, including history
 * loaded long after this script first ran.
 */

document.addEventListener("click", event => {

    const card = event.target.closest(".code-card");

    if (card) {

        openCodeModal(card.dataset.codeId);

    }

});


document.addEventListener("keydown", event => {

    if (event.key !== "Enter") return;

    const card = event.target.closest(".code-card");

    if (card) {

        openCodeModal(card.dataset.codeId);

    }

});


/* ==========================================
   MARKDOWN RENDERER
========================================== */

function renderMarkdown(text) {

    if (!text) return "";


    const placeholders = [];


    const withoutCode = text.replace(

        /```(\w+)?\n?([\s\S]*?)```/g,

        (match, lang, code) => {

            const id =
                `code-${Date.now()}-${cipherCodeBlockCounter++}`;

            CipherCodeBlocks.set(id, {

                code: code.trim(),

                lang: (lang || "text").toLowerCase()

            });


            const token = `@@CODEBLOCK_${id}@@`;

            placeholders.push({ token, id });

            return token;

        }

    );


    let html = escapeHTML(withoutCode);

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


    placeholders.forEach(({ token, id }) => {

        const block = CipherCodeBlocks.get(id);

        html = html.replace(
            token,
            createCodeCardHTML(id, block.lang)
        );

    });


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
