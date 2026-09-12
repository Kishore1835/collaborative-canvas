# Real-Time Collaborative Drawing Canvas

A real-time collaborative drawing application where multiple users can draw simultaneously on the same HTML5 Canvas and see each other's changes instantly.

The application uses Node.js, Express, Socket.IO, and Vanilla TypeScript to provide real-time collaboration without using frontend frameworks such as React or Vue.

---

## Features

### Drawing Tools

- Brush tool
- Eraser tool
- Custom color selection
- Adjustable brush size
- Freehand drawing using HTML5 Canvas
- Real-time drawing synchronization

### Real-Time Collaboration

- Multiple users can draw on the same canvas
- Drawing updates are synchronized in real time
- Remote cursor tracking
- Online users list
- Unique color assigned to each connected user
- Simultaneous drawing support

### Canvas History

- Global Undo
- Global Redo
- Global Clear Canvas
- Server-authoritative canvas history

### State Synchronization

- Initial canvas state synchronization
- Canvas revision tracking
- Stale canvas state protection
- Canvas state recovery after reconnection
- Latest authoritative canvas state can be requested from the server

### Reliability and Validation

- Server-side input validation
- Drawing coordinate validation
- Brush width validation
- Drawing tool validation
- Color validation
- Stroke validation
- Cursor coordinate validation
- Socket.IO connection error handling
- Automatic reconnection support

---

## Technology Stack

### Frontend

- HTML5
- CSS3
- Vanilla TypeScript
- HTML5 Canvas API

### Backend

- Node.js
- Express
- Socket.IO

### Development Tools

- TypeScript
- tsx
- npm

---

## Project Structure

```text
collaborative-canvas/
│
├── client/
│   ├── index.html
│   ├── style.css
│   ├── main.ts
│   ├── canvas.ts
│   └── websocket.ts
│
├── server/
│   └── server.ts
│
├── dist/
│   └── compiled JavaScript files
│
├── package.json
├── tsconfig.json
├── README.md
└── ARCHITECTURE.md
```

---

## Architecture Overview

The application follows a client-server architecture.

The browser handles canvas rendering and user interaction. Socket.IO is used to send drawing events between clients and the Node.js server.

The server maintains the authoritative canvas history and broadcasts updates to connected clients.

```text
User A
   │
   │ Drawing / Cursor Events
   ▼
Socket.IO
   │
   ▼
Node.js + Express Server
   │
   │ Authoritative Canvas State
   │
   ▼
Socket.IO
   │
   ├──────────────► User A
   │
   └──────────────► User B
```

A more detailed explanation of the architecture is provided in `ARCHITECTURE.md`.

---

## How Real-Time Drawing Works

When a user starts drawing, the client sends a `drawing-start` event to the server.

While the user is drawing, the client sends drawing point updates through Socket.IO.

The server maintains the active stroke and broadcasts the drawing data to the other connected clients.

When the drawing is completed, the server stores the completed stroke in the canvas history.

This allows multiple users to draw simultaneously while keeping the server as the authoritative source of the shared canvas history.

---

## Canvas State Management

The server maintains the shared canvas state using:

- Completed strokes
- Redo history
- Active strokes
- Canvas revision number
- Connected users
- User colors

The server is responsible for maintaining the authoritative canvas state.

Clients receive canvas state updates and render the strokes locally using the HTML5 Canvas API.

---

## Revision Tracking

The server maintains a canvas revision number.

The revision is increased whenever an operation changes the shared canvas, including:

- Completing a drawing
- Undo
- Redo
- Clear Canvas

Clients compare the received revision with their current revision.

If an older canvas state is received, it is ignored.

This prevents stale canvas state from overwriting a newer state.

---

## Global Undo and Redo

Undo and redo operations are handled by the server.

When a user performs an undo:

1. The latest completed stroke is removed from the canvas history.
2. The removed stroke is placed into the redo stack.
3. The canvas revision is increased.
4. The updated canvas state is broadcast to all connected clients.

When redo is performed:

1. The latest stroke is removed from the redo stack.
2. The stroke is restored to the canvas history.
3. The canvas revision is increased.
4. The updated canvas state is broadcast to all connected clients.

Therefore, undo and redo are global operations shared by all connected users.

---

## Simultaneous Drawing

The application supports multiple users drawing at the same time.

Each active connection maintains its own active stroke on the server.

Drawing points are associated with the corresponding connected user and broadcast to other clients.

This allows different users to draw simultaneously without replacing each other's strokes.

---

## Remote Cursors

Each connected user can broadcast their cursor position through Socket.IO.

The server forwards cursor coordinates and the user's assigned color to the other connected clients.

Each client displays the remote cursor independently.

Remote cursors are removed when the corresponding user disconnects or leaves the canvas.

---

## Online Users

When a user connects, the server assigns a color to the user and updates the connected-user list.

When a user disconnects, the server removes the user and broadcasts the updated online-user list.

This allows every client to see the currently connected users.

---

## Reconnection and Canvas Recovery

Socket.IO automatically attempts to reconnect when the connection is interrupted.

After reconnecting, the client requests the latest canvas state from the server.

The server responds with:

```text
strokes
revision
```

The client uses this information to restore the latest authoritative canvas state.

This helps the client recover after a temporary connection loss.

---

## Input Validation

The server validates incoming data before processing it.

Validation includes:

- X and Y coordinates must be valid finite numbers
- Brush width must be greater than zero
- Brush width must remain within the allowed range
- Tool must be either `brush` or `eraser`
- Color must be a valid non-empty string
- Stroke data must contain valid points
- Cursor coordinates must be valid numbers

Invalid data is rejected without modifying the canvas state.

---

## Error Handling

Socket.IO connection errors are logged by the server.

The client also displays the current connection state:

```text
Connected
Disconnected
Reconnecting...
Connection failed
```

This provides basic connection status feedback to users.

---

## Running the Project

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the TypeScript Project

```bash
npm run build
```

### 3. Start the Development Server

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:3000
```

---

## Production Build

Build the TypeScript files:

```bash
npm run build
```

Start the compiled server:

```bash
npm start
```

---

## Health Check

The server provides a health-check endpoint:

```text
http://localhost:3000/health
```

A successful response is:

```json
{
  "status": "ok",
  "message": "Collaborative Canvas server is running"
}
```

---

## Testing

The application has been tested using multiple browser clients.

The following functionality has been verified:

- Brush drawing
- Eraser
- Color selection
- Brush size
- Real-time drawing
- Remote cursors
- Online users
- User colors
- Global undo
- Global redo
- Global clear
- Simultaneous drawing
- Canvas state synchronization
- Canvas revision tracking
- Stale-state protection
- Reconnection
- Canvas recovery after reconnection
- Server-side input validation
- Socket.IO connection error handling

---

## Future Improvements

Possible future enhancements include:

- Drawing rooms
- Persistent canvas storage
- User authentication
- Shape drawing tools
- Text tool
- Image insertion
- Mobile touch optimization
- Database-backed canvas persistence
- Collaboration metrics

---

## License

This project was developed as a technical assignment to demonstrate real-time collaborative application architecture using HTML5 Canvas, TypeScript, Node.js, and Socket.IO.