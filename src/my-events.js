document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Please log in to view your events.");
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:8000/member/events", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Failed to fetch events");

        const data = await response.json();

        // Update Upcoming Events
        const upcomingList = document.querySelectorAll(".card")[0].querySelector("ul");
        upcomingList.innerHTML = "";
        data.upcoming.forEach(event => {
            const li = document.createElement("li");
            li.textContent = event;
            upcomingList.appendChild(li);
        });

        // Update Registered Events
        const registeredList = document.querySelectorAll(".card")[1].querySelector("ul");
        registeredList.innerHTML = "";
        data.registered.forEach(event => {
            const li = document.createElement("li");
            li.textContent = event;
            registeredList.appendChild(li);
        });

        // Update Past Events
        const pastList = document.querySelectorAll(".card")[2].querySelector("ul");
        pastList.innerHTML = "";
        data.past.forEach(event => {
            const li = document.createElement("li");
            li.textContent = event;
            pastList.appendChild(li);
        });

    } catch (err) {
        console.error("Error loading events:", err);
        alert("Could not load events. Please login again.");
        window.location.href = "login.html";
    }
});
