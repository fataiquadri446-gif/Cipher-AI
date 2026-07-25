
/* ==========================================
   CIPHER SIDEBAR
   Created by Fatai Quadri
========================================== */

"use strict";

/* ==========================================
   SIDEBAR OBJECT
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
   INITIALIZE
========================================== */

function initializeSidebar(){

    if(Sidebar.initialized) return;

    Sidebar.initialized = true;

    registerSidebarEvents();

    loadSidebarChats();

}


/* ==========================================
   EVENTS
========================================== */

function registerSidebarEvents(){

    if(SidebarUI.toggle){

        SidebarUI.toggle.addEventListener(

            "click",

            toggleSidebar

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

    if (window.innerWidth > 768) return;

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

    if (window.innerWidth <= 768) {

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
   REFRESH CHAT LIST
========================================== */

async function refreshSidebar() {

    await loadSidebarChats();

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

            <div class="sidebar-empty-icon">
                💬
            </div>

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

    /* Pinned chats */

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

    /* Recent chats */

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

    const messageCount =
        Number(chat.message_count || 0);

    const date =
        formatChatDate(
            chat.updated_at ||
            chat.created_at
        );

    item.innerHTML = `

        <div class="chat-item-icon">
            💬
        </div>

        <div class="chat-item-info">

            <div class="chat-item-title">

                ${escapeHTML(title)}

            </div>

            <div class="chat-item-meta">

                <span>
                    ${messageCount}
                    ${messageCount === 1
                        ? "message"
                        : "messages"}
                </span>

                ${
                    date
                    ? `<span>•</span>
                       <span>${escapeHTML(date)}</span>`
                    : ""
                }

            </div>

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
   CHAT SEARCH
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


/* ==========================================
   SEARCH RESULTS
========================================== */

function renderSidebarSearchResults(chats, query) {

    if (!SidebarUI.list) return;

    SidebarUI.list.innerHTML = "";

    if (chats.length === 0) {

        SidebarUI.list.innerHTML = `

            <div class="sidebar-empty">

                <div class="sidebar-empty-icon">
                    🔎
                </div>

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


/* ==========================================
   CREATE SEARCH BOX
========================================== */

function createChatSearch() {

    if (!SidebarUI.sidebar) return;

    if (
        document.getElementById(
            "chat-search"
        )
    ) {

        return;

    }

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "chat-search-wrapper";

    wrapper.innerHTML = `

        <div class="chat-search-box">

            <span class="chat-search-icon">
                🔎
            </span>

            <input
                type="search"
                id="chat-search"
                placeholder="Search chats..."
                autocomplete="off"
                aria-label="Search conversations"
            />

            <button
                type="button"
                class="chat-search-clear"
                id="chat-search-clear"
                aria-label="Clear search"
                style="display:none;">

                ×

            </button>

        </div>

    `;

    const newChatButton =
        SidebarUI.newChat;

    if (newChatButton) {

        newChatButton.insertAdjacentElement(
            "afterend",
            wrapper
        );

    }
    else {

        SidebarUI.sidebar.prepend(
            wrapper
        );

    }

    setupChatSearchEvents();

}


/* ==========================================
   SEARCH EVENTS
========================================== */

function setupChatSearchEvents() {

    const searchInput =
        document.getElementById(
            "chat-search"
        );

    const clearButton =
        document.getElementById(
            "chat-search-clear"
        );

    if (!searchInput) return;


    searchInput.addEventListener(
        "input",
        () => {

            const query =
                searchInput.value;

            if (clearButton) {

                clearButton.style.display =
                    query
                    ? "block"
                    : "none";

            }

            searchSidebarChats(query);

        }
    );


    if (clearButton) {

        clearButton.addEventListener(
            "click",
            () => {

                searchInput.value = "";

                clearButton.style.display =
                    "none";

                searchSidebarChats("");

                searchInput.focus();

            }
        );

    }

}


/* ==========================================
   KEYBOARD SHORTCUT
========================================== */

document.addEventListener(
    "keydown",
    event => {

        /*
         * Ctrl + K focuses chat search.
         */

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "k"
        ) {

            event.preventDefault();

            const searchInput =
                document.getElementById(
                    "chat-search"
                );

            if (searchInput) {

                searchInput.focus();

            }

        }

    }
);


/* ==========================================
   CHAT OPTIONS MENU
========================================== */

let activeChatMenu = null;


/* ==========================================
   OPEN CHAT MENU
========================================== */

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
            onclick="renameChat('${escapeHTML(String(chatId))}')">

            ✏️ Rename

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


/* ==========================================
   CLOSE CHAT MENU
========================================== */

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
   RENAME CHAT
========================================== */

async function renameChat(chatId) {

    closeChatMenu();

    const chat = Sidebar.chats.find(
        item =>
            String(item.id) === String(chatId)
    );

    if (!chat) return;

    const currentTitle =
        chat.title ||
        "New Conversation";

    const newTitle = prompt(
        "Enter a new chat title:",
        currentTitle
    );

    if (newTitle === null) return;

    const title = newTitle.trim();

    if (!title) {

        showWarning(
            "Chat title cannot be empty."
        );

        return;

    }

    try {

        const response = await fetch(

            `/chats/${encodeURIComponent(chatId)}/rename`,

            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    title: title
                })

            }

        );

        if (!response.ok) {

            throw new Error(
                "Unable to rename chat."
            );

        }

        await loadSidebarChats();

        showSuccess(
            "Chat renamed."
        );

    }

    catch (error) {

        console.error(error);

        showError(
            "Unable to rename chat."
        );

    }

}


/* ==========================================
   MOBILE + COLLAPSED SIDEBAR
========================================== */

Sidebar.collapsed = false;


/* ==========================================
   COLLAPSE DESKTOP SIDEBAR
========================================== */

function toggleSidebarCollapse() {

    // Don't collapse the sidebar on mobile.
    if (window.innerWidth <= 768) {

        toggleSidebar();

        return;

    }

    Sidebar.collapsed =
        !Sidebar.collapsed;

    if (SidebarUI.sidebar) {

        SidebarUI.sidebar.classList.toggle(
            "collapsed",
            Sidebar.collapsed
        );

    }

    saveSidebarPreference();

}


/* ==========================================
   RESTORE SIDEBAR PREFERENCE
========================================== */

function restoreSidebarPreference() {

    if (window.innerWidth <= 768) return;

    const saved =
        localStorage.getItem(
            "cipher-sidebar-collapsed"
        );

    Sidebar.collapsed =
        saved === "true";

    if (SidebarUI.sidebar) {

        SidebarUI.sidebar.classList.toggle(
            "collapsed",
            Sidebar.collapsed
        );

    }

}


/* ==========================================
   SAVE SIDEBAR PREFERENCE
========================================== */

function saveSidebarPreference() {

    localStorage.setItem(

        "cipher-sidebar-collapsed",

        Sidebar.collapsed
            ? "true"
            : "false"

    );

}


/* ==========================================
   WINDOW RESIZE
========================================== */

window.addEventListener(
    "resize",
    () => {

        if (window.innerWidth > 768) {

            closeSidebar();

            restoreSidebarPreference();

        }
        else {

            // Mobile should never remain
            // in desktop collapsed mode.

            Sidebar.collapsed = false;

            if (SidebarUI.sidebar) {

                SidebarUI.sidebar.classList.remove(
                    "collapsed"
                );

            }

        }

    }
);


/* ==========================================
   MOBILE CHAT SELECTION
========================================== */

document.addEventListener(
    "click",
    event => {

        const chatItem =
            event.target.closest(
                ".chat-item"
            );

        if (!chatItem) return;

        if (window.innerWidth <= 768) {

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
            window.innerWidth <= 768 &&
            Sidebar.opened
        ) {

            closeSidebar();

        }

    }
);


/* ==========================================
   FINAL SIDEBAR INITIALIZATION
========================================== */

function initializeSidebar() {

    if (Sidebar.initialized) return;

    Sidebar.initialized = true;

    restoreSidebarPreference();

    createChatSearch();

    registerSidebarEvents();

    loadSidebarChats();

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

        if (!response.ok) {

            throw new Error(
                "Unable to create chat."
            );

        }

        const chat = await response.json();

        Sidebar.currentChat = chat.id;

        /*
         * Clear the current conversation.
         */

        if (
            typeof clearChat ===
            "function"
        ) {

            clearChat();

        }

        /*
         * Show Cipher welcome screen.
         */

        if (
            typeof showWelcome ===
            "function"
        ) {

            showWelcome();

        }

        await loadSidebarChats();

        highlightActiveChat(chat.id);

        closeSidebarAfterSelection();

        if (
            typeof input !==
            "undefined" &&
            input
        ) {

            input.focus();

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


/* ==========================================
   NEW CHAT BUTTON
========================================== */

if (SidebarUI.newChat) {

    SidebarUI.newChat.addEventListener(
        "click",
        createNewChat
    );

}


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
