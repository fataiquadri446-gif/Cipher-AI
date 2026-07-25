
/* ==========================================
   CIPHER THEME SYSTEM
   Created by Fatai Quadri
========================================== */

"use strict";


/* ==========================================
   THEME STATE
========================================== */

const ThemeManager = {

    current: "dark",

    initialized: false,

    storageKey: "cipher-theme"

};


/* ==========================================
   AVAILABLE THEMES
========================================== */

const CipherThemes = {

    dark: {
        name: "Dark",
        icon: "🌙"
    },

    light: {
        name: "Light",
        icon: "☀️"
    },

    amoled: {
        name: "AMOLED",
        icon: "⚫"
    },

    ocean: {
        name: "Ocean",
        icon: "🌊"
    },

    emerald: {
        name: "Emerald",
        icon: "💚"
    }

};


/* ==========================================
   APPLY THEME
========================================== */

function applyTheme(themeName) {

    if (!CipherThemes[themeName]) {

        themeName = "dark";

    }

    ThemeManager.current = themeName;

    document.documentElement
        .setAttribute(
            "data-theme",
            themeName
        );

    localStorage.setItem(

        ThemeManager.storageKey,

        themeName

    );

    updateThemeMeta();

}


/* ==========================================
   LOAD SAVED THEME
========================================== */

function loadSavedTheme() {

    const savedTheme =

        localStorage.getItem(
            ThemeManager.storageKey
        );

    if (
        savedTheme &&
        CipherThemes[savedTheme]
    ) {

        applyTheme(savedTheme);

    }
    else {

        applyTheme("dark");

    }

}


/* ==========================================
   CHANGE THEME
========================================== */

function changeTheme(themeName) {

    applyTheme(themeName);

}


/* ==========================================
   GET CURRENT THEME
========================================== */

function getCurrentTheme() {

    return ThemeManager.current;

}


/* ==========================================
   UPDATE THEME META
========================================== */

function updateThemeMeta() {

    const theme =
        CipherThemes[
            ThemeManager.current
        ];

    if (!theme) return;

    document.title =
        `Cipher — ${theme.name}`;

}


/* ==========================================
   INITIALIZE THEME SYSTEM
========================================== */

function initializeThemes() {

    if (ThemeManager.initialized) {

        return;

    }

    ThemeManager.initialized = true;

    loadSavedTheme();

}


/* ==========================================
   START AFTER PAGE LOAD
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeThemes();

    }
);


/* ==========================================
   EXPOSE THEME MANAGER
========================================== */

window.CipherThemes = {

    change: changeTheme,

    current: getCurrentTheme,

    available: CipherThemes

};


/* ==========================================
   CIPHER THEME SWITCHER
========================================== */


/* ==========================================
   CREATE THEME MENU
========================================== */

function createThemeMenu() {

    // Don't create it twice.
    if (
        document.getElementById(
            "cipher-theme-menu"
        )
    ) {
        return;
    }

    const menu =
        document.createElement("div");

    menu.id =
        "cipher-theme-menu";

    menu.className =
        "cipher-theme-menu";

    menu.setAttribute(
        "role",
        "menu"
    );

    Object.entries(CipherThemes)
        .forEach(([key, theme]) => {

            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "theme-option";

            button.dataset.theme =
                key;

            button.setAttribute(
                "role",
                "menuitem"
            );

            button.innerHTML = `

                <span class="theme-option-icon">
                    ${theme.icon}
                </span>

                <span class="theme-option-name">
                    ${escapeHTML(theme.name)}
                </span>

                <span class="theme-option-check">
                    ✓
                </span>

            `;

            button.addEventListener(
                "click",
                () => {

                    changeTheme(key);

                    updateThemeMenu();

                    closeThemeMenu();

                }
            );

            menu.appendChild(button);

        });

    document.body.appendChild(menu);

    updateThemeMenu();

}


/* ==========================================
   UPDATE ACTIVE THEME
========================================== */

function updateThemeMenu() {

    const menu =
        document.getElementById(
            "cipher-theme-menu"
        );

    if (!menu) return;

    menu
        .querySelectorAll(
            ".theme-option"
        )
        .forEach(option => {

            const active =
                option.dataset.theme ===
                ThemeManager.current;

            option.classList.toggle(
                "active",
                active
            );

            option.setAttribute(
                "aria-checked",
                active
            );

        });

}


/* ==========================================
   OPEN THEME MENU
========================================== */

function openThemeMenu(anchor) {

    createThemeMenu();

    const menu =
        document.getElementById(
            "cipher-theme-menu"
        );

    if (!menu) return;

    menu.classList.add("open");

    if (anchor) {

        const rect =
            anchor.getBoundingClientRect();

        menu.style.position = "fixed";

        menu.style.top =
            `${rect.bottom + 8}px`;

        menu.style.right =
            `${Math.max(
                8,
                window.innerWidth - rect.right
            )}px`;

    }

    updateThemeMenu();

}


/* ==========================================
   CLOSE THEME MENU
========================================== */

function closeThemeMenu() {

    const menu =
        document.getElementById(
            "cipher-theme-menu"
        );

    if (!menu) return;

    menu.classList.remove("open");

}


/* ==========================================
   TOGGLE THEME MENU
========================================== */

function toggleThemeMenu(anchor) {

    const menu =
        document.getElementById(
            "cipher-theme-menu"
        );

    if (
        menu &&
        menu.classList.contains("open")
    ) {

        closeThemeMenu();

    }
    else {

        openThemeMenu(anchor);

    }

}


/* ==========================================
   CLOSE WHEN CLICKING OUTSIDE
========================================== */

document.addEventListener(
    "click",
    event => {

        const menu =
            document.getElementById(
                "cipher-theme-menu"
            );

        if (!menu) return;

        const clickedThemeButton =
            event.target.closest(
                ".theme-option"
            );

        const clickedThemeTrigger =
            event.target.closest(
                "[data-theme-trigger]"
            );

        if (
            !clickedThemeButton &&
            !clickedThemeTrigger &&
            !menu.contains(event.target)
        ) {

            closeThemeMenu();

        }

    }
);


/* ==========================================
   UPDATE MENU WHEN THEME CHANGES
========================================== */

const originalApplyTheme =
    applyTheme;

applyTheme = function(themeName) {

    originalApplyTheme(themeName);

    updateThemeMenu();

};


/* ==========================================
   EXPOSE THEME MENU
========================================== */

window.CipherThemeMenu = {

    open: openThemeMenu,

    close: closeThemeMenu,

    toggle: toggleThemeMenu

};


/* ==========================================
   SYSTEM THEME DETECTION
========================================== */

const SystemTheme = {

    mediaQuery: window.matchMedia(
        "(prefers-color-scheme: dark)"
    ),

    listenerAttached: false

};


/* ==========================================
   GET SYSTEM THEME
========================================== */

function getSystemTheme() {

    return SystemTheme.mediaQuery.matches
        ? "dark"
        : "light";

}


/* ==========================================
   CHECK IF USER HAS SAVED A THEME
========================================== */

function hasSavedTheme() {

    return Boolean(
        localStorage.getItem(
            ThemeManager.storageKey
        )
    );

}


/* ==========================================
   APPLY INITIAL THEME
========================================== */

function applyInitialTheme() {

    const savedTheme =
        localStorage.getItem(
            ThemeManager.storageKey
        );


    /*
     * If the user already selected
     * a theme, use it.
     */

    if (
        savedTheme &&
        CipherThemes[savedTheme]
    ) {

        applyTheme(savedTheme);

        return;

    }


    /*
     * Otherwise follow the device
     * system preference.
     */

    const systemTheme =
        getSystemTheme();

    applyTheme(systemTheme);

}


/* ==========================================
   SYSTEM THEME CHANGE
========================================== */

function handleSystemThemeChange(event) {

    /*
     * Don't override a theme that
     * the user manually selected.
     */

    if (hasSavedTheme()) {

        return;

    }

    const newTheme =
        event.matches
            ? "dark"
            : "light";

    applyTheme(newTheme);

}


/* ==========================================
   WATCH SYSTEM THEME
========================================== */

function watchSystemTheme() {

    if (
        SystemTheme.listenerAttached
    ) {

        return;

    }

    if (
        SystemTheme.mediaQuery &&
        SystemTheme.mediaQuery.addEventListener
    ) {

        SystemTheme.mediaQuery.addEventListener(
            "change",
            handleSystemThemeChange
        );

        SystemTheme.listenerAttached = true;

    }

}


/* ==========================================
   RESET TO SYSTEM THEME
========================================== */

function resetToSystemTheme() {

    localStorage.removeItem(
        ThemeManager.storageKey
    );

    applyTheme(
        getSystemTheme()
    );

    updateThemeMenu();

}


/* ==========================================
   INITIALIZE SYSTEM THEME
========================================== */

function initializeSystemTheme() {

    applyInitialTheme();

    watchSystemTheme();

}


/* ==========================================
   EXPOSE SYSTEM THEME CONTROLS
========================================== */

window.CipherSystemTheme = {

    current: getSystemTheme,

    reset: resetToSystemTheme

};


/* ==========================================
   CIPHER CUSTOM APPEARANCE SETTINGS
========================================== */

const AppearanceSettings = {

    storageKey: "cipher-appearance",

    defaults: {

        accent: "teal",

        density: "comfortable",

        fontSize: "medium",

        messageStyle: "rounded",

        background: "standard"

    }

};


/* ==========================================
   LOAD APPEARANCE SETTINGS
========================================== */

function loadAppearanceSettings() {

    const saved =
        localStorage.getItem(
            AppearanceSettings.storageKey
        );

    if (!saved) {

        return {
            ...AppearanceSettings.defaults
        };

    }

    try {

        const parsed =
            JSON.parse(saved);

        return {

            ...AppearanceSettings.defaults,

            ...parsed

        };

    }

    catch (error) {

        console.warn(
            "Cipher appearance settings could not be loaded.",
            error
        );

        return {
            ...AppearanceSettings.defaults
        };

    }

}


/* ==========================================
   SAVE APPEARANCE SETTINGS
========================================== */

function saveAppearanceSettings(settings) {

    localStorage.setItem(

        AppearanceSettings.storageKey,

        JSON.stringify(settings)

    );

}


/* ==========================================
   SET APPEARANCE OPTION
========================================== */

function setAppearanceOption(
    option,
    value
) {

    const settings =
        loadAppearanceSettings();

    if (
        !Object.prototype.hasOwnProperty.call(
            AppearanceSettings.defaults,
            option
        )
    ) {

        console.warn(
            `Unknown appearance option: ${option}`
        );

        return;

    }

    settings[option] = value;

    saveAppearanceSettings(settings);

    applyAppearanceSettings(settings);

}


/* ==========================================
   APPLY APPEARANCE
========================================== */

function applyAppearanceSettings(settings) {

    const root =
        document.documentElement;

    root.dataset.accent =
        settings.accent;

    root.dataset.density =
        settings.density;

    root.dataset.fontSize =
        settings.fontSize;

    root.dataset.messageStyle =
        settings.messageStyle;

    root.dataset.background =
        settings.background;

}


/* ==========================================
   RESET APPEARANCE
========================================== */

function resetAppearanceSettings() {

    const defaults = {

        ...AppearanceSettings.defaults

    };

    saveAppearanceSettings(defaults);

    applyAppearanceSettings(defaults);

}


/* ==========================================
   INITIALIZE APPEARANCE
========================================== */

function initializeAppearanceSettings() {

    const settings =
        loadAppearanceSettings();

    applyAppearanceSettings(settings);

}


/* ==========================================
   EXPOSE APPEARANCE CONTROLS
========================================== */

window.CipherAppearance = {

    get: loadAppearanceSettings,

    set: setAppearanceOption,

    reset: resetAppearanceSettings

};


/* ==========================================
   FINAL THEME INITIALIZATION
========================================== */

function finalizeThemeSystem() {

    initializeThemes();

    initializeSystemTheme();

    initializeAppearanceSettings();

    updateThemeMenu();

}


/* ==========================================
   THEME TRANSITION
========================================== */

function enableThemeTransition() {

    document.documentElement.classList.add(
        "theme-transition"
    );

    setTimeout(() => {

        document.documentElement.classList.remove(
            "theme-transition"
        );

    }, 350);

}


/* ==========================================
   SMOOTH THEME CHANGE
========================================== */

const originalChangeTheme =
    changeTheme;

changeTheme = function(themeName) {

    enableThemeTransition();

    originalChangeTheme(themeName);

    updateThemeMenu();

};


/* ==========================================
   KEYBOARD SHORTCUT
========================================== */

document.addEventListener(
    "keydown",
    event => {

        /*
         * Ctrl + Shift + T
         * opens Cipher's theme menu.
         */

        if (
            event.ctrlKey &&
            event.shiftKey &&
            event.key.toLowerCase() === "t"
        ) {

            event.preventDefault();

            const trigger =
                document.querySelector(
                    "[data-theme-trigger]"
                );

            toggleThemeMenu(trigger);

        }

    }
);


/* ==========================================
   FINAL STARTUP
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        finalizeThemeSystem();

    }
);


/* ==========================================
   EXPOSE THEME SYSTEM
========================================== */

window.CipherThemeSystem = {

    apply: applyTheme,

    change: changeTheme,

    current: getCurrentTheme,

    resetToSystem:
        resetToSystemTheme,

    appearance:
        window.CipherAppearance

};
