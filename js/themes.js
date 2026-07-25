/* =========================================================
   CIPHER THEME SYSTEM
   Complete Theme & Appearance Controller
========================================================= */

"use strict";


/* =========================================================
   THEME CONFIGURATION
========================================================= */

const CipherThemeConfig = {

    storageKey: "cipher-theme",

    themes: {

        midnight: {
            name: "Midnight",
            icon: "🌙",
            preview: "midnight"
        },

        emerald: {
            name: "Emerald",
            icon: "💚",
            preview: "emerald"
        },

        cyber: {
            name: "Cyber",
            icon: "⚡",
            preview: "cyber"
        },

        amoled: {
            name: "AMOLED Black",
            icon: "⚫",
            preview: "amoled"
        },

        ocean: {
            name: "Ocean",
            icon: "🌊",
            preview: "ocean"
        },

        sunset: {
            name: "Sunset",
            icon: "🌅",
            preview: "sunset"
        },

        light: {
            name: "Light",
            icon: "☀️",
            preview: "light"
        }

    }

};


/* =========================================================
   THEME STATE
========================================================= */

const ThemeManager = {

    current: "midnight",

    initialized: false,

    menuCreated: false

};


/* =========================================================
   GET SYSTEM THEME
========================================================= */

function getSystemTheme() {

    if (
        window.matchMedia &&
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches
    ) {

        return "midnight";

    }

    return "light";

}


/* =========================================================
   GET SAVED THEME
========================================================= */

function getSavedTheme() {

    const saved =
        localStorage.getItem(
            CipherThemeConfig.storageKey
        );

    if (
        saved &&
        CipherThemeConfig.themes[saved]
    ) {

        return saved;

    }

    return null;

}


/* =========================================================
   APPLY THEME
========================================================= */

function applyTheme(themeName, save = true) {

    if (
        !CipherThemeConfig.themes[themeName]
    ) {

        themeName = "midnight";

    }


    /*
     * Smooth transition.
     */

    document.documentElement.classList.add(
        "theme-transition"
    );


    /*
     * Apply theme.
     */

    document.documentElement.setAttribute(
        "data-theme",
        themeName
    );


    ThemeManager.current =
        themeName;


    /*
     * Save user's selection.
     */

    if (save) {

        localStorage.setItem(

            CipherThemeConfig.storageKey,

            themeName

        );

    }


    updateThemeMenu();


    /*
     * Remove transition class
     * after the animation.
     */

    window.setTimeout(() => {

        document.documentElement.classList.remove(
            "theme-transition"
        );

    }, 350);

}


/* =========================================================
   CHANGE THEME
========================================================= */

function changeTheme(themeName) {

    applyTheme(
        themeName,
        true
    );

}


/* =========================================================
   RESET TO SYSTEM THEME
========================================================= */

function resetToSystemTheme() {

    localStorage.removeItem(
        CipherThemeConfig.storageKey
    );

    applyTheme(
        getSystemTheme(),
        false
    );

}


/* =========================================================
   CURRENT THEME
========================================================= */

function getCurrentTheme() {

    return ThemeManager.current;

}


/* =========================================================
   CREATE THEME MENU
========================================================= */

function createThemeMenu() {

    /*
     * Don't create duplicate menus.
     */

    if (
        document.getElementById(
            "cipher-theme-menu"
        )
    ) {

        ThemeManager.menuCreated = true;

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


    /*
     * Create every theme option.
     */

    Object.entries(
        CipherThemeConfig.themes
    ).forEach(
        ([key, theme]) => {

            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "theme-option";

            button.dataset.theme =
                key;

            button.setAttribute(
                "role",
                "menuitemradio"
            );


            button.innerHTML = `

                <span
                    class="theme-preview ${theme.preview}"
                    aria-hidden="true">
                </span>

                <span
                    class="theme-option-icon"
                    aria-hidden="true">
                    ${theme.icon}
                </span>

                <span
                    class="theme-option-name">
                    ${theme.name}
                </span>

                <span
                    class="theme-option-check"
                    aria-hidden="true">
                    ✓
                </span>

            `;


            button.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    changeTheme(key);

                    closeThemeMenu();

                }
            );


            menu.appendChild(
                button
            );

        }
    );


    document.body.appendChild(
        menu
    );

    ThemeManager.menuCreated = true;

    updateThemeMenu();

}


/* =========================================================
   UPDATE ACTIVE THEME
========================================================= */

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
        .forEach(
            option => {

                const isActive =
                    option.dataset.theme ===
                    ThemeManager.current;


                option.classList.toggle(
                    "active",
                    isActive
                );


                option.setAttribute(
                    "aria-checked",
                    isActive
                        ? "true"
                        : "false"
                );

            }
        );

}


/* =========================================================
   POSITION THEME MENU
========================================================= */

function positionThemeMenu(anchor) {

    const menu =
        document.getElementById(
            "cipher-theme-menu"
        );

    if (!menu) return;


    if (!anchor) {

        menu.style.top = "";
        menu.style.right = "";

        return;

    }


    const rect =
        anchor.getBoundingClientRect();


    const menuWidth =
        Math.min(
            210,
            window.innerWidth - 20
        );


    let right =
        window.innerWidth -
        rect.right;


    /*
     * Keep menu inside screen.
     */

    right =
        Math.max(
            10,
            Math.min(
                right,
                window.innerWidth -
                menuWidth -
                10
            )
        );


    menu.style.right =
        `${right}px`;

    menu.style.top =
        `${rect.bottom + 8}px`;

}


/* =========================================================
   OPEN THEME MENU
========================================================= */

function openThemeMenu(anchor = null) {

    createThemeMenu();

    const menu =
        document.getElementById(
            "cipher-theme-menu"
        );

    if (!menu) return;


    positionThemeMenu(
        anchor
    );


    menu.classList.add(
        "open"
    );


    updateThemeMenu();

}


/* =========================================================
   CLOSE THEME MENU
========================================================= */

function closeThemeMenu() {

    const menu =
        document.getElementById(
            "cipher-theme-menu"
        );

    if (!menu) return;


    menu.classList.remove(
        "open"
    );

}


/* =========================================================
   TOGGLE THEME MENU
========================================================= */

function toggleThemeMenu(anchor = null) {

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

        openThemeMenu(
            anchor
        );

    }

}


/* =========================================================
   THEME TRIGGER
========================================================= */

function setupThemeTriggers() {

    const triggers =
        document.querySelectorAll(
            "[data-theme-trigger]"
        );


    triggers.forEach(
        trigger => {

            trigger.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    toggleThemeMenu(
                        trigger
                    );

                }
            );

        }
    );

}


/* =========================================================
   CLOSE MENU WHEN CLICKING OUTSIDE
========================================================= */

function setupOutsideClick() {

    document.addEventListener(
        "click",
        event => {

            const menu =
                document.getElementById(
                    "cipher-theme-menu"
                );

            if (!menu) return;


            const insideMenu =
                menu.contains(
                    event.target
                );


            const trigger =
                event.target.closest(
                    "[data-theme-trigger]"
                );


            if (
                !insideMenu &&
                !trigger
            ) {

                closeThemeMenu();

            }

        }
    );

}


/* =========================================================
   CLOSE MENU WITH ESCAPE
========================================================= */

function setupEscapeKey() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeThemeMenu();

            }

        }
    );

}


/* =========================================================
   SYSTEM THEME DETECTION
========================================================= */

function setupSystemThemeListener() {

    if (!window.matchMedia) return;


    const mediaQuery =
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        );


    const handleChange =
        event => {

            /*
             * Only follow the system if
             * the user hasn't selected
             * a theme manually.
             */

            const saved =
                getSavedTheme();


            if (saved) return;


            applyTheme(
                event.matches
                    ? "midnight"
                    : "light",
                false
            );

        };


    /*
     * Modern browsers.
     */

    if (
        mediaQuery.addEventListener
    ) {

        mediaQuery.addEventListener(
            "change",
            handleChange
        );

    }


    /*
     * Older browser support.
     */

    else if (
        mediaQuery.addListener
    ) {

        mediaQuery.addListener(
            handleChange
        );

    }

}


/* =========================================================
   APPEARANCE SETTINGS
========================================================= */

const AppearanceManager = {

    storageKey:
        "cipher-appearance",

    defaults: {

        accent: "teal",

        density: "comfortable",

        fontSize: "medium",

        messageStyle: "rounded",

        background: "standard"

    }

};


/* =========================================================
   LOAD APPEARANCE
========================================================= */

function loadAppearanceSettings() {

    const saved =
        localStorage.getItem(
            AppearanceManager.storageKey
        );


    if (!saved) {

        return {
            ...AppearanceManager.defaults
        };

    }


    try {

        const parsed =
            JSON.parse(saved);


        return {

            ...AppearanceManager.defaults,

            ...parsed

        };

    }

    catch (error) {

        console.warn(
            "Cipher appearance settings could not be loaded.",
            error
        );


        return {
            ...AppearanceManager.defaults
        };

    }

}


/* =========================================================
   SAVE APPEARANCE
========================================================= */

function saveAppearanceSettings(
    settings
) {

    localStorage.setItem(

        AppearanceManager.storageKey,

        JSON.stringify(settings)

    );

}


/* =========================================================
   APPLY APPEARANCE
========================================================= */

function applyAppearanceSettings(
    settings
) {

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


/* =========================================================
   CHANGE APPEARANCE OPTION
========================================================= */

function setAppearanceOption(
    option,
    value
) {

    const allowed = {

        accent: [
            "teal",
            "green",
            "blue",
            "purple",
            "orange"
        ],

        density: [
            "compact",
            "comfortable",
            "spacious"
        ],

        fontSize: [
            "small",
            "medium",
            "large"
        ],

        messageStyle: [
            "rounded",
            "soft",
            "square"
        ],

        background: [
            "standard",
            "soft",
            "deep"
        ]

    };


    if (
        !allowed[option] ||
        !allowed[option].includes(value)
    ) {

        console.warn(
            `Invalid Cipher appearance option: ${option} = ${value}`
        );

        return;

    }


    const settings =
        loadAppearanceSettings();


    settings[option] =
        value;


    saveAppearanceSettings(
        settings
    );


    applyAppearanceSettings(
        settings
    );

}


/* =========================================================
   RESET APPEARANCE
========================================================= */

function resetAppearanceSettings() {

    const defaults = {

        ...AppearanceManager.defaults

    };


    saveAppearanceSettings(
        defaults
    );


    applyAppearanceSettings(
        defaults
    );

}


/* =========================================================
   INITIALIZE APPEARANCE
========================================================= */

function initializeAppearance() {

    const settings =
        loadAppearanceSettings();


    applyAppearanceSettings(
        settings
    );

}


/* =========================================================
   INITIALIZE THEME
========================================================= */

function initializeTheme() {

    if (
        ThemeManager.initialized
    ) {

        return;

    }


    ThemeManager.initialized =
        true;


    const savedTheme =
        getSavedTheme();


    /*
     * Saved theme gets priority.
     */

    if (savedTheme) {

        applyTheme(
            savedTheme,
            false
        );

    }

    else {

        /*
         * New users follow their
         * phone/computer preference.
         */

        applyTheme(
            getSystemTheme(),
            false
        );

    }


    initializeAppearance();

    createThemeMenu();

    setupThemeTriggers();

    setupOutsideClick();

    setupEscapeKey();

    setupSystemThemeListener();

}


/* =========================================================
   WINDOW RESIZE
========================================================= */

window.addEventListener(
    "resize",
    () => {

        const menu =
            document.getElementById(
                "cipher-theme-menu"
            );


        if (
            !menu ||
            !menu.classList.contains("open")
        ) {

            return;

        }


        const trigger =
            document.querySelector(
                "[data-theme-trigger]"
            );


        positionThemeMenu(
            trigger
        );

    }
);


/* =========================================================
   PUBLIC CIPHER THEME API
========================================================= */

window.CipherThemes = {

    change: changeTheme,

    apply: applyTheme,

    current: getCurrentTheme,

    available:
        CipherThemeConfig.themes,

    openMenu:
        openThemeMenu,

    closeMenu:
        closeThemeMenu,

    toggleMenu:
        toggleThemeMenu,

    resetToSystem:
        resetToSystemTheme

};


window.CipherAppearance = {

    get:
        loadAppearanceSettings,

    set:
        setAppearanceOption,

    reset:
        resetAppearanceSettings

};


/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeTheme
    );

}
else {

    initializeTheme();

}


/* =========================================================
   END OF THEMES.JS
========================================================= */