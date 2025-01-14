# Try Not to Laugh: A Real-Time Multiplayer Video Game

This project is a real-time multiplayer video game where players try to make each other laugh while keeping a straight face themselves.

The game utilizes facial recognition technology to detect smiles and awards points accordingly. Players join virtual rooms, take turns trying to make others laugh, and compete for the highest score. The application is built with a React frontend and a Node.js backend, using Socket.IO for real-time communication and face-api.js for smile detection.

## Repository Structure

```
.
├── backend
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── docker-compose.yml
└── frontend
    ├── Dockerfile
    ├── index.html
    ├── package.json
    ├── postcss.config.js
    ├── public
    │   └── models
    │       ├── face_expression_model-weights_manifest.json
    │       └── tiny_face_detector_model-weights_manifest.json
    ├── src
    │   ├── App.jsx
    │   ├── index.css
    │   ├── main.jsx
    │   └── pages
    │       ├── GameRoom.jsx
    │       └── Home.jsx
    ├── tailwind.config.js
    └── vite.config.js
```

### Key Files:

- `backend/server.js`: Main entry point for the backend server
- `frontend/src/pages/Home.jsx`: Home page component for creating or joining game rooms
- `frontend/src/pages/GameRoom.jsx`: Main game room component handling video streams and game logic
- `docker-compose.yml`: Docker Compose configuration for running the application

## Usage Instructions

### Prerequisites

- Docker and Docker Compose installed on your system
- Node.js v18 or later (for local development)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd <repository-name>
   ```

2. Build and run the Docker containers:
   ```
   docker-compose up --build
   ```

3. Access the application at `http://localhost` in your web browser.

### Getting Started

1. Open the application in your web browser.
2. Enter your name and either create a new room or join an existing room using a room ID.
3. Once in the room, wait for other players to join.
4. Start the game when all players are ready.
5. Take turns trying to make other players laugh while keeping a straight face yourself.
6. The game ends after a set number of rounds, and the player with the highest score wins.

### Configuration

The application can be configured using environment variables:

- Backend:
  - `PORT`: The port on which the backend server runs (default: 3000)
  - `FRONTEND_URL`: The URL of the frontend application for CORS configuration

- Frontend:
  - `VITE_BACKEND_URL`: The URL of the backend server for API requests

### Testing & Quality

To run tests locally:

1. Navigate to the backend or frontend directory:
   ```
   cd backend
   ```
   or
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run tests:
   ```
   npm test
   ```

### Troubleshooting

1. Issue: Video stream not working
   - Ensure your browser has permission to access your camera
   - Check if your camera is being used by another application
   - Try using a different browser

2. Issue: Unable to connect to a room
   - Verify that the room ID is correct
   - Check your internet connection
   - Ensure the backend server is running

3. Issue: Smile detection not working
   - Make sure your face is well-lit and clearly visible
   - Try adjusting your position or camera angle
   - Verify that the face-api.js models are loaded correctly

For any persistent issues, check the browser console for error messages and report them to the project maintainers.

## Data Flow

The application follows a client-server architecture with real-time communication. Here's an overview of the data flow:

1. Client connects to the server via Socket.IO
2. Client joins or creates a game room
3. Server manages room state and broadcasts updates to connected clients
4. Clients capture video streams and perform local smile detection
5. Smile detection results are sent to the server
6. Server updates game state and broadcasts changes to all clients in the room
7. Clients update their UI based on received game state

```
+--------+    WebSocket    +--------+
| Client | <-------------> | Server |
+--------+                 +--------+
    ^                           ^
    |                           |
    v                           v
+--------+                 +--------+
| Camera |                 |  Game  |
+--------+                 | Logic  |
    ^                      +--------+
    |
    v
+--------+
| Smile  |
| Detect |
+--------+
```

## Deployment

The application is containerized using Docker, making it easy to deploy to various environments.

### Prerequisites

- Docker and Docker Compose installed on the target machine
- A domain name (optional, for HTTPS setup)

### Deployment Steps

1. Clone the repository on your server:
   ```
   git clone <repository-url>
   cd <repository-name>
   ```

2. Create a `.env` file in the root directory with necessary environment variables:
   ```
   FRONTEND_URL=https://your-domain.com
   ```

3. Build and start the Docker containers:
   ```
   docker-compose up -d --build
   ```

4. Set up a reverse proxy (e.g., Nginx) to forward traffic to the appropriate containers.

5. Configure SSL/TLS certificates for HTTPS (recommended for production use).

6. Monitor the application logs:
   ```
   docker-compose logs -f
   ```

## Infrastructure

The application infrastructure is defined in the `docker-compose.yml` file:

- Backend Service:
  - Built from `./backend/Dockerfile`
  - Exposes port 3000
  - Runs in production environment

- Frontend Service:
  - Built from `./frontend/Dockerfile`
  - Exposes port 80
  - Depends on the backend service

- Network:
  - A bridge network named `app-network` for inter-service communication