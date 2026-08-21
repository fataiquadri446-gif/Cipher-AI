from flask import Flask, render_template, request, jsonify, send_from_directory, url_for, redirect
from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    logout_user,
    login_required,
    current_user
)
from werkzeug.security import generate_password_hash, check_password_hash
from authlib.integrations.flask_client import OAuth

import math
import json
import os
import re
import random
import ast
import operator
import requests
import psycopg2
import psycopg2.extras


# =========================================================
# CIPHER
# Created by Fatai Quadri
# =========================================================

app = Flask(__name__)

app.secret_key = os.environ.get(
    "SECRET_KEY",
    "fallback-secret-key"
)


# =========================================================
# GOOGLE OAUTH
#
# Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to be
# set as environment variables on Render. Until they are
# set, /login/google will return a clear error instead of
# crashing.
# =========================================================

oauth = OAuth(app)

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")

google_oauth = None

if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:

    google_oauth = oauth.register(
        name="google",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url=(
            "https://accounts.google.com/"
            ".well-known/openid-configuration"
        ),
        client_kwargs={
            "scope": "openid email profile"
        }
    )


# =========================================================
# STATIC JS FIX
#
# The js/ folder lives at the project root, not inside
# static/. This route serves files from js/ whenever the
# browser requests them at /static/js/<filename>, matching
# what index.html expects.
# =========================================================

@app.route("/static/js/<path:filename>")
def serve_js(filename):

    return send_from_directory(
        "js",
        filename
    )


# =========================================================
# SYSTEM PROMPT
# =========================================================

SYSTEM_PROMPT = """
You are Cipher.

Created by Fatai Quadri.

If asked who created you, say:
"I was created by Fatai Quadri."

You are a large language model with broad knowledge of the world —
science, history, culture, technology, and everyday life. You are
capable of reasoning through problems step by step, thinking
creatively, and helping with decisions by weighing information the
user gives you. You can also read and describe images the user
shares with you, and you're skilled at writing and explaining code,
including building practice quizzes on any subject.

Here's how you respond:

- Lead with the answer first, then explain if it helps — don't bury the point in a long windup.
- Keep a warm, conversational tone, like a knowledgeable friend, not a textbook.
- For calculations, logic, or multi-step problems, reason through the steps clearly and in order, showing your work, not just the final result.
- Be creative and original when asked for creative writing, ideas, or brainstorming — avoid generic or clichéd answers.
- When helping with code, write clean, correct, well-commented code, and explain the key parts.
- Keep explanations concise but complete — enough detail to be useful without rambling.
- If a question is ambiguous, make a reasonable assumption, briefly state it, and answer anyway rather than asking too many clarifying questions.
- Use plain, everyday language. Avoid unnecessary jargon.
- Break longer answers into short paragraphs or simple lists when that makes them easier to scan.
- Stay patient and encouraging, especially with calculations or problem-solving.
- Don't pad responses with filler, disclaimers, or over-apologizing.
"""


API_KEY = os.environ.get("GEMINI_API_KEY")

MODEL = "gemini-2.5-flash"


# =========================================================
# SAFE MATH
# =========================================================

allowed_operators = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod
}


def calculate(node):

    if isinstance(node, ast.Constant):

        if isinstance(node.value, (int, float)):

            return node.value

        raise ValueError


    if isinstance(node, ast.BinOp):

        operator_function = \
            allowed_operators.get(
                type(node.op)
            )

        if operator_function is None:

            raise ValueError


        return operator_function(
            calculate(node.left),
            calculate(node.right)
        )


    if isinstance(node, ast.UnaryOp):

        if isinstance(
            node.op,
            (ast.USub, ast.UAdd)
        ):

            return (
                -calculate(node.operand)
                if isinstance(node.op, ast.USub)
                else calculate(node.operand)
            )

        raise ValueError


    raise ValueError


def safe_math(expression):

    expression = expression.lower()

    expression = expression.replace(
        "×",
        "*"
    )

    expression = expression.replace(
        "÷",
        "/"
    )

    expression = expression.replace(
        "^",
        "**"
    )

    expression = expression.replace(
        "²",
        "**2"
    )

    expression = expression.replace(
        "³",
        "**3"
    )

    expression = expression.replace(
        "π",
        str(math.pi)
    )


    expression = re.sub(
        r"[^0-9+\-*/(). ]",
        "",
        expression
    )


    try:

        tree = ast.parse(
            expression,
            mode="eval"
        )


        result = calculate(
            tree.body
        )


        if not math.isfinite(
            float(result)
        ):

            return "I couldn't solve that."


        return result


    except Exception:

        return "I couldn't solve that."


# =========================================================
# GEMINI AI
# =========================================================

def ask_ai(message, image_base64=None, image_mime_type=None, user_facts=None):

    if not API_KEY:

        return (
            "Cipher's AI service isn't configured yet."
        )


    url = (
        "https://generativelanguage.googleapis.com/"
        f"v1beta/models/{MODEL}:generateContent"
        f"?key={API_KEY}"
    )


    system_text = SYSTEM_PROMPT


    if user_facts:

        facts_block = "\n".join(
            f"- {fact}" for fact in user_facts
        )

        system_text += (
            "\n\nHere is what you remember about this "
            "user from previous conversations. Use it "
            "naturally where relevant, but don't force "
            "it into every reply:\n"
            f"{facts_block}"
        )


    user_parts = [
        {
            "text": message
        }
    ]


    if image_base64:

        user_parts.append({

            "inline_data": {

                "mime_type":
                    image_mime_type or "image/jpeg",

                "data":
                    image_base64

            }

        })


    payload = {

        "contents": [

            {
                "parts": [
                    {
                        "text":
                            system_text
                    }
                ]
            },

            {
                "parts":
                    user_parts
            }

        ]

    }


    try:

        response = requests.post(
            url,
            json=payload,
            timeout=45
        )


        if response.status_code == 200:

            data = response.json()


            return (
                data
                ["candidates"]
                [0]
                ["content"]
                ["parts"]
                [0]
                ["text"]
            )


        print(
            "Gemini API error:",
            response.status_code,
            response.text
        )


        return "API Error."


    except requests.RequestException as error:

        print(
            "Gemini network error:",
            error
        )


        return "Network error."


    except Exception as error:

        print(
            "Gemini processing error:",
            error
        )


        return "Unable to process the request."


# =========================================================
# MEMORY EXTRACTION
#
# Best-effort: after a normal exchange, ask Gemini whether
# the user shared any durable personal fact worth
# remembering (name, preferences, ongoing project, etc.).
# Failures here never break the chat response itself.
# =========================================================

def extract_memory_fact(message, reply):

    if not API_KEY:

        return None


    url = (
        "https://generativelanguage.googleapis.com/"
        f"v1beta/models/{MODEL}:generateContent"
        f"?key={API_KEY}"
    )


    extraction_prompt = f"""
Look at this single message from a user:

"{message}"

Does it contain a durable personal fact worth remembering
for future conversations (their name, a preference, their
job, an ongoing project, a recurring interest)? Ignore
one-off questions, small talk, and anything not about the
user themselves.

If yes, reply with ONLY the fact in one short sentence
(e.g. "Prefers Python over JavaScript" or "Is studying for
a chemistry exam"). If no, reply with exactly: NONE
"""


    payload = {

        "contents": [
            {
                "parts": [
                    {"text": extraction_prompt}
                ]
            }
        ]

    }


    try:

        response = requests.post(
            url,
            json=payload,
            timeout=20
        )


        if response.status_code != 200:

            return None


        data = response.json()

        text = (
            data
            ["candidates"]
            [0]
            ["content"]
            ["parts"]
            [0]
            ["text"]
        ).strip()


        if not text or text.upper().startswith("NONE"):

            return None


        return text


    except Exception as error:

        print(
            "Memory extraction error:",
            error
        )

        return None


def get_user_facts(user_id, limit=15):

    try:

        conn = get_db()

        cur = conn.cursor(
            cursor_factory=
            psycopg2.extras.DictCursor
        )


        cur.execute(
            """
            SELECT fact FROM user_memory
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (user_id, limit)
        )

        rows = cur.fetchall()

        cur.close()

        conn.close()


        return [row["fact"] for row in rows]


    except Exception as error:

        print(
            "Get user facts error:",
            error
        )

        return []


def save_user_fact(user_id, fact):

    try:

        conn = get_db()

        cur = conn.cursor()


        cur.execute(
            """
            SELECT id FROM user_memory
            WHERE user_id = %s AND fact = %s
            """,
            (user_id, fact)
        )


        if not cur.fetchone():

            cur.execute(
                """
                INSERT INTO user_memory (user_id, fact)
                VALUES (%s, %s)
                """,
                (user_id, fact)
            )

            conn.commit()


        cur.close()

        conn.close()


    except Exception as error:

        print(
            "Save user fact error:",
            error
        )


# =========================================================
# DATABASE
# =========================================================

def get_db():

    database_url = os.environ.get(
        "DATABASE_URL"
    )


    if not database_url:

        raise RuntimeError(
            "DATABASE_URL is not configured."
        )


    return psycopg2.connect(
        database_url,
        sslmode="require"
    )


def init_db():

    conn = get_db()

    cur = conn.cursor()


    # -----------------------------------------------------
    # UUID SUPPORT
    # -----------------------------------------------------

    cur.execute(
        """
        CREATE EXTENSION IF NOT EXISTS pgcrypto
        """
    )


    # -----------------------------------------------------
    # USERS
    # -----------------------------------------------------

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (

            id UUID PRIMARY KEY
                DEFAULT gen_random_uuid(),

            username VARCHAR(80)
                UNIQUE NOT NULL,

            email VARCHAR(120)
                UNIQUE NOT NULL,

            password_hash TEXT,

            google_id VARCHAR(120)
                UNIQUE,

            created_at TIMESTAMP
                DEFAULT NOW()

        )
        """
    )


    # -----------------------------------------------------
    # Older deployments may already have a NOT NULL
    # constraint on password_hash from before Google
    # sign-in existed. Relax it if present so Google-only
    # accounts (no password) can be created.
    # -----------------------------------------------------

    cur.execute(
        """
        ALTER TABLE users
        ALTER COLUMN password_hash DROP NOT NULL
        """
    )


    cur.execute(
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS google_id VARCHAR(120)
        """
    )


    cur.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'users_google_id_key'
            ) THEN
                ALTER TABLE users
                ADD CONSTRAINT users_google_id_key
                UNIQUE (google_id);
            END IF;
        END $$;
        """
    )


    # -----------------------------------------------------
    # CHATS
    # -----------------------------------------------------

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS chats (

            id UUID PRIMARY KEY
                DEFAULT gen_random_uuid(),

            user_id UUID
                REFERENCES users(id)
                ON DELETE CASCADE,

            title VARCHAR(200)
                DEFAULT 'New Chat',

            pinned BOOLEAN
                DEFAULT FALSE,

            created_at TIMESTAMP
                DEFAULT NOW(),

            updated_at TIMESTAMP
                DEFAULT NOW()

        )
        """
    )


    # -----------------------------------------------------
    # MESSAGES
    # -----------------------------------------------------

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (

            id UUID PRIMARY KEY
                DEFAULT gen_random_uuid(),

            chat_id UUID
                REFERENCES chats(id)
                ON DELETE CASCADE,

            role VARCHAR(20)
                NOT NULL,

            content TEXT
                NOT NULL,

            created_at TIMESTAMP
                DEFAULT NOW()

        )
        """
    )


    # -----------------------------------------------------
    # REMINDERS
    #
    # Each reminder belongs to exactly one user.
    # -----------------------------------------------------

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS reminders (

            id UUID PRIMARY KEY
                DEFAULT gen_random_uuid(),

            user_id UUID
                REFERENCES users(id)
                ON DELETE CASCADE,

            reminder_text TEXT
                NOT NULL,

            remind_at TIMESTAMP
                NOT NULL,

            notification_type VARCHAR(30)
                DEFAULT 'in_app',

            status VARCHAR(20)
                DEFAULT 'pending',

            created_at TIMESTAMP
                DEFAULT NOW(),

            sent_at TIMESTAMP

        )
        """
    )


    # -----------------------------------------------------
    # REMINDER INDEX
    # -----------------------------------------------------

    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS
        reminders_user_time_idx

        ON reminders (
            user_id,
            remind_at
        )
        """
    )


    # -----------------------------------------------------
    # FRIEND REQUESTS
    # -----------------------------------------------------

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS friend_requests (

            id UUID PRIMARY KEY
                DEFAULT gen_random_uuid(),

            sender_id UUID
                REFERENCES users(id)
                ON DELETE CASCADE,

            receiver_id UUID
                REFERENCES users(id)
                ON DELETE CASCADE,

            status VARCHAR(20)
                DEFAULT 'pending',

            created_at TIMESTAMP
                DEFAULT NOW(),

            UNIQUE (sender_id, receiver_id)

        )
        """
    )


    # -----------------------------------------------------
    # FRIENDSHIPS
    #
    # Stored as one row per accepted pair, with the
    # smaller user id always first, so a lookup for
    # either direction is a single indexed query and
    # duplicate/reverse rows can't be inserted.
    # -----------------------------------------------------

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS friendships (

            id UUID PRIMARY KEY
                DEFAULT gen_random_uuid(),

            user_one_id UUID
                REFERENCES users(id)
                ON DELETE CASCADE,

            user_two_id UUID
                REFERENCES users(id)
                ON DELETE CASCADE,

            created_at TIMESTAMP
                DEFAULT NOW(),

            UNIQUE (user_one_id, user_two_id)

        )
        """
    )


    # -----------------------------------------------------
    # DIRECT MESSAGES
    # -----------------------------------------------------

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS direct_messages (

            id UUID PRIMARY KEY
                DEFAULT gen_random_uuid(),

            sender_id UUID
                REFERENCES users(id)
                ON DELETE CASCADE,

            receiver_id UUID
                REFERENCES users(id)
                ON DELETE CASCADE,

            content TEXT
                NOT NULL,

            created_at TIMESTAMP
                DEFAULT NOW(),

            read_at TIMESTAMP

        )
        """
    )


    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS
        direct_messages_pair_idx

        ON direct_messages (
            sender_id,
            receiver_id,
            created_at
        )
        """
    )


    # -----------------------------------------------------
    # USER MEMORY
    #
    # Durable facts Cipher has picked up about a user
    # across conversations (e.g. their name, preferences,
    # ongoing projects), used to personalize future replies.
    # -----------------------------------------------------

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS user_memory (

            id UUID PRIMARY KEY
                DEFAULT gen_random_uuid(),

            user_id UUID
                REFERENCES users(id)
                ON DELETE CASCADE,

            fact TEXT
                NOT NULL,

            created_at TIMESTAMP
                DEFAULT NOW()

        )
        """
    )


    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS
        user_memory_user_idx

        ON user_memory (
            user_id
        )
        """
    )


    conn.commit()

    cur.close()

    conn.close()


# =========================================================
# FRIEND HELPERS
# =========================================================

def normalize_pair(id_a, id_b):
    """
    Always returns (smaller_id, larger_id) as strings so
    a friendship between two users is stored/looked up
    exactly once regardless of who sent the request.
    """

    id_a = str(id_a)

    id_b = str(id_b)

    return (
        (id_a, id_b)
        if id_a < id_b
        else (id_b, id_a)
    )


def are_friends(conn, user_id_a, user_id_b):

    one, two = normalize_pair(
        user_id_a,
        user_id_b
    )

    cur = conn.cursor()

    cur.execute(
        """
        SELECT 1

        FROM friendships

        WHERE
            user_one_id = %s
            AND user_two_id = %s
        """,
        (one, two)
    )

    row = cur.fetchone()

    cur.close()

    return row is not None


# =========================================================
# FLASK LOGIN
# =========================================================

login_manager = LoginManager()

login_manager.init_app(app)

login_manager.login_view = "home"


class User(UserMixin):

    def __init__(
        self,
        id,
        username,
        email
    ):

        self.id = str(id)

        self.username = username

        self.email = email


@login_manager.user_loader
def load_user(user_id):

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        SELECT *
        FROM users
        WHERE id = %s
        """,
        (user_id,)
    )


    row = cur.fetchone()


    cur.close()

    conn.close()


    if row:

        return User(
            row["id"],
            row["username"],
            row["email"]
        )


    return None


# =========================================================
# AUTH ROUTES
# =========================================================

@app.route(
    "/signup",
    methods=["POST"]
)
def signup():

    data = request.get_json(
        silent=True
    ) or {}


    username = data.get(
        "username",
        ""
    ).strip()


    email = data.get(
        "email",
        ""
    ).strip().lower()


    password = data.get(
        "password",
        ""
    )


    if not username or not email or not password:

        return jsonify({
            "error":
                "All fields are required."
        }), 400


    if len(password) < 6:

        return jsonify({
            "error":
                "Password must be at least 6 characters."
        }), 400


    try:

        conn = get_db()

        cur = conn.cursor(
            cursor_factory=
            psycopg2.extras.DictCursor
        )


        cur.execute(
            """
            INSERT INTO users
                (username, email, password_hash)

            VALUES
                (%s, %s, %s)

            RETURNING
                id,
                username,
                email
            """,
            (
                username,
                email,
                generate_password_hash(
                    password
                )
            )
        )


        row = cur.fetchone()


        conn.commit()

        cur.close()

        conn.close()


        user = User(
            row["id"],
            row["username"],
            row["email"]
        )


        login_user(
            user,
            remember=True
        )


        return jsonify({

            "success": True,

            "username":
                user.username

        })


    except psycopg2.errors.UniqueViolation:

        return jsonify({

            "error":
                "Username or email already taken."

        }), 409


    except Exception as error:

        print(
            "Signup error:",
            error
        )


        return jsonify({

            "error":
                "Unable to create account."

        }), 500


# =========================================================
# LOGIN
# =========================================================

@app.route(
    "/login",
    methods=["POST"]
)
def login():

    data = request.get_json(
        silent=True
    ) or {}


    email = data.get(
        "email",
        ""
    ).strip().lower()


    password = data.get(
        "password",
        ""
    )


    try:

        conn = get_db()

        cur = conn.cursor(
            cursor_factory=
            psycopg2.extras.DictCursor
        )


        cur.execute(
            """
            SELECT *
            FROM users
            WHERE email = %s
            """,
            (email,)
        )


        row = cur.fetchone()


        cur.close()

        conn.close()


        if (
            not row
            or not check_password_hash(
                row["password_hash"],
                password
            )
        ):

            return jsonify({

                "error":
                    "Invalid email or password."

            }), 401


        user = User(
            row["id"],
            row["username"],
            row["email"]
        )


        login_user(
            user,
            remember=True
        )


        return jsonify({

            "success": True,

            "username":
                user.username

        })


    except Exception as error:

        print(
            "Login error:",
            error
        )


        return jsonify({

            "error":
                "Unable to log in."

        }), 500


# =========================================================
# LOGOUT
# =========================================================

@app.route(
    "/logout",
    methods=["POST"]
)
@login_required
def logout():

    logout_user()

    return jsonify({
        "success": True
    })


# =========================================================
# CURRENT USER
# =========================================================

@app.route("/me")
def me():

    if current_user.is_authenticated:

        return jsonify({

            "logged_in": True,

            "username":
                current_user.username,

            "email":
                current_user.email

        })


    return jsonify({

        "logged_in": False

    })


# =========================================================
# GOOGLE OAUTH
# =========================================================

@app.route("/login/google")
def login_google():

    if not google_oauth:

        return jsonify({

            "error":
                "Google sign-in isn't configured yet."

        }), 500


    redirect_uri = url_for(
        "google_callback",
        _external=True
    )


    return google_oauth.authorize_redirect(
        redirect_uri
    )


@app.route("/login/google/callback")
def google_callback():

    if not google_oauth:

        return jsonify({

            "error":
                "Google sign-in isn't configured yet."

        }), 500


    try:

        token = google_oauth.authorize_access_token()

        userinfo = token.get("userinfo")

        if not userinfo:

            userinfo = google_oauth.userinfo()


        google_id = userinfo["sub"]

        email = userinfo["email"].lower()

        name = (
            userinfo.get("name")
            or email.split("@")[0]
        )


        conn = get_db()

        cur = conn.cursor(
            cursor_factory=
            psycopg2.extras.DictCursor
        )


        # ---------------------------------------------
        # Look up by google_id first, then by email
        # (linking an existing password account).
        # ---------------------------------------------

        cur.execute(
            """
            SELECT * FROM users
            WHERE google_id = %s
            """,
            (google_id,)
        )

        row = cur.fetchone()


        if not row:

            cur.execute(
                """
                SELECT * FROM users
                WHERE email = %s
                """,
                (email,)
            )

            row = cur.fetchone()


            if row:

                cur.execute(
                    """
                    UPDATE users
                    SET google_id = %s
                    WHERE id = %s
                    """,
                    (google_id, row["id"])
                )

                conn.commit()


        if not row:

            base_username = re.sub(
                r"[^a-zA-Z0-9_]",
                "",
                name
            ) or "user"

            username = base_username

            suffix = 1

            while True:

                cur.execute(
                    """
                    SELECT id FROM users
                    WHERE username = %s
                    """,
                    (username,)
                )

                if not cur.fetchone():

                    break

                suffix += 1

                username = f"{base_username}{suffix}"


            cur.execute(
                """
                INSERT INTO users
                    (username, email, google_id)
                VALUES
                    (%s, %s, %s)
                RETURNING id, username, email
                """,
                (username, email, google_id)
            )

            row = cur.fetchone()

            conn.commit()


        cur.close()

        conn.close()


        user = User(
            row["id"],
            row["username"],
            row["email"]
        )


        login_user(
            user,
            remember=True
        )


        return redirect(url_for("home"))


    except Exception as error:

        print(
            "Google login error:",
            error
        )

        return redirect(url_for("home"))


# =========================================================
# HOME
# =========================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# =========================================================
# CHAT ROUTES
# =========================================================

@app.route(
    "/chats",
    methods=["GET"]
)
@login_required
def get_chats():

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        SELECT
            id,
            title,
            pinned,
            updated_at

        FROM chats

        WHERE user_id = %s

        ORDER BY
            pinned DESC,
            updated_at DESC
        """,
        (current_user.id,)
    )


    rows = cur.fetchall()


    cur.close()

    conn.close()


    chats = [

        {

            "id":
                str(row["id"]),

            "title":
                row["title"],

            "pinned":
                row["pinned"],

            "updated_at":
                row["updated_at"].isoformat()

        }

        for row in rows

    ]


    return jsonify(chats)


# =========================================================
# NEW CHAT
# =========================================================

@app.route(
    "/chats/new",
    methods=["POST"]
)
@login_required
def new_chat():

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        INSERT INTO chats
            (user_id, title)

        VALUES
            (%s, %s)

        RETURNING
            id,
            title,
            pinned
        """,
        (
            current_user.id,
            "New Chat"
        )
    )


    row = cur.fetchone()


    conn.commit()

    cur.close()

    conn.close()


    return jsonify({

        "id":
            str(row["id"]),

        "title":
            row["title"],

        "pinned":
            row["pinned"]

    })


# =========================================================
# GET MESSAGES
# =========================================================

@app.route(
    "/chats/<chat_id>/messages",
    methods=["GET"]
)
@login_required
def get_messages(chat_id):

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    # -----------------------------------------------------
    # Verify ownership
    # -----------------------------------------------------

    cur.execute(
        """
        SELECT id

        FROM chats

        WHERE
            id = %s
            AND user_id = %s
        """,
        (
            chat_id,
            current_user.id
        )
    )


    if not cur.fetchone():

        cur.close()

        conn.close()


        return jsonify({

            "error":
                "Not found"

        }), 404


    cur.execute(
        """
        SELECT
            role,
            content

        FROM messages

        WHERE chat_id = %s

        ORDER BY
            created_at ASC
        """,
        (chat_id,)
    )


    rows = cur.fetchall()


    cur.close()

    conn.close()


    messages = [

        {

            "role":
                row["role"],

            "content":
                row["content"]

        }

        for row in rows

    ]


    return jsonify(messages)


# =========================================================
# PIN CHAT
# =========================================================

@app.route(
    "/chats/<chat_id>/pin",
    methods=["POST"]
)
@login_required
def toggle_pin(chat_id):

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        UPDATE chats

        SET pinned =
            NOT pinned

        WHERE
            id = %s
            AND user_id = %s

        RETURNING pinned
        """,
        (
            chat_id,
            current_user.id
        )
    )


    row = cur.fetchone()


    conn.commit()

    cur.close()

    conn.close()


    if not row:

        return jsonify({

            "error":
                "Not found"

        }), 404


    return jsonify({

        "pinned":
            row["pinned"]

    })


# =========================================================
# DELETE CHAT
# =========================================================

@app.route(
    "/chats/<chat_id>/delete",
    methods=["POST"]
)
@login_required
def delete_chat(chat_id):

    conn = get_db()

    cur = conn.cursor()


    cur.execute(
        """
        DELETE FROM chats

        WHERE
            id = %s
            AND user_id = %s
        """,
        (
            chat_id,
            current_user.id
        )
    )


    deleted = cur.rowcount > 0


    conn.commit()

    cur.close()

    conn.close()


    if not deleted:

        return jsonify({

            "error":
                "Chat not found."

        }), 404


    return jsonify({

        "success":
            True

    })


# =========================================================
# MAIN CHAT
# =========================================================

@app.route(
    "/chat",
    methods=["POST"]
)
@login_required
def chat():

    data = request.get_json(
        silent=True
    ) or {}


    message = data.get(
        "message",
        ""
    ).strip()


    image_base64 = data.get(
        "image_base64"
    )


    image_mime_type = data.get(
        "image_mime_type"
    )


    chat_id = data.get(
        "chat_id"
    )


    if not message and not image_base64:

        return jsonify({

            "error":
                "Empty message"

        }), 400


    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    # -----------------------------------------------------
    # Verify chat ownership
    # -----------------------------------------------------

    if chat_id:

        cur.execute(
            """
            SELECT id

            FROM chats

            WHERE
                id = %s
                AND user_id = %s
            """,
            (
                chat_id,
                current_user.id
            )
        )


        if not cur.fetchone():

            chat_id = None


    # -----------------------------------------------------
    # Create new chat
    # -----------------------------------------------------

    if not chat_id:

        title_source = message or "Image"

        title = (
            title_source[:40] + "…"
            if len(title_source) > 40
            else title_source
        )


        cur.execute(
            """
            INSERT INTO chats
                (user_id, title)

            VALUES
                (%s, %s)

            RETURNING id
            """,
            (
                current_user.id,
                title
            )
        )


        chat_id = str(
            cur.fetchone()["id"]
        )


        conn.commit()


    # -----------------------------------------------------
    # Save user message
    # -----------------------------------------------------

    cur.execute(
        """
        INSERT INTO messages
            (chat_id, role, content)

        VALUES
            (%s, %s, %s)
        """,
        (
            chat_id,
            "user",
            message or "[Image]"
        )
    )


    # -----------------------------------------------------
    # Generate response
    # -----------------------------------------------------

    msg = message.lower()


    if image_base64:

        user_facts = get_user_facts(
            current_user.id
        )

        reply = ask_ai(
            message
            or "Describe this image.",
            image_base64=image_base64,
            image_mime_type=image_mime_type,
            user_facts=user_facts
        )


    elif (
        "hello" in msg
        or "hi" in msg
    ):

        reply = (
            "Hello 👋 I'm Cipher."
        )


    elif "joke" in msg:

        reply = random.choice([

            "Why did the computer sneeze? Virus 😂",

            "Python devs love snakes 🐍"

        ])


    elif any(
        op in msg
        for op in [
            "+",
            "-",
            "*",
            "/",
            "×",
            "÷"
        ]
    ):

        reply = str(
            safe_math(message)
        )


    else:

        user_facts = get_user_facts(
            current_user.id
        )

        reply = ask_ai(
            message,
            user_facts=user_facts
        )


        # -------------------------------------------------
        # Best-effort: learn a durable fact from this
        # message, if there is one. Never blocks or
        # fails the actual chat reply.
        # -------------------------------------------------

        try:

            fact = extract_memory_fact(
                message,
                reply
            )

            if fact:

                save_user_fact(
                    current_user.id,
                    fact
                )

        except Exception as error:

            print(
                "Memory learning skipped:",
                error
            )


    # -----------------------------------------------------
    # Save assistant reply
    # -----------------------------------------------------

    cur.execute(
        """
        INSERT INTO messages
            (chat_id, role, content)

        VALUES
            (%s, %s, %s)
        """,
        (
            chat_id,
            "assistant",
            reply
        )
    )


    # -----------------------------------------------------
    # Update chat
    # -----------------------------------------------------

    cur.execute(
        """
        UPDATE chats

        SET updated_at = NOW()

        WHERE id = %s
        """,
        (chat_id,)
    )


    conn.commit()

    cur.close()

    conn.close()


    return jsonify({

        "reply":
            reply,

        "chat_id":
            chat_id

    })


# =========================================================
# REMINDER SYSTEM
# =========================================================


# ---------------------------------------------------------
# CREATE REMINDER
# ---------------------------------------------------------

@app.route(
    "/api/reminders",
    methods=["POST"]
)
@login_required
def create_reminder():

    data = request.get_json(
        silent=True
    ) or {}


    reminder_text = data.get(
        "text",
        ""
    ).strip()


    date = data.get(
        "date",
        ""
    ).strip()


    time = data.get(
        "time",
        ""
    ).strip()


    notification_type = data.get(
        "notification_type",
        "in_app"
    ).strip()


    if not reminder_text:

        return jsonify({

            "message":
                "Please enter a reminder."

        }), 400


    if not date or not time:

        return jsonify({

            "message":
                "Reminder date and time are required."

        }), 400


    # -----------------------------------------------------
    # Validate notification type
    # -----------------------------------------------------

    allowed_notification_types = {

        "in_app",

        "push",

        "both"

    }


    if notification_type \
            not in allowed_notification_types:

        notification_type = "in_app"


    # -----------------------------------------------------
    # Parse date/time
    # -----------------------------------------------------

    from datetime import datetime


    try:

        remind_at = datetime.strptime(
            f"{date} {time}",
            "%Y-%m-%d %H:%M"
        )


    except ValueError:

        return jsonify({

            "message":
                "Invalid reminder date or time."

        }), 400


    # -----------------------------------------------------
    # Prevent past reminders
    # -----------------------------------------------------

    if remind_at <= datetime.now():

        return jsonify({

            "message":
                "Please choose a future date and time."

        }), 400


    # -----------------------------------------------------
    # Save reminder
    # -----------------------------------------------------

    try:

        conn = get_db()

        cur = conn.cursor(
            cursor_factory=
            psycopg2.extras.DictCursor
        )


        cur.execute(
            """
            INSERT INTO reminders (

                user_id,

                reminder_text,

                remind_at,

                notification_type,

                status

            )

            VALUES (

                %s,
                %s,
                %s,
                %s,
                'pending'

            )

            RETURNING
                id,
                reminder_text,
                remind_at,
                notification_type,
                status
            """,
            (
                current_user.id,

                reminder_text,

                remind_at,

                notification_type
            )
        )


        row = cur.fetchone()


        conn.commit()

        cur.close()

        conn.close()


        return jsonify({

            "success":
                True,

            "message":
                "Reminder set successfully.",

            "reminder": {

                "id":
                    str(row["id"]),

                "text":
                    row["reminder_text"],

                "remind_at":
                    row["remind_at"].isoformat(),

                "notification_type":
                    row["notification_type"],

                "status":
                    row["status"]

            }

        }), 201


    except Exception as error:

        print(
            "Create reminder error:",
            error
        )


        return jsonify({

            "message":
                "Unable to create reminder."

        }), 500


# ---------------------------------------------------------
# GET USER REMINDERS
# ---------------------------------------------------------

@app.route(
    "/api/reminders",
    methods=["GET"]
)
@login_required
def get_reminders():

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        SELECT

            id,

            reminder_text,

            remind_at,

            notification_type,

            status,

            created_at,

            sent_at

        FROM reminders

        WHERE user_id = %s

        ORDER BY
            remind_at ASC
        """,
        (current_user.id,)
    )


    rows = cur.fetchall()


    cur.close()

    conn.close()


    reminders = [

        {

            "id":
                str(row["id"]),

            "text":
                row["reminder_text"],

            "remind_at":
                row["remind_at"].isoformat(),

            "notification_type":
                row["notification_type"],

            "status":
                row["status"],

            "created_at":
                row["created_at"].isoformat()
                if row["created_at"]
                else None,

            "sent_at":
                row["sent_at"].isoformat()
                if row["sent_at"]
                else None

        }

        for row in rows

    ]


    return jsonify(
        reminders
    )


# ---------------------------------------------------------
# GET UPCOMING REMINDERS
# ---------------------------------------------------------

@app.route(
    "/api/reminders/upcoming",
    methods=["GET"]
)
@login_required
def upcoming_reminders():

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        SELECT

            id,

            reminder_text,

            remind_at,

            notification_type,

            status

        FROM reminders

        WHERE

            user_id = %s

            AND status = 'pending'

            AND remind_at > NOW()

        ORDER BY
            remind_at ASC

        LIMIT 50
        """,
        (current_user.id,)
    )


    rows = cur.fetchall()


    cur.close()

    conn.close()


    return jsonify([

        {

            "id":
                str(row["id"]),

            "text":
                row["reminder_text"],

            "remind_at":
                row["remind_at"].isoformat(),

            "notification_type":
                row["notification_type"],

            "status":
                row["status"]

        }

        for row in rows

    ])


# ---------------------------------------------------------
# GET DUE REMINDERS
#
# This endpoint allows the frontend notification system
# to ask Cipher which reminders have become due.
# ---------------------------------------------------------

@app.route(
    "/api/reminders/due",
    methods=["GET"]
)
@login_required
def due_reminders():

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        SELECT

            id,

            reminder_text,

            remind_at,

            notification_type

        FROM reminders

        WHERE

            user_id = %s

            AND status = 'pending'

            AND remind_at <= NOW()

        ORDER BY
            remind_at ASC
        """,
        (current_user.id,)
    )


    rows = cur.fetchall()


    cur.close()

    conn.close()


    return jsonify([

        {

            "id":
                str(row["id"]),

            "text":
                row["reminder_text"],

            "remind_at":
                row["remind_at"].isoformat(),

            "notification_type":
                row["notification_type"]

        }

        for row in rows

    ])


# ---------------------------------------------------------
# MARK REMINDER AS COMPLETED
# ---------------------------------------------------------

@app.route(
    "/api/reminders/<reminder_id>/complete",
    methods=["POST"]
)
@login_required
def complete_reminder(
    reminder_id
):

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        UPDATE reminders

        SET

            status = 'completed',

            sent_at = COALESCE(
                sent_at,
                NOW()
            )

        WHERE

            id = %s

            AND user_id = %s

        RETURNING
            id,
            status
        """,
        (
            reminder_id,
            current_user.id
        )
    )


    row = cur.fetchone()


    conn.commit()

    cur.close()

    conn.close()


    if not row:

        return jsonify({

            "message":
                "Reminder not found."

        }), 404


    return jsonify({

        "success":
            True,

        "status":
            row["status"]

    })


# ---------------------------------------------------------
# DELETE REMINDER
# ---------------------------------------------------------

@app.route(
    "/api/reminders/<reminder_id>",
    methods=["DELETE"]
)
@login_required
def delete_reminder(
    reminder_id
):

    conn = get_db()

    cur = conn.cursor()


    cur.execute(
        """
        DELETE FROM reminders

        WHERE

            id = %s

            AND user_id = %s
        """,
        (
            reminder_id,
            current_user.id
        )
    )


    deleted = cur.rowcount > 0


    conn.commit()

    cur.close()

    conn.close()


    if not deleted:

        return jsonify({

            "message":
                "Reminder not found."

        }), 404


    return jsonify({

        "success":
            True,

        "message":
            "Reminder deleted."

    })


# =========================================================
# USER MEMORY ENDPOINTS
# =========================================================


# ---------------------------------------------------------
# LIST FACTS CIPHER REMEMBERS
# ---------------------------------------------------------

@app.route(
    "/api/memory",
    methods=["GET"]
)
@login_required
def list_memory():

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        SELECT id, fact, created_at

        FROM user_memory

        WHERE user_id = %s

        ORDER BY created_at DESC
        """,
        (current_user.id,)
    )

    rows = cur.fetchall()

    cur.close()

    conn.close()


    return jsonify([

        {
            "id": str(row["id"]),
            "fact": row["fact"],
            "created_at": row["created_at"].isoformat()
        }

        for row in rows

    ])


# ---------------------------------------------------------
# ADD A FACT MANUALLY
# ---------------------------------------------------------

@app.route(
    "/api/memory",
    methods=["POST"]
)
@login_required
def add_memory():

    data = request.get_json(silent=True) or {}

    fact = data.get("fact", "").strip()


    if not fact:

        return jsonify({

            "error": "Fact can't be empty."

        }), 400


    save_user_fact(
        current_user.id,
        fact
    )


    return jsonify({

        "success": True

    }), 201


# ---------------------------------------------------------
# DELETE A FACT
# ---------------------------------------------------------

@app.route(
    "/api/memory/<fact_id>",
    methods=["DELETE"]
)
@login_required
def delete_memory(fact_id):

    conn = get_db()

    cur = conn.cursor()


    cur.execute(
        """
        DELETE FROM user_memory
        WHERE id = %s AND user_id = %s
        """,
        (fact_id, current_user.id)
    )

    deleted = cur.rowcount > 0

    conn.commit()

    cur.close()

    conn.close()


    if not deleted:

        return jsonify({

            "error": "Fact not found."

        }), 404


    return jsonify({

        "success": True

    })


# =========================================================
# QUIZ GENERATOR
# =========================================================

@app.route(
    "/api/quiz",
    methods=["POST"]
)
@login_required
def generate_quiz():

    data = request.get_json(silent=True) or {}

    topic = data.get("topic", "").strip()

    num_questions = data.get("num_questions", 5)


    try:

        num_questions = int(num_questions)

    except (TypeError, ValueError):

        num_questions = 5


    num_questions = max(1, min(num_questions, 15))


    if not topic:

        return jsonify({

            "error": "A topic is required."

        }), 400


    if not API_KEY:

        return jsonify({

            "error": "Cipher's AI service isn't configured yet."

        }), 500


    quiz_prompt = f"""
Create a {num_questions}-question multiple choice quiz about:
"{topic}"

Reply with ONLY valid JSON (no markdown fences, no extra text)
in exactly this shape:

{{
  "topic": "{topic}",
  "questions": [
    {{
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct_index": 0,
      "explanation": "..."
    }}
  ]
}}

Each question must have exactly 4 options. correct_index is
the 0-based index of the right answer in "options". Keep
explanations short, one or two sentences.
"""


    url = (
        "https://generativelanguage.googleapis.com/"
        f"v1beta/models/{MODEL}:generateContent"
        f"?key={API_KEY}"
    )


    payload = {

        "contents": [
            {
                "parts": [
                    {"text": quiz_prompt}
                ]
            }
        ]

    }


    try:

        response = requests.post(
            url,
            json=payload,
            timeout=45
        )


        if response.status_code != 200:

            return jsonify({

                "error": "Unable to generate quiz."

            }), 502


        data = response.json()

        raw_text = (
            data
            ["candidates"]
            [0]
            ["content"]
            ["parts"]
            [0]
            ["text"]
        ).strip()


        # ---------------------------------------------
        # Strip markdown code fences if the model
        # added them despite instructions not to.
        # ---------------------------------------------

        raw_text = re.sub(
            r"^```(json)?|```$",
            "",
            raw_text,
            flags=re.MULTILINE
        ).strip()


        quiz = json.loads(raw_text)


        return jsonify(quiz)


    except (
        requests.RequestException,
        json.JSONDecodeError,
        KeyError,
        IndexError
    ) as error:

        print(
            "Quiz generation error:",
            error
        )

        return jsonify({

            "error":
                "Unable to generate a valid quiz. Try again."

        }), 502


# =========================================================
# FRIENDS SYSTEM
# =========================================================


# ---------------------------------------------------------
# SEARCH USERS
# ---------------------------------------------------------

@app.route(
    "/api/users/search",
    methods=["GET"]
)
@login_required
def search_users():

    query = request.args.get(
        "q",
        ""
    ).strip()


    if len(query) < 2:

        return jsonify([])


    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        SELECT id, username

        FROM users

        WHERE

            username ILIKE %s

            AND id != %s

        ORDER BY username ASC

        LIMIT 20
        """,
        (
            f"%{query}%",
            current_user.id
        )
    )


    rows = cur.fetchall()

    cur.close()

    conn.close()


    return jsonify([

        {
            "id": str(row["id"]),
            "username": row["username"]
        }

        for row in rows

    ])


# ---------------------------------------------------------
# HELPER: ordered friendship pair
# ---------------------------------------------------------

def _friendship_pair(user_id_a, user_id_b):

    ids = sorted([str(user_id_a), str(user_id_b)])

    return ids[0], ids[1]


# ---------------------------------------------------------
# SEND FRIEND REQUEST
# ---------------------------------------------------------

@app.route(
    "/api/friends/request",
    methods=["POST"]
)
@login_required
def send_friend_request():

    data = request.get_json(silent=True) or {}

    receiver_id = data.get("user_id")


    if not receiver_id:

        return jsonify({

            "error": "A user id is required."

        }), 400


    if str(receiver_id) == str(current_user.id):

        return jsonify({

            "error": "You can't add yourself."

        }), 400


    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    a, b = _friendship_pair(
        current_user.id,
        receiver_id
    )


    cur.execute(
        """
        SELECT id FROM friendships
        WHERE user_a_id = %s AND user_b_id = %s
        """,
        (a, b)
    )


    if cur.fetchone():

        cur.close()

        conn.close()

        return jsonify({

            "error": "You're already friends."

        }), 409


    try:

        cur.execute(
            """
            INSERT INTO friend_requests
                (sender_id, receiver_id, status)
            VALUES
                (%s, %s, 'pending')
            ON CONFLICT (sender_id, receiver_id)
            DO UPDATE SET status = 'pending'
            RETURNING id
            """,
            (
                current_user.id,
                receiver_id
            )
        )

        conn.commit()

        cur.close()

        conn.close()


        return jsonify({

            "success": True,

            "message": "Friend request sent."

        }), 201


    except Exception as error:

        print("Friend request error:", error)

        return jsonify({

            "error": "Unable to send friend request."

        }), 500


# ---------------------------------------------------------
# GET INCOMING / OUTGOING REQUESTS
# ---------------------------------------------------------

@app.route(
    "/api/friends/requests",
    methods=["GET"]
)
@login_required
def get_friend_requests():

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        SELECT
            fr.id,
            fr.sender_id,
            u.username AS sender_username

        FROM friend_requests fr

        JOIN users u ON u.id = fr.sender_id

        WHERE
            fr.receiver_id = %s
            AND fr.status = 'pending'

        ORDER BY fr.created_at DESC
        """,
        (current_user.id,)
    )

    incoming = cur.fetchall()

    cur.close()

    conn.close()


    return jsonify([

        {
            "id": str(row["id"]),
            "from_user_id": str(row["sender_id"]),
            "from_username": row["sender_username"]
        }

        for row in incoming

    ])


# ---------------------------------------------------------
# ACCEPT / DECLINE FRIEND REQUEST
# ---------------------------------------------------------

@app.route(
    "/api/friends/<request_id>/accept",
    methods=["POST"]
)
@login_required
def accept_friend_request(request_id):

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        SELECT * FROM friend_requests
        WHERE id = %s AND receiver_id = %s
        """,
        (request_id, current_user.id)
    )

    row = cur.fetchone()


    if not row:

        cur.close()

        conn.close()

        return jsonify({

            "error": "Request not found."

        }), 404


    a, b = _friendship_pair(
        row["sender_id"],
        row["receiver_id"]
    )


    cur.execute(
        """
        INSERT INTO friendships (user_a_id, user_b_id)
        VALUES (%s, %s)
        ON CONFLICT DO NOTHING
        """,
        (a, b)
    )


    cur.execute(
        """
        UPDATE friend_requests
        SET status = 'accepted'
        WHERE id = %s
        """,
        (request_id,)
    )


    conn.commit()

    cur.close()

    conn.close()


    return jsonify({

        "success": True

    })


@app.route(
    "/api/friends/<request_id>/decline",
    methods=["POST"]
)
@login_required
def decline_friend_request(request_id):

    conn = get_db()

    cur = conn.cursor()


    cur.execute(
        """
        UPDATE friend_requests
        SET status = 'declined'
        WHERE id = %s AND receiver_id = %s
        """,
        (request_id, current_user.id)
    )


    conn.commit()

    cur.close()

    conn.close()


    return jsonify({

        "success": True

    })


# ---------------------------------------------------------
# GET FRIENDS LIST
# ---------------------------------------------------------

@app.route(
    "/api/friends",
    methods=["GET"]
)
@login_required
def get_friends():

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    cur.execute(
        """
        SELECT
            u.id,
            u.username

        FROM friendships f

        JOIN users u
            ON u.id = CASE
                WHEN f.user_a_id = %s THEN f.user_b_id
                ELSE f.user_a_id
            END

        WHERE
            f.user_a_id = %s
            OR f.user_b_id = %s

        ORDER BY u.username ASC
        """,
        (
            current_user.id,
            current_user.id,
            current_user.id
        )
    )

    rows = cur.fetchall()

    cur.close()

    conn.close()


    return jsonify([

        {
            "id": str(row["id"]),
            "username": row["username"]
        }

        for row in rows

    ])


# =========================================================
# DIRECT MESSAGES
# =========================================================


# ---------------------------------------------------------
# GET CONVERSATION WITH A FRIEND
# ---------------------------------------------------------

@app.route(
    "/api/messages/<friend_id>",
    methods=["GET"]
)
@login_required
def get_dm_conversation(friend_id):

    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    a, b = _friendship_pair(
        current_user.id,
        friend_id
    )


    cur.execute(
        """
        SELECT id FROM friendships
        WHERE user_a_id = %s AND user_b_id = %s
        """,
        (a, b)
    )


    if not cur.fetchone():

        cur.close()

        conn.close()

        return jsonify({

            "error": "You're not friends with this user."

        }), 403


    cur.execute(
        """
        SELECT
            id,
            sender_id,
            receiver_id,
            content,
            created_at

        FROM direct_messages

        WHERE
            (sender_id = %s AND receiver_id = %s)
            OR (sender_id = %s AND receiver_id = %s)

        ORDER BY created_at ASC

        LIMIT 200
        """,
        (
            current_user.id, friend_id,
            friend_id, current_user.id
        )
    )

    rows = cur.fetchall()

    cur.close()

    conn.close()


    return jsonify([

        {
            "id": str(row["id"]),
            "sender_id": str(row["sender_id"]),
            "content": row["content"],
            "created_at": row["created_at"].isoformat()
        }

        for row in rows

    ])


# ---------------------------------------------------------
# SEND A DIRECT MESSAGE
# ---------------------------------------------------------

@app.route(
    "/api/messages/<friend_id>",
    methods=["POST"]
)
@login_required
def send_dm(friend_id):

    data = request.get_json(silent=True) or {}

    content = data.get("content", "").strip()


    if not content:

        return jsonify({

            "error": "Message can't be empty."

        }), 400


    conn = get_db()

    cur = conn.cursor(
        cursor_factory=
        psycopg2.extras.DictCursor
    )


    a, b = _friendship_pair(
        current_user.id,
        friend_id
    )


    cur.execute(
        """
        SELECT id FROM friendships
        WHERE user_a_id = %s AND user_b_id = %s
        """,
        (a, b)
    )


    if not cur.fetchone():

        cur.close()

        conn.close()

        return jsonify({

            "error": "You're not friends with this user."

        }), 403


    cur.execute(
        """
        INSERT INTO direct_messages
            (sender_id, receiver_id, content)
        VALUES
            (%s, %s, %s)
        RETURNING id, created_at
        """,
        (
            current_user.id,
            friend_id,
            content
        )
    )

    row = cur.fetchone()

    conn.commit()

    cur.close()

    conn.close()


    return jsonify({

        "id": str(row["id"]),
        "sender_id": str(current_user.id),
        "content": content,
        "created_at": row["created_at"].isoformat()

    }), 201


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

with app.app_context():

    init_db()


# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True
    )
