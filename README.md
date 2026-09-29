# RedLink

Emergency blood donor matching system that connects hospitals with eligible blood donors based on blood group, availability, location, and urgency.

## Tech Stack

| Layer    | Technology                                   |
|----------|----------------------------------------------|
| Frontend | React 19, TypeScript, Vite, React Router, Axios, Tailwind CSS |
| Backend  | Java 25, Spring Boot 4.1, Spring Data JPA    |
| Database | PostgreSQL                                   |

## Project Structure

```
RedLink/
├── frontend/   # React + TypeScript app (Vite)
└── backend/    # Spring Boot REST API
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [JDK](https://www.oracle.com/java/technologies/downloads/) 25 or later
- [PostgreSQL](https://www.postgresql.org/download/) 16 or later

Maven does not need to be installed; the backend includes the Maven wrapper (`mvnw`).

## Getting Started

### 1. Database

Create a PostgreSQL database named `redLink` (the name is case-sensitive, so keep the quotes):

```sql
CREATE DATABASE "redLink";
```

### 2. Backend

The database password is kept out of git. In `backend/src/main/resources/`, copy `application-local.properties.example` to `application-local.properties` and set your PostgreSQL password:

```properties
spring.datasource.password=YOUR_PASSWORD
```

The database URL and username are in `application.properties` (defaults: `localhost:5432/redLink`, user `postgres`).

Start the API (runs on http://localhost:8080):

```bash
cd backend
./mvnw spring-boot:run        # macOS / Linux
.\mvnw.cmd spring-boot:run    # Windows
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on http://localhost:5173. Requests to `/api/*` are proxied to the backend on port 8080.

## Scripts

### Frontend (`frontend/`)

| Command           | Description                    |
|-------------------|--------------------------------|
| `npm run dev`     | Start the development server   |
| `npm run build`   | Type-check and build for production |
| `npm run lint`    | Run ESLint                     |
| `npm run preview` | Preview the production build   |

### Backend (`backend/`)

| Command                      | Description          |
|------------------------------|----------------------|
| `./mvnw spring-boot:run`     | Start the API        |
| `./mvnw test`                | Run tests            |
| `./mvnw clean package`       | Build a runnable JAR |
