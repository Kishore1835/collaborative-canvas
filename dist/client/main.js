import { setTool, setColor, setWidth } from "./canvas.js";
import socket from "./websocket.js";
// ==================================================
// Tool buttons
// ==================================================
const brushBtn = document.getElementById("brushBtn");
const eraserBtn = document.getElementById("eraserBtn");
brushBtn.addEventListener("click", () => {
    setTool("brush");
    brushBtn.classList.add("active");
    eraserBtn.classList.remove("active");
});
eraserBtn.addEventListener("click", () => {
    setTool("eraser");
    eraserBtn.classList.add("active");
    brushBtn.classList.remove("active");
});
// ==================================================
// Color picker
// ==================================================
const colorPicker = document.getElementById("colorPicker");
colorPicker.addEventListener("input", () => {
    setColor(colorPicker.value);
});
// ==================================================
// Brush width
// ==================================================
const brushSize = document.getElementById("brushSize");
const brushSizeValue = document.getElementById("brushSizeValue");
brushSize.addEventListener("input", () => {
    const width = Number(brushSize.value);
    setWidth(width);
    brushSizeValue.textContent =
        `${width}px`;
});
// ==================================================
// Undo / Redo / Clear
// ==================================================
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const clearBtn = document.getElementById("clearBtn");
// ==================================================
// Undo
// ==================================================
undoBtn.addEventListener("click", () => {
    console.log("UNDO REQUESTED");
    socket.emit("undo");
});
// ==================================================
// Redo
// ==================================================
redoBtn.addEventListener("click", () => {
    console.log("REDO REQUESTED");
    socket.emit("redo");
});
// ==================================================
// Clear
// ==================================================
clearBtn.addEventListener("click", () => {
    console.log("CLEAR REQUESTED");
    socket.emit("clear-canvas");
});
// ==================================================
// Online Users
// ==================================================
const onlineUsersContainer = document.getElementById("onlineUsers");
socket.on("users-update", (users) => {
    if (!onlineUsersContainer) {
        return;
    }
    onlineUsersContainer.innerHTML =
        "";
    users.forEach((user, index) => {
        const userElement = document.createElement("div");
        userElement.className =
            "online-user";
        const dot = document.createElement("span");
        dot.className =
            "user-color";
        dot.style.backgroundColor =
            user.color;
        const name = document.createElement("span");
        name.textContent =
            `User ${index + 1}`;
        userElement.appendChild(dot);
        userElement.appendChild(name);
        onlineUsersContainer.appendChild(userElement);
    });
});
//# sourceMappingURL=main.js.map