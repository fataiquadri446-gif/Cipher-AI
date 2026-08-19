/* =========================================================
   CIPHER APP
   Created by Fatai Quadri
   Main Application Controller
========================================================= */

"use strict";


/* =========================================================
   GLOBAL STATE
========================================================= */

const Cipher = {

    user: null,

    currentChat: null,

    chats: [],

    initialized: false,

    theme:
        localStorage.getItem("cipher-theme")
        || "midnight",

    sidebarOpen: false,

    settingsOpen: false,

    reminderOpen: false,

    online:
        navigator.onLine

};


/* =========================================================
   DOM REFERENCES
========================================================= */

const App = {

    authScreen:
        document.getElementById("auth-screen"),

    appScreen:
        document.getElementById("app-screen"),

    chat:
        document.getElementById("chat"),

    form:
        document.getElementById("form"),

    input:
        document.getElementById("input"),

    send:
        document.getElementById("send"),

    sidebar:
        document.getElementById("sidebar"),

    sidebarToggle:
        document.getElementById("sidebar-toggle"),

    chatList:
        document.getElementById("chat-list"),

    userName:
        document.getElementById("user-name"),

    userAvatar:
        document.getElementById("user-avatar"),

    userStatus:
        document.getElementById("user-status"),

    themeButton:
        document.getElementById("theme-btn"),

    themeSwitch:
        document.getElementById("theme-switch"),

    settingsButton:
        document.getElementById("settings-btn"),

    reminderButton:
        document.getElementById("open-reminder-btn"),

    attachmentButton:
        document.getElementById("upload-btn"),

    fileInput:
        document.getElementById("file-input"),

    reminderModal:
        document.getElementById("reminder-panel"),

    reminderText:
        document.getElementById("reminder-title"),

    reminderDate:
        document.getElementById("reminder-date"),

    reminderTime:
        document.getElementById("reminder-time"),

    reminderNotification:
        document.getElementById(
            "reminder-notification"
        ),

    reminderError:
        document.getElementById("reminder-error"),

    saveReminderButton:
        document.getElementById("save-reminder-btn"),

    settingsModal:
        document.getElementById("settings-panel"),

    fontSizeSetting:
        document.getElementById(
            "font-size-setting"
        ),

    densitySetting:
        document.getElementById(
            "density-setting"
        ),

    messageStyleSetting:
        document.getElementById(
            "message-style-setting"
        ),

    memorySettingsButton:
        document.getElementById(
            "memory-settings-btn"
        ),

    resetPreferencesButton:
        document.getElementById(
            "reset-preferences-btn"
        )

};


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeCipher
);


async function initializeCipher() {

    if (Cipher.initialized) {

        return;

    }


    setMinimumReminderDate();


    registerGlobalEvents();


    await checkLogin();


    Cipher.initialized = true;


    console.log(
        "Cipher application initialized."
    );

}


/* =========================================================
   AUTHENTICATION CHECK
========================================================= */

async function checkLogin() {

    try {

        const response =
            await fetch(
                "/me",
                {
                    method: "GET",

                    credentials: "same-origin",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (!response.ok) {

            throw new Error(
                `Authentication request failed: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (data.logged_in) {

            Cipher.user =
                data;


            enterApp(
                data.username
                || data.email
                || "User"
            );

        }

        else {

            showAuthScreen();

        }

    }

    catch (error) {

        logError(
            error,
            "Authentication Check"
        );


        showAuthScreen();

    }

}


/* =========================================================
   SHOW AUTH SCREEN
========================================================= */

function showAuthScreen() {

    if (!App.authScreen ||
        !App.appScreen) {

        return;

    }


    App.authScreen.style.display =
        "flex";

    App.appScreen.style.display =
        "none";

}


/* =========================================================
   ENTER APPLICATION
========================================================= */

function enterApp(username) {

    if (!App.authScreen ||
        !App.appScreen) {

        return;

    }


    App.authScreen.style.display =
        "none";

    App.appScreen.style.display =
        "flex";


    const displayName =
        username || "User";


    if (App.userName) {

        App.userName.textContent =
            displayName;

    }


    if (App.userAvatar) {

        App.userAvatar.textContent =
            displayName
                .charAt(0)
                .toUpperCase();

    }


    /*
     * Load chat history through sidebar.js.
     */

    if (
        typeof loadSidebarChats === "function"
    ) {

        safeExecute(
            () => loadSidebarChats(),
            "Load Chats"
        );

    }


    setTimeout(() => {

        if (App.input) {

            App.input.focus();

        }

    }, 150);

}


/* =========================================================
   LOADING STATE
========================================================= */

function showLoading() {

    if (!App.send) return;


    App.send.disabled =
        true;


    App.send.dataset.originalText =
        App.send.innerHTML;


    App.send.innerHTML = `

        <span
            class="loading-spinner"
            aria-label="Sending">
        </span>

    `;

}


/* =========================================================
   HIDE LOADING
========================================================= */

function hideLoading() {

    if (!App.send) return;


    App.send.disabled =
        false;


    if (App.send.dataset.originalText) {

        App.send.innerHTML =
            App.send.dataset.originalText;

    }

}


/* =========================================================
   GLOBAL EVENTS
========================================================= */

function registerGlobalEvents() {

    /*
     * Prevent duplicate registration.
     */

    if (
        document.body.dataset
            .cipherEventsRegistered === "true"
    ) {

        return;

    }


    document.body.dataset
        .cipherEventsRegistered = "true";


    /* =====================================================
       MESSAGE FORM
       NOTE: chat.js does NOT bind its own submit listener
       (initializeChat() is never called), so this is the
       single, authoritative handler for sending messages.
    ===================================================== */

    if (App.form) {

        App.form.addEventListener(
            "submit",
            handleSendMessage
        );

    }


    /* =====================================================
       ENTER TO SEND
    ===================================================== */

    if (App.input) {

        App.input.addEventListener(
            "keydown",
            handleInputKeydown
        );


        App.input.addEventListener(
            "input",
            autoResizeInput
        );

    }


    /* =====================================================
       SIDEBAR TOGGLE
       NOTE: sidebar.js already binds its own click listener
       to #sidebar-toggle (and owns toggleSidebar()), so app.js
       intentionally does NOT bind a second listener here to
       avoid the double-toggle bug.
    ===================================================== */


    /* =====================================================
       SETTINGS
    ===================================================== */

    if (App.settingsButton) {

        App.settingsButton.addEventListener(
            "click",
            openSettings
        );

    }


    /* =====================================================
       REMINDER
    ===================================================== */

    if (App.reminderButton) {

        App.reminderButton.addEventListener(
            "click",
            openReminder
        );

    }


    if (App.saveReminderButton) {

        App.saveReminderButton.addEventListener(
            "click",
            handleReminderSubmit
        );

    }


    /* =====================================================
       FILE ATTACHMENT
    ===================================================== */

    if (App.attachmentButton) {

        App.attachmentButton
            .addEventListener(
                "click",
                openFilePicker
            );

    }


    if (App.fileInput) {

        App.fileInput.addEventListener(
            "change",
            handleFileSelection
        );

    }


    /* =====================================================
       PANEL CLOSE BUTTONS (theme / settings / reminder)
       These use data-close-panel="<id>" in the HTML.
    ===================================================== */

    document
        .querySelectorAll("[data-close-panel]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const panel =
                        document.getElementById(
                            button.dataset.closePanel
                        );

                    if (panel) {

                        panel.style.display =
                            "none";

                        if (
                            panel === App.settingsModal
                        ) {

                            Cipher.settingsOpen = false;

                        }

                        if (
                            panel === App.reminderModal
                        ) {

                            Cipher.reminderOpen = false;

                        }

                    }

                }
            );

        });


    /* =====================================================
       SETTINGS CONTROLS
    ===================================================== */

    if (App.fontSizeSetting) {

        App.fontSizeSetting
            .addEventListener(
                "change",
                event => {

                    if (
                        window.CipherAppearance
                    ) {

                        window.CipherAppearance
                            .set(
                                "fontSize",
                                event.target.value
                            );

                    }

                }
            );

    }


    if (App.densitySetting) {

        App.densitySetting
            .addEventListener(
                "change",
                event => {

                    if (
                        window.CipherAppearance
                    ) {

                        window.CipherAppearance
                            .set(
                                "density",
                                event.target.value
                            );

                    }

                }
            );

    }


    if (App.messageStyleSetting) {

        App.messageStyleSetting
            .addEventListener(
                "change",
                event => {

                    if (
                        window.CipherAppearance
                    ) {

                        window.CipherAppearance
                            .set(
                                "messageStyle",
                                event.target.value
                            );

                    }

                }
            );

    }


    /* =====================================================
       MEMORY
    ===================================================== */

    if (App.memorySettingsButton) {

        App.memorySettingsButton
            .addEventListener(
                "click",
                openMemorySettings
            );

    }


    /* =====================================================
       RESET PREFERENCES
    ===================================================== */

    if (App.resetPreferencesButton) {

        App.resetPreferencesButton
            .addEventListener(
                "click",
                resetPreferences
            );

    }


    /* =====================================================
       ESCAPE
    ===================================================== */

    document.addEventListener(
        "keydown",
        handleGlobalKeydown
    );


    /* =====================================================
       WELCOME CARDS
    ===================================================== */

    document
        .querySelectorAll(
            ".welcome-card"
        )
        .forEach(card => {

            card.addEventListener(
                "click",
                handleWelcomeCard
            );

        });


    /*
     * Load appearance settings.
     */

    loadAppearanceIntoSettings();

}


/* =========================================================
   INPUT KEYBOARD
========================================================= */

function handleInputKeydown(event) {

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();


        if (App.form) {

            App.form.requestSubmit();

        }

    }

}


/* =========================================================
   AUTO RESIZE MESSAGE INPUT
========================================================= */

function autoResizeInput() {

    if (!App.input) return;


    App.input.style.height =
        "auto";


    const maxHeight = 180;


    App.input.style.height =
        Math.min(
            App.input.scrollHeight,
            maxHeight
        ) + "px";

}


/* =========================================================
   SEND MESSAGE
   NOTE: chat.js owns the real sending logic and reads the
   message straight from ChatUI.input, so this just forwards
   the submit event to it. It no longer requires a chat to
   already exist -- the backend auto-creates one on /chat.
========================================================= */

async function handleSendMessage(event) {

    event.preventDefault();


    if (!App.input) return;


    const message =
        App.input.value.trim();


    if (!message) return;


    if (!isOnline()) {

        showWarning(
            "You're offline. Check your connection and try again."
        );

        return;

    }


    showLoading();


    try {

        if (
            typeof sendMessage === "function"
        ) {

            await sendMessage();

        }

        else {

            throw new Error(
                "chat.js sendMessage() is unavailable."
            );

        }

    }

    catch (error) {

        logError(
            error,
            "Send Message"
        );


        showNotification(
            "Failed to send message.",
            "error"
        );

    }

    finally {

        hideLoading();


        if (App.input) {

            App.input.focus();

        }

    }

}


/* =========================================================
   SETTINGS
========================================================= */

function openSettings() {

    if (!App.settingsModal) return;


    loadAppearanceIntoSettings();


    App.settingsModal.style.display =
        "block";


    Cipher.settingsOpen =
        true;

}


function closeSettings() {

    if (!App.settingsModal) return;


    App.settingsModal.style.display =
        "none";


    Cipher.settingsOpen =
        false;

}


/* =========================================================
   LOAD APPEARANCE SETTINGS
========================================================= */

function loadAppearanceIntoSettings() {

    if (
        !window.CipherAppearance
    ) {

        return;

    }


    const settings =
        window.CipherAppearance.get();


    if (App.fontSizeSetting) {

        App.fontSizeSetting.value =
            settings.fontSize;

    }


    if (App.densitySetting) {

        App.densitySetting.value =
            settings.density;

    }


    if (App.messageStyleSetting) {

        App.messageStyleSetting.value =
            settings.messageStyle;

    }

}


/* =========================================================
   RESET PREFERENCES
========================================================= */

function resetPreferences() {

    const confirmed =
        confirmAction(
            "Reset your saved appearance and theme preferences?"
        );


    if (!confirmed) return;


    if (
        window.CipherAppearance &&
        typeof window.CipherAppearance.reset ===
            "function"
    ) {

        window.CipherAppearance.reset();

    }


    if (
        window.CipherThemes &&
        typeof window.CipherThemes.resetToSystem ===
            "function"
    ) {

        window.CipherThemes.resetToSystem();

    }


    Cipher.theme =
        localStorage.getItem(
            "cipher-theme"
        ) || "midnight";


    loadAppearanceIntoSettings();


    showSuccess(
        "Your appearance preferences have been reset."
    );

}


/* =========================================================
   MEMORY SETTINGS
========================================================= */

function openMemorySettings() {

    showInfo(
        "Memory management will be connected to Cipher's memory system."
    );

}


/* =========================================================
   REMINDER SYSTEM
========================================================= */

function openReminder() {

    if (!App.reminderModal) return;


    setMinimumReminderDate();


    App.reminderModal.style.display =
        "block";


    Cipher.reminderOpen =
        true;


    if (App.reminderText) {

        setTimeout(() => {

            App.reminderText.focus();

        }, 100);

    }

}


function closeReminder() {

    if (!App.reminderModal) return;


    App.reminderModal.style.display =
        "none";


    Cipher.reminderOpen =
        false;


    clearReminderError();

}


/* =========================================================
   REMINDER DATE
========================================================= */

function setMinimumReminderDate() {

    if (!App.reminderDate) return;


    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            today.getDate()
        ).padStart(2, "0");


    const dateString =
        `${year}-${month}-${day}`;


    App.reminderDate.min =
        dateString;


    if (!App.reminderDate.value) {

        App.reminderDate.value =
            dateString;

    }

}


/* =========================================================
   REMINDER FORM
========================================================= */

async function handleReminderSubmit(event) {

    if (event) {

        event.preventDefault();

    }


    clearReminderError();


    const