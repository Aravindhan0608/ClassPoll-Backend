# ClassPoll+ — Backend (Phase 1–10: Backend Complete)

Real-Time Smart Classroom Polling & Doubt Management System — backend service.

The backend is now **feature-complete** per the project spec, through Phase 10. It includes:

- Project setup (Express, ES Modules, MVC + Service layer)
- MongoDB Atlas connection (Mongoose)
- All 6 core data models: `User`, `Class`, `Poll`, `Vote`, `Question`, `Notification`
- Full JWT authentication: student/teacher registration, login (all roles), refresh token rotation, logout
- `bcrypt` password hashing
- Auth middleware + Role-based authorization middleware
- Centralized error handling (`ApiError` / `ApiResponse` / `error.middleware.js`)
- Input validation via `express-validator`
- Security: Helmet, CORS, rate limiting, mongo-sanitize, httpOnly cookies
- Admin seed script (admin has **no** public registration route, per spec)
- **Class Module**: create classes, unique join-code generation/regeneration, join-by-code, list "my classes" (teacher and student views), get single class (access-controlled), update/archive class, remove a student from a class
- **Poll Module**: create polls as drafts, start/end lifecycle (auto-ends any other live poll in the same class), edit/delete drafts only, list polls per class (students never see drafts), get the currently-active poll, and view aggregated results with an `allowResult`-gated visibility rule for students
- **Voting Module**: students cast one vote per poll, guarded by poll-is-live / class-membership / valid-option checks, with double-vote protection at both the service layer and the database's unique index (race-condition safe); students can check their own vote status on a poll
- **Question Module**: students ask questions in a class they're enrolled in, teachers answer them, each side gets a `Notification` document created automatically; question lists are scoped so students only see their own questions
- **Real-Time Socket.io Integration**: token-authenticated socket connections, room strategy (`class:<id>`, `poll:<id>`, `user:<id>`), and live events for poll start/end, instant vote-count updates on every vote cast, question asked/answered pushes, class online-user presence counts, and a generic class announcement broadcast
- **Notifications API**: list my notifications (paginated, optional read/unread filter), unread count for a dashboard badge, mark one/all as read, delete a notification
- **Admin Module (Dashboard + Analytics)**: dashboard summary counts, list/search/paginate users filtered by role (backs both "Manage Teachers" and "Manage Students"), view/update/deactivate/delete a student or teacher (admin accounts themselves are protected from edit/delete through this endpoint), list every class platform-wide with search, archive any class, and an analytics endpoint returning users-by-role, polls-by-status, questions-by-status, a 14-day signup trend, and the top 5 most-enrolled classes

## Not yet included
The entire frontend (React 19 / Vite / Tailwind SaaS dashboard — landing page, auth, and the three role-based dashboards) and the final deployment/documentation pass (README polish, ER diagram, architecture diagram, Render/Vercel deployment guide). Ask to continue and the frontend build starts next.

## Getting Started

```bash
cd server
npm install
cp .env.example .env
# then edit .env with your real MongoDB Atlas URI and JWT secrets
npm run seed:admin   # creates the one admin account, once
npm run dev          # starts the API on http://localhost:5000
```

## Environment Variables

See `.env.example` for the full list. Required: `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`. The server refuses to boot if these are missing.

## API Endpoints (implemented so far)

### Auth
| Method | Route                        | Access        | Description                          |
|--------|------------------------------|---------------|--------------------------------------|
| POST   | `/api/auth/register/student` | Public        | Register a student account           |
| POST   | `/api/auth/register/teacher` | Public        | Register a teacher account           |
| POST   | `/api/auth/login`            | Public        | Login (student, teacher, or admin)   |
| POST   | `/api/auth/refresh`          | Cookie        | Rotate access/refresh tokens         |
| POST   | `/api/auth/logout`           | Authenticated | Invalidate refresh token, clear cookies |
| GET    | `/api/auth/me`               | Authenticated | Get current logged-in user           |

### Classes
| Method | Route                                       | Access                | Description                              |
|--------|----------------------------------------------|------------------------|-------------------------------------------|
| POST   | `/api/classes`                              | Teacher                | Create a class (auto-generates join code) |
| GET    | `/api/classes/teacher/my`                   | Teacher                | List classes I teach                       |
| GET    | `/api/classes/student/my`                   | Student                 | List classes I've joined                   |
| GET    | `/api/classes/:id`                          | Owner / member / admin  | Get one class (access-checked)             |
| PATCH  | `/api/classes/:id`                          | Owning teacher / admin  | Update class name/description              |
| DELETE | `/api/classes/:id`                          | Owning teacher / admin  | Archive (soft-delete) a class              |
| POST   | `/api/classes/:id/regenerate-code`          | Owning teacher / admin  | Invalidate old join code, issue a new one  |
| POST   | `/api/classes/join`                         | Student                 | Join a class via 6-character join code     |
| DELETE | `/api/classes/:id/students/:studentId`      | Owning teacher / admin  | Remove a student from a class              |

### Polls
| Method | Route                          | Access                       | Description                                            |
|--------|----------------------------------|-------------------------------|----------------------------------------------------------|
| POST   | `/api/polls`                    | Teacher                       | Create a poll (starts in `draft` status)                  |
| POST   | `/api/polls/:id/start`          | Teacher (owner)                | Start a poll — ends any other live poll in the class first |
| POST   | `/api/polls/:id/end`            | Teacher (owner)                | End a live poll                                            |
| PATCH  | `/api/polls/:id`                | Teacher (owner)                | Edit a poll — **draft only**                               |
| DELETE | `/api/polls/:id`                | Teacher (owner)                | Delete a poll — **draft only**                             |
| GET    | `/api/polls/class/:classId`     | Owner / member / admin         | List polls for a class (students see live/ended only)      |
| GET    | `/api/polls/class/:classId/active` | Owner / member / admin      | Get the class's currently-live poll                        |
| GET    | `/api/polls/:id`                | Owner / member / admin         | Get one poll (students can't see another class's drafts)   |
| GET    | `/api/polls/:id/results`        | Owner / admin always; student if `allowResult` | Aggregated vote counts per option           |

### Votes
| Method | Route                | Access  | Description                                        |
|--------|------------------------|---------|-----------------------------------------------------|
| POST   | `/api/votes`          | Student | Cast a vote on a live poll (one vote per poll)       |
| GET    | `/api/votes/my/:pollId` | Student | Check whether/how the current student already voted |

### Questions
| Method | Route                              | Access                  | Description                                              |
|--------|--------------------------------------|--------------------------|------------------------------------------------------------|
| POST   | `/api/questions`                    | Student                  | Ask a question in an enrolled class                        |
| PATCH  | `/api/questions/:id/answer`         | Teacher (owner)           | Answer a student's question                                |
| GET    | `/api/questions/class/:classId`     | Owner / member / admin    | List questions (student sees only their own; supports `?status=pending\|answered`) |
| GET    | `/api/questions/:id`                | Asker / owner / admin     | Get one question                                            |

### Notifications
| Method | Route                          | Access        | Description                                              |
|--------|-----------------------------------|----------------|-------------------------------------------------------------|
| GET    | `/api/notifications`             | Authenticated  | List my notifications (`?isRead=true\|false&page=&limit=`) |
| GET    | `/api/notifications/unread-count`| Authenticated  | Unread count for a dashboard badge                          |
| PATCH  | `/api/notifications/:id/read`    | Owner          | Mark one notification as read                                |
| PATCH  | `/api/notifications/read-all`    | Authenticated  | Mark all of my notifications as read                          |
| DELETE | `/api/notifications/:id`         | Owner          | Delete a notification                                         |

### Admin
| Method | Route                       | Access | Description                                                        |
|--------|-------------------------------|--------|----------------------------------------------------------------------|
| GET    | `/api/admin/dashboard`       | Admin  | Summary counts (students, teachers, classes, polls, votes, questions) |
| GET    | `/api/admin/analytics`       | Admin  | Users-by-role, polls-by-status, questions-by-status, 14-day signups, top 5 classes |
| GET    | `/api/admin/users`           | Admin  | List/search users (`?role=&search=&page=&limit=`)                    |
| GET    | `/api/admin/users/:id`       | Admin  | Get one user                                                          |
| PATCH  | `/api/admin/users/:id`       | Admin  | Update name / active status of a student or teacher                  |
| DELETE | `/api/admin/users/:id`       | Admin  | Delete a student or teacher account                                   |
| GET    | `/api/admin/classes`         | Admin  | List/search every class platform-wide                                 |
| DELETE | `/api/admin/classes/:id`     | Admin  | Archive any class                                                     |

### Misc
| Method | Route          | Access | Description   |
|--------|----------------|--------|---------------|
| GET    | `/api/health`  | Public | Health check  |

All responses follow: `{ success, statusCode, message, data, errors }`.

## Auth Flow

- Access token (15 min) + refresh token (7 days), both set as `httpOnly` cookies.
- `authMiddleware` verifies the access token and attaches `req.user`.
- `roleMiddleware('teacher')`, `roleMiddleware('student', 'teacher')`, etc. restrict routes by role.
- Admin accounts are created only via `npm run seed:admin` — never through a public endpoint.

## Class Module Notes

- Join codes are 6 characters, uppercase, excluding ambiguous characters (0/O/1/I), generated with a collision check against the database.
- Archiving is a **soft delete** (`isArchived: true`) so historical polls/votes/questions tied to a class are preserved for records and analytics later.
- Access to `GET /api/classes/:id` is enforced in the service layer: the owning teacher, any enrolled student, or an admin can view it — anyone else gets a 403.

## Poll Module Notes

- Polls always start as `draft` — invisible to students until a teacher calls `start`.
- Starting a poll auto-ends any other `live` poll in the same class, since only one poll should be active at a time.
- Editing or deleting a poll is only allowed while it's still a `draft`, so a poll's shape never changes underneath students who may have already voted.
- `allowResult` controls whether **students** can see the live/final tally; the owning teacher and admins can always see results regardless of this flag.
- Vote aggregation uses a MongoDB `$group` aggregation over the `Vote` collection — the vote-casting endpoint itself lands in the next phase (Voting Module), but results-viewing is ready now.

## Voting Module Notes

- Vote casting requires: the poll is `live`, the student is enrolled in the poll's class, and `optionId` is one of that poll's real options.
- Double-vote protection is layered: a friendly service-layer check first, then the database's unique `(pollId, studentId)` compound index as the final, race-condition-proof guard — a duplicate-key error is caught and converted into the same clean "already voted" message.
- Results aggregation (from the Poll Module) reads straight from this `Vote` collection, so counts are always live and consistent with what's actually been cast.

## Question Module Notes

- A student can only ask questions in a class they're actually enrolled in.
- Answering creates a `Notification` for the student, and asking creates one for the teacher — right now these are just `Notification` documents in the DB (a full list/mark-as-read API arrives with the dedicated Notifications phase); Phase 7's Socket.io layer will additionally push these instantly instead of requiring a refresh/poll.
- List scoping: teachers/admins see every question in the class; students only ever see their own, even though the same endpoint is shared.

## Real-Time Socket.io Events

The client connects with `io(SERVER_URL, { auth: { token: accessToken } })` (or lets the `accessToken` cookie ride along — both are checked). All events below are documented in `src/services/socket.service.js`.

**Client emits (join/leave rooms):**
| Event         | Payload    | Purpose                                   |
|---------------|------------|--------------------------------------------|
| `class:join`  | `classId`  | Join a class room to receive its live events |
| `class:leave` | `classId`  | Leave a class room                          |
| `poll:join`   | `pollId`   | Watch one poll's live results                |
| `poll:leave`  | `pollId`   | Stop watching that poll                      |

**Server emits (pushed to the client):**
| Event                 | Room            | Payload                              | Fired when                          |
|-----------------------|-----------------|----------------------------------------|--------------------------------------|
| `poll:started`        | `class:<id>`    | `{ poll }`                             | Teacher starts a poll                |
| `poll:ended`          | `class:<id>`, `poll:<id>` | `{ poll }`                    | Teacher ends a poll                  |
| `poll:voteUpdate`     | `poll:<id>`     | `{ pollId, results, totalVotes }`       | Any student casts a vote             |
| `question:new`        | `user:<teacherId>` | `{ question }`                     | A student asks a question            |
| `question:answered`   | `user:<studentId>` | `{ question }`                     | Teacher answers a question           |
| `notification:new`    | `user:<id>`     | `{ title, type }`                      | Alongside the two events above, for a generic badge/toast listener |
| `class:onlineCount`   | `class:<id>`    | `{ classId, count }`                    | Someone joins/leaves a class room (presence) |
| `class:announcement`  | `class:<id>`    | `{ classId, title, message }`           | Available for a teacher broadcast feature |

Every emit goes through `safeEmit()` in `socket.service.js`, which no-ops (and logs) if Socket.io isn't initialized instead of throwing — so a REST action (starting a poll, casting a vote) always succeeds even if the real-time push layer is unavailable.

## Notifications Module Notes

- Every notification route is scoped to "my own" — there's no separate ownership check needed at the route level beyond authentication, but `markAsRead` and `deleteNotification` still verify `notification.userId` matches the requester as defense-in-depth against guessed IDs.
- Notifications are currently created by the Question Module (ask → teacher notified, answer → student notified). As future modules are added (e.g. a teacher class announcement), they'll create `Notification` documents through this same model and this API will list them automatically — no changes needed here.
- Pairs with the `notification:new` Socket.io event from Phase 7 for instant delivery; this REST API is the durable, paginated history behind that live badge.

## Admin Module Notes

- Admin accounts cannot be edited or deleted through `/api/admin/users/:id` — the spec defines a single, manually-seeded admin, so this is a deliberate guard rail rather than an oversight.
- "Manage Teachers" and "Manage Students" in the spec are both served by the same `GET /api/admin/users?role=teacher` / `?role=student` endpoint — one list, filtered.
- `DELETE /api/admin/classes/:id` reuses `class.service.archiveClass()` directly (the same function the owning teacher calls), so admin archiving behaves identically everywhere instead of having a second, possibly-diverging implementation.
- Analytics aggregations run directly against MongoDB (`$group`, `$dateToString`, `$project`+`$size`) rather than pulling documents into Node and reducing in memory, so they stay fast as data grows.

## Folder Structure

```
server/
  src/
    config/       db.js, env.js, socket.js
    controllers/
      auth/         auth.controller.js
      class/        class.controller.js
      poll/         poll.controller.js
      vote/         vote.controller.js
      question/     question.controller.js
      notification/ notification.controller.js
      admin/        admin.controller.js
    middleware/    auth, role, error, validate
    models/        User, Class, Poll, Vote, Question, Notification
    routes/        auth, class, poll, vote, question, notification, admin .routes.js
    services/      auth, class, poll, vote, question, notification, admin .service.js, socket.service.js
    validators/     auth, class, poll, vote, question, notification, admin .validator.js
    utils/         ApiResponse, ApiError, jwt, logger, asyncHandler, seedAdmin
    app.js
    server.js
```

## Deployment (planned)
Backend → Render · Frontend → Vercel · Database → MongoDB Atlas. Deployment guide will be finalized in the last phase alongside the full architecture/ER diagrams.

