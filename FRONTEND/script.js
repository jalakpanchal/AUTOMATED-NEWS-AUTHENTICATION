// ================= API KEY =================
const API_KEY = "b09d4b64ec154aa7a8c32c0c29007379";

// ================= LOAD NEWS =================
async function loadNews() {
  try {
    const res = await fetch(
      `https://cors-anywhere.herokuapp.com/https://newsapi.org/v2/top-headlines?country=us&pageSize=12&apiKey=${API_KEY}`
    );

    const data = await res.json();
    console.log(data);

    const container = document.getElementById("news");
    container.innerHTML = "";

    data.articles.forEach(article => {
      const div = document.createElement("div");
      div.className = "card";

      div.innerHTML = `
        <h2>${article.title}</h2>
        <p>${article.description || "No description available"}</p>
      `;

      // click to verify
      div.onclick = () => verifyNews(article.title);

      container.appendChild(div);
    });

    // ticker
    document.getElementById("ticker").innerText =
      data.articles.map(a => "⚡ " + a.title).join("   ");

  } catch (err) {
    console.error(err);
  }
}

loadNews();
setInterval(loadNews, 60000);

// ================= TIMER =================
setInterval(() => {
  document.getElementById("time").innerText =
    new Date().toLocaleTimeString();
}, 1000);

// ================= DARK MODE =================
let dark = true;

function toggleDark() {
  dark = !dark;

  if (dark) {
    document.body.classList.remove("light");
  } else {
    document.body.classList.add("light");
  }
}

// ================= VERIFY =================
function verifyNews(text) {
  fetch("http://127.0.0.1:5000/predict", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  })
    .then(res => res.json())
    .then(data => {
      console.log(data);
      alert("Result: " + data.prediction);
    })
    .catch(err => {
      console.error(err);
      alert("Error connecting to backend");
    });
}

// ================= CUSTOM INPUT =================
function verifyCustom() {
  const text = document.getElementById("newsInput").value;

  if (!text) {
    alert("Enter some text!");
    return;
  }

  verifyNews(text);
}