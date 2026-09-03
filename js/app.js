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
       NOTE: settings are now fully owned by cipher-ui.js
       (the new settings modal + theme system). app.js no
       longer binds its own click listener here to avoid
       a redundant second listener on the same button.
    ===================================================== */


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
       IMAGE GENERATION TOGGLE
       NOTE: the old dedicated toggle button was replaced
       by the "Image Generation" welcome card. It's now
       triggered through the same handleWelcomeCard() path
       as Chat/Research/Documents, so there's no separate
       listener to bind here anymore.
    ===================================================== */


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


    const text =
        App.reminderText
            ? App.reminderText.value.trim()
            : "";


    const date =
        App.reminderDate
            ? App.reminderDate.value
            : "";


    const time =
        App.reminderTime
            ? App.reminderTime.value
            : "";


    const notificationType =
        App.reminderNotification
            ? App.reminderNotification.value
            : "in_app";


    if (!text) {

        showReminderError(
            "Please enter what you want Cipher to remind you about."
        );

        return;

    }


    if (!date || !time) {

        showReminderError(
            "Please select a date and time."
        );

        return;

    }


    const reminderDateTime =
        new Date(
            `${date}T${time}`
        );


    if (
        Number.isNaN(
            reminderDateTime.getTime()
        )
    ) {

        showReminderError(
            "Please enter a valid reminder date and time."
        );

        return;

    }


    if (
        reminderDateTime.getTime()
        <= Date.now()
    ) {

        showReminderError(
            "Please choose a future date and time."
        );

        return;

    }


    const reminder = {

        text: text,

        date: date,

        time: time,

        notification_type:
            notificationType

    };


    try {

        const response =
            await fetch(
                "/api/reminders",
                {

                    method: "POST",

                    credentials:
                        "same-origin",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            reminder
                        )

                }
            );


        if (!response.ok) {

            let errorMessage =
                "Unable to create reminder.";


            try {

                const errorData =
                    await response.json();


                if (
                    errorData.message
                ) {

                    errorMessage =
                        errorData.message;

                }

            }

            catch {

                /* Keep default message. */

            }


            throw new Error(
                errorMessage
            );

        }


        const data =
            await response.json();


        closeReminder();


        if (App.reminderText) {

            App.reminderText.value = "";

        }


        setMinimumReminderDate();


        showSuccess(
            data.message
            || "Reminder set successfully."
        );


    }

    catch (error) {

        logError(
            error,
            "Reminder"
        );


        showReminderError(
            error.message
            || "Unable to set reminder."
        );

    }

}


/* =========================================================
   REMINDER ERROR
========================================================= */

function showReminderError(message) {

    if (!App.reminderError) {

        showError(message);

        return;

    }


    App.reminderError.textContent =
        message;


    App.reminderError.style.display =
        "block";

}


function clearReminderError() {

    if (!App.reminderError) return;


    App.reminderError.textContent =
        "";


    App.reminderError.style.display =
        "none";

}


/* =========================================================
   FILE ATTACHMENT
   Images are converted to base64 and held here until the
   next message is sent -- chat.js reads Cipher.pendingImage
   and includes it in the /chat request. Cipher's vision
   support only understands images, so non-image files are
   rejected with a clear message rather than silently doing
   nothing.
========================================================= */

Cipher.pendingImage = null;


/* =========================================================
   IMAGE GENERATION MODE
   A one-shot toggle: turn it on, type a description, hit
   send -- the trigger phrase the backend recognizes gets
   prepended automatically, then the mode turns itself back
   off. Exposed on window so chat.js's sendMessage() can
   read and clear it without a circular dependency between
   the two files.
========================================================= */

Cipher.imageGenMode = false;


function toggleImageGenMode(force = null) {

    Cipher.imageGenMode =
        force !== null
            ? Boolean(force)
            : !Cipher.imageGenMode;


    /*
     * Visual feedback lives on the "Image Generation"
     * welcome card now, not a dedicated toggle button.
     * It only stays visible on the welcome screen, so
     * this is a nice-to-have, not load-bearing.
     */

    const imageGenCard =
        document.getElementById("imageGenerationBtn");

    if (imageGenCard) {

        imageGenCard.classList.toggle(
            "active",
            Cipher.imageGenMode
        );

    }


    if (App.input) {

        App.input.placeholder =
            Cipher.imageGenMode
                ? "Describe the image you want…"
                : "Message Cipher...";

    }

}


window.toggleImageGenMode = toggleImageGenMode;


function openFilePicker() {

    if (!App.fileInput) return;


    App.fileInput.click();

}


function handleFileSelection(event) {

    const files =
        Array.from(
            event.target.files || []
        );


    event.target.value = "";


    if (!files.length) return;


    const file = files[0];


    if (!file.type.startsWith("image/")) {

        showWarning(
            "Cipher can currently only see images -- try a JPG, PNG, or WEBP file."
        );

        return;

    }


    if (file.size > 8 * 1024 * 1024) {

        showWarning(
            "That image is too large. Please use one under 8MB."
        );

        return;

    }


    const reader = new FileReader();


    reader.onload = () => {

        const result = reader.result;

        const base64 =
            result.substring(
                result.indexOf(",") + 1
            );


        Cipher.pendingImage = {

            base64: base64,

            mimeType: file.type,

            name: file.name

        };


        showAttachmentPreview(
            file.name,
            result
        );

    };


    reader.onerror = () => {

        showError(
            "Unable to read that image."
        );

    };


    reader.readAsDataURL(file);

}


function showAttachmentPreview(fileName, dataUrl) {

    const preview =
        document.getElementById(
            "attachment-preview"
        );

    if (!preview) return;


    preview.innerHTML = "";


    const chip =
        document.createElement("div");

    chip.className =
        "attachment-chip";


    const thumb =
        document.createElement("img");

    thumb.src =
        dataUrl;

    thumb.alt =
        fileName;

    thumb.className =
        "attachment-thumb";


    const label =
        document.createElement("span");

    label.textContent =
        fileName;


    const removeButton =
        document.createElement("button");

    removeButton.type =
        "button";

    removeButton.setAttribute(
        "aria-label",
        "Remove attachment"
    );

    removeButton.textContent =
        "×";

    removeButton.addEventListener(
        "click",
        clearPendingImage
    );


    chip.appendChild(thumb);

    chip.appendChild(label);

    chip.appendChild(removeButton);

    preview.appendChild(chip);

}


function clearPendingImage() {

    Cipher.pendingImage = null;


    const preview =
        document.getElementById(
            "attachment-preview"
        );

    if (preview) {

        preview.innerHTML = "";

    }

}


/* =========================================================
   WELCOME CARDS
========================================================= */

function handleWelcomeCard(event) {

    const card =
        event.currentTarget;


    const action =
        card.dataset.action;


    switch (action) {

        case "chat":

            focusMessageInput();

            break;


        case "research":

            setMessagePrompt(
                "What would you like Cipher to research?"
            );

            break;


        case "documents":

            openFilePicker();

            break;


        case "image":

            toggleImageGenMode(true);

            focusMessageInput();

            break;


        case "reminder":

            openReminder();

            break;


        default:

            break;

    }

}


/* =========================================================
   FOCUS MESSAGE INPUT
========================================================= */

function focusMessageInput() {

    if (!App.input) return;


    App.input.focus();


    App.input.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}


/* =========================================================
   MESSAGE PROMPT
========================================================= */

function setMessagePrompt(prompt) {

    if (!App.input) return;


    App.input.value =
        prompt;


    autoResizeInput();


    focusMessageInput();


    App.input.setSelectionRange(
        0,
        0
    );

}


/* =========================================================
   GLOBAL KEYBOARD
========================================================= */

function handleGlobalKeydown(event) {

    if (
        event.key === "Escape"
    ) {

        if (Cipher.reminderOpen) {

            closeReminder();

            return;

        }


        if (Cipher.settingsOpen) {

            closeSettings();

            return;

        }


        if (
            window.CipherThemes &&
            typeof window.CipherThemes.closeMenu ===
                "function"
        ) {

            window.CipherThemes.closeMenu();

        }

    }

}


/* =========================================================
   NOTIFICATION SYSTEM
========================================================= */

function showNotification(
    message,
    type = "info",
    duration = 3500
) {

    let container =
        document.getElementById(
            "notification-container"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );


        container.id =
            "notification-container";


        document.body.appendChild(
            container
        );

    }


    const notification =
        document.createElement(
            "div"
        );


    notification.className =
        `notification ${type}`;


    notification.setAttribute(
        "role",
        "status"
    );


    const messageSpan =
        document.createElement(
            "span"
        );


    messageSpan.textContent =
        message;


    const closeButton =
        document.createElement(
            "button"
        );


    closeButton.type =
        "button";


    closeButton.className =
        "notification-close";


    closeButton.setAttribute(
        "aria-label",
        "Close notification"
    );


    closeButton.innerHTML =
        "&times;";


    notification.appendChild(
        messageSpan
    );


    notification.appendChild(
        closeButton
    );


    container.appendChild(
        notification
    );


    requestAnimationFrame(() => {

        notification.classList.add(
            "show"
        );

    });


    let removed = false;


    const removeNotification =
        () => {

            if (removed) return;


            removed = true;


            notification.classList.remove(
                "show"
            );


            setTimeout(() => {

                if (
                    notification.parentNode
                ) {

                    notification.remove();

                }

            }, 300);

        };


    closeButton.addEventListener(
        "click",
        removeNotification
    );


    setTimeout(
        removeNotification,
        duration
    );

}


/* =========================================================
   NOTIFICATION HELPERS
========================================================= */

function showSuccess(message) {

    showNotification(
        message,
        "success"
    );

}


function showError(message) {

    showNotification(
        message,
        "error"
    );

}


function showWarning(message) {

    showNotification(
        message,
        "warning"
    );

}


function showInfo(message) {

    showNotification(
        message,
        "info"
    );

}


/* =========================================================
   CONFIRMATION
========================================================= */

function confirmAction(message) {

    return window.confirm(
        message
    );

}


/* =========================================================
   LOCAL STORAGE HELPERS
========================================================= */

function saveLocal(
    key,
    value
) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

    }

    catch (error) {

        logError(
            error,
            "Local Storage Save"
        );

    }

}


function loadLocal(
    key,
    fallback = null
) {

    try {

        const value =
            localStorage.getItem(
                key
            );


        if (!value) {

            return fallback;

        }


        return JSON.parse(
            value
        );

    }

    catch (error) {

        logError(
            error,
            "Local Storage Load"
        );


        return fallback;

    }

}


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function $(selector) {

    return document.querySelector(
        selector
    );

}


function $$(selector) {

    return document.querySelectorAll(
        selector
    );

}


function createElement(
    tag,
    className = "",
    html = ""
) {

    const element =
        document.createElement(
            tag
        );


    if (className) {

        element.className =
            className;

    }


    if (html) {

        element.innerHTML =
            html;

    }


    return element;

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text == null
            ? ""
            : String(text);


    return div.innerHTML;

}


/* =========================================================
   DELAY
========================================================= */

function sleep(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );

}


/* =========================================================
   RANDOM ID
========================================================= */

function generateId() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID ===
            "function"
    ) {

        return window.crypto.randomUUID();

    }


    return (
        Date.now().toString(36)
        + Math.random()
            .toString(36)
            .substring(2)
    );

}


/* =========================================================
   DATE FORMAT
========================================================= */

function formatDate(date) {

    try {

        return new Date(
            date
        ).toLocaleString();

    }

    catch {

        return "";

    }

}


/* =========================================================
   NETWORK STATUS
========================================================= */

function isOnline() {

    return navigator.onLine;

}


function updateNetworkStatus() {

    Cipher.online =
        navigator.onLine;


    if (App.userStatus) {

        App.userStatus.textContent =
            navigator.onLine
                ? "Online"
                : "Offline";

    }

}


window.addEventListener(
    "offline",
    () => {

        updateNetworkStatus();


        showWarning(
            "You're offline. Cipher will reconnect when your connection returns."
        );

    }
);


window.addEventListener(
    "online",
    () => {

        updateNetworkStatus();


        showSuccess(
            "Connection restored."
        );

    }
);


/* =========================================================
   ERROR LOGGING
========================================================= */

function logError(
    error,
    source = "Unknown"
) {

    console.error(
        `[Cipher:${source}]`,
        error
    );

}


/* =========================================================
   GLOBAL ERROR HANDLING
========================================================= */

window.addEventListener(
    "error",
    event => {

        logError(
            event.error ||
            event.message,
            "Window"
        );

    }
);


window.addEventListener(
    "unhandledrejection",
    event => {

        logError(
            event.reason,
            "Promise"
        );

    }
);


/* =========================================================
   SAFE EXECUTION
========================================================= */

async function safeExecute(
    fn,
    source = "Unknown"
) {

    try {

        return await fn();

    }

    catch (error) {

        logError(
            error,
            source
        );


        showError(
            "Operation failed."
        );


        return null;

    }

}


/* =========================================================
   APPLICATION INFO
========================================================= */

Cipher.version =
    "2.0.1";


Cipher.build =
    "Prototype";


Cipher.creator =
    "Fatai Quadri";


console.log(`

=========================================
             CIPHER AI
=========================================
Version : ${Cipher.version}
Creator : ${Cipher.creator}
Status  : Initializing
=========================================

`);


/* =========================================================
   PUBLIC APP API
========================================================= */

window.CipherApp = {

    state:
        Cipher,

    openSettings:
        openSettings,

    closeSettings:
        closeSettings,

    openReminder:
        openReminder,

    closeReminder:
        closeReminder,

    showNotification:
        showNotification,

    showSuccess:
        showSuccess,

    showError:
        showError,

    showWarning:
        showWarning,

    showInfo:
        showInfo,

    focusInput:
        focusMessageInput,

    openFilePicker:
        openFilePicker

};


/* =========================================================
   END OF APP.JS
========================================================= */
