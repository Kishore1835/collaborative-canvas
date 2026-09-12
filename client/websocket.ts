declare const io: any;

const socket = io();

const connectionText =
    document.getElementById("connectionText");

const statusDot =
    document.querySelector(".status-dot") as HTMLElement;


// ==================================================
// Connected
// ==================================================

socket.on("connect", () => {

    console.log(
        "Connected to server:",
        socket.id
    );

    if (connectionText) {
        connectionText.textContent =
            "Connected";
    }

    if (statusDot) {
        statusDot.style.background =
            "#22c55e";
    }
});


// ==================================================
// Disconnect
// ==================================================

socket.on("disconnect", (reason: string) => {

    console.log(
        "Disconnected from server:",
        reason
    );

    if (connectionText) {
        connectionText.textContent =
            "Disconnected";
    }

    if (statusDot) {
        statusDot.style.background =
            "#ef4444";
    }
});


// ==================================================
// Reconnecting
// ==================================================

socket.io.on(
    "reconnect_attempt",
    (attempt: number) => {

        console.log(
            "Reconnection attempt:",
            attempt
        );

        if (connectionText) {
            connectionText.textContent =
                "Reconnecting...";
        }

        if (statusDot) {
            statusDot.style.background =
                "#f59e0b";
        }
    }
);


// ==================================================
// Reconnected
// ==================================================

socket.io.on(
    "reconnect",
    (attempt: number) => {

        console.log(
            "Reconnected after attempts:",
            attempt
        );

        if (connectionText) {
            connectionText.textContent =
                "Connected";
        }

        if (statusDot) {
            statusDot.style.background =
                "#22c55e";
        }
        socket.emit(
            "request-canvas-state"
        );
    }
);


// ==================================================
// Reconnection failed
// ==================================================

socket.io.on(
    "reconnect_failed",
    () => {

        console.log(
            "Reconnection failed"
        );

        if (connectionText) {
            connectionText.textContent =
                "Connection failed";
        }

        if (statusDot) {
            statusDot.style.background =
                "#ef4444";
        }
    }
);


// ==================================================
// Export shared socket
// ==================================================

export default socket;