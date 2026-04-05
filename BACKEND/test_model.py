import pickle
import os

# Load model
model_path = os.path.join("..", "MODEL", "model.pkl")
with open(model_path, "rb") as f:
    model = pickle.load(f)

# Predict
prediction = model.predict(["Some news text"])[0]  # get the single value
label = "REAL" if prediction == 1 else "FAKE"

print("Prediction:", label)