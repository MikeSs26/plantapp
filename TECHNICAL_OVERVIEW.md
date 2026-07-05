# PlantApp — Technical Overview & System Design

## Executive Summary

**PlantApp** is a full-stack reforestation web application that enables users to register trees they've planted, interact with a community feed, view profiles, like/comment on others' trees, and see a public leaderboard. Administrators can moderate content and manage user roles. The application is built with Django REST Framework (backend), React 19 + Vite (frontend), and PostgreSQL (database), deployed to Render (backend), Vercel (frontend), and Neon (database).

---

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Database** | PostgreSQL 15+ (Neon) | Cloud-hosted, auto-backups |
| **Backend** | Django 6.0 + DRF 3.17 | REST API, custom User model, JWT auth |
| **Frontend** | React 19 + TypeScript + Vite | SPA routing via React Router v7, Tailwind v4 |
| **Authentication** | djangorestframework-simplejwt | Stateless JWT (30min access, 7d refresh w/ rotation) |
| **Image Storage** | Cloudinary | Auto-converts HEIC→JPG, resizes up to 1600px |
| **Maps** | Leaflet.js + OpenStreetMap | Interactive location picking & community map |
| **CSS** | Tailwind v4 w/ dark mode | Custom brand colors (emerald green), class-based dark mode |
| **Deployment** | Render (backend), Vercel (frontend) | Auto-deploy on `main` push; Render free tier |

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                    (plantapp-black.vercel.app)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vercel)                            │
│  React 19 SPA + TypeScript + Tailwind v4 + React Router v7       │
│  ┌─ AuthContext (JWT token persistence, refresh intercept)       │
│  ┌─ Pages: Landing, Login, Register, TreesPage, ProfilePage,     │
│  │         UserProfilePage, AdminPage                            │
│  └─ Components: TreeCard, TreeDetailModal, MapPicker, Leaderboard│
└──────────────────────────┬──────────────────────────────────────┘
                           │ REST API (Bearer token)
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                   BACKEND API (Render)                            │
│              Django 6.0 + DRF (port 8000)                         │
│  ┌─ Auth: /api/auth/register, login, refresh, me/                │
│  ├─ Trees: /api/trees/ (CRUD, paginated, search, filter)         │
│  ├─ Social: /api/trees/<id>/like/, /api/comments/               │
│  ├─ Profiles: /api/auth/me/, /api/users/<username>/              │
│  ├─ Admin: /api/admin/users/, /api/admin/stats/                 │
│  ├─ Public: /api/stats/, /api/leaderboard/                       │
│  └─ Upload: /api/upload/ (→ Cloudinary)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ psycopg2 driver
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│                    DATABASE (Neon PostgreSQL)                     │
│  Tables: users.User, plantapp.Tree, plantapp.Like, Comment       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### User (Custom)
```python
- id (PK)
- email (unique, login field)
- username (unique, 3–30 chars [a-zA-Z0-9_])
- display_name, bio, avatar_url, location
- role (user / admin)
- is_active, created_at
- password (hashed)
```
**Key behavior:** Custom manager auto-generates username if not provided. Backfill migration (0003_populate_usernames) ran on Neon at first deploy.

### Tree
```python
- id (PK)
- user (FK → User, cascade delete)
- species, photo_url
- latitude, longitude (decimal, 6 decimal places = ~11cm precision)
- planted_at (auto_now_add)
```

### Like
```python
- id (PK)
- user (FK → User, cascade)
- tree (FK → Tree, cascade)
- created_at
- unique_together(user, tree) — one like per user per tree
```

### Comment
```python
- id (PK)
- user (FK → User, cascade)
- tree (FK → Tree, cascade)
- text (max 500 chars)
- created_at (default ordering)
```

---

## Authentication & Authorization

### Flow
1. **Register:** POST `/api/auth/register/` (email, password, username, display_name) → User created, auto-login
2. **Login:** POST `/api/auth/login/` → returns `{access, refresh}` tokens
3. **Token Storage:** localStorage keys `plantapp_access`, `plantapp_refresh`
4. **Every Request:** Axios interceptor attaches `Authorization: Bearer <access>`
5. **Token Refresh:** On 401, attempts one refresh + auto-retry (prevents cascading 401s)
6. **Logout:** Clear localStorage, redirect to /login

### Permissions
| Endpoint | Anonymous | Authenticated | Admin | Notes |
|----------|-----------|---------------|-------|-------|
| /register | ✓ | ✓ | ✓ | Public |
| /login | ✓ | ✓ | ✓ | Public |
| /trees/ | ✗ | ✓ | ✓ | IsAuthenticated + IsOwnerOrReadOnly (admin can moderate) |
| /me/ | ✗ | ✓ | ✓ | Own profile only |
| /users/<username>/ | ✗ | ✓ | ✓ | Anyone's public profile |
| /admin/* | ✗ | ✗ | ✓ | IsAdminRole only |
| /stats/ | ✓ | ✓ | ✓ | Public landing stats |

---

## Key Features Implemented

### 1. **User Authentication & Profiles**
- Email-based login (username is a separate handle for public URLs)
- JWT with access/refresh token rotation
- Editable profile (display_name, bio, location, avatar via Cloudinary)
- Public profiles at `/app/users/<username>` (read-only view of any user)

### 2. **Tree Registration & Feed**
- Users register trees with species, photo (optional), and geolocation
- Cloudinary automatically converts any format to JPG, resizes ≤1600px, auto-crops
- Paginated feed (12 trees/page) with server-side search (species/author), filters (mine), sort (recent/top-liked)
- Leaflet map showing all trees as custom pins; map picker with click-to-set and "My Location" geolocation button
  - Geolocation error messages: specific (permission denied, GPS off, timeout) not generic

### 3. **Social Features**
- **Like system:** One like per user per tree; toggled from feed cards and tree detail modal
- **Comments:** Nested under each tree (max 500 chars); delete own comments, or any as admin
- **Leaderboard:** Top 10 users by tree count; entries link to their public profiles
- **Activity counts:** Annotated in tree queryset (likes_count, comments_count, liked_by_me) to avoid N+1 queries

### 4. **Administration**
- Admin panel at `/app/admin` (protected by IsAdminRole)
- Dashboard: metrics (users, admins, trees, comments, likes, new this week)
- User management table: toggle role (user↔admin), activate/deactivate, delete
- Safety locks: admin cannot self-demote or self-delete
- Moderation: admins can delete any tree or comment (IsOwnerOrReadOnly permission updated)
- User model registered in Django `/admin/` for bootstrap superuser creation

### 5. **Responsive Design & UX**
- **Tailwind v4** with custom brand colors (emerald green palette)
- **Dark mode:** class-based (`dark` on `<html>`), localStorage-persisted, lucide-react icons
- **Mobile-first** layouts: single column on mobile, multi-column on tablet+
- **Toast notifications:** replaced all `alert()` calls (success/error variants, auto-dismiss 3.5s)
- **Skeleton loaders** for async data (trees, profiles)
- **Two-step delete confirmation** for destructive actions

### 6. **Production-Ready Config**
- **Environment-driven:** DEBUG, ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS, Cloudinary keys from env
- **Database:** DATABASE_URL (Neon) parsed by dj-database-url; falls back to local DB_* vars for dev
- **Static files:** WhiteNoise middleware + CompressedManifestStaticFilesStorage for production
- **CORS:** Configured to allow Vercel origin; CSRF tokens for state-changing requests
- **Migrations:** Auto-run on Render boot via Build Command; backfill migrations (usernames) baked in

---

## API Endpoints (Subset)

### Authentication
```
POST   /api/auth/register/           create account
POST   /api/auth/login/              get JWT tokens
POST   /api/auth/refresh/            rotate access token
GET    /api/auth/me/                 authenticated user profile (editable)
```

### Trees
```
GET    /api/trees/                   paginated feed (search, mine=1, ordering=likes)
POST   /api/trees/                   create tree
GET    /api/trees/<id>/              tree detail
PATCH  /api/trees/<id>/              edit own tree
DELETE /api/trees/<id>/              delete own tree (admin can delete any)
POST   /api/trees/<id>/like/         toggle like
GET    /api/trees/locations/         all trees (unpaginated, for map)
```

### Comments
```
GET    /api/comments/?tree=<id>      comments on a tree
POST   /api/comments/                post comment
DELETE /api/comments/<id>/           delete own comment
```

### Profiles & Social
```
GET    /api/users/<username>/        public profile (no email)
GET    /api/leaderboard/             top 10 by tree count
```

### Admin
```
GET    /api/admin/stats/             dashboard metrics
GET    /api/admin/users/             all users (PATCH/DELETE available)
PATCH  /api/admin/users/<id>/        change role/is_active
DELETE /api/admin/users/<id>/        remove user
```

### Public
```
GET    /api/stats/                   trees/users/likes/species counts (landing)
POST   /api/upload/                  upload image → Cloudinary
```

---

## Frontend Pages & Routes

| Route | Component | Auth | Purpose |
|-------|-----------|------|---------|
| `/` | Landing | Public | Hero + stats strip + CTAs |
| `/login` | Login | Public | Email + password form |
| `/register` | Register | Public | Email + username + password + display_name |
| `/app` | TreesPage | Protected | Main feed: form, map, paginated tree list, leaderboard sidebar |
| `/app/profile` | ProfilePage | Protected | Editable own profile (avatar, name, bio, location, username) |
| `/app/users/:username` | UserProfilePage | Protected | Public profile: info, stats, their trees |
| `/app/admin` | AdminPage | Admin-only | Dashboard + user management table |

---

## Data Flow: Planting a Tree (End-to-End)

1. **User enters form** (TreesPage)
   - Species, photo (optional), location (click map or "My Location")
   
2. **Photo upload flow** (if selected)
   - User picks file → front-end checks size (≤8MB)
   - POST `/api/upload/` with FormData
   - Backend: Cloudinary SDK converts to JPG, resizes, returns secure_url
   - Frontend stores URL in state
   
3. **Form submission**
   - POST `/api/trees/` { species, photo_url, latitude, longitude }
   - Backend: `perform_create` sets `user=request.user`
   - DB insert, TreeViewSet queryset annotates counts
   
4. **Feed update**
   - Frontend re-fetches page 1 of trees
   - TreeCard rendered for each result
   - User sees their new tree + like button, comment count
   
5. **Likes & comments flow**
   - Like: POST `/api/trees/<id>/like/` → Like row created/deleted, count updated live
   - Comment: click card → TreeDetailModal opens → user types + POST `/api/comments/`
   - Comment appears in modal instantly; comments_count increments on feed card

---

## Deployment Pipeline

1. **Local development (you)**
   - Edit code on `develop` branch
   - Test locally: `python manage.py runserver` + `npm run dev`
   - Commit & push to `origin/develop`

2. **Ready to release**
   - Merge `develop` → `main`: `git checkout main && git merge develop && git push`

3. **Render redeploy (backend)**
   - Git webhook triggered
   - Build Command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate && python manage.py createsuperuser --noinput` (if env vars set)
   - Start Command: `gunicorn core.wsgi:application`
   - Result: Live at `https://plantapp-upfy.onrender.com`

4. **Vercel redeploy (frontend)**
   - Git webhook triggered
   - Build: `npm run build` (outputs to `dist/`)
   - Env var VITE_API_URL injected (points to Render backend)
   - SPA rewrite rule (vercel.json) ensures `/app/*` routes go to index.html
   - Result: Live at `https://plantapp-black.vercel.app`

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Custom User model + email login | Simpler UX (no username/email dual entry); username is separate handle for public URLs |
| Separate `username` field | Allows email changes later; username is immutable public identity |
| JWT with refresh rotation | Stateless auth for horizontal scaling; refresh rotation mitigates token theft |
| Server-side pagination + search | Scales better than client-side; filters push to DB |
| Cloudinary auto-HEIC→JPG | Avoids browser rendering issues; transparent to users on any phone |
| Leaflet + OpenStreetMap | Open-source, no API keys/billing; Leaflet custom divIcon workaround for marker styling |
| Admin role in User model | Simple RBAC without Django groups; moderators can delete any content |
| IsOwnerOrReadOnly + admin override | Allows users to edit own, admins to moderate all |
| WhiteNoise for static files | Single-process deployment; no separate Nginx needed on Render free |
| Tailwind v4 over styled-components | Faster bundle, consistent design tokens, dark mode class-based (not JS) |

---

## Security Considerations

- ✅ CORS restricted to Vercel origin
- ✅ CSRF tokens enforced on state-changes (DRF default)
- ✅ Passwords hashed (Django default: PBKDF2)
- ✅ JWT tokens short-lived (30min access); refresh rotation enabled
- ✅ Cloudinary credentials server-side only (never exposed to client)
- ✅ Admin self-lock: cannot demote/delete own account
- ✅ User.email unique; username unique (case-insensitive)
- ✅ Comments/trees editable by owner or admin only
- ⚠️ **Rotate Cloudinary API secret** (was shared in chat during dev)

---

## Performance Optimizations

| Optimization | Implementation |
|---------------|-----------------|
| **N+1 prevention** | Annotate counts in TreeViewSet.get_queryset (likes_count, comments_count, liked_by_me via Exists) |
| **Pagination** | 12 trees/page; client fetches next page on "Cargar más" button |
| **Debounced search** | 400ms debounce before server query; resets to page 1 |
| **Image resizing** | Cloudinary limits width/height to 1600px; auto-crops aspect ratio |
| **Token refresh caching** | Axios interceptor caches refresh promise; prevents duplicate requests |
| **Lazy loading** | TreeDetailModal fetches comments only when opened |
| **Static file serving** | WhiteNoise + gzip compression; `dist/` built once per deploy |

---

## Known Limitations & Future Work

| Item | Status |
|------|--------|
| Search only by species/author | Works well; full-text search not needed yet |
| No email verification | Assumed trusted early-stage community |
| No tree deletion recovery | Permanent; could add soft-delete + 30d grace period |
| No geofencing/distance queries | Planned if community scales to 1000+ trees |
| No real-time updates (WebSocket) | Polling sufficient; WebSocket adds ops complexity |
| No export (GeoJSON/CSV) | Nice-to-have for conservation groups |

---

## Conclusion

PlantApp is a **fully functional, production-deployed** reforestation tracking app with user authentication, community interaction (likes/comments), public profiles, and admin moderation. The stack is modern (React 19 + Django 6 + PostgreSQL), horizontally scalable (stateless JWT), and user-friendly (dark mode, mobile-responsive, toast notifications). It demonstrates best practices in REST API design, permission models, and deployment automation.

---

**Last Updated:** July 5, 2026  
**Repository:** https://github.com/MikeSs26/plantapp  
**Live URLs:**
- Frontend: https://plantapp-black.vercel.app
- Backend: https://plantapp-upfy.onrender.com
- Django Admin: https://plantapp-upfy.onrender.com/admin/
