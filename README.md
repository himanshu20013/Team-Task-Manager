# TaskFlow — Team Task Manager

A full-stack team task management application with role-based access control, project management, and real-time task tracking.

## 🚀 Live Demo

**Deployed URL:** *(Add your Railway URL here after deployment)*

## ✨ Features

### Authentication
- User signup & login with JWT tokens
- Secure password hashing with bcrypt
- Protected routes (frontend + API)

### Projects
- Create/edit/delete projects with custom colors
- Progress tracking per project
- Project-level role-based access (Admin / Member)

### Team Management
- Search and add team members to projects
- Assign roles (Admin or Member)
- Admins can edit project settings, manage members, and delete any task
- Members can create and update tasks

### Task Management
- Create tasks with title, description, priority, status, assignee, and due date
- Kanban board view with columns: To Do, In Progress, Review, Done
- List/table view with sorting
- Filter by status, priority, and assignee
- Comments on tasks

### Dashboard
- Personal task overview
- Stats: total, in-progress, review, completed, overdue
- Recent activity feed

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Vite |
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT + bcryptjs |
| Deployment | Railway |

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── db/database.js        # SQLite schema & connection
│   ├── middleware/auth.js     # JWT auth + role middleware
│   ├── routes/
│   │   ├── auth.js           # Signup, login, user search
│   │   ├── projects.js       # Project CRUD + members
│   │   └── tasks.js          # Task CRUD + comments + dashboard
│   └── server.js             # Express app entry point
├── frontend/
│   ├── src/
│   │   ├── components/       # Layout, shared components
│   │   ├── context/          # Auth context
│   │   ├── pages/            # Dashboard, Projects, ProjectDetail, Auth
│   │   └── utils/api.js      # Axios instance
│   ├── index.html
│   └── vite.config.js
├── package.json              # Root package (manages both)
├── railway.toml              # Railway deployment config
└── README.md
```

## 🔑 API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/auth/me | Get current user |
| GET | /api/auth/users/search?q= | Search users to invite |

### Projects
| Method | Path | Access |
|--------|------|--------|
| GET | /api/projects | All projects for user |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Project details + members |
| PUT | /api/projects/:id | Update (admin only) |
| DELETE | /api/projects/:id | Delete (owner only) |
| POST | /api/projects/:id/members | Add member (admin only) |
| PUT | /api/projects/:id/members/:uid | Change role (admin only) |
| DELETE | /api/projects/:id/members/:uid | Remove member (admin only) |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/projects/:id/tasks | List tasks (filterable) |
| POST | /api/projects/:id/tasks | Create task |
| GET | /api/tasks/:id | Get task + comments |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete (admin or creator) |
| POST | /api/tasks/:id/comments | Add comment |
| GET | /api/dashboard | Dashboard summary |

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd taskflow

# Install root dependencies
npm install

# Start backend (from root)
npm run dev

# In a separate terminal, start frontend
cd frontend
npm install
npm run dev
```

Backend runs on `http://localhost:3001`
Frontend runs on `http://localhost:5173` (proxies /api to backend)

## 🚂 Deploy to Railway

### Option 1: GitHub Integration (Recommended)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repository
4. Railway auto-detects Node.js and runs `npm run build` then `npm start`
5. Set environment variables (optional but recommended):
   - `JWT_SECRET` = any long random string (e.g. generate with `openssl rand -hex 32`)
   - `NODE_ENV` = `production`
6. Your app gets a public URL automatically

### Option 2: Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `JWT_SECRET` | JWT signing secret | `taskflow-secret-key-change-in-production` |
| `NODE_ENV` | Environment | `development` |
| `DB_PATH` | SQLite file directory | `./data` |

> ⚠️ **Important**: Set `JWT_SECRET` to a strong random value in production!

## 🗃 Database

SQLite is used for simplicity and zero-config deployment. The database file is created at `data/taskflow.db` on first run. Tables:

- `users` — user accounts
- `projects` — projects
- `project_members` — many-to-many with roles
- `tasks` — tasks with status/priority/assignment
- `comments` — task comments

## 📜 License

MIT
