from flask import Flask, render_template, request, jsonify, session
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
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


app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "fallback-secret-key")

# ---------------- SYSTEM ----------------

SYSTEM_PROMPT = """
You are Cipher.

Created by Fatai Quadri.

If asked who created you, say:
"I was created by Fatai Quadri."

You are a helpful, friendly AI assistant. Here's how you respond:

- Lead with the answer first, then explain if it helps — don't bury the point in a long windup.
- Keep a warm, conversational tone, like a knowledgeable friend, not a textbook.
- For calculations or multi-step problems, walk through the steps clearly and in order, showing your work, not just the final result.
- Keep explanations concise but complete — enough detail to be useful without rambling.
- If a question is ambiguous, make a reasonable assumption, briefly state it, and answer anyway rather than asking too many clarifying questions.
- Use plain, everyday language. Avoid unnecessary jargon.
- Break longer answers into short paragraphs or simple lists when that makes them easier to scan.
- Stay patient and encouraging, especially with calculations or problem-solving.
- Don't pad responses with filler, disclaimers, or over-apologizing.
"""

API_KEY = os.environ.get("GEMINI_API_KEY")

MODEL = "gemini-2.5-flash"

# ---------------- SAFE MATH ----------------

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
        return node.value

    if isinstance(node, ast.BinOp):
        return allowed_operators[type(node.op)](
            calculate(node.left),
            calculate(node.right)
        )

    if isinstance(node, ast.UnaryOp):
        return -calculate(node.operand)

    raise ValueError

def safe_math(expression):
    expression = expression.lower()
    expression = expression.replace("×", "*")
    expression = expression.replace("÷", "/")
    expression = expression.replace("^", "**")
    expression = expression.replace("²", "**2")
    expression = expression.replace("³", "**3")
    expression = expression.replace("π", str(math.pi))

    expression = re.sub(r"[^0-9+\-*/(). ]", "", expression)

    try:
        tree = ast.parse(expression, mode="eval")
        return calculate(tree.body)
    except:
        return "I couldn't solve that."

# ---------------- GEMINI AI ----------------

def ask_ai(message):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

    payload = {
        "contents": [
            {"parts": [{"text": SYSTEM_PROMPT}]},
            {"parts": [{"text": message}]}
        ]
    }

    try:
        response = requests.post(url, json=payload)

        if response.status_code == 200:
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"]

        return "API Error"

    except:
        return "Network error"

# ---------------- DATABASE ----------------

def get_db():
    conn = psycopg2.connect(os.environ.get("DATABASE_URL"), sslmode="require")
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            username VARCHAR(80) UNIQUE NOT NULL,
            email VARCHAR(120) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS chats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(200) DEFAULT 'New Chat',
            pinned BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
            role VARCHAR(10) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)

    conn.commit()
    cur.close()
    conn.close()

# ---------------- FLASK-LOGIN ----------------

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "home"

class User(UserMixin):
    def __init__(self, id, username, email):
        self.id = str(id)
        self.username = username
        self.email = email

@login_manager.user_loader
def load_user(user_id):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row:
        return User(row["id"], row["username"], row["email"])
    return None

# ---------------- AUTH ROUTES ----------------

@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "All fields are required."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id, username, email",
            (username, email, generate_password_hash(password))
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        user = User(row["id"], row["username"], row["email"])
        login_user(user, remember=True)
        return jsonify({"success": True, "username": user.username})

    except psycopg2.errors.UniqueViolation:
        return jsonify({"error": "Username or email already taken."}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row or not check_password_hash(row["password_hash"], password):
            return jsonify({"error": "Invalid email or password."}), 401

        user = User(row["id"], row["username"], row["email"])
        login_user(user, remember=True)
        return jsonify({"success": True, "username": user.username})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return jsonify({"success": True})

@app.route("/me")
def me():
    if current_user.is_authenticated:
        return jsonify({"logged_in": True, "username": current_user.username})
    return jsonify({"logged_in": False})

# ---------------- CHAT ROUTES ----------------

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chats", methods=["GET"])
@login_required
def get_chats():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute(
        "SELECT id, title, pinned, updated_at FROM chats WHERE user_id = %s ORDER BY pinned DESC, updated_at DESC",
        (current_user.id,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    chats = [
        {
            "id": str(row["id"]),
            "title": row["title"],
            "pinned": row["pinned"],
            "updated_at": row["updated_at"].isoformat()
        }
        for row in rows
    ]
    return jsonify(chats)

@app.route("/chats/new", methods=["POST"])
@login_required
def new_chat():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute(
        "INSERT INTO chats (user_id, title) VALUES (%s, %s) RETURNING id, title, pinned",
        (current_user.id, "New Chat")
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({
        "id": str(row["id"]),
        "title": row["title"],
        "pinned": row["pinned"]
    })

@app.route("/chats/<chat_id>/messages", methods=["GET"])
@login_required
def get_messages(chat_id):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    # Verify ownership
    cur.execute("SELECT id FROM chats WHERE id = %s AND user_id = %s", (chat_id, current_user.id))
    if not cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"error": "Not found"}), 404

    cur.execute(
        "SELECT role, content FROM messages WHERE chat_id = %s ORDER BY created_at ASC",
        (chat_id,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    messages = [{"role": r["role"], "content": r["content"]} for r in rows]
    return jsonify(messages)

@app.route("/chats/<chat_id>/pin", methods=["POST"])
@login_required
def toggle_pin(chat_id):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    cur.execute(
        "UPDATE chats SET pinned = NOT pinned WHERE id = %s AND user_id = %s RETURNING pinned",
        (chat_id, current_user.id)
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not row:
        return jsonify({"error": "Not found"}), 404

    return jsonify({"pinned": row["pinned"]})

@app.route("/chats/<chat_id>/delete", methods=["POST"])
@login_required
def delete_chat(chat_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM chats WHERE id = %s AND user_id = %s", (chat_id, current_user.id))
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"success": True})

@app.route("/chat", methods=["POST"])
@login_required
def chat():
    data = request.json
    message = data.get("message", "")
    chat_id = data.get("chat_id")

    if not message:
        return jsonify({"error": "Empty message"}), 400

    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

    # Verify chat ownership if chat_id provided
    if chat_id:
        cur.execute(
            "SELECT id FROM chats WHERE id = %s AND user_id = %s",
            (chat_id, current_user.id)
        )
        if not cur.fetchone():
            chat_id = None

    # Create new chat if needed
    if not chat_id:
        title = (message[:40] + "…") if len(message) > 40 else message
        cur.execute(
            "INSERT INTO chats (user_id, title) VALUES (%s, %s) RETURNING id",
            (current_user.id, title)
        )
        chat_id = str(cur.fetchone()["id"])
        conn.commit()

    # Save user message
    cur.execute(
        "INSERT INTO messages (chat_id, role, content) VALUES (%s, %s, %s)",
        (chat_id, "user", message)
    )

    # Get reply
    msg = message.lower()

    if "hello" in msg or "hi" in msg:
        reply = "Hello 👋 I'm Cipher."
    elif "joke" in msg:
        reply = random.choice([
            "Why did the computer sneeze? Virus 😂",
            "Python devs love snakes 🐍"
        ])
    elif any(op in msg for op in ["+", "-", "*", "/", "×", "÷"]):
        reply = str(safe_math(message))
    else:
        reply = ask_ai(message)

    # Save assistant reply
    cur.execute(
        "INSERT INTO messages (chat_id, role, content) VALUES (%s, %s, %s)",
        (chat_id, "assistant", reply)
    )

    # Update chat timestamp
    cur.execute("UPDATE chats SET updated_at = NOW() WHERE id = %s", (chat_id,))

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"reply": reply, "chat_id": chat_id})

# ---------------- INIT ----------------

with app.app_context():
    init_db()

if __name__ == "__main__":
    app.run(debug=True)