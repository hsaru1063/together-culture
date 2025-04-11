document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please login to view content.");
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch("http://127.0.0.1:8000/content", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error("Failed to fetch content");

        const contentList = await res.json();
        const grid = document.getElementById("contentGrid");
        grid.innerHTML = "";

        contentList.forEach(item => {
            const card = document.createElement("div");
            card.classList.add("card");

            const title = document.createElement("h3");
            title.textContent = `${item.title} (${capitalize(item.type)})`;

            const desc = document.createElement("p");
            desc.textContent = item.description || "No description available.";

            const button = document.createElement("button");
            if (item.type === "course") {
                button.textContent = "Start Course";
                button.onclick = () => alert(`Opening course: ${item.title}`);
            } else if (item.type === "video") {
                button.textContent = "Watch Now";
                button.onclick = () => alert(`Playing video: ${item.title}`);
            } else if (item.type === "document") {
                button.textContent = "Download";
                button.onclick = () => alert(`Downloading: ${item.title}`);
            } else {
                button.textContent = "Open";
                button.onclick = () => alert(`Opening: ${item.title}`);
            }

            card.appendChild(title);
            card.appendChild(desc);
            card.appendChild(button);
            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading content:", err);
        alert("Unable to load content. Please try again.");
    }
});

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
