
/* ==========================================
   CIPHER APP
   Created by Fatai Quadri
========================================== */

"use strict";

/* ==========================================
   Global State
========================================== */

const Cipher = {

    user: null,

    currentChat: null,

    chats: [],

    initialized: false,

    theme: localStorage.getItem("cipher-theme") || "midnight"

};


/* ==========================================
   DOM
========================================== */

const App = {

    authScreen: document.getElementById("auth-screen"),

    appScreen: document.getElementById("app-screen"),

    chat: document.getElementById("chat"),

    form: document.getElementById("form"),

    input: document.getElementById("input"),

    send: document.getElementById("send"),

    sidebar: document.getElementById("sidebar"),

    sidebarToggle: document.getElementById("sidebar-toggle"),

    chatList: document.getElementById("chat-list"),

    userName: document.getElementById("user-name"),

    userAvatar: document.getElementById("user-avatar")

};


/* ==========================================
   Initialize
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeCipher();

});


async function initializeCipher(){

    applyTheme(Cipher.theme);

    await checkLogin();

    registerGlobalEvents();

    Cipher.initialized = true;

}


/* ==========================================
   STARTUP
========================================== */

async function checkLogin() {

    try {

        const res = await fetch("/me");

        const data = await res.json();

        if (data.logged_in) {

            Cipher.user = data;

            enterApp(data.username);

        } else {

            showAuthScreen();

        }

    } catch (err) {

        console.error(err);

        showNotification("Unable to connect to Cipher.", "error");

        showAuthScreen();

    }

}


/* ==========================================
   AUTH / APP VIEW
========================================== */

function showAuthScreen() {

    App.authScreen.style.display = "flex";

    App.appScreen.style.display = "none";

}


function enterApp(username) {

    App.authScreen.style.display = "none";

    App.appScreen.style.display = "flex";

    App.userName.textContent = username;

    App.userAvatar.textContent = username.charAt(0).toUpperCase();

    loadChats();

    App.input.focus();

}


/* ==========================================
   LOADING
========================================== */

function showLoading() {

    App.send.disabled = true;

    App.send.innerHTML = `
        <span class="loading-spinner"></span>
    `;

}


function hideLoading() {

    App.send.disabled = false;

    App.send.innerHTML = `
        <svg width="20" height="20"
             viewBox="0 0 24 24"
             fill="none"
             stroke="currentColor"
             stroke-width="2">

            <path d="M22 2L11 13"></path>

            <path d="M22 2L15 22L11 13L2 9L22 2"></path>

        </svg>
    `;

}


/* ==========================================
   GLOBAL EVENTS
========================================== */

function registerGlobalEvents() {

    /* Send message */
    App.form.addEventListener("submit", handleSendMessage);

    /* Enter to send
       Shift + Enter = new line */
    App.input.addEventListener("keydown", (e) => {

        if (
            e.key === "Enter" &&
            !e.shiftKey
        ) {

            e.preventDefault();

            App.form.requestSubmit();

        }

    });

    /* Mobile sidebar */

    if (App.sidebarToggle) {

        App.sidebarToggle.addEventListener("click", () => {

            App.sidebar.classList.toggle("open");

        });

    }

    /* Close sidebar when clicking outside */

    document.addEventListener("click", (e) => {

        if (window.innerWidth > 900) return;

        if (
            !App.sidebar.contains(e.target) &&
            !App.sidebarToggle.contains(e.target)
        ) {

            App.sidebar.classList.remove("open");

        }

    });

    /* Window resized */

    window.addEventListener("resize", () => {

        if (window.innerWidth > 900) {

            App.sidebar.classList.remove("open");

        }

    });

}


/* ==========================================
   SEND MESSAGE
========================================== */

async function handleSendMessage(e) {

    e.preventDefault();

    if (!Cipher.currentChat) return;

    const message = App.input.value.trim();

    if (!message) return;

    showLoading();

    try {

        if (typeof sendMessage === "function") {

            await sendMessage(message);

        }

    } catch (err) {

        console.error(err);

        showNotification(
            "Failed to send message.",
            "error"
        );

    }

    hideLoading();

    App.input.focus();

}


/* ==========================================
   NOTIFICATION SYSTEM
========================================== */

function showNotification(message, type = "info", duration = 3500) {

    let container = document.getElementById("notification-container");

    if (!container) {

        container = document.createElement("div");

        container.id = "notification-container";

        container.style.position = "fixed";
        container.style.top = "20px";
        container.style.right = "20px";
        container.style.zIndex = "9999";

        document.body.appendChild(container);

    }

    const notification = document.createElement("div");

    notification.className = `notification ${type}`;

    notification.innerHTML = `

        <span>${message}</span>

        <button class="notification-close">&times;</button>

    `;

    container.appendChild(notification);

    requestAnimationFrame(() => {

        notification.classList.add("show");

    });

    const removeNotification = () => {

        notification.classList.remove("show");

        setTimeout(() => {

            notification.remove();

        }, 300);

    };

    notification
        .querySelector(".notification-close")
        .addEventListener("click", removeNotification);

    setTimeout(removeNotification, duration);

}


/* ==========================================
   CONFIRM DIALOG
========================================== */

function confirmAction(message) {

    return window.confirm(message);

}


/* ==========================================
   SUCCESS / ERROR HELPERS
========================================== */

function showSuccess(message) {

    showNotification(message, "success");

}

function showError(message) {

    showNotification(message, "error");

}

function showWarning(message) {

    showNotification(message, "warning");

}

function showInfo(message) {

    showNotification(message, "info");

}


/* ==========================================
   SPLASH SCREEN
========================================== */

async function showSplashScreen(duration = 1800) {

    let splash = document.getElementById("cipher-splash");

    if (!splash) {

        splash = document.createElement("div");

        splash.id = "cipher-splash";

        splash.innerHTML = `

            <div class="splash-content">

                <div class="splash-logo animate-glow">
                    ¢
                </div>

                <h1>Cipher</h1>

                <p>Initializing Cipher...</p>

                <div class="splash-loader">

                    <div class="loader-bar"></div>

                </div>

            </div>

        `;

        document.body.appendChild(splash);

    }

    splash.style.display = "flex";

    await new Promise(resolve => setTimeout(resolve, duration));

}


function hideSplashScreen() {

    const splash = document.getElementById("cipher-splash");

    if (!splash) return;

    splash.style.opacity = "0";

    setTimeout(() => {

        splash.remove();

    }, 500);

}


/* ==========================================
   STARTUP SEQUENCE
========================================== */

async function startApplication() {

    await showSplashScreen();

    await checkLogin();

    hideSplashScreen();

}


/* ==========================================
   UTILITY FUNCTIONS
========================================== */

/**
 * Shortcut for querySelector
 */
function $(selector) {

    return document.querySelector(selector);

}

/**
 * Shortcut for querySelectorAll
 */
function $$(selector) {

    return document.querySelectorAll(selector);

}

/**
 * Create DOM element
 */
function createElement(tag, className = "", html = "") {

    const element = document.createElement(tag);

    if (className) {

        element.className = className;

    }

    if (html) {

        element.innerHTML = html;

    }

    return element;

}

/**
 * Escape HTML
 */
function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}

/**
 * Delay helper
 */
function sleep(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));

}

/**
 * Generate random ID
 */
function generateId() {

    return crypto.randomUUID();

}

/**
 * Format date
 */
function formatDate(date) {

    return new Date(date).toLocaleString();

}

/**
 * Save locally
 */
function saveLocal(key, value) {

    localStorage.setItem(

        key,

        JSON.stringify(value)

    );

}

/**
 * Load locally
 */
function loadLocal(key, fallback = null) {

    const value = localStorage.getItem(key);

    if (!value) return fallback;

    try {

        return JSON.parse(value);

    } catch {

        return fallback;

    }

}


/* ==========================================
   GLOBAL ERROR HANDLING
========================================== */

/**
 * Log application errors
 */
function logError(error, source = "Unknown") {

    console.error(`[${source}]`, error);

}

/**
 * Handle unexpected errors
 */
window.addEventListener("error", (event) => {

    logError(event.error || event.message, "Window");

    showError(
        "An unexpected error occurred."
    );

});


/**
 * Handle Promise rejections
 */
window.addEventListener("unhandledrejection", (event) => {

    logError(event.reason, "Promise");

    showError(
        "Something went wrong while processing your request."
    );

});


/**
 * Safe async wrapper
 */
async function safeExecute(fn, source = "Unknown") {

    try {

        return await fn();

    }

    catch(error){

        logError(error, source);

        showError(
            "Operation failed."
        );

        return null;

    }

}


/**
 * Network status
 */

window.addEventListener("offline", () => {

    showWarning(
        "You're offline. Cipher will reconnect automatically."
    );

});


window.addEventListener("online", () => {

    showSuccess(
        "Connection restored."
    );

});


/**
 * Check if online
 */

function isOnline(){

    return navigator.onLine;

}


/* ==========================================
   FINAL INITIALIZATION
========================================== */

async function bootCipher() {

    try {

        console.log("Starting Cipher...");

        await startApplication();

        console.log("Cipher Ready.");

    }

    catch(error){

        logError(error, "Boot");

        showError("Cipher failed to start.");

    }

}


/* ==========================================
   APP CLEANUP
========================================== */

window.addEventListener("beforeunload", () => {

    saveLocal("cipher-theme", Cipher.theme);

});


/* ==========================================
   AUTO SAVE
========================================== */

setInterval(() => {

    if(Cipher.initialized){

        saveLocal("last-chat", Cipher.currentChat);

    }

},30000);


/* ==========================================
   APPLICATION INFO
========================================== */

Cipher.version = "2.0.0";

Cipher.build = "Prototype";

Cipher.creator = "Fatai Quadri";


console.log(`
=========================================
             CIPHER AI
=========================================
Version : ${Cipher.version}
Creator : ${Cipher.creator}
Status  : Ready
=========================================
`);


/* ==========================================
   START APPLICATION
========================================== */

bootCipher();
