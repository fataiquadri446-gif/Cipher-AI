
/* ==========================================
   CIPHER SIDEBAR
   Created by Fatai Quadri
========================================== */

"use strict";

/* ==========================================
   SIDEBAR OBJECT
   NOTE: Sidebar.currentChat mirrors
   Chat.currentChat (defined in chat.js) --
   they are kept in sync everywhere a chat
   is created or selected so nothing silently
   disagrees on "which chat is open".
========================================== */

const Sidebar = {

    opened: false,

    currentChat: null,

    chats: [],

    initialized: false

};


/* ==========================================
   SIDEBAR ELEMENTS
========================================== */

const SidebarUI = {

    sidebar: document.getElementById("sidebar"),

    toggle: document.getElementById("sidebar-toggle"),

    list: document.getElementById("chat-list"),

    newChat: document.querySelector(".new-chat-btn")

};


/* ==========================================
   EVENTS
========================================== */

function registerSidebarEvents(){

    if(SidebarUI.toggle){

        SidebarUI.toggle.addEventListener(

            "click",

            event => {

                event.stopPropagation();

                toggleSidebar();

            }

        );

    }


    if (SidebarUI.newChat) {

        SidebarUI.newChat.addEventListener(
            "click",
            createNewChat
        );

    }

}


/* ==========================================
   TOGGLE SIDEBAR
========================================== */

function toggleSidebar() {

    Sidebar.opened = !Sidebar.opened;

    SidebarUI.sidebar.classList.toggle(

        "open",

        Sidebar.opened

    );

}


/* ==========================================
   OPEN SIDEBAR
========================================== */

function openSidebar() {

    Sidebar.opened = true;

    SidebarUI.sidebar.classList.add(

        "open"

    );

}


/* ==========================================
   CLOSE SIDEBAR
========================================== */

function closeSidebar() {

    Sidebar.opened = false;

    SidebarUI.sidebar.classList.remove(

        "open"

    );

}


/* ==========================================
   CLOSE WHEN CLICKING OUTSIDE
========================================== */

document.addEventListener("click", (event) => {

    if (window.innerWidth > 900) return;

    if (!Sidebar.opened) return;

    const clickedInside =

        SidebarUI.sidebar.contains(event.target) ||

        SidebarUI.toggle.contains(event.target);

    if (!clickedInside) {

        closeSidebar();

    }

});


/* ==========================================
   CLOSE AFTER SELECTING CHAT
========================================== */

function closeSidebarAfterSelection() {

    if (window.innerWidth <= 900) {

        closeSidebar();

    }

}


/* ==========================================
   LOAD CHAT LIST
========================================== */

async function loadSidebarChats() {

    try {

        const response = await fetch("/chats");

        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );

        }

        const chats = await response.json();

        Sidebar.chats = Array.isArray(chats)
            ? chats
            : [];

        renderSidebarChats(Sidebar.chats);

    }

    catch (error) {

        console.error(
            "Cipher sidebar error:",
            error
        );

        Sidebar.chats = [];

        showSidebarMessage(
            "Unable to load conversations."
        );

    }

}


/* ==========================================
   SHOW SIDEBAR MESSAGE
========================================== */

function showSidebarMessage(message) {

    if (!SidebarUI.list) return;

    SidebarUI.list.innerHTML = `

        <div class="sidebar-empty">

            ${escapeHTML(message)}

        </div>

    `;

}


/* ==========================================
   EMPTY CHAT STATE
========================================== */

function showEmptySidebar() {

    if (!SidebarUI.list) return;

    SidebarUI.list.innerHTML = `

        <div class="sidebar-empty">

            <p>No conversations yet.</p>

            <span>
                Start a new conversation with Cipher.
            </span>

        </div>

    `;

}


/* ==========================================
   SELECT CHAT
========================================== */

async function selectSidebarChat(chatId) {

    if (!chatId) return;

    Sidebar.currentChat = chatId;

    closeSidebarAfterSelection();

    if (typeof loadChat === "function") {

        await loadChat(chatId);

    }

    highlightActiveChat(chatId);

}


/* ==========================================
   ACTIVE CHAT
========================================== */

function highlightActiveChat(chatId) {

    document
        .querySelectorAll(".chat-item")
        .forEach(item => {

            item.classList.toggle(

                "active",

                String(item.dataset.id) ===
                String(chatId)

            );

        });

}


/* ==========================================
   RENDER SIDEBAR CHATS
========================================== */

function renderSidebarChats(chats) {

    if (!SidebarUI.list) return;

    SidebarUI.list.innerHTML = "";

    if (!chats || chats.length === 0) {

        showEmptySidebar();

        return;

    }

    const pinned = chats.filter(
        chat => chat.pinned
    );

    const recent = chats.filter(
        chat => !chat.pinned
    );

    if (pinned.length > 0) {

        addSidebarSectionLabel(
            "📌 Pinned"
        );

        pinned.forEach(chat => {

            SidebarUI.list.appendChild(
                createSidebarChatItem(chat)
            );

        });

    }

    if (recent.length > 0) {

        addSidebarSectionLabel(
            pinned.length > 0
                ? "Recent"
                : "Conversations"
        );

        recent.forEach(chat => {

            SidebarUI.list.appendChild(
                createSidebarChatItem(chat)
            );

        });

    }

}


/* ==========================================
   SECTION LABEL
========================================== */

function addSidebarSectionLabel(label) {

    const section = document.createElement("div");

    section.className =
        "chat-section-label";

    section.textContent = label;

    SidebarUI.list.appendChild(section);

}


/* ==========================================
   CREATE CHAT ITEM
========================================== */

function createSidebarChatItem(chat) {

    const item = document.createElement("div");

    item.className = "chat-item";

    item.dataset.id = chat.id;

    if (
        String(chat.id) ===
        String(Sidebar.currentChat)
    ) {

        item.classList.add("active");

    }

    const title =
        chat.title ||
        "New Conversation";

    const date =
        formatChatDate(
            chat.updated_at ||
            chat.created_at
        );

    item.innerHTML = `

        <div class="chat-item-title">

            ${escapeHTML(title)}

        </div>

        <div class="chat-item-actions">

            <button
                type="button"
                class="chat-action-btn"
                title="More options"
                onclick="openChatMenu(event, '${escapeHTML(String(chat.id))}')">

                ⋯

            </button>

        </div>

    `;

    item.addEventListener(
        "click",
        () => selectSidebarChat(chat.id)
    );

    return item;

}


/* ==========================================
   CHAT DATE
========================================== */

function formatChatDate(dateValue) {

    if (!dateValue) return "";

    const date =
        new Date(dateValue);

    if (Number.isNaN(date.getTime())) {

        return "";

    }

    const now = new Date();

    const difference =
        now.getTime() -
        date.getTime();

    const oneDay =
        24 * 60 * 60 * 1000;

    if (difference < oneDay) {

        return "Today";

    }

    if (difference < oneDay * 2) {

        return "Yesterday";

    }

    return date.toLocaleDateString(
        undefined,
        {
            month: "short",
            day: "numeric"
        }
    );

}


/* ==========================================
   CHAT SEARCH (uses the existing #chat-search
   input already in index.html -- no need to
   create a duplicate one)
========================================== */

function searchSidebarChats(query) {

    query = query.trim().toLowerCase();

    if (!query) {

        renderSidebarChats(Sidebar.chats);

        return;

    }

    const results = Sidebar.chats.filter(chat => {

        const title =
            String(chat.title || "").toLowerCase();

        return title.includes(query);

    });

    renderSidebarSearchResults(results, query);

}


function renderSidebarSearchResults(chats, query) {

    if (!SidebarUI.list) return;

    SidebarUI.list.innerHTML = "";

    if (chats.length === 0) {

        SidebarUI.list.innerHTML = `

            <div class="sidebar-empty">

                <p>No chats found.</p>

                <span>
                    No conversation matches
                    "${escapeHTML(query)}".
                </span>

            </div>

        `;

        return;

    }

    addSidebarSectionLabel(
        `Search results (${chats.length})`
    );

    chats.forEach(chat => {

        SidebarUI.list.appendChild(
            createSidebarChatItem(chat)
        );

    });

}


function setupChatSearchEvents() {

    const searchInput =
        document.getElementById(
            "chat-search"
        );

    if (!searchInput) return;

    searchInput.addEventListener(
        "input",
        () => {

            searchSidebarChats(
                searchInput.value
            );

        }
    );

}


/* ==========================================
   CHAT OPTIONS MENU
========================================== */

let activeChatMenu = null;


function openChatMenu(event, chatId) {

    event.stopPropagation();

    closeChatMenu();

    const button = event.currentTarget;

    const chat = Sidebar.chats.find(
        item => String(item.id) === String(chatId)
    );

    if (!chat) return;

    const menu = document.createElement("div");

    menu.className = "chat-context-menu";

    menu.innerHTML = `

        <button
            type="button"
            onclick="togglePinChat('${escapeHTML(String(chatId))}')">

            ${chat.pinned ? "📍 Unpin chat" : "📌 Pin chat"}

        </button>

        <button
            type="button"
            class="danger"
            onclick="deleteChat('${escapeHTML(String(chatId))}')">

            🗑 Delete

        </button>

    `;

    document.body.appendChild(menu);

    const rect = button.getBoundingClientRect();

    menu.style.position = "fixed";

    menu.style.top =
        `${rect.bottom + 5}px`;

    menu.style.left =
        `${Math.max(8, rect.right - 160)}px`;

    activeChatMenu = menu;

}


function closeChatMenu() {

    if (activeChatMenu) {

        activeChatMenu.remove();

        activeChatMenu = null;

    }

}


document.addEventListener(
    "click",
    closeChatMenu
);


/* ==========================================
   PIN / UNPIN CHAT
========================================== */

async function togglePinChat(chatId) {

    closeChatMenu();

    try {

        const response = await fetch(

            `/chats/${encodeURIComponent(chatId)}/pin`,

            {
                method: "POST"
            }

        );

        if (!response.ok) {

            throw new Error(
                "Unable to update pin status."
            );

        }

        await loadSidebarChats();

    }

    catch (error) {

        console.error(error);

        showError(
            "Unable to update chat."
        );

    }

}


/* ==========================================
   DELETE CHAT
========================================== */

async function deleteChat(chatId) {

    closeChatMenu();

    const confirmed = confirm(
        "Delete this conversation?"
    );

    if (!confirmed) return;

    try {

        const response = await fetch(

            `/chats/${encodeURIComponent(chatId)}/delete`,

            {
                method: "POST"
            }

        );

        if (!response.ok) {

            throw new Error(
                "Unable to delete chat."
            );

        }

        if (
            String(Sidebar.currentChat) ===
            String(chatId)
        ) {

            Sidebar.currentChat = null;

            if (typeof Chat !== "undefined") {

                Chat.currentChat = null;

                Chat.messages = [];

            }

            if (
                typeof showWelcomeScreen ===
                "function"
            ) {

                showWelcomeScreen();

            }

        }

        await loadSidebarChats();

        showSuccess(
            "Conversation deleted."
        );

    }

    catch (error) {

        console.error(error);

        showError(
            "Unable to delete conversation."
        );

    }

}


/* ==========================================
   NEW CHAT
   This is the single implementation (chat.js
   no longer defines its own createNewChat, so
   there's nothing to silently overwrite).
========================================== */

async function createNewChat() {

    try {

        const response = await fetch(
            "/chats/new",
            {
                method: "POST"
            }
        );

        if (!response.ok) {

            throw new Error(
                "Unable to create chat."
            );

        }

        const chat = await response.json();

        Sidebar.currentChat = chat.id;

        if (typeof Chat !== "undefined") {

            Chat.currentChat = chat.id;

            Chat.messages = [];

        }

        if (
            typeof showWelcomeScreen ===
            "function"
        ) {

            showWelcomeScreen();

        }

        await loadSidebarChats();

        highlightActiveChat(chat.id);

        closeSidebarAfterSelection();

        if (
            typeof ChatUI !== "undefined" &&
            ChatUI.input
        ) {

            ChatUI.input.focus();

        }

    }

    catch (error) {

        console.error(
            "New chat error:",
            error
        );

        if (
            typeof showError ===
            "function"
        ) {

            showError(
                "Unable to create a new chat."
            );

        }

    }

}


/*
 * index.html calls startNewChat() in a couple
 * of inline onclick attributes -- keep that name
 * working as an alias for createNewChat().
 */

function startNewChat() {

    createNewChat();

}


/* ==========================================
   FINAL SIDEBAR INITIALIZATION
========================================== */

function initializeSidebar() {

    if (Sidebar.initialized) return;

    Sidebar.initialized = true;

    setupChatSearchEvents();

    registerSidebarEvents();

    loadSidebarChats();

}


/* ==========================================
   WINDOW RESIZE
========================================== */

window.addEventListener(
    "resize",
    () => {

        if (window.innerWidth > 900) {

            closeSidebar();

        }

    }
);


/* ==========================================
   ESCAPE KEY
========================================== */

document.addEventListener(
    "keydown",
    event => {

        if (event.key !== "Escape") return;

        closeChatMenu();

        if (
            window.innerWidth <= 900 &&
            Sidebar.opened
        ) {

            closeSidebar();

        }

    }
);


/* ==========================================
   START SIDEBAR AFTER PAGE LOAD
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeSidebar();

    }
);


/* ==========================================
   EXPOSE SIDEBAR
========================================== */

window.CipherSidebar = Sidebar;

/* ==========================================
   END OF SIDEBAR.JS
========================================== */

