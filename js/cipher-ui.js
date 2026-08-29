
/* =====================================================
   CIPHER THEME ENGINE
   This is now the single source of truth for themes --
   the older themes.js system has been retired to avoid
   two competing implementations fighting over the same
   buttons.
===================================================== */

const cipherThemes = {

    midnight: {
        bg: "#080d12",
        panel: "#101923",
        input: "#17232e",
        button: "#1d303b",
        accent: "#20d0c0",
        border: "#31545b",
        text: "#f5ffff"
    },

    emerald: {
        bg: "#071711",
        panel: "#0d241a",
        input: "#123527",
        button: "#184936",
        accent: "#34d399",
        border: "#28694d",
        text: "#effff7"
    },

    cyber: {
        bg: "#10071b",
        panel: "#1b0d2d",
        input: "#281342",
        button: "#38205b",
        accent: "#a855f7",
        border: "#7135a5",
        text: "#faf5ff"
    },

    amoled: {
        bg: "#000000",
        panel: "#050505",
        input: "#0d0d0d",
        button: "#151515",
        accent: "#ffffff",
        border: "#292929",
        text: "#ffffff"
    },

    ocean: {
        bg: "#061722",
        panel: "#0b2535",
        input: "#12364b",
        button: "#194b67",
        accent: "#29b6f6",
        border: "#28647f",
        text: "#f1fbff"
    },

    sunset: {
        bg: "#211008",
        panel: "#35180d",
        input: "#492316",
        button: "#63311f",
        accent: "#ff8a32",
        border: "#8a4b2e",
        text: "#fff7ef"
    },

    aurora: {
        bg: "#071a18",
        panel: "#0d2925",
        input: "#123a34",
        button: "#185047",
        accent: "#00e5a8",
        border: "#24776a",
        text: "#effffb"
    },

    violet: {
        bg: "#100b1e",
        panel: "#1c1330",
        input: "#281a43",
        button: "#38255b",
        accent: "#8b5cf6",
        border: "#6540a4",
        text: "#faf8ff"
    },

    rose: {
        bg: "#1d0b11",
        panel: "#32121c",
        input: "#471825",
        button: "#5d2230",
        accent: "#f43f5e",
        border: "#823447",
        text: "#fff5f7"
    },

    crimson: {
        bg: "#190708",
        panel: "#2d0c0d",
        input: "#421315",
        button: "#58191c",
        accent: "#ef4444",
        border: "#79292c",
        text: "#fff5f5"
    },

    arctic: {
        bg: "#08151d",
        panel: "#102631",
        input: "#173641",
        button: "#214c5d",
        accent: "#67e8f9",
        border: "#367486",
        text: "#effcff"
    },

    gold: {
        bg: "#171108",
        panel: "#2a1e0b",
        input: "#3b2b10",
        button: "#513c15",
        accent: "#facc15",
        border: "#806321",
        text: "#fffbed"
    },

    nebula: {
        bg: "#0a0b1d",
        panel: "#151735",
        input: "#20234a",
        button: "#2c3060",
        accent: "#6366f1",
        border: "#4a4e9a",
        text: "#f4f4ff"
    },

    sakura: {
        bg: "#1b0d14",
        panel: "#301421",
        input: "#461d2d",
        button: "#5d273b",
        accent: "#fb7185",
        border: "#853d56",
        text: "#fff5f7"
    },

    matrix: {
        bg: "#020b05",
        panel: "#06150a",
        input: "#0b2411",
        button: "#103619",
        accent: "#22c55e",
        border: "#1c6b32",
        text: "#edfff2"
    },

    light: {
        bg: "#f5f7fa",
        panel: "#ffffff",
        input: "#edf1f5",
        button: "#e1e7ed",
        accent: "#13b8aa",
        border: "#c8d2dc",
        text: "#101820"
    }

};


function applyCipherTheme(themeName) {

    const theme =
        cipherThemes[themeName];

    if (!theme) return;


    const root =
        document.documentElement;


    root.style.setProperty("--bg-primary", theme.bg);

    root.style.setProperty("--bg-secondary", theme.panel);

    root.style.setProperty("--input-bg", theme.input);

    root.style.setProperty("--button-bg", theme.button);

    root.style.setProperty("--accent", theme.accent);

    root.style.setProperty("--border", theme.border);

    root.style.setProperty("--text", theme.text);


    /*
     * The app's original stylesheet reads different
     * variable names for the same purpose -- keep those
     * in sync too so nothing goes back to its old colors.
     */

    root.style.setProperty("--bg-card", theme.panel);

    root.style.setProperty("--bg-hover", theme.button);

    root.style.setProperty("--accent-dark", theme.accent);

    root.style.setProperty("--text-primary", theme.text);


    document.body.dataset.theme =
        themeName;


    localStorage.setItem(
        "cipherTheme",
        themeName
    );


    document
        .querySelectorAll(".theme-option")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.theme === themeName
            );

        });

}


/* =====================================================
   THEME MENU
===================================================== */

const themeMenu =
    document.getElementById("themeMenu");

const themeBtn =
    document.getElementById("theme-btn");

const topThemeBtn =
    document.getElementById("theme-switch");

const advancedThemeBtn =
    document.getElementById("advancedThemeBtn");

const closeThemeMenuBtn =
    document.getElementById("closeThemeMenu");


function openThemeMenu() {

    if (!themeMenu) return;

    themeMenu.classList.add("active");

}


function closeThemes() {

    if (!themeMenu) return;

    themeMenu.classList.remove("active");

}


[themeBtn, topThemeBtn, advancedThemeBtn].forEach(
    trigger => {

        if (!trigger) return;

        trigger.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                closeSettingsModal();

                openThemeMenu();

            }
        );

    }
);


if (closeThemeMenuBtn) {

    closeThemeMenuBtn.addEventListener(
        "click",
        closeThemes
    );

}


document.addEventListener("click", event => {

    if (!themeMenu || !themeMenu.classList.contains("active")) {

        return;

    }


    const isTrigger =
        event.target.closest(
            "#theme-btn, #theme-switch, #advancedThemeBtn"
        );


    if (
        !themeMenu.contains(event.target) &&
        !isTrigger
    ) {

        closeThemes();

    }

});


document.addEventListener("keydown", event => {

    if (event.key === "Escape") {

        closeThemes();

    }

});


/* Theme selection */

document
    .querySelectorAll(".theme-option")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                applyCipherTheme(
                    button.dataset.theme
                );

            }
        );

    });


/* =====================================================
   RANDOM THEMES
   Per the confirmed design: themes randomize once when
   the app is opened/reloaded, not on a running timer.
   The interval dropdown stays in the UI for a possible
   future "live cycling" mode, but doesn't do anything
   functional yet -- only the on/off toggle is active.
===================================================== */

const randomThemes =
    document.getElementById("randomThemes");

const randomThemeSettings =
    document.getElementById("randomThemeSettings");


function pickRandomTheme(excludeCurrent) {

    const names =
        Object.keys(cipherThemes);


    const choices =
        excludeCurrent
            ? names.filter(name => name !== excludeCurrent)
            : names;


    return choices[
        Math.floor(Math.random() * choices.length)
    ];

}


if (randomThemes) {

    randomThemes.addEventListener(
        "change",
        function () {

            localStorage.setItem(
                "randomThemes",
                this.checked
            );


            if (randomThemeSettings) {

                randomThemeSettings.classList.toggle(
                    "active",
                    this.checked
                );

            }


            if (this.checked) {

                const current =
                    localStorage.getItem("cipherTheme");

                applyCipherTheme(
                    pickRandomTheme(current)
                );

            }

        }
    );

}


/* =====================================================
   CIPHER THEME COMMAND SYSTEM
   Lets the person change themes just by telling Cipher
   in a chat message, when explicitly enabled.
===================================================== */

const cipherThemeControl =
    document.getElementById("cipherThemeControl");


if (cipherThemeControl) {

    cipherThemeControl.addEventListener(
        "change",
        function () {

            localStorage.setItem(
                "cipherThemeControl",
                this.checked
            );

        }
    );

}


function cipherCanChangeTheme() {

    return localStorage.getItem(
        "cipherThemeControl"
    ) === "true";

}


const CIPHER_THEME_COMMANDS = {

    midnight: ["midnight", "dark blue", "dark theme"],
    emerald: ["emerald", "green theme", "green template"],
    cyber: ["cyber", "purple cyber", "cyber template"],
    amoled: ["amoled", "pure black", "black theme"],
    ocean: ["ocean", "blue theme", "blue template"],
    sunset: ["sunset", "orange theme"],
    aurora: ["aurora", "aurora theme"],
    violet: ["violet", "purple theme", "purple template"],
    rose: ["rose", "pink theme"],
    crimson: ["crimson", "red theme"],
    arctic: ["arctic", "ice theme", "icy theme"],
    gold: ["gold", "golden theme"],
    nebula: ["nebula", "space theme"],
    sakura: ["sakura", "pink interface"],
    matrix: ["matrix", "hacker theme", "green matrix"],
    light: ["light theme", "bright theme"]

};


/*
 * Phrases that clearly mean "I want a different theme"
 * but don't say which one -- these open the picker with
 * a prompt instead of silently doing nothing.
 */

const CIPHER_GENERIC_THEME_TRIGGERS = [

    "change theme",
    "change the theme",
    "change my theme",
    "change color",
    "change the color",
    "change colour",
    "change the colour",
    "switch theme",
    "switch the theme",
    "switch color",
    "change template",
    "change the template",
    "change interface",
    "change the interface",
    "new theme",
    "different theme",
    "different color"

];


/*
 * Returns true if a theme change was triggered, OR if
 * the picker was opened because the request was too
 * vague to act on directly. Exposed on window so chat.js
 * can call it without needing to know anything about how
 * themes work internally.
 */

function handleCipherThemeCommand(message) {

    if (!cipherCanChangeTheme()) {

        return false;

    }

    if (!message) {

        return false;

    }


    const text =
        message.toLowerCase();


    for (
        const [theme, keywords]
        of Object.entries(CIPHER_THEME_COMMANDS)
    ) {

        if (keywords.some(keyword => text.includes(keyword))) {

            applyCipherTheme(theme);

            showCipherToast(
                `Switched to ${theme[0].toUpperCase()}${theme.slice(1)} 🎨`
            );

            return true;

        }

    }


    const wantsAThemeChange =
        CIPHER_GENERIC_THEME_TRIGGERS.some(
            phrase => text.includes(phrase)
        );


    if (wantsAThemeChange) {

        openThemeMenu();

        showCipherToast(
            "Which color would you like? Pick one below 🎨"
        );

        return true;

    }


    return false;

}


window.CipherThemeCommand =
    handleCipherThemeCommand;



/* =====================================================
   SETTINGS
===================================================== */

const settingsModal =
    document.getElementById("settingsModal");


let cipherSettings = {

    displayName: "",

    compactMode: false,

    animations: true,

    textSize: "normal",

    onlineStatus: true

};


function openSettingsModal() {

    if (!settingsModal) return;

    settingsModal.classList.add("active");

    loadCipherSettings();

}


function closeSettingsModal() {

    if (!settingsModal) return;

    settingsModal.classList.remove("active");

}


const settingsTrigger =
    document.getElementById("settings-btn");

if (settingsTrigger) {

    settingsTrigger.addEventListener(
        "click",
        openSettingsModal
    );

}


const closeSettingsBtn =
    document.getElementById("closeSettings");

if (closeSettingsBtn) {

    closeSettingsBtn.addEventListener(
        "click",
        closeSettingsModal
    );

}


function applyCipherSettings() {

    document.body.classList.toggle(
        "compact-mode",
        cipherSettings.compactMode
    );


    document.body.classList.toggle(
        "no-animations",
        !cipherSettings.animations
    );


    document.body.dataset.textSize =
        cipherSettings.textSize;


    const nameToShow =
        cipherSettings.displayName
        || (window.Cipher && Cipher.user && Cipher.user.username)
        || "User";


    const userNameEl =
        document.getElementById("user-name");

    if (userNameEl) {

        userNameEl.textContent = nameToShow;

    }


    const userStatusEl =
        document.getElementById("user-status");

    if (userStatusEl) {

        userStatusEl.textContent =
            cipherSettings.onlineStatus
                ? "Online"
                : "Offline";

    }

}


async function loadCipherSettings() {

    const saved =
        loadLocalCipherSettings();

    cipherSettings = {

        ...cipherSettings,

        ...saved

    };


    const displayNameInput =
        document.getElementById("displayNameInput");

    if (displayNameInput) {

        displayNameInput.value =
            cipherSettings.displayName;

    }


    const compactModeToggle =
        document.getElementById("compactModeToggle");

    if (compactModeToggle) {

        compactModeToggle.checked =
            cipherSettings.compactMode;

    }


    const animationsToggle =
        document.getElementById("animationsToggle");

    if (animationsToggle) {

        animationsToggle.checked =
            cipherSettings.animations;

    }


    const textSizeSelect =
        document.getElementById("textSizeSelect");

    if (textSizeSelect) {

        textSizeSelect.value =
            cipherSettings.textSize;

    }


    const onlineStatusToggle =
        document.getElementById("onlineStatusToggle");

    if (onlineStatusToggle) {

        onlineStatusToggle.checked =
            cipherSettings.onlineStatus;

    }


    /*
     * Username/email come from the real account, not
     * localStorage -- fetch the current values so the
     * fields aren't stale or blank.
     */

    try {

        const response =
            await fetch("/me", { credentials: "same-origin" });

        const data =
            await response.json();


        if (data.logged_in) {

            const usernameInput =
                document.getElementById("usernameInput");

            if (usernameInput && !usernameInput.dataset.dirty) {

                usernameInput.value = data.username;

            }


            const emailDisplay =
                document.getElementById("settingsEmailDisplay");

            if (emailDisplay) {

                emailDisplay.textContent = data.email;

            }


            const usernameLabel =
                document.getElementById("settingsUsername");

            if (usernameLabel) {

                usernameLabel.textContent = data.username;

            }

        }

    } catch (error) {

        console.error("Unable to load account details:", error);

    }

}


function loadLocalCipherSettings() {

    try {

        const raw =
            localStorage.getItem("cipherSettings");

        return raw ? JSON.parse(raw) : {};

    } catch {

        return {};

    }

}


function saveLocalCipherSettings() {

    localStorage.setItem(
        "cipherSettings",
        JSON.stringify(cipherSettings)
    );

}


const usernameInputEl =
    document.getElementById("usernameInput");

if (usernameInputEl) {

    usernameInputEl.addEventListener(
        "input",
        () => {

            usernameInputEl.dataset.dirty = "true";

        }
    );

}


const saveSettingsBtn =
    document.getElementById("saveSettingsBtn");

if (saveSettingsBtn) {

    saveSettingsBtn.addEventListener(
        "click",
        async () => {

            const displayNameInput =
                document.getElementById("displayNameInput");

            const compactModeToggle =
                document.getElementById("compactModeToggle");

            const animationsToggle =
                document.getElementById("animationsToggle");

            const textSizeSelect =
                document.getElementById("textSizeSelect");

            const onlineStatusToggle =
                document.getElementById("onlineStatusToggle");


            cipherSettings = {

                displayName:
                    displayNameInput
                        ? displayNameInput.value.trim()
                        : cipherSettings.displayName,

                compactMode:
                    compactModeToggle
                        ? compactModeToggle.checked
                        : cipherSettings.compactMode,

                animations:
                    animationsToggle
                        ? animationsToggle.checked
                        : cipherSettings.animations,

                textSize:
                    textSizeSelect
                        ? textSizeSelect.value
                        : cipherSettings.textSize,

                onlineStatus:
                    onlineStatusToggle
                        ? onlineStatusToggle.checked
                        : cipherSettings.onlineStatus

            };


            saveLocalCipherSettings();

            applyCipherSettings();


            /*
             * Username is the one field backed by the
             * real account -- push it to the server if
             * it was actually changed.
             */

            if (
                usernameInputEl &&
                usernameInputEl.dataset.dirty === "true"
            ) {

                try {

                    const response =
                        await fetch("/api/profile", {

                            method: "POST",

                            credentials: "same-origin",

                            headers: {
                                "Content-Type": "application/json"
                            },

                            body: JSON.stringify({
                                username: usernameInputEl.value.trim()
                            })

                        });


                    const data =
                        await response.json();


                    if (!response.ok) {

                        showCipherToast(
                            data.error || "Unable to update username."
                        );

                        return;

                    }


                    usernameInputEl.dataset.dirty = "false";


                    const userNameEl =
                        document.getElementById("user-name");

                    if (
                        userNameEl &&
                        !cipherSettings.displayName
                    ) {

                        userNameEl.textContent = data.username;

                    }

                } catch (error) {

                    console.error(error);

                    showCipherToast("Unable to reach the server.");

                    return;

                }

            }


            showCipherToast("Settings saved");

            closeSettingsModal();

        }
    );

}


/*
 * Advanced settings shortcuts.
 */

const advancedReminderBtn =
    document.getElementById("advancedReminderBtn");

if (advancedReminderBtn) {

    advancedReminderBtn.addEventListener(
        "click",
        () => {

            closeSettingsModal();

            if (typeof openReminder === "function") {

                openReminder();

            }

        }
    );

}


const advancedMemoryBtn =
    document.getElementById("advancedMemoryBtn");

if (advancedMemoryBtn) {

    advancedMemoryBtn.addEventListener(
        "click",
        async () => {

            try {

                const response =
                    await fetch("/api/memory", { credentials: "same-origin" });

                const facts =
                    await response.json();


                if (!Array.isArray(facts) || facts.length === 0) {

                    alert("Cipher hasn't learned anything about you yet.");

                    return;

                }


                alert(
                    "What Cipher remembers about you:\n\n"
                    + facts.map(fact => `• ${fact.fact}`).join("\n")
                );

            } catch (error) {

                console.error(error);

                alert("Unable to load memory right now.");

            }

        }
    );

}


const advancedSignOutBtn =
    document.getElementById("advancedSignOutBtn");

if (advancedSignOutBtn) {

    advancedSignOutBtn.addEventListener(
        "click",
        () => {

            if (typeof doLogout === "function") {

                doLogout();

            }

        }
    );

}


/* =====================================================
   PROFILE PICTURE
   Stored as a data URL in localStorage -- this means it
   lives on this device/browser only, not synced to the
   account or visible to friends. A real cross-device
   version would need a backend upload endpoint and
   somewhere to store the file (out of scope for now).
===================================================== */

const profileUploadInput =
    document.getElementById("profileUpload");

if (profileUploadInput) {

    profileUploadInput.addEventListener(
        "change",
        function () {

            const file =
                this.files[0];

            this.value = "";

            if (!file) return;


            if (!file.type.startsWith("image/")) {

                showCipherToast("Please choose an image file.");

                return;

            }


            if (file.size > 3 * 1024 * 1024) {

                showCipherToast(
                    "That image is too large -- please use one under 3MB."
                );

                return;

            }


            const reader =
                new FileReader();


            reader.onload =
                function (event) {

                    const image =
                        event.target.result;


                    applyProfilePicture(image);


                    try {

                        localStorage.setItem(
                            "cipherProfilePicture",
                            image
                        );

                    } catch (error) {

                        console.error(error);

                        showCipherToast(
                            "That image couldn't be saved -- try a smaller one."
                        );

                    }

                };


            reader.readAsDataURL(file);

        }
    );

}


function applyProfilePicture(dataUrl) {

    const preview =
        document.getElementById("profilePreview");

    if (preview) {

        preview.src = dataUrl;

    }


    document
        .querySelectorAll(".profile-avatar")
        .forEach(element => {

            element.src = dataUrl;

        });


    const sidebarAvatar =
        document.getElementById("user-avatar");

    if (sidebarAvatar) {

        sidebarAvatar.style.backgroundImage =
            `url(${dataUrl})`;

        sidebarAvatar.style.backgroundSize = "cover";

        sidebarAvatar.style.backgroundPosition = "center";

        sidebarAvatar.textContent = "";

    }

}


function loadProfilePicture() {

    const saved =
        localStorage.getItem("cipherProfilePicture");

    if (saved) {

        applyProfilePicture(saved);

    }

}


/* =====================================================
   TOAST
===================================================== */

function showCipherToast(message) {

    let toast =
        document.getElementById("cipherToast");


    if (!toast) {

        toast =
            document.createElement("div");

        toast.id = "cipherToast";

        document.body.appendChild(toast);

    }


    toast.textContent = message;

    toast.style.display = "block";


    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {

        toast.style.display = "none";

    }, 2200);

}


/* =====================================================
   CIPHER INITIALIZATION
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
         * Load theme. A theme saved under the app's
         * older storage key is honored once, so existing
         * users don't lose their pick during the switch
         * to this engine.
         */

        const savedTheme =
            localStorage.getItem("cipherTheme")
            || localStorage.getItem("cipher-theme");


        const randomEnabled =
            localStorage.getItem("randomThemes") === "true";


        if (randomEnabled) {

            applyCipherTheme(
                pickRandomTheme(savedTheme)
            );

        } else {

            applyCipherTheme(
                savedTheme || "sunset"
            );

        }


        /* Random theme toggle state */

        if (randomThemes) {

            randomThemes.checked = randomEnabled;

        }

        if (randomThemeSettings) {

            randomThemeSettings.classList.toggle(
                "active",
                randomEnabled
            );

        }


        /* Cipher theme command permission */

        if (cipherThemeControl) {

            cipherThemeControl.checked =
                localStorage.getItem("cipherThemeControl") === "true";

        }


        /* Load settings + profile picture */

        loadCipherSettings();

        loadProfilePicture();

    }
);


/* =====================================================
   END OF CIPHER-UI.JS
===================================================== */
