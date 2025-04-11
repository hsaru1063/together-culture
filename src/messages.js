let currentChatPartner = null;

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("You must be logged in to view this page.");
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch("http://127.0.0.1:8000/member/messages", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) throw new Error("Failed to load conversations.");

        const data = await res.json();
        const list = document.getElementById("conversationList");
        list.innerHTML = "";

        data.conversations.forEach(name => {
            const li = document.createElement("li");
            li.textContent = name;
            li.onclick = () => loadConversation(name);
            list.appendChild(li);
        });

    } catch (err) {
        console.error("Error loading messages:", err);
        alert("Unable to load messages.");
    }
});

function loadConversation(name) {
    currentChatPartner = name;
    document.getElementById("chatWith").textContent = `Chat with ${name}`;
    const chatBox = document.getElementById("chatBox");
    chatBox.innerHTML = `
        <p><strong>${name}:</strong> Hi there!</p>
        <p><strong>You:</strong> Hello! 👋</p>
    `;
}

async function sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById("messageInput");
    const message = input.value.trim();
    if (!message || !currentChatPartner) return;

    const token = localStorage.getItem("token");

    try {
        const res = await fetch("http://127.0.0.1:8000/member/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                to: currentChatPartner,
                text: message
            })
        });

        if (!res.ok) throw new Error("Message send failed.");

        const chatBox = document.getElementById("chatBox");
        chatBox.innerHTML += `<p><strong>You:</strong> ${message}</p>`;
        input.value = "";
        chatBox.scrollTop = chatBox.scrollHeight;

    } catch (err) {
        console.error("Send failed:", err);
        alert("Could not send the message.");
    }
}

function logout() {
    localStorage.removeItem("token");
}
