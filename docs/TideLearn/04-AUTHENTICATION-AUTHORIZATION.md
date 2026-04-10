# TideLearn — Authentication & Authorization

> Version: 0.1.0 | Last updated: 2026-04-10

*Navigation: [← Data Model](03-DATA-MODEL.md) | [Index](00-INDEX.md) | Next: [Code Conventions →](05-CODE-CONVENTIONS.md)*

---

## Authentication Flow

TideLearn uses **Google OAuth** via Supabase Auth. There is no email/password registration.

### Login Flow

```
1. User clicks "Sign in with Google" on /auth
2. Supabase Auth redirects to Google consent screen
3. Google returns OAuth token to Supabase
4. Supabase creates/updates auth.users record
5. Trigger creates/updates profiles record
6. Frontend receives session (stored in localStorage)
7. React AuthProvider context updates
8. User redirected to /courses
```

### Session Management

- **Persistence**: localStorage (Supabase default)
- **Auto-refresh**: Enabled — tokens refresh automatically before expiry
- **Session check**: `supabase.auth.getSession()` on app mount
- **Listener**: `supabase.auth.onAuthStateChange()` for real-time auth events

### Google OAuth Configuration

- **Cloud project**: `tidelearn` (Google Cloud Console)
- **Authorized redirect URI**: Configured in Supabase Auth settings
- **Scopes**: `email`, `profile` (standard)

---

## Authorization Model

### Route-Level Protection

```typescript
// In App.tsx — ProtectedRoute wrapper
<Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
```

| Route | Protection | Who can access |
|-------|-----------|---------------|
| `/` | Public | Anyone |
| `/auth` | Public | Anyone |
| `/view` | Public* | Anyone (public courses); Owner (private courses) |
| `/courses` | Protected | Authenticated users only |
| `/editor` | Protected | Authenticated users only |
| `/settings` | Protected | Authenticated users only |
| `/changelog` | Protected | Authenticated users only |

### Database-Level Protection (RLS)

Row Level Security policies enforce access control at the PostgreSQL level:

#### profiles table

```sql
-- Anyone authenticated can read profiles
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can only insert their own profile
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own profile
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
```

#### courses table

```sql
-- Public courses readable by anyone; own courses by owner
CREATE POLICY "courses_select" ON courses
  FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

-- Authenticated users can create courses
CREATE POLICY "courses_insert" ON courses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Owners can update their courses
CREATE POLICY "courses_update" ON courses
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Owners can delete their courses
CREATE POLICY "courses_delete" ON courses
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

#### course-media bucket

```sql
-- Public read (anyone can access uploaded media)
-- Authenticated upload to user-scoped folders (user_id/*)
-- Owner delete (users can delete their own files)
```

---

## MCP Server Authentication

Currently, the MCP server uses **Supabase service role key** (server-side, bypasses RLS). This is appropriate for the stdio transport model where Claude runs locally.

### Future: OAuth 2.0 PKCE (Plan D)

When the MCP server moves to hosted SSE transport:

```
1. Claude initiates OAuth 2.0 PKCE flow
2. User authenticates via Google (Supabase Auth)
3. /finalize-auth endpoint exchanges Supabase token for MCP session token
4. Session stored in mcp_sessions table
5. Subsequent requests include MCP token in SSE connection
6. AsyncLocalStorage provides request-scoped user context
7. RLS policies apply per-user (no more service role bypass)
```

---

## Security Considerations

1. **No service role key in frontend** — Only the publishable anon key is exposed
2. **RLS on every table** — Database enforces access control regardless of API layer
3. **User-scoped storage** — Media uploads are namespaced by `user_id/` prefix
4. **Session validation** — `getUser()` not `getSession()` for server-side auth checks (Supabase best practice)
5. **CSRF protection** — Supabase Auth handles CSRF via state parameter in OAuth flow
