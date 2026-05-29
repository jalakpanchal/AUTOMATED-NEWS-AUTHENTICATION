import os
import re
import string
import pickle
import requests
import xml.etree.ElementTree as ET
from difflib import SequenceMatcher

from flask import Flask, request, jsonify
from flask_cors import CORS


# ============================================================
# FLASK SETUP
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# PATH SETUP
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "..", "MODEL", "model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "..", "MODEL", "vectorizer.pkl")


# ============================================================
# LOAD MODEL AND VECTORIZER
# ============================================================

model = None
vectorizer = None

try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)

    with open(VECTORIZER_PATH, "rb") as f:
        vectorizer = pickle.load(f)

    print("✅ Model and vectorizer loaded successfully.")

except Exception as e:
    print("❌ Model/vectorizer loading error:", e)


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text):
    text = str(text).lower()

    text = re.sub(r"http\S+|www\S+|https\S+", "", text)
    text = re.sub(r"<.*?>", "", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\d+", "", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text


def remove_html(text):
    text = str(text)
    text = re.sub(r"<.*?>", "", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def text_similarity(a, b):
    return SequenceMatcher(None, str(a).lower(), str(b).lower()).ratio()


def important_words(text):
    stopwords = {
        "the", "and", "for", "with", "that", "this", "from", "into", "when",
        "where", "what", "why", "how", "was", "were", "are", "is", "has",
        "have", "had", "will", "would", "could", "should", "about", "after",
        "before", "during", "over", "under", "its", "his", "her", "their",
        "our", "you", "your", "they", "them", "but", "new", "news", "a",
        "an", "to", "of", "in", "on", "as", "by", "at"
    }

    text = clean_text(text)
    words = text.split()

    return {
        word for word in words
        if len(word) > 2 and word not in stopwords
    }


def word_overlap_score(query, article_text):
    query_words = important_words(query)
    article_words = important_words(article_text)

    if not query_words:
        return 0

    common_words = query_words.intersection(article_words)

    return len(common_words) / len(query_words)


def has_debunk_words(text):
    text = str(text).lower()

    debunk_words = [
        "fake",
        "false",
        "hoax",
        "debunk",
        "debunked",
        "misleading",
        "fact check",
        "fact-check",
        "conspiracy",
        "rumor",
        "rumour"
    ]

    return any(word in text for word in debunk_words)


def has_negative_words(text):
    text = str(text).lower()

    negative_words = [
        "not",
        "never",
        "no",
        "isn't",
        "wasn't",
        "aren't",
        "won't",
        "cannot",
        "can't",
        "denies",
        "denied",
        "without"
    ]

    words = clean_text(text).split()

    return any(word in words for word in negative_words)


def is_too_short_or_vague(text):
    cleaned = clean_text(text)
    words = cleaned.split()
    key_words = important_words(text)

    # Too short to verify properly
    if len(words) < 7:
        return True

    # Only 1-2 useful words like "Trump president" is too vague
    if len(key_words) < 4:
        return True

    return False


def looks_like_bad_claim(text):
    cleaned = clean_text(text)

    suspicious_patterns = [
        "not the presidentship",
        "not presidentship",
        "is the presidentship",
        "are the presidentship",
        "presidentship",
        "prime ministership",
        "is not the president",
        "is not president"
    ]

    return any(pattern in cleaned for pattern in suspicious_patterns)


# ============================================================
# ML PREDICTION
# ============================================================

def predict_with_ml(news_text):
    if model is None or vectorizer is None:
        raise Exception("Model or vectorizer not loaded. Please check MODEL folder.")

    cleaned_text = clean_text(news_text)

    vectorized_text = vectorizer.transform([cleaned_text])

    raw_prediction = int(model.predict(vectorized_text)[0])

    # IMPORTANT:
    # Notebook label mapping:
    # 0 = FAKE
    # 1 = REAL
    ml_label = "REAL" if raw_prediction == 1 else "FAKE"

    if hasattr(model, "predict_proba"):
        probability = model.predict_proba(vectorized_text)[0]
        confidence = round(float(max(probability) * 100), 2)
    else:
        confidence = 75.0

    return {
        "cleaned_text": cleaned_text,
        "raw_prediction": raw_prediction,
        "ml_prediction": ml_label,
        "ml_confidence": confidence
    }


# ============================================================
# GOOGLE NEWS LIVE VERIFICATION
# Works without API key
# ============================================================

def get_google_news_items(query=""):
    try:
        if query:
            url = "https://news.google.com/rss/search"

            params = {
                "q": query[:180],
                "hl": "en-IN",
                "gl": "IN",
                "ceid": "IN:en"
            }

        else:
            url = "https://news.google.com/rss"

            params = {
                "hl": "en-IN",
                "gl": "IN",
                "ceid": "IN:en"
            }

        response = requests.get(url, params=params, timeout=10)

        if response.status_code != 200:
            return []

        root = ET.fromstring(response.content)

        items = []

        for item in root.findall(".//item"):
            title = item.findtext("title") or ""
            link = item.findtext("link") or ""
            pub_date = item.findtext("pubDate") or ""
            description = item.findtext("description") or ""

            source = "Google News"

            source_tag = item.find("{*}source")
            if source_tag is not None and source_tag.text:
                source = source_tag.text

            items.append({
                "title": remove_html(title),
                "description": remove_html(description),
                "source": remove_html(source),
                "url": link,
                "published_at": pub_date
            })

        return items

    except Exception as e:
        print("Google News error:", e)
        return []


def verify_with_google_news(query):
    try:
        # Do not live-verify vague/short/negative claims directly
        if is_too_short_or_vague(query):
            return {
                "enabled": True,
                "matched": False,
                "matches": [],
                "source_mode": "Live verification skipped because the claim is too short or vague."
            }

        if looks_like_bad_claim(query):
            return {
                "enabled": True,
                "matched": False,
                "matches": [],
                "source_mode": "Live verification skipped because the claim wording looks unreliable."
            }

        articles = get_google_news_items(query)

        matched_articles = []

        query_has_negative = has_negative_words(query)

        for article in articles:
            title = article.get("title", "") or ""
            description = article.get("description", "") or ""
            source = article.get("source", "") or "Google News"
            url = article.get("url", "") or ""
            published_at = article.get("published_at", "") or ""

            combined_article_text = f"{title} {description}"

            similarity_score = text_similarity(query, combined_article_text)
            overlap_score = word_overlap_score(query, combined_article_text)

            if has_debunk_words(combined_article_text):
                continue

            # If query has "not/never/no", require much stronger match
            if query_has_negative:
                if similarity_score >= 0.45 and overlap_score >= 0.60:
                    matched_articles.append({
                        "title": title,
                        "description": description,
                        "source": source,
                        "url": url,
                        "published_at": published_at,
                        "similarity": round(similarity_score, 2),
                        "overlap": round(overlap_score, 2)
                    })

            else:
                if similarity_score >= 0.22 or overlap_score >= 0.45:
                    matched_articles.append({
                        "title": title,
                        "description": description,
                        "source": source,
                        "url": url,
                        "published_at": published_at,
                        "similarity": round(similarity_score, 2),
                        "overlap": round(overlap_score, 2)
                    })

        if matched_articles:
            return {
                "enabled": True,
                "matched": True,
                "matches": matched_articles[:5],
                "source_mode": "Live verification found related articles using Google News."
            }

        return {
            "enabled": True,
            "matched": False,
            "matches": [],
            "source_mode": "No strong live source match found. ML model result used."
        }

    except Exception as e:
        return {
            "enabled": True,
            "matched": False,
            "matches": [],
            "source_mode": "Live verification failed. ML model result used.",
            "error": str(e)
        }


# ============================================================
# FINAL DECISION LOGIC
# ============================================================

def make_final_decision(news_text):
    ml_result = predict_with_ml(news_text)

    ml_label = ml_result["ml_prediction"]
    ml_confidence = ml_result["ml_confidence"]

    # Default live check when skipped
    live_check = {
        "enabled": True,
        "matched": False,
        "matches": [],
        "source_mode": "Live verification skipped for short/vague claim."
    }

    # VERY IMPORTANT:
    # Do not trust Google News for short/vague/negative claims.
    # Example: "Trump is not the presidentship"
    # It only matches the word Trump, so it should NOT become REAL.
    if looks_like_bad_claim(news_text):
        return {
            "prediction": "FAKE",
            "confidence": max(ml_confidence, 85.0),
            "message": "The claim wording looks unreliable or grammatically incorrect, so it is treated as fake.",
            "ml_prediction": ml_label,
            "ml_confidence": ml_confidence,
            "raw_prediction": ml_result["raw_prediction"],
            "cleaned_text": ml_result["cleaned_text"],
            "live_check": live_check,
            "source_mode": "Live verification skipped because the claim wording looks unreliable."
        }

    if is_too_short_or_vague(news_text) or has_negative_words(news_text):
        return {
            "prediction": "UNCERTAIN",
            "confidence": ml_confidence,
            "message": "This claim is too short, vague, or negative. Please enter a complete news headline or article for better verification.",
            "ml_prediction": ml_label,
            "ml_confidence": ml_confidence,
            "raw_prediction": ml_result["raw_prediction"],
            "cleaned_text": ml_result["cleaned_text"],
            "live_check": live_check,
            "source_mode": "Live verification skipped because the claim is too short/vague."
        }

    # Only now use Google News live verification
    live_check = verify_with_google_news(news_text)

    final_label = ml_label
    final_confidence = ml_confidence

    if live_check.get("matched"):
        final_label = "REAL"
        final_confidence = max(ml_confidence, 85.0)
        message = "This news was found in live source verification, so it appears credible."

    elif ml_label == "REAL" and ml_confidence >= 55:
        final_label = "REAL"
        final_confidence = ml_confidence
        message = "The model found credible news writing patterns."

    elif ml_label == "FAKE" and ml_confidence >= 60:
        final_label = "FAKE"
        final_confidence = ml_confidence
        message = "The model found misinformation-style patterns."

    else:
        final_label = "UNCERTAIN"
        final_confidence = ml_confidence
        message = "The model is not confident enough. Please verify this news from trusted sources."

    return {
        "prediction": final_label,
        "confidence": final_confidence,
        "message": message,
        "ml_prediction": ml_label,
        "ml_confidence": ml_confidence,
        "raw_prediction": ml_result["raw_prediction"],
        "cleaned_text": ml_result["cleaned_text"],
        "live_check": live_check,
        "source_mode": live_check.get("source_mode", "ML model used.")
    }


# ============================================================
# ROUTES
# ============================================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Automated News Authentication Backend is running successfully.",
        "model_loaded": model is not None,
        "vectorizer_loaded": vectorizer is not None,
        "google_news_fallback": True,
        "status": "success"
    })


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No JSON data received.",
                "status": "failed"
            }), 400

        news_text = data.get("text", "").strip()

        if news_text == "":
            return jsonify({
                "error": "News text is empty.",
                "status": "failed"
            }), 400

        result = make_final_decision(news_text)

        return jsonify({
            "prediction": result["prediction"],
            "confidence": result["confidence"],
            "message": result["message"],
            "ml_prediction": result["ml_prediction"],
            "ml_confidence": result["ml_confidence"],
            "raw_prediction": result["raw_prediction"],
            "cleaned_text": result["cleaned_text"],
            "live_check": result["live_check"],
            "source_mode": result["source_mode"],
            "status": "success"
        })

    except Exception as e:
        return jsonify({
            "error": str(e),
            "status": "failed"
        }), 500


@app.route("/news", methods=["GET"])
def get_live_news():
    try:
        query = request.args.get("q", "").strip()

        google_articles = get_google_news_items(query)

        final_articles = []

        for article in google_articles[:10]:
            title = article.get("title", "") or ""
            description = article.get("description", "") or ""
            source = article.get("source", "") or "Google News"
            url = article.get("url", "") or ""
            published_at = article.get("published_at", "") or ""

            combined_text = f"{title}. {description}"

            if has_debunk_words(combined_text):
                prediction = "FAKE"
                confidence = 85.0
            else:
                prediction = "REAL"
                confidence = 90.0

            final_articles.append({
                "title": title,
                "description": description,
                "source": source,
                "url": url,
                "published_at": published_at,
                "prediction": prediction,
                "confidence": confidence
            })

        return jsonify({
            "articles": final_articles,
            "status": "success"
        })

    except Exception as e:
        return jsonify({
            "articles": [],
            "error": str(e),
            "status": "failed"
        }), 500


# ============================================================
# RUN APP
# ============================================================

if __name__ == "__main__":
    app.run(debug=True, port=5000)
