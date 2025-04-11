document.addEventListener("DOMContentLoaded", async () => {
    console.log("Member dashboard loading...");

    const token = localStorage.getItem("token");
    if (!token) {
        alert("You must be logged in to view this page.");
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch("http://127.0.0.1:8000/member/dashboard", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            throw new Error("Unauthorized or failed to load dashboard data.");
        }

        const data = await res.json();

        // Update Upcoming Events
        const upcomingList = document.querySelectorAll(".card")[0].querySelector("ul");
        upcomingList.innerHTML = "";
        data.upcoming_events.forEach(event => {
            const li = document.createElement("li");
            li.textContent = event;
            upcomingList.appendChild(li);
        });

        // Update Recommended Events
        const recommendedList = document.querySelectorAll(".card")[1].querySelector("ul");
        recommendedList.innerHTML = "";
        data.recommended_events.forEach(event => {
            const li = document.createElement("li");
            li.textContent = event;
            recommendedList.appendChild(li);
        });

        // Update Unread Messages
        const messageCard = document.querySelectorAll(".card")[2].querySelector("p");
        messageCard.textContent = `You have ${data.messages} unread message${data.messages !== 1 ? "s" : ""}`;

        // Update Courses
        const courseList = document.querySelectorAll(".card")[3].querySelector("ul");
        courseList.innerHTML = "";
        data.courses.forEach(course => {
            const li = document.createElement("li");
            li.textContent = course;
            courseList.appendChild(li);
        });

    } catch (error) {
        console.error("Dashboard load error:", error);
        alert("Failed to load dashboard data. Please login again.");
        window.location.href = "login.html";
    }
});
