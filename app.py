from flask import Flask, render_template, request, jsonify
import math
import json
import os
import re
import random
import ast
import operator
import requests

app = Flask(__name__)

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

# ---------------- ROUTES ----------------

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    message = data.get("message", "")

    msg = message.lower()

    # simple logic
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

    return jsonify({"reply": reply})

# ---------------- RUN ----------------

if __name__ == "__main__":
    app.run(debug=True)