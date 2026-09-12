# Collaborative Canvas — Architecture

## 1. System Overview

The Real-Time Collaborative Drawing Canvas uses a client-server architecture.

The frontend is built using Vanilla TypeScript and the HTML5 Canvas API.

The backend uses Node.js, Express, and Socket.IO to provide real-time communication between multiple connected clients.

The server maintains the authoritative canvas history and synchronizes changes between connected users.

```text
                  ┌─────────────────────┐
                  │      Client A       │
                  │                     │
                  │ HTML5 Canvas        │
                  │ Vanilla TypeScript  │
                  └──────────┬──────────┘
                             │
                             │ Socket.IO
                             │
                             ▼
                  ┌─────────────────────┐
                  │    Node.js Server   │
                  │                     │
                  │ Express             │
                  │ Socket.IO           │
                  │ Canvas History      │
                  │ Revision Tracking   │
                  │ User Management     │
                  └──────────┬──────────┘
                             │
                             │ Socket.IO
                             │
                             ▼
                  ┌─────────────────────┐
                  │      Client B       │
                  │                     │
                  │ HTML5 Canvas        │
                  │ Vanilla TypeScript  │
                  └─────────────────────┘
```

---

# 2. Technology Architecture

## Frontend

The frontend consists of:

- HTML
- CSS
- Vanilla TypeScript
- HTML5 Canvas API
- Socket.IO client

The frontend is responsible for:

- Capturing mouse input
- Rendering local drawings
- Rendering remote drawings
- Displaying remote cursors
- Displaying connected users
- Managing drawing tools
- Managing color and brush size
- Displaying connection status
- Redrawing the canvas from synchronized state

---

## Backend

The backend consists of:

- Node.js
- Express
- Socket.IO

The backend is responsible for:

- Managing client connections
- Assigning user colors
- Maintaining canvas history
- Maintaining active strokes
- Maintaining redo history
- Processing drawing events
- Broadcasting drawing events
- Processing undo/redo operations
- Broadcasting canvas state
- Maintaining canvas revisions
- Handling reconnection state requests
- Validating incoming data
- Handling connection errors

---

# 3. Project Components

```text
client/
│
├── index.html
│   └── Application interface
│
├── style.css
│   └── Application styling
│
├── main.ts
│   └── UI controls and online-user handling
│
├── canvas.ts
│   └── Canvas rendering and drawing logic
│
└── websocket.ts
    └── Shared Socket.IO connection and connection status

server/
│
└── server.ts
    └── Express server, Socket.IO server,
        canvas state, history and synchronization
```

---

# 4. Client-Server Communication

Socket.IO is used for bidirectional real-time communication.

The client sends user actions to the server.

The server processes the action and broadcasts the appropriate information to other clients.

The main communication events are:

| Event | Direction | Purpose |
|---|---|---|
| `drawing-start` | Client → Server → Clients | Starts a new stroke |
| `drawing` | Client → Server → Clients | Sends drawing points |
| `drawing-end` | Client → Server → Clients | Completes a stroke |
| `cursor-move` | Client → Server → Clients | Synchronizes cursor position |
| `cursor-leave` | Client → Server → Clients | Removes remote cursor |
| `users-update` | Server → Clients | Updates online users |
| `canvas-state` | Server → Clients | Sends authoritative canvas |
| `request-canvas-state` | Client → Server | Requests latest canvas |
| `undo` | Client → Server | Requests global undo |
| `redo` | Client → Server | Requests global redo |
| `clear-canvas` | Client → Server | Clears shared canvas |
| `user-disconnected` | Server → Clients | Removes disconnected user's cursor |

---

# 5. Drawing Data Flow

When a user starts drawing:

```text
Mouse Down
    │
    ▼
Canvas Client
    │
    │ drawing-start
    ▼
Socket.IO
    │
    ▼
Server
    │
    ├── Create active stroke
    │
    └── Broadcast to other clients
            │
            ▼
      Other Canvas Clients
```

While the user continues drawing:

```text
Mouse Move
    │
    ▼
Drawing Point
    │
    ▼
Socket.IO
    │
    ▼
Server
    │
    ├── Add point to active stroke
    │
    └── Broadcast point
            │
            ▼
      Other Clients
```

When drawing ends:

```text
Mouse Up
    │
    ▼
drawing-end
    │
    ▼
Server
    │
    ├── Move active stroke
    │   into completed history
    │
    ├── Increase revision
    │
    └── Clear redo history
```

---

# 6. Authoritative Server State

The server is the authoritative source for the shared canvas history.

The server maintains:

```text
strokes
redoStack
activeStrokes
canvasRevision
users
userColors
```

### `strokes`

Contains completed strokes that make up the current canvas.

### `redoStack`

Contains strokes removed through undo and available for redo.

### `activeStrokes`

Contains strokes currently being drawn by connected users.

### `canvasRevision`

Represents the current version of the shared canvas state.

### `users`

Stores currently connected users.

### `userColors`

Provides colors for connected users.

---

# 7. Stroke Representation

A completed stroke contains:

```text
{
    id,
    userId,
    points,
    color,
    width,
    tool
}
```

Each stroke contains an array of points:

```text
[
    { x, y },
    { x, y },
    { x, y }
]
```

The client uses these points to reconstruct the stroke on the HTML5 Canvas.

---

# 8. Global Undo and Redo

Undo and redo are controlled by the server.

## Undo

When any client requests undo:

```text
Client
   │
   │ undo
   ▼
Server
   │
   ├── Remove latest stroke
   │
   ├── Add stroke to redoStack
   │
   ├── Increase canvasRevision
   │
   └── Broadcast canvas-state
           │
           ▼
      All Clients
```

## Redo

When any client requests redo:

```text
Client
   │
   │ redo
   ▼
Server
   │
   ├── Remove stroke from redoStack
   │
   ├── Add stroke back to strokes
   │
   ├── Increase canvasRevision
   │
   └── Broadcast canvas-state
           │
           ▼
      All Clients
```

This makes undo and redo global operations rather than client-local operations.

---

# 9. Conflict Resolution

Multiple users may draw simultaneously.

Each connected user has an independent active stroke.

The server stores active strokes using the socket ID:

```text
activeStrokes[socket.id]
```

Therefore, drawing from one user does not replace the active drawing of another user.

For example:

```text
User A
   │
   └── activeStrokes[A]

User B
   │
   └── activeStrokes[B]

User C
   │
   └── activeStrokes[C]
```

Each stroke is completed independently and then added to the shared stroke history.

The server therefore acts as the coordination point for concurrent drawing operations.

---

# 10. Revision-Based State Synchronization

The server maintains a monotonically increasing canvas revision.

Example:

```text
Revision 0
    │
    ├── User draws
    ▼
Revision 1
    │
    ├── User draws
    ▼
Revision 2
    │
    ├── Undo
    ▼
Revision 3
```

The server sends:

```text
{
    strokes,
    revision
}
```

with canvas state updates.

The client stores its latest known revision.

If a received canvas state has a revision lower than the client's current revision, the client ignores the stale state.

This prevents an older state from overwriting a newer state.

---

# 11. Reconnection and State Recovery

Socket.IO automatically attempts to reconnect after a connection failure.

The client displays the connection state:

```text
Connected
Disconnected
Reconnecting...
Connection failed
```

After successful reconnection, the client requests the latest canvas state:

```text
request-canvas-state
```

The server responds with:

```text
canvas-state
{
    strokes,
    revision
}
```

The client then redraws the canvas using the latest authoritative state.

```text
Connection Lost
      │
      ▼
Reconnecting
      │
      ▼
Connected
      │
      ▼
Request Canvas State
      │
      ▼
Server
      │
      ▼
Latest Canvas + Revision
      │
      ▼
Client Canvas Recovery
```

---

# 12. Remote Cursor Synchronization

Cursor movement is synchronized independently from drawing operations.

When a user moves their cursor:

```text
Client
   │
   │ cursor-move
   ▼
Server
   │
   │ userId + x + y + color
   ▼
Other Clients
```

Each client displays the remote cursor using the corresponding user's assigned color.

When a user disconnects, the server sends:

```text
user-disconnected
```

so other clients can remove the corresponding cursor.

---

# 13. Online User Management

When a client connects:

1. The server generates a Socket.IO connection ID.
2. A color is assigned to the user.
3. The user is added to the users map.
4. The updated user list is broadcast.

When a client disconnects:

1. The user is removed from the users map.
2. The user's active stroke is removed if necessary.
3. Other clients are informed.
4. The updated user list is broadcast.

---

# 14. Input Validation

The server validates incoming data before processing it.

Drawing validation includes:

- X coordinate validation
- Y coordinate validation
- Finite number validation
- Color validation
- Brush width validation
- Drawing tool validation
- Stroke validation

Cursor validation includes:

- X coordinate validation
- Y coordinate validation
- Finite number validation

Invalid input is rejected without modifying the authoritative canvas state.

---

# 15. Connection Error Handling

Socket.IO connection errors are handled by the server.

The client also updates the connection status indicator based on:

- Connected
- Disconnected
- Reconnecting
- Connection failed

This provides users with immediate feedback about the real-time connection.

---

# 16. Rendering Strategy

The application uses the native HTML5 Canvas API.

No drawing library or frontend framework is used.

The canvas is rendered using JavaScript/TypeScript drawing operations.

For synchronized canvas state, the client redraws the stored strokes in order.

This keeps the rendering model simple and ensures that the canvas can be reconstructed from the authoritative stroke history.

---

# 17. Why Socket.IO

Socket.IO was selected because it provides:

- Bidirectional real-time communication
- Event-based messaging
- Automatic reconnection
- Connection lifecycle events
- Broadcasting between connected clients
- Simple integration with Node.js

This makes it suitable for a collaborative drawing application where low-latency updates are required.

---

# 18. Overall Data Flow

```text
                   ┌──────────────────┐
                   │    User Input    │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │ HTML5 Canvas +   │
                   │ TypeScript       │
                   └────────┬─────────┘
                            │
                            │ Socket.IO
                            ▼
                   ┌──────────────────┐
                   │   Node.js        │
                   │   Socket.IO      │
                   │     Server       │
                   └────────┬─────────┘
                            │
                 ┌──────────┼──────────┐
                 │          │          │
                 ▼          ▼          ▼
             Canvas      Users      Cursors
              State     /Colors
                 │
                 ▼
             Revision
              Tracking
                 │
                 ▼
          All Connected Clients
```

---

# 19. Design Principles

The implementation follows these main principles:

### Server Authority

The server maintains the authoritative shared canvas history.

### Real-Time Communication

Socket.IO provides immediate event-based communication.

### Independent Active Strokes

Each user's active drawing is tracked independently.

### Global History

Undo and redo operate on the shared server-side history.

### Revision Tracking

Canvas revisions prevent stale state from overwriting newer state.

### Recovery

Clients can request the latest authoritative canvas state after reconnecting.

### Validation

Server-side validation prevents malformed drawing and cursor data from modifying application state.

---

# 20. Current Scope

The current implementation focuses on the core collaborative drawing requirements:

- Real-time drawing
- Brush and eraser
- Colors
- Brush width
- Remote cursors
- Online users
- User colors
- Global undo/redo
- Global clear
- Canvas synchronization
- Revision tracking
- Simultaneous drawing
- Reconnection and recovery
- Server-side validation
- Connection error handling

Potential future extensions include rooms, authentication, persistence, shapes, text, images, and mobile touch optimization.