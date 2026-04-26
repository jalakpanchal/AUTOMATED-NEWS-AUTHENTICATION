import os
import re
import pickle
from pathlib import Path

import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

# ----------------------------
# APP SETUP
# ----------------------------
app = Flask(__name__)
CORS(app)

# ----------------------------
# PATHS
# ----------------------------
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
MODEL_PATH = PROJECT_ROOT / "MODEL" / "model.pkl"

# ----------------------------
# LOAD MODEL
# ----------------------------
if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Model file not found at: {MODEL_PATH}")

with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

# ----------------------------
# CONFIG
# ----------------------------
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "").strip()

# ----------------------------
# TEXT CLEANING
# Must match notebook logic
# ----------------------------
def clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+|https\S+", " ", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

# ----------------------------
# ROUTES
# ----------------------------
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Fake News Detection Backend is running"
    })

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": True,
        "model_path": str(MODEL_PATH)
    })

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(silent=True)

        if not data:
            return jsonify({"error": "No JSON data received"}), 400

        text = data.get("text", "").strip()

        if not text:
            return jsonify({"error": "Text is required"}), 400

        cleaned = clean_text(text)
        prediction = model.predict([cleaned])[0]

        result = "Real News" if prediction == 1 else "Fake News"

        return jsonify({
            "prediction": result,
            "input_text": text
        })

    except Exception as e:
        return jsonify({
            "error": f"Prediction failed: {str(e)}"
        }), 500

@app.route("/news", methods=["GET"])
def get_news():
    """
    Returns latest headlines for your frontend cards/ticker.
    Uses NewsAPI if NEWS_API_KEY is set.
    Falls back to sample articles if not set or request fails.
    """
    try:
        if NEWS_API_KEY:
            url = "https://newsapi.org/v2/top-headlines"
            params = {
                "country": "us",
                "pageSize": 9,
                "apiKey": NEWS_API_KEY
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if data.get("status") == "ok":
                articles = []
                for article in data.get("articles", []):
                    articles.append({
                        "title": article.get("title", "No title"),
                        "description": article.get("description") or "No description available",
                        "url": article.get("url", ""),
                        "source": article.get("source", {}).get("name", "Unknown"),
                        "publishedAt": article.get("publishedAt", "")
                    })

                return jsonify({"articles": articles})

        # Fallback if no key or API fails
        fallback_articles = [
            {
                "title": "Breaking: Global markets react to new economic policy",
                "description": "Analysts are studying the long-term effects of the announcement.",
                "url": "",
                "source": "Demo Feed",
                "publishedAt": ""
            },
            {
                "title": "Scientists report progress in renewable energy storage",
                "description": "Researchers say new materials could improve battery efficiency.",
                "url": "",
                "source": "Demo Feed",
                "publishedAt": ""
            },
            {
                "title": "Government announces nationwide education reform proposal",
                "description": "Officials say the proposal will be reviewed over the coming months.",
                "url": "",
                "source": "Demo Feed",
                "publishedAt": ""
            },
            {
                "title": "New AI model released for language understanding tasks",
                "description": "Developers claim improved performance on benchmark datasets.",
                "url": "",
                "source": "Demo Feed",
                "publishedAt": ""
            },
            {
                "title": "Space agency prepares next mission for lunar research",
                "description": "The mission will focus on surface mapping and sample collection.",
                "url": "",
                "source": "Demo Feed",
                "publishedAt": ""
            },
            {
                "title": "Public health officials monitor seasonal disease patterns",
                "description": "Experts recommend awareness and preventive measures.",
                "url": "",
                "source": "Demo Feed",
                "publishedAt": ""
            }
        ]

        return jsonify({"articles": fallback_articles})

    except Exception as e:
        return jsonify({
            "articles": [],
            "error": f"Failed to fetch news: {str(e)}"
        }), 500

# ----------------------------
# RUN
# ----------------------------
if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)