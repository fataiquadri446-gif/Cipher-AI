/* =========================================
   CIPHER CHAT SYSTEM
========================================= */


/* =========================================
   STATE
========================================= */

let currentUser = null;

let friends = [];

let activeFriend = null;

let myCode = null;

let myCodeExpiresAt = null;


/* =========================================
   ELEMENTS
========================================= */

const friendModal =
    document.getElementById("friendModal");

const profileModal =
    document.getElementById("profileModal");

const conversation =
    document.getElementById("conversation");

const friendsPage =
    document.getElementById("friendsPage");

const chatPage =
    document.getElementById("chatPage");

const friendCodeInput =
    document.getElementById("friendCodeInput");

const codeError =
    document.getElementById("codeError");

const friendsList =
    document.getElementById("friendsList");

const chatList =
    document.getElementById("chatList");


/* =========================================
   FETCH HELPER
   Every request includes the session cookie
   (credentials: "same-origin") since these
   routes are all @login_required on the
   backend.
========================================= */

async function api(path, options = {}) {

    const response = await fetch(path, {

        credentials: "same-origin",

        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },

        ...options

    });


    let data = null;

    try {

        data = await response.json();

    } catch {

        data = null;

    }


    if (!response.ok) {

        const message =
            (data && (data.error || data.message))
            || `Request failed (${response.status})`;

        throw new Error(message);

    }


    return data;

}


/* =========================================
   MODAL FUNCTIONS
========================================= */

function openFriendModal() {

    friendModal.classList.add("show");

    friendCodeInput.focus();

    loadMyCode();

}


function closeFriendModal() {

    friendModal.classList.remove("show");

    friendCodeInput.value = "";

    codeError.textContent = "";

}


/* =========================================
   ADD FRIEND BUTTONS
========================================= */

document
    .getElementById("addFriendBtn")
    .onclick = openFriendModal;


document
    .getElementById("friendsAddBtn")
    .onclick = openFriendModal;


document
    .getElementById("emptyAddFriend")
    .onclick = openFriendModal;


document
    .getElementById("friendEmptyBtn")
    .onclick = openFriendModal;


document
    .getElementById("closeFriendModal")
    .onclick = closeFriendModal;


/* =========================================
   PROFILE
========================================= */

document
    .getElementById("profileBtn")
    .onclick = () => {

        profileModal.classList.add("show");

        loadProfile();

    };


document
    .getElementById("closeProfile")
    .onclick = () => {

        profileModal.classList.remove("show");

    };


async function loadProfile() {

    if (!currentUser) {

        await loadMe();

    }


    if (currentUser) {

        document.getElementById(
            "profileName"
        ).textContent =
            currentUser.username;

        document.querySelector(
            "#profileModal .username"
        ).textContent =
            `@${currentUser.username}`;

    }


    await loadMyCode();

    document.querySelector(
        "#profileModal .profile-code strong"
    ).textContent =
        myCode || "—";

}


/* =========================================
   CURRENT USER
========================================= */

async function loadMe() {

    try {

        const data = await api("/me");

        if (data && data.logged_in) {

            currentUser = data;

        }

    } catch (error) {

        console.error(error);

    }

}


/* =========================================
   MY FRIEND CODE
   Codes expire after 10 minutes on the
   backend, so we generate a fresh one each
   time it's needed rather than reusing a
   stale one.
========================================= */

async function loadMyCode() {

    const label =
        document.getElementById(
            "myFriendCode"
        );


    if (label) {

        label.textContent = "Generating…";

    }


    try {

        const data = await api(
            "/api/friends/code/generate",
            { method: "POST" }
        );

        myCode = data.code;

        myCodeExpiresAt = data.expires_at;

        if (label) {

            label.textContent = myCode;

        }

    } catch (error) {

        console.error(error);

        if (label) {

            label.textContent =
                "Unable to generate a code";

        }

    }

}


/* =========================================
   FRIEND CODE FORMAT
========================================= */

function normaliseCode(code) {

    return code
        .trim()
        .toUpperCase();

}


/* =========================================
   ADD FRIEND
========================================= */

document
    .getElementById("sendFriendRequest")
    .onclick = async () => {

        const code =
            normaliseCode(friendCodeInput.value);


        codeError.textContent = "";


        if (!code) {

            codeError.textContent =
                "Enter a Cipher friend code.";

            return;
        }


        if (!/^CPH-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(code)) {

            codeError.textContent =
                "Invalid Cipher code format.";

            return;
        }


        if (myCode && code === myCode) {

            codeError.textContent =
                "You cannot add yourself.";

            return;
        }


        try {

            const data = await api(
                "/api/friends/code/redeem",
                {
                    method: "POST",

                    body: JSON.stringify({
                        code: code
                    })
                }
            );


            closeFriendModal();

            await loadFriends();

            alert(
                data.friend_username
                    ? `You're now friends with ${data.friend_username}!`
                    : "Friend added successfully!"
            );


        } catch (error) {

            codeError.textContent =
                error.message
                || "Unable to add this friend.";

        }

    };


/* =========================================
   LOAD FRIENDS
========================================= */

async function loadFriends() {

    try {

        const data = await api("/api/friends");

        friends = Array.isArray(data) ? data : [];

    } catch (error) {

        console.error(error);

        friends = [];

    }


    renderFriends();

    renderChatList();

}


/* =========================================
   RENDER FRIENDS PAGE
========================================= */

function renderFriends() {

    if (friends.length === 0) {

        friendsList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    👥
                </div>

                <h3>No friends yet</h3>

                <p>
                    Add someone using their
                    private Cipher code.
                </p>

                <button
                    class="primary-btn"
                    onclick="openFriendModal()"
                >
                    Add a Friend
                </button>

            </div>

        `;

        return;
    }


    friendsList.innerHTML = "";


    friends.forEach(friend => {

        const item =
            document.createElement("div");

        item.className = "friend-item";


        item.innerHTML = `

            <div class="avatar">
                ${friend.username
                    ? friend.username[0].toUpperCase()
                    : "C"}
            </div>

            <div class="friend-info">

                <strong>
                    ${escapeHTML(friend.username)}
                </strong>

                <small>
                    Cipher friend
                </small>

            </div>

            <span>
                ›
            </span>

        `;


        item.onclick = () =>
            openConversation(friend);


        friendsList.appendChild(item);

    });

}


/* =========================================
   RENDER CHATS PAGE
   Cipher has no separate "conversation
   preview" concept on the backend, so the
   Chats tab lists the same friends as the
   Friends tab -- tapping one opens (or
   continues) that DM thread.
========================================= */

function renderChatList() {

    const emptyChats =
        document.getElementById("emptyChats");


    if (friends.length === 0) {

        if (emptyChats) {

            emptyChats.style.display = "flex";

        }

        return;
    }


    if (emptyChats) {

        emptyChats.style.display = "none";

    }


    document
        .querySelectorAll(".chat-item")
        .forEach(item => item.remove());


    friends.forEach(friend => {

        const item =
            document.createElement("div");

        item.className = "friend-item chat-item";


        item.innerHTML = `

            <div class="avatar">
                ${friend.username
                    ? friend.username[0].toUpperCase()
                    : "C"}
            </div>

            <div class="friend-info">

                <strong>
                    ${escapeHTML(friend.username)}
                </strong>

                <small>
                    Tap to open chat
                </small>

            </div>

            <span>
                ›
            </span>

        `;


        item.onclick = () =>
            openConversation(friend);


        chatList.appendChild(item);

    });

}


/* =========================================
   OPEN CONVERSATION
========================================= */

async function openConversation(friend) {

    activeFriend = friend;

    conversation.classList.remove("hidden");

    document
        .getElementById("conversationName")
        .textContent = friend.username;


    const avatar =
        document.querySelector(
            "#conversation .avatar"
        );

    if (avatar) {

        avatar.textContent =
            friend.username
                ? friend.username[0].toUpperCase()
                : "C";

    }


    await loadMessages(friend.id);

}


/* =========================================
   CLOSE CONVERSATION
========================================= */

document
    .getElementById("closeConversation")
    .onclick = () => {

        conversation.classList.add(
            "hidden"
        );

        activeFriend = null;

    };


/* =========================================
   LOAD MESSAGES
========================================= */

async function loadMessages(friendId) {

    const messages =
        document.getElementById("messages");


    try {

        const data =
            await api(`/api/messages/${friendId}`);


        renderMessages(
            Array.isArray(data) ? data : []
        );


    } catch (error) {

        console.error(error);

        messages.innerHTML = `

            <div class="conversation-empty">

                <div class="empty-icon">
                    ⚠
                </div>

                <h3>
                    Unable to load messages
                </h3>

                <p>
                    ${escapeHTML(error.message || "")}
                </p>

            </div>

        `;

    }

}


/* =========================================
   RENDER MESSAGES
========================================= */

/* =========================================
   CODE CARDS
   Mirrors the code-card system in the main
   Cipher chat, so forwarded code (or any code
   pasted into a DM) shows as a tappable card
   here too, instead of a giant text bubble.
========================================= */

const DmCodeBlocks = new Map();

let dmCodeBlockCounter = 0;


const DM_CODE_EXTENSIONS = {

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


function dmExtensionForLanguage(lang) {

    return DM_CODE_EXTENSIONS[(lang || "").toLowerCase()] || "txt";

}


function renderMessageContent(text) {

    if (!/```/.test(text)) {

        return escapeHTML(text).replace(/\n/g, "<br>");

    }


    const placeholders = [];


    const withoutCode = text.replace(

        /```(\w+)?\n?([\s\S]*?)```/g,

        (match, lang, code) => {

            const id =
                `dm-code-${Date.now()}-${dmCodeBlockCounter++}`;

            DmCodeBlocks.set(id, {

                code: code.trim(),

                lang: (lang || "text").toLowerCase()

            });


            const token = `@@DMCODE_${id}@@`;

            placeholders.push({ token, id });

            return token;

        }

    );


    let html =
        escapeHTML(withoutCode).replace(/\n/g, "<br>");


    placeholders.forEach(({ token, id }) => {

        const block = DmCodeBlocks.get(id);

        const label = (block.lang || "code").toUpperCase();


        html = html.replace(
            token,
            `
            <div class="code-card" data-code-id="${id}" role="button" tabindex="0">
                <div class="code-card-icon">&lt;/&gt;</div>
                <div class="code-card-info">
                    <strong>Code</strong>
                    <small>Code · ${escapeHTML(label)}</small>
                </div>
            </div>
            `
        );

    });


    return html;

}


function openDmCodeModal(id) {

    const block = DmCodeBlocks.get(id);

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

                        <button type="button" id="code-viewer-copy">Copy</button>

                        <button type="button" id="code-viewer-download">Download</button>

                        <button type="button" id="code-viewer-close">×</button>

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

            alert("Unable to copy.");

        }

    };


    const downloadButton =
        document.getElementById("code-viewer-download");

    downloadButton.onclick = () => {

        const ext = dmExtensionForLanguage(block.lang);

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


document.addEventListener("click", event => {

    const card = event.target.closest(".code-card");

    if (card) {

        openDmCodeModal(card.dataset.codeId);

    }

});


/* =========================================
   RENDER MESSAGES
========================================= */

function renderMessages(conversationMessages) {

    const messages =
        document.getElementById("messages");


    if (conversationMessages.length === 0) {

        messages.innerHTML = `

            <div class="conversation-empty">

                <div class="empty-icon">
                    🔐
                </div>

                <h3>
                    Private conversation
                </h3>

                <p>
                    Your conversation starts here.
                </p>

            </div>

        `;

        return;
    }


    messages.innerHTML = "";


    conversationMessages.forEach(message => {

        const bubble =
            document.createElement("div");

        bubble.className =
            "message " +
            (
                currentUser &&
                String(message.sender_id) ===
                String(currentUser.id)
                    ? "sent"
                    : "received"
            );


        if (
            typeof message.content === "string" &&
            message.content.startsWith("data:image")
        ) {

            const image =
                document.createElement("img");

            image.className = "dm-image";

            image.src = message.content;

            image.alt = "Shared image";

            bubble.appendChild(image);

        } else {

            bubble.innerHTML =
                renderMessageContent(message.content);

        }


        messages.appendChild(bubble);

    });


    messages.scrollTop =
        messages.scrollHeight;

}


/* =========================================
   SEND MESSAGE
========================================= */

document
    .getElementById("sendMessage")
    .onclick = sendMessage;


document
    .getElementById("messageInput")
    .addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                sendMessage();

            }

        }
    );


/* =========================================
   ATTACHMENT (IMAGES)
   Selecting an image sends it immediately as
   its own message -- DMs are text-only on the
   backend, so an image is sent as a data URL
   string stored in the same content column.
========================================= */

const dmAttachmentBtn =
    document.getElementById("dmAttachmentBtn");

const dmFileInput =
    document.getElementById("dmFileInput");


if (dmAttachmentBtn && dmFileInput) {

    dmAttachmentBtn.onclick = () => {

        if (!activeFriend) {

            alert("Open a conversation first.");

            return;

        }

        dmFileInput.click();

    };


    dmFileInput.addEventListener(
        "change",
        async event => {

            const file =
                event.target.files &&
                event.target.files[0];

            event.target.value = "";

            if (!file || !activeFriend) return;


            if (!file.type.startsWith("image/")) {

                alert(
                    "You can only attach images right now."
                );

                return;

            }


            if (file.size > 5 * 1024 * 1024) {

                alert(
                    "That image is too large. Please use one under 5MB."
                );

                return;

            }


            const reader = new FileReader();


            reader.onload = async () => {

                try {

                    await api(
                        `/api/messages/${activeFriend.id}`,
                        {
                            method: "POST",

                            body: JSON.stringify({
                                content: reader.result
                            })
                        }
                    );


                    await loadMessages(activeFriend.id);


                } catch (error) {

                    console.error(error);

                    alert(
                        error.message
                        || "Unable to send image."
                    );

                }

            };


            reader.onerror = () => {

                alert("Unable to read that image.");

            };


            reader.readAsDataURL(file);

        }
    );

}


async function sendMessage() {

    const input =
        document.getElementById(
            "messageInput"
        );


    const text =
        input.value.trim();


    if (!text || !activeFriend) return;


    input.value = "";


    try {

        await api(
            `/api/messages/${activeFriend.id}`,
            {
                method: "POST",

                body: JSON.stringify({
                    content: text
                })
            }
        );


        await loadMessages(activeFriend.id);


    } catch (error) {

        console.error(error);

        alert(
            error.message
            || "Unable to send message."
        );

    }

}


/* =========================================
   FRIEND TABS
========================================= */

document
    .querySelectorAll(".friend-tab")
    .forEach(tab => {

        tab.onclick = () => {

            document
                .querySelectorAll(".friend-tab")
                .forEach(t =>
                    t.classList.remove("active")
                );


            document
                .querySelectorAll(".tab-content")
                .forEach(content =>
                    content.classList.remove("active")
                );


            tab.classList.add("active");


            document
                .getElementById(
                    tab.dataset.tab
                )
                .classList.add("active");


            if (tab.dataset.tab === "myCode") {

                loadMyCode();

            }

        };

    });


/* =========================================
   COPY FRIEND CODE
========================================= */

document
    .getElementById("copyCode")
    .onclick = async () => {

        if (!myCode) return;


        await navigator.clipboard.writeText(
            myCode
        );


        document
            .getElementById("copyCode")
            .textContent = "Copied!";


        setTimeout(() => {

            document
                .getElementById("copyCode")
                .textContent = "Copy";

        }, 1500);

    };


/* =========================================
   NAVIGATION
========================================= */

document
    .querySelectorAll(".nav-item[data-page]")
    .forEach(button => {

        button.onclick = () => {

            document
                .querySelectorAll(".nav-item")
                .forEach(
                    item =>
                        item.classList.remove(
                            "active"
                        )
                );


            button.classList.add("active");


            const page =
                button.dataset.page;


            if (page === "chatPage") {

                chatPage.classList.remove(
                    "hidden"
                );

                friendsPage.classList.add(
                    "hidden"
                );

            }


            if (page === "friendsPage") {

                friendsPage.classList.remove(
                    "hidden"
                );

                chatPage.classList.add(
                    "hidden"
                );

                renderFriends();

            }

        };

    });


/* =========================================
   BACK BUTTON (to main Cipher app)
========================================= */

const backBtn =
    document.getElementById("backBtn");

if (backBtn) {

    backBtn.onclick = () => {

        window.location.href = "/";

    };

}


/* =========================================
   SEARCH CHATS
========================================= */

document
    .getElementById("chatSearch")
    .addEventListener(
        "input",
        event => {

            const search =
                event.target.value
                    .toLowerCase()
                    .trim();


            document
                .querySelectorAll(".chat-item")
                .forEach(item => {

                    item.style.display =
                        item.textContent
                            .toLowerCase()
                            .includes(search)
                            ? "flex"
                            : "none";

                });

        }
    );


/* =========================================
   HTML ESCAPE
========================================= */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadMe();

        await loadFriends();

    }
);
