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


# ===================================================