# 📰 Automated News Authentication

This project detects whether a news article is **Real** or **Fake** using **Machine Learning** and **Natural Language Processing (NLP)**.  
It also integrates **real-time news APIs**, allowing users to verify live news articles instantly.

---

## 🚀 Features

✅ Classifies news as **Real** or **Fake**  
🔄 Fetches **real-time news headlines**  
🧹 Text preprocessing (**stopword removal, lemmatization, cleaning**)  
📊 **TF-IDF Vectorization**  
🤖 Machine Learning models (**SVM**, can use other models too)  
🌐 Web interface using **Flask**  
⚡ Fast and scalable pipeline  

---

## 🌐 Real-Time News Integration

This project uses a **News API** to fetch latest headlines in real-time and runs them through the fake news detection model.

### 🔌 Supported APIs
- NewsAPI  
- GNews API  

---

## 💡 How it Works

1. Fetch latest news using API  
2. Clean and preprocess text  
3. Convert text using **TF-IDF Vectorization**  
4. Predict using trained **ML model**  
5. Display result (**Real / Fake**) on UI  

---

## 🛠️ Tech Stack

### Backend
- Python  
- Flask  

### Machine Learning / NLP
- Pandas  
- NumPy  
- Scikit-learn  
- NLTK / SpaCy  

### API Integration
- Requests  

### Frontend
- HTML  
- CSS  
- JavaScript  

---

## 📂 Project Structure

```bash
Automated-News-Authentication/
│
├── BACKEND/
│   ├── app.py
│   ├── requirements.txt
│
├── FRONTEND/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│
├── NOTEBOOK/
│   ├── fake-news.ipynb
│
└── README.md
