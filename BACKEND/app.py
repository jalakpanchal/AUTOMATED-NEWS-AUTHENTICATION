import os
import pickle
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Correct path to model.pkl
model_path = os.path.join("..", "MODEL", "model.pkl")  # points to MODEL folder
model = pickle.load(open(model_path, "rb"))

@app.route("/")
def home():
    return "Fake News Detector API is running"

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json["text"]
    prediction = model.predict([data])[0]

    # Convert numeric label to text
    label = "REAL" if prediction == 1 else "FAKE"

    return jsonify({"prediction": label})

if __name__ == "__main__":
    app.run(debug=True)