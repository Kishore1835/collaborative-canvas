import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();

const httpServer =
    createServer(app);

const io =
    new Server(httpServer);

const PORT = 3000;


// ==================================================
// SERVE CLIENT
// ==================================================

app.use(
    express.static(
        path.join(
            process.cwd(),
            "client"
        )
    )
);


// ==================================================
// JAVASCRIPT ROUTES
// ==================================================

app.get(
    "/main.js",
    (_req, res) => {

        res.sendFile(
            path.join(
                process.cwd(),
                "dist/client/main.js"
            )
        );

    }
);


app.get(
    "/canvas.js",
    (_req, res) => {

        res.sendFile(
            path.join(
                process.cwd(),
                "dist/client/canvas.js"
            )
        );

    }
);


app.get(
    "/websocket.js",
    (_req, res) => {

        res.sendFile(
            path.join(
                process.cwd(),
                "dist/client/websocket.js"
            )
        );

    }
);


// ==================================================
// HEALTH
// ==================================================

app.get(
    "/health",
    (_req, res) => {

        res.json({

            status: "ok",

            message:
                "Collaborative Canvas server is running"

        });

    }
);


// ==================================================
// TYPES
// ==================================================

interface Point {

    x: number;

    y: number;

}


interface Stroke {

    id: string;

    userId: string;

    points: Point[];

    color: string;

    width: number;

    tool:
        "brush" | "eraser";

}


// ==================================================
// INPUT VALIDATION HELPERS
// ==================================================

function isValidNumber(
    value: unknown
): value is number {

    return (
        typeof value === "number" &&
        Number.isFinite(value)
    );

}


function isValidPoint(
    point: unknown
): point is Point {

    if (
        typeof point !== "object" ||
        point === null
    ) {

        return false;

    }

    const data =
        point as Record<string, unknown>;

    return (
        isValidNumber(data.x) &&
        isValidNumber(data.y)
    );

}


function isValidColor(
    color: unknown
): color is string {

    return (
        typeof color === "string" &&
        color.length > 0 &&
        color.length <= 50
    );

}


function isValidWidth(
    width: unknown
): width is number {

    return (
        isValidNumber(width) &&
        width > 0 &&
        width <= 100
    );

}


function isValidTool(
    tool: unknown
): tool is "brush" | "eraser" {

    return (
        tool === "brush" ||
        tool === "eraser"
    );

}


function isValidDrawingData(
    data: unknown
): data is {
    x: number;
    y: number;
    color: string;
    width: number;
    tool: "brush" | "eraser";
} {

    if (
        typeof data !== "object" ||
        data === null
    ) {

        return false;

    }

    const drawingData =
        data as Record<string, unknown>;

    return (
        isValidNumber(drawingData.x) &&
        isValidNumber(drawingData.y) &&
        isValidColor(drawingData.color) &&
        isValidWidth(drawingData.width) &&
        isValidTool(drawingData.tool)
    );

}


function isValidStroke(
    stroke: unknown
): stroke is Stroke {

    if (
        typeof stroke !== "object" ||
        stroke === null
    ) {

        return false;

    }

    const data =
        stroke as Record<string, unknown>;

    return (
        typeof data.id === "string" &&
        data.id.length > 0 &&

        typeof data.userId === "string" &&
        data.userId.length > 0 &&

        Array.isArray(data.points) &&
        data.points.length > 0 &&
        data.points.every(
            isValidPoint
        ) &&

        isValidColor(data.color) &&

        isValidWidth(data.width) &&

        isValidTool(data.tool)
    );

}


// ==================================================
// CANVAS HISTORY
// ==================================================

let strokes: Stroke[] = [];

let redoStack: Stroke[] = [];


// ==================================================
// CANVAS REVISION
// ==================================================

let canvasRevision = 0;


// ==================================================
// CURRENTLY DRAWING STROKES
// ==================================================

const activeStrokes:
    Record<
        string,
        Stroke | undefined
    > = {};


// ==================================================
// ONLINE USERS
// ==================================================

const userColors = [

    "#ef4444",

    "#3b82f6",

    "#22c55e",

    "#a855f7",

    "#f97316",

    "#06b6d4",

    "#eab308",

    "#ec4899"

];


const users:
    Map<string, string> =
        new Map();


// ==================================================
// SEND USERS UPDATE
// ==================================================

function sendUsersUpdate(): void {

    const userList =
        Array.from(
            users.entries()
        ).map(
            ([id, color]) => ({

                id,

                color

            })
        );


    io.emit(
        "users-update",
        userList
    );

}


// ==================================================
// BROADCAST CANVAS
// ==================================================

function broadcastCanvas(): void {

    io.emit(
        "canvas-state",
        {
            strokes,
            revision:
                canvasRevision
        }
    );

}


// ==================================================
// SOCKET.IO ERROR HANDLING
// ==================================================

io.engine.on(
    "connection_error",
    (err) => {

        console.error(
            "Socket.IO connection error:",
            err.message
        );

    }
);
// ==================================================
// SOCKET.IO
// ==================================================

io.on(
    "connection",
    (socket) => {

        console.log(
            `User connected: ${socket.id}`
        );


        // ==================================================
        // ASSIGN USER COLOR
        // ==================================================

        const colorIndex =
            users.size %
            userColors.length;


        const assignedColor =
            userColors[colorIndex];


        users.set(
            socket.id,
            assignedColor
        );


        console.log(
            `Assigned color ${assignedColor} to ${socket.id}`
        );


        sendUsersUpdate();


        // ==================================================
        // SEND EXISTING CANVAS
        // ==================================================

        socket.emit(
            "canvas-state",
            {
                strokes,
                revision:
                    canvasRevision
            }
        );


        // ==================================================
        // REQUEST LATEST CANVAS STATE
        // ==================================================

        socket.on(
            "request-canvas-state",
            () => {

                console.log(
                    `Canvas state requested by ${socket.id}`
                );


                socket.emit(
                    "canvas-state",
                    {
                        strokes,
                        revision:
                            canvasRevision
                    }
                );

            }
        );


        // ==================================================
        // DRAWING START
        // ==================================================

        socket.on(
            "drawing-start",
            (data: unknown) => {

                // Validate incoming drawing data
                if (
                    !isValidDrawingData(data)
                ) {

                    console.warn(
                        `Invalid drawing-start received from ${socket.id}`
                    );

                    return;

                }


                const stroke: Stroke = {

                    id:
                        `${socket.id}-${Date.now()}-${Math.random()}`,

                    userId:
                        socket.id,

                    points: [

                        {
                            x: data.x,

                            y: data.y
                        }

                    ],

                    color:
                        data.color,

                    width:
                        data.width,

                    tool:
                        data.tool

                };


                // Extra safety check
                if (
                    !isValidStroke(stroke)
                ) {

                    console.warn(
                        `Generated invalid stroke from ${socket.id}`
                    );

                    return;

                }


                activeStrokes[
                    socket.id
                ] =
                    stroke;


                socket.broadcast.emit(
                    "drawing-start",
                    {

                        ...data,

                        userId:
                            socket.id

                    }
                );

            }
        );


        // ==================================================
        // DRAWING POINTS
        // ==================================================

        socket.on(
            "drawing",
            (data: unknown) => {

                // Validate incoming drawing data
                if (
                    !isValidDrawingData(data)
                ) {

                    console.warn(
                        `Invalid drawing data received from ${socket.id}`
                    );

                    return;

                }


                const stroke =
                    activeStrokes[
                        socket.id
                    ];


                // Ignore drawing points
                // if no active stroke exists
                if (!stroke) {

                    console.warn(
                        `Drawing point received without active stroke from ${socket.id}`
                    );

                    return;

                }


                stroke.points.push({

                    x:
                        data.x,

                    y:
                        data.y

                });


                socket.broadcast.emit(
                    "drawing",
                    {

                        ...data,

                        userId:
                            socket.id

                    }
                );

            }
        );


        // ==================================================
        // DRAWING FINISHED
        // ==================================================

        socket.on(
            "drawing-end",
            () => {

                const stroke =
                    activeStrokes[
                        socket.id
                    ];


                // No active drawing
                if (!stroke) {

                    return;

                }


                // Validate the completed stroke
                if (
                    !isValidStroke(stroke)
                ) {

                    console.warn(
                        `Invalid completed stroke from ${socket.id}`
                    );

                    delete activeStrokes[
                        socket.id
                    ];

                    return;

                }


                strokes.push(
                    stroke
                );


                // New drawing creates
                // a new canvas revision
                canvasRevision++;


                // New drawing clears
                // redo history
                redoStack = [];


                delete activeStrokes[
                    socket.id
                ];


                socket.broadcast.emit(
                    "drawing-end",
                    {

                        userId:
                            socket.id

                    }
                );

            }
        );


        // ==================================================
        // CURSOR MOVEMENT
        // ==================================================

        socket.on(
            "cursor-move",
            (data: unknown) => {

                // Validate cursor coordinates
                if (
                    typeof data !== "object" ||
                    data === null
                ) {

                    console.warn(
                        `Invalid cursor data received from ${socket.id}`
                    );

                    return;

                }


                const cursorData =
                    data as Record<string, unknown>;


                if (
                    !isValidNumber(
                        cursorData.x
                    ) ||
                    !isValidNumber(
                        cursorData.y
                    )
                ) {

                    console.warn(
                        `Invalid cursor coordinates received from ${socket.id}`
                    );

                    return;

                }


                const userColor =
                    users.get(
                        socket.id
                    ) ||
                    "#3b82f6";


                console.log(
                    "Cursor received:",
                    {

                        userId:
                            socket.id,

                        x:
                            cursorData.x,

                        y:
                            cursorData.y,

                        color:
                            userColor

                    }
                );


                // Send cursor position
                // to every OTHER browser

                socket.broadcast.emit(
                    "cursor-move",
                    {

                        x:
                            cursorData.x,

                        y:
                            cursorData.y,

                        userId:
                            socket.id,

                        color:
                            userColor

                    }
                );

            }
        );


        // ==================================================
        // CURSOR LEAVE
        // ==================================================

        socket.on(
            "cursor-leave",
            () => {

                socket.broadcast.emit(
                    "cursor-leave",
                    {

                        userId:
                            socket.id

                    }
                );

            }
        );


        // ==================================================
        // UNDO
        // ==================================================

        socket.on(
            "undo",
            () => {

                console.log(
                    `Undo requested by ${socket.id}`
                );


                if (
                    strokes.length === 0
                ) {

                    return;

                }


                const removedStroke =
                    strokes.pop();


                if (removedStroke) {

                    redoStack.push(
                        removedStroke
                    );


                    canvasRevision++;

                }


                broadcastCanvas();

            }
        );


        // ==================================================
        // REDO
        // ==================================================

        socket.on(
            "redo",
            () => {

                console.log(
                    `Redo requested by ${socket.id}`
                );


                if (
                    redoStack.length === 0
                ) {

                    return;

                }


                const restoredStroke =
                    redoStack.pop();


                if (restoredStroke) {

                    strokes.push(
                        restoredStroke
                    );


                    canvasRevision++;

                }


                broadcastCanvas();

            }
        );


        // ==================================================
        // CLEAR CANVAS
        // ==================================================

        socket.on(
            "clear-canvas",
            () => {

                console.log(
                    `Clear requested by ${socket.id}`
                );


                strokes = [];

                redoStack = [];

                canvasRevision++;


                broadcastCanvas();

            }
        );


        // ==================================================
        // DISCONNECT
        // ==================================================

        socket.on(
            "disconnect",
            () => {

                console.log(
                    `User disconnected: ${socket.id}`
                );


                // Remove any unfinished stroke
                delete activeStrokes[
                    socket.id
                ];


                // Tell all other browsers
                // to remove this user's cursor

                socket.broadcast.emit(
                    "user-disconnected",
                    socket.id
                );


                // Remove user
                users.delete(
                    socket.id
                );


                // Update online users
                sendUsersUpdate();

            }
        );

    }
);


// ==================================================
// START SERVER
// ==================================================

httpServer.listen(
    PORT,
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

    }
);