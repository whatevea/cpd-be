# CPD Backend Project Context

## Project Overview
This is the backend application for the CPD project  Chess Puzzle directory. It is built using **Node.js** and **Express.js**, providing RESTful APIs for authentication, user management, and real-time chat functionality. The project integrates with **MongoDB** for data persistence, **Centrifugo** for real-time capabilities, and **OpenRouter/Gemini** for AI features.

It is designed for dual deployment:
1.  **Standard Server:** Dockerized Node.js application.
2.  **Serverless:** Cloudflare Workers (via `cloudflare:node` compatibility).

## Tech Stack
*   **Runtime:** Node.js (ES Modules)
*   **Framework:** Express.js (v5)
*   **Database:** MongoDB (Mongoose ODM)
*   **Authentication:** JWT, Google OAuth, Lichess OAuth
*   **Real-time:** Centrifugo
*   **AI:** OpenRouter SDK, Gemini API
*   **Deployment:** Docker, Cloudflare Workers (Wrangler)

## Project Structure
```text
/media/sandip/writable/personal/cpd2/Backend/
├── src/
│   ├── config/         # Database connection (db.js)
│   ├── controllers/    # Request handlers (auth, chat, user)
│   ├── middleware/     # Express middleware (auth.js)
│   ├── models/         # Mongoose schemas (User, UserMessage)
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic & external integrations (AI, OAuth)
│   ├── utils/          # Helper utilities (Centrifugo)
│   └── index.js        # App entry point & server setup
├── worker.js           # Cloudflare Workers entry point
├── Dockerfile          # Container configuration
├── deploy_instructions.txt # Manual deployment steps
└── wrangler.toml       # Cloudflare Workers config
```

## Setup & Installation

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Copy `.env.example` to `.env` and configure the following:
    *   `PORT`: Server port (default: 5000)
    *   `MONGODB_URI`: Connection string for MongoDB
    *   `JWT_SECRET` & `JWT_EXPIRES_IN`: Security config
    *   `FRONTEND_URL`: CORS allowed origin(s)
    *   **Integrations:** Google OAuth credentials, Lichess Client ID, Centrifugo credentials, and Gemini API Key.

## Development & Running

*   **Development (with nodemon):**
    ```bash
    npm run dev
    ```
*   **Production Start:**
    ```bash
    npm start
    ```

## Deployment

### Docker
(Refer to `deploy_instructions.txt` for specific commands)
1.  **Build Image:**
    ```bash
    docker build -t sandiph/cpd-be:latest .
    ```
2.  **Run Container:**
    ```bash
    docker run -d --name cpd-backend -p 3001:5000 --restart unless-stopped sandiph/cpd-be:latest
    ```

### Cloudflare Workers
The project is configured to run on Cloudflare Workers using `nodejs_compat`.
*   **Configuration:** `wrangler.toml`
*   **Entry Point:** `worker.js` (wraps the Express app using `httpServerHandler`)

## Key Conventions
*   **ES Modules:** The project uses `import`/`export` syntax (`"type": "module"` in `package.json`).
*   **Database Connection:** `src/config/db.js` handles caching the Mongoose connection to support serverless environments.
*   **Service Layer:** Complex logic (AI chat, OAuth flows) is separated into `src/services/`.
