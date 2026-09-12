import socket from "./websocket.js";


// ==================================================
// CANVAS
// ==================================================

const canvas =
    document.getElementById(
        "drawingCanvas"
    ) as HTMLCanvasElement;

const context =
    canvas.getContext("2d")!;


// ==================================================
// LOCAL DRAWING STATE
// ==================================================

let isDrawing = false;

let currentTool:
    "brush" | "eraser" = "brush";

let currentColor = "#000000";

let currentWidth = 5;
// Latest canvas revision received from server
let latestRevision = 0;

// ==================================================
// REMOTE DRAWING STATE
// ==================================================

const remoteLastPoints:
    Record<
        string,
        {
            x: number;
            y: number;
        }
    > = {};


// ==================================================
// REMOTE CURSOR STATE
// ==================================================

const remoteCursors:
    Record<
        string,
        HTMLDivElement
    > = {};


// ==================================================
// CANVAS SIZING
// ==================================================

function resizeCanvas(): void {

    const rect =
        canvas.getBoundingClientRect();

    const devicePixelRatio =
        window.devicePixelRatio || 1;


    canvas.width =
        rect.width *
        devicePixelRatio;

    canvas.height =
        rect.height *
        devicePixelRatio;


    context.setTransform(
        devicePixelRatio,
        0,
        0,
        devicePixelRatio,
        0,
        0
    );


    context.lineCap =
        "round";

    context.lineJoin =
        "round";

}


resizeCanvas();


window.addEventListener(
    "resize",
    resizeCanvas
);


// ==================================================
// MOUSE POSITION
// ==================================================

function getMousePosition(
    event: MouseEvent
): {
    x: number;
    y: number;
} {

    const rect =
        canvas.getBoundingClientRect();


    return {

        x:
            event.clientX -
            rect.left,

        y:
            event.clientY -
            rect.top

    };

}


// ==================================================
// REDRAW COMPLETE CANVAS
// ==================================================

function redrawCanvas(
    strokes: Array<{
        points: Array<{
            x: number;
            y: number;
        }>;

        color: string;

        width: number;

        tool:
            "brush" | "eraser";
    }>
): void {

    context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    strokes.forEach(
        (stroke) => {

            if (
                stroke.points.length === 0
            ) {

                return;

            }


            context.save();

            context.beginPath();


            const firstPoint =
                stroke.points[0];


            context.moveTo(
                firstPoint.x,
                firstPoint.y
            );


            for (
                let i = 1;
                i < stroke.points.length;
                i++
            ) {

                const point =
                    stroke.points[i];


                context.lineTo(
                    point.x,
                    point.y
                );

            }


            context.strokeStyle =
                stroke.tool === "eraser"
                    ? "#ffffff"
                    : stroke.color;


            context.lineWidth =
                stroke.width;


            context.lineCap =
                "round";

            context.lineJoin =
                "round";


            context.stroke();


            context.closePath();

            context.restore();

        }
    );

}


// ==================================================
// START DRAWING
// ==================================================

canvas.addEventListener(
    "mousedown",
    (event: MouseEvent) => {

        isDrawing = true;


        const {
            x,
            y
        } =
            getMousePosition(event);


        socket.emit(
            "drawing-start",
            {

                x,

                y,

                color:
                    currentTool === "eraser"
                        ? "#ffffff"
                        : currentColor,

                width:
                    currentWidth,

                tool:
                    currentTool

            }
        );


        context.beginPath();


        context.moveTo(
            x,
            y
        );


        context.strokeStyle =
            currentTool === "eraser"
                ? "#ffffff"
                : currentColor;


        context.lineWidth =
            currentWidth;


        context.lineCap =
            "round";

        context.lineJoin =
            "round";

    }
);


// ==================================================
// MOUSE MOVE
// ==================================================
//
// This single listener handles BOTH:
//
// 1. Live cursor position
// 2. Local drawing
//
// ==================================================

canvas.addEventListener(
    "mousemove",
    (event: MouseEvent) => {

        const {
            x,
            y
        } =
            getMousePosition(event);


        // ==================================================
        // SEND CURSOR POSITION
        // ==================================================

        socket.emit(
            "cursor-move",
            {
                x,
                y
            }
        );


        // ==================================================
        // DRAW ONLY IF MOUSE IS PRESSED
        // ==================================================

        if (!isDrawing) {

            return;

        }


        // ==================================================
        // DRAW LOCALLY
        // ==================================================

        context.lineTo(
            x,
            y
        );


        context.stroke();


        // ==================================================
        // SEND DRAWING POINT
        // ==================================================

        socket.emit(
            "drawing",
            {

                x,

                y,

                color:
                    currentTool === "eraser"
                        ? "#ffffff"
                        : currentColor,

                width:
                    currentWidth,

                tool:
                    currentTool

            }
        );

    }
);


// ==================================================
// STOP DRAWING
// ==================================================

function stopDrawing(): void {

    if (!isDrawing) {

        return;

    }


    isDrawing = false;


    context.closePath();


    socket.emit(
        "drawing-end"
    );

}


canvas.addEventListener(
    "mouseup",
    stopDrawing
);


canvas.addEventListener(
    "mouseleave",
    stopDrawing
);


// ==================================================
// BRUSH / ERASER
// ==================================================

export function setTool(
    tool: "brush" | "eraser"
): void {

    currentTool =
        tool;

}


// ==================================================
// COLOR
// ==================================================

export function setColor(
    color: string
): void {

    currentColor =
        color;

}


// ==================================================
// WIDTH
// ==================================================

export function setWidth(
    width: number
): void {

    currentWidth =
        width;

}


// ==================================================
// REMOTE DRAWING START
// ==================================================

socket.on(
    "drawing-start",
    (data: {
        x: number;
        y: number;
        color: string;
        width: number;
        tool:
            "brush" | "eraser";
        userId: string;
    }) => {

        console.log(
            "REMOTE DRAWING START:",
            data
        );


        remoteLastPoints[
            data.userId
        ] = {

            x:
                data.x,

            y:
                data.y

        };

    }
);


// ==================================================
// REMOTE DRAWING
// ==================================================

socket.on(
    "drawing",
    (data: {
        x: number;
        y: number;
        color: string;
        width: number;
        tool:
            "brush" | "eraser";
        userId: string;
    }) => {

        console.log(
            "REMOTE DRAWING RECEIVED:",
            data
        );


        const previousPoint =
            remoteLastPoints[
                data.userId
            ];


        if (!previousPoint) {

            remoteLastPoints[
                data.userId
            ] = {

                x:
                    data.x,

                y:
                    data.y

            };


            return;

        }


        context.save();


        context.beginPath();


        context.moveTo(
            previousPoint.x,
            previousPoint.y
        );


        context.lineTo(
            data.x,
            data.y
        );


        context.strokeStyle =
            data.tool === "eraser"
                ? "#ffffff"
                : data.color;


        context.lineWidth =
            data.width;


        context.lineCap =
            "round";

        context.lineJoin =
            "round";


        context.stroke();


        context.closePath();


        context.restore();


        remoteLastPoints[
            data.userId
        ] = {

            x:
                data.x,

            y:
                data.y

        };

    }
);


// ==================================================
// CANVAS STATE
// ==================================================

socket.on(
    "canvas-state",
    (data: {
        strokes: Array<{
            points: Array<{
                x: number;
                y: number;
            }>;

            color: string;

            width: number;

            tool:
                "brush" | "eraser";
        }>;
        revision: number;
    }) => {

        console.log(
            "CANVAS STATE RECEIVED:",
            data
        );
        console.log(
            "CANVAS REVISION:",
            data.revision
        );
        // Ignore an older canvas state
        if (data.revision < latestRevision) {
            console.log(
                "IGNORING STALE CANVAS STATE:",
                data.revision,
                "Current:",
                latestRevision
            );

    return;
}

// Store the newest revision
latestRevision = data.revision;


        Object.keys(
            remoteLastPoints
        ).forEach(
            (userId) => {

                delete remoteLastPoints[
                    userId
                ];

            }
        );


        redrawCanvas(
            data.strokes
        );

    }
);


// ==================================================
// CREATE REMOTE CURSOR
// ==================================================

function createRemoteCursor(
    userId: string,
    color: string
): HTMLDivElement {

    const cursor =
        document.createElement(
            "div"
        );


    cursor.className =
        "remote-cursor";


    // ==================================================
    // Cursor appearance
    // ==================================================

    cursor.style.position =
        "absolute";

    cursor.style.width =
        "16px";

    cursor.style.height =
        "16px";

    cursor.style.borderRadius =
        "50%";

    cursor.style.backgroundColor =
        color;

    cursor.style.border =
        "3px solid white";

    cursor.style.boxShadow =
        "0 0 0 2px rgba(0,0,0,0.35)";

    cursor.style.pointerEvents =
        "none";

    cursor.style.zIndex =
        "9999";

    cursor.style.transform =
        "translate(-50%, -50%)";


    // ==================================================
    // IMPORTANT:
    // Put cursor in canvas parent
    // ==================================================

    const canvasParent =
        canvas.parentElement;


    if (!canvasParent) {

        console.error(
            "Canvas parent not found"
        );


        return cursor;

    }


    const parentStyle =
        getComputedStyle(
            canvasParent
        );


    if (
        parentStyle.position ===
        "static"
    ) {

        canvasParent.style.position =
            "relative";

    }


    canvasParent.appendChild(
        cursor
    );


    remoteCursors[
        userId
    ] =
        cursor;


    return cursor;

}


// ==================================================
// REMOTE CURSOR MOVEMENT
// ==================================================

socket.on(
    "cursor-move",
    (data: {
        x: number;
        y: number;
        userId: string;
        color?: string;
    }) => {

        console.log(
            "REMOTE CURSOR:",
            data
        );


        // Never display our own cursor

        if (
            data.userId ===
            socket.id
        ) {

            return;

        }


        // ==================================================
        // Find existing cursor
        // ==================================================

        let cursor =
            remoteCursors[
                data.userId
            ];


        // ==================================================
        // Create cursor
        // ==================================================

        if (!cursor) {

            cursor =
                createRemoteCursor(
                    data.userId,
                    data.color ||
                    "#3b82f6"
                );

        }


        // ==================================================
        // Move cursor
        // ==================================================

        cursor.style.left =
            `${data.x}px`;

        cursor.style.top =
            `${data.y}px`;

    }
);


// ==================================================
// REMOVE REMOTE CURSOR
// ==================================================

socket.on(
    "user-disconnected",
    (userId: string) => {

        console.log(
            "REMOTE USER DISCONNECTED:",
            userId
        );


        const cursor =
            remoteCursors[
                userId
            ];


        if (cursor) {

            cursor.remove();


            delete remoteCursors[
                userId
            ];

        }


        delete remoteLastPoints[
            userId
        ];

    }
);


// ==================================================
// CURSOR LEAVE
// ==================================================

socket.on(
    "cursor-leave",
    (data: {
        userId: string;
    }) => {

        const cursor =
            remoteCursors[
                data.userId
            ];


        if (cursor) {

            cursor.remove();


            delete remoteCursors[
                data.userId
            ];

        }

    }
);