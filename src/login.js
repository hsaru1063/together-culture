document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const messageArea = document.getElementById("messageArea");

    if (!email || !password) {
        messageArea.textContent = "Please enter both email and password.";
        return;
    }

    messageArea.textContent = "Logging in...";

    try {
        // Step 1: Login and get token
        const loginRes = await fetch("http://127.0.0.1:8000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                username: email,
                password: password
            }),
        });

        if (!loginRes.ok) {
            const error = await loginRes.json();
            messageArea.textContent = error.detail || "Login failed.";
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.access_token;

        // Save token to localStorage
        localStorage.setItem("token", token);

        // Step 2: Get user info
        const meRes = await fetch("http://127.0.0.1:8000/me", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const user = await meRes.json();

        // Step 3: Redirect
        if (user.is_admin) {
            window.location.href = "admin-dashboard.html";
        } else {
            window.location.href = "member-dashboard.html";
        }

    } catch (err) {
        console.error("Login error:", err);
        messageArea.textContent = "Server error. Please try again.";
    }
});
