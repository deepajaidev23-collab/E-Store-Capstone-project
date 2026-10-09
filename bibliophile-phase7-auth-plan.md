# Phase 7 — Supabase Authentication Plan

## Top-Level Overview

Harden and complete the Supabase Auth integration. The codebase already has a
working skeleton (`AuthContext`, `AuthGuard`, login/register pages using
`react-hook-form`) but it has several correctness gaps, a security gap in
`AuthGuard`, and missing features (profile sync, proper loading screen,
display-name registration, sign-out in the navbar). Nothing in the UI, hook
call sites, or routing structure needs to change — each sub-task is surgical.

### What already works

| Piece | State |
|---|---|
| `supabase` client singleton | ✅ exists, `src/lib/supabase.ts` |
| `AuthContext` + `AuthProvider` | ✅ exists, session hydration + subscription |
| `useAuth()` hook | ✅ exists |
| `AuthGuard` wrapper | ⚠️ has a security gap (see §Security) |
| Login page form | ✅ exists, uses design system |
| Register page form | ✅ exists, 8-char password min |
| Route protection on 9 routes | ✅ all user-owned routes wrapped |
| `ProfilePage` stub | ❌ empty stub |

### What is missing / broken

1. **`AuthGuard` loading flicker** — while `loading = true` the guard renders a
   plain `<span>` with gray text that uses removed Tailwind class names
   (`text-gray-500`). Needs replacing with the design-system `LoadingState`.
2. **`AuthGuard` security gap** — the guard never checks for a session expiry
   event. If `onAuthStateChange` fires `SIGNED_OUT` the `user` state becomes
   `null` but any in-flight navigation completes before the next render.
   This is not a critical RLS bypass (RLS protects the server), but it means
   stale UI can appear for a render cycle. Needs a `loading` re-arm on the
   `SIGNED_OUT` event to trigger a clean re-render.
3. **`RegisterPage` navigates immediately** — after `signUp` the page
   navigates to `/` without waiting for the profile trigger to complete and
   without showing a confirmation message. Supabase email-confirmation is
   disabled by default in local dev but enabled in production. The page needs
   to handle both cases: `session !== null` (auto-confirmed) → navigate home;
   `session === null` (email confirmation pending) → show "Check your email".
4. **No `display_name` on registration** — the profile trigger sets
   `display_name` from `email` prefix. The register form should accept an
   optional display name and pass it as `raw_user_meta_data` so the trigger
   has a real name to use.
5. **Sign-out not wired in the navbar** — `RootLayout` renders a profile
   icon button that navigates to `/profile` for signed-in users, but there is
   no sign-out affordance anywhere in the nav. The profile dropdown or a
   separate button must expose sign-out.
6. **`ProfilePage` is a stub** — the auth phase should at minimum display the
   signed-in user's `email` and profile `display_name` and provide a sign-out
   button, even if full profile editing is deferred.
7. **Session restoration race** — during the initial hydration (`loading = true`)
   the `RootLayout` already renders and calls `useAuth()`. The navbar's
   conditional rendering (`user ? profile-icon : sign-in`) flickers because
   `user` starts as `null`. A global `loading` gate at the `App` level
   (or a skeleton navbar) prevents the flicker.
8. **`AuthGuard` does not redirect already-authenticated users away from
   `/login` and `/register`** — a signed-in user can still visit these pages.
   An `AuthRedirect` guard (the inverse of `AuthGuard`) prevents this.

---

## Authentication Flow

```
Registration
  User fills name + email + password
       │
       ▼
  supabase.auth.signUp({ email, password, options: { data: { display_name } } })
       │
  ┌────┴───────────────────────────────────────────────┐
  │ auto-confirm ON (local dev)   │ auto-confirm OFF (prod) │
  │ session returned immediately  │ session = null          │
  │ trigger fires → profiles row  │ show "check your email" │
  │ navigate to /                 │ stay on /register       │
  └───────────────────────────────┴─────────────────────────┘

Login
  User fills email + password
       │
       ▼
  supabase.auth.signInWithPassword({ email, password })
       │
  ┌────┴────────────────────────────────────────────────┐
  │ success                       │ error (wrong creds)    │
  │ navigate to ?next= (or /)     │ show Alert on form     │
  └───────────────────────────────┴────────────────────────┘

Session Restoration (on page load / refresh)
  App mounts → AuthProvider useEffect fires
       │
       ▼
  supabase.auth.getSession()   ← reads from localStorage
       │
  setUser + setSession → loading = false
       │
  If loading === true → App renders global skeleton (not routed yet)
  If loading === false → Router renders with correct auth state

Sign-out
  User clicks "Sign out"
       │
       ▼
  supabase.auth.signOut()
       │
  onAuthStateChange fires SIGNED_OUT → user = null, session = null
       │
  React Router navigate('/') → home page (public)
  queryClient.clear() → all cached user-data queries discarded
```

---

## Sub-Tasks

---

### Sub-Task 1 — Fix `AuthGuard` loading state and security gap

**Status:** `[ ] pending`

**Intent:**
Replace the inline `text-gray-500` loading stub with the design-system
`LoadingState`. Add explicit handling of the `SIGNED_OUT` auth event in
`AuthContext` to re-arm `loading` during sign-out so `AuthGuard` never
shows stale protected content.

**Expected Outcomes:**
- `AuthGuard` loading state uses `LoadingState` from `src/components/ui`
- No hardcoded Tailwind colour classes remain in `AuthGuard.tsx`
- `AuthContext` sets `loading = true` momentarily on `SIGNED_OUT` before
  `user` becomes `null`, so the guard re-renders cleanly

**Todo List:**
1. In `src/components/AuthGuard.tsx`:
   - Replace the inline loading `<div>` with `<LoadingState message="Loading…" />`
     imported from `@/components/ui`
   - Remove the `min-h-screen` wrapper (LoadingState already centres itself)

2. In `src/context/AuthContext.tsx`:
   - In the `onAuthStateChange` callback, add a case for the `SIGNED_OUT`
     event: set `loading = true` before clearing `user` and `session`, then
     set `loading = false` after the state is cleared. This prevents the
     split-render window where `user = null` but the guard has not yet
     re-evaluated.
   - Pattern: `if (event === 'SIGNED_OUT') { setLoading(true) }` before the
     state setters, then `setLoading(false)` in a `useEffect` cleanup or
     a `setTimeout(0)` tick to allow the batch.

**Relevant Context:**
- `src/components/AuthGuard.tsx` — full file
- `src/context/AuthContext.tsx` — full file
- `src/components/ui/LoadingState.tsx` — `LoadingState` component

---

### Sub-Task 2 — Add `AuthRedirect` guard (inverse of `AuthGuard`)

**Status:** `[ ] pending`

**Intent:**
Prevent authenticated users from visiting `/login` or `/register`. Currently
a signed-in user can navigate directly to these pages. The guard redirects
them to `/` (or the `next` param if present).

**Expected Outcomes:**
- Visiting `/login` while authenticated redirects to `/` (or `next=` value)
- Visiting `/register` while authenticated redirects to `/`
- The guard handles the `loading` state (shows nothing / spinner while
  session is being restored, then decides)

**Todo List:**
1. Create `src/components/AuthRedirect.tsx`:
   - Props: `children: React.ReactNode`
   - Reads `{ user, loading }` from `useAuth()`
   - Reads `next` from `useSearchParams()`
   - While loading: render `<LoadingState />`
   - If `user !== null`: `<Navigate to={next ?? '/'} replace />`
   - Otherwise: render `children`

2. In `src/router.tsx`:
   - Wrap `LoginPage` and `RegisterPage` elements in `<AuthRedirect>`:
     ```tsx
     { path: '/login',    element: <AuthRedirect><LoginPage /></AuthRedirect> }
     { path: '/register', element: <AuthRedirect><RegisterPage /></AuthRedirect> }
     ```

**Relevant Context:**
- `src/components/AuthGuard.tsx` — pattern to mirror (inverse logic)
- `src/router.tsx` — lines for `/login` and `/register`

---

### Sub-Task 3 — Add `display_name` field to registration

**Status:** `[ ] pending`

**Intent:**
Pass the user's chosen display name as `raw_user_meta_data` to Supabase
Auth on sign-up, so the profile trigger (`handle_new_user`) uses the real
name rather than the email prefix. The field is **required**.

**Expected Outcomes:**
- Register form has a "Display name" field (required, above email)
- Validation: `required: 'Display name is required'`, `maxLength: 50`
- `signUp` is always called with `options: { data: { display_name } }`
- `AuthContext.signUp` signature is extended to accept required
  `displayName: string`
- The field has a reasonable maxLength (50 characters)

**Todo List:**
1. In `src/context/AuthContext.tsx`:
   - Change `signUp` signature to:
     `signUp: (email: string, password: string, displayName: string) => ...`
   - Always pass `options: { data: { display_name: displayName } }` to
     `supabase.auth.signUp`

2. Update `AuthContextValue` interface accordingly.

3. In `src/pages/RegisterPage.tsx`:
   - Add `displayName: string` to `RegisterFormValues` (required)
   - Add a `FormField` for "Display name" (required, `maxLength={50}`,
     `required: 'Display name is required'`) as the first field
   - Pass `values.displayName` to `signUp(email, password, displayName)`

**Relevant Context:**
- `src/context/AuthContext.tsx` — `signUp` method
- `src/pages/RegisterPage.tsx` — form values and `onSubmit`
- Phase 6 plan §12 — profile trigger uses `raw_user_meta_data->>'display_name'`

---

### Sub-Task 4 — Handle email-confirmation pending state in `RegisterPage`

**Status:** `[ ] pending`

**Intent:**
When Supabase is configured to require email confirmation (production mode),
`signUp` returns `{ data: { session: null }, error: null }`. The current
`RegisterPage` silently navigates to `/` which then fails (no session, no
profile). The page must detect this case and show a "Check your email"
message instead of navigating.

**Expected Outcomes:**
- If `signUp` returns `session !== null` → navigate to `/` (auto-confirm, local dev)
- If `signUp` returns `session === null` and no error → show an `Alert variant="info"`
  with "Please check your email to confirm your account." and do not navigate
- The form is hidden after this point (user has nothing more to do)
- The confirmation alert has a link back to `/login` for when they return
  after clicking the email link

**Todo List:**
1. In `src/pages/RegisterPage.tsx`:
   - Change `onSubmit` to read the full `{ data, error }` result from `signUp`
   - After error check: if `data.session` is not null, navigate to `/`
   - If `data.session` is null (pending confirmation): set a local state flag
     `emailSent = true`
   - Conditionally render the form vs. the confirmation message based on
     `emailSent`

**Relevant Context:**
- `src/pages/RegisterPage.tsx` — `onSubmit` handler
- `src/components/ui/ErrorState.tsx` — `Alert variant="info"`

---

### Sub-Task 5 — Wire sign-out in the navbar

**Status:** `[ ] pending`

**Intent:**
The profile icon button in `RootLayout` currently navigates to `/profile`.
A signed-in user has no way to sign out without going to the profile page
(which is a stub). This sub-task adds a sign-out action accessible from the
navbar without requiring a full profile page to be implemented.

**Expected Outcomes:**
- A "Sign out" link/button is reachable from the navbar when the user is
  signed in
- Clicking it calls `signOut()`, clears the react-query cache, and navigates
  to `/`
- On mobile the affordance is still reachable
- The existing profile icon navigation to `/profile` is preserved

**Design decision — dropdown vs. two separate buttons:**
Use a simple two-button row: the existing profile icon (navigates to
`/profile`) plus a new `IconButton` with a log-out icon, placed next to the
profile icon in the `actions` slot of the navbar. This avoids building a
dropdown component that is out of scope for this phase.

**Todo List:**
1. In `src/layouts/RootLayout.tsx`:
   - Add `signOut` to the destructured `useAuth()` result
   - Add `queryClient` from `useQueryClient()` (import `useQueryClient` from
     `@tanstack/react-query`)
   - Define a `handleSignOut` async function:
     ```ts
     const handleSignOut = async () => {
       await signOut()
       queryClient.clear()
       navigate('/')
     }
     ```
   - Add a second `IconButton` (log-out icon SVG) in the `actions` slot,
     beside the existing profile icon, calling `handleSignOut`
   - Label: `aria-label="Sign out"`

**Relevant Context:**
- `src/layouts/RootLayout.tsx` — `actions` JSX slot
- `src/hooks/useAuth.ts` — `signOut` available from context
- `src/components/ui/Button.tsx` — `IconButton` component

---

### Sub-Task 6 — Implement `ProfilePage` (auth phase scope only)

**Status:** `[ ] pending`

**Intent:**
Replace the `ProfilePage` stub with a page that shows the authenticated
user's email, display name from their `profiles` row (read directly via
Supabase), reward points, and a sign-out button. Full profile editing and
address management is deferred to a later phase. This page is the minimum
needed to confirm auth is working end-to-end.

**Expected Outcomes:**
- Signed-in users see their email (from `auth.user.email`)
- Signed-in users see their `display_name` and `reward_points` from the
  `profiles` table (read via Supabase, not from `AuthContext`)
- A "Sign out" button is present on the page and works
- Loading state while profile is fetching
- Error state if the profiles query fails
- Uses design-system components throughout (no hardcoded gray colours)

**Todo List:**
1. Create `src/hooks/useProfile.ts`:
   - `useProfile()` — queries `supabase.from('profiles').select('*').eq('id', user.id).single()`
   - Returns `{ data: Profile | null, isLoading, isError }`
   - queryKey: `['profile', user.id]`
   - Uses `useAuth()` to get `user.id`; `enabled: !!user`

2. In `src/pages/ProfilePage.tsx`:
   - Replace stub with a page that:
     - Calls `useProfile()` and `useAuth()`
     - Shows `LoadingState` while loading
     - Shows `ErrorState` on error
     - Renders the profile data in `Card` components using design-system
       `Heading`, `Text`, `Button` primitives
     - Has a "Sign out" button that calls `handleSignOut` (same pattern as
       Sub-Task 5, but inline in the page since the user is already here)

**Relevant Context:**
- `src/types/user.ts` — `Profile` interface
- `src/lib/supabase.ts` — supabase client
- `src/components/ui/index.ts` — available primitives

---

### Sub-Task 7 — Global loading gate in `App`

**Status:** `[ ] pending`

**Intent:**
During the initial session hydration (`loading = true`), the router already
renders the matched route and `RootLayout` calls `useAuth()`. This causes a
flash where the navbar shows "Sign in" before the session is restored and
then immediately flips to the profile icon. A global gate prevents the router
from rendering until the initial auth check completes.

**Expected Outcomes:**
- While `AuthProvider` is resolving the initial session, the entire app
  renders a full-page `LoadingState` spinner instead of the routed content
- After `loading = false` the router renders normally
- The gate is in `App.tsx` or a thin wrapper — no changes to individual pages
- The spinner is centred on screen and matches the design system

**Todo List:**
1. Create `src/components/AppLoadingGate.tsx`:
   - A component that reads `loading` from `useAuth()`
   - If `loading`: returns a full-viewport centred `Spinner` (not `LoadingState`
     which has a message — just the raw `Spinner` from the ui barrel)
   - If not loading: returns `children` unchanged
   - This component must be inside `AuthProvider` but outside `RouterProvider`

2. In `src/App.tsx`:
   - Wrap `RouterProvider` with `AppLoadingGate`:
     ```tsx
     <AuthProvider>
       <AppLoadingGate>
         <RouterProvider router={router} />
       </AppLoadingGate>
     </AuthProvider>
     ```
   - Note: `AppLoadingGate` calls `useAuth()` so it must be a child of
     `AuthProvider`, not a sibling.

**Relevant Context:**
- `src/App.tsx` — provider tree
- `src/context/AuthContext.tsx` — `loading` state
- `src/components/ui/LoadingState.tsx` — `Spinner` export

---

### Sub-Task 8 — Tests

**Status:** `[ ] pending`

**Intent:**
Verify the auth flow behaviours that are testable without a live Supabase
instance. All tests use `MemoryRouter` and mock `useAuth`.

**Expected Outcomes:**
- All existing tests continue to pass
- New `src/test/auth.test.tsx` covers:
  - `AuthGuard` redirects unauthenticated users to `/login?next=<path>`
  - `AuthGuard` renders children when user is present
  - `AuthGuard` renders `LoadingState` while auth is loading
  - `AuthRedirect` redirects authenticated users away from `/login`
  - `AuthRedirect` renders children when user is not authenticated
  - `RegisterPage` shows "Check your email" message when `session` is null
  - `LoginPage` shows error `Alert` when `signIn` returns an error

**Todo List:**
1. Create `src/test/auth.test.tsx`
2. Mock `useAuth` hook in each test using `vi.mock('@/hooks/useAuth')`
3. For `RegisterPage` test: mock `useAuth` to return a `signUp` that resolves
   `{ data: { session: null, user: null }, error: null }` and assert that
   the "Check your email" message is visible
4. For `LoginPage` test: mock `signIn` to return an error object and assert
   the `Alert` renders with the error message
5. Run `npm run typecheck && npm run lint && npm test` — all must pass

**Relevant Context:**
- `src/test/NotFoundPage.test.tsx` — existing test pattern to follow
- `src/components/AuthGuard.tsx` — component under test
- `src/pages/LoginPage.tsx` / `RegisterPage.tsx` — pages under test

---

## Security Risks and Mitigations

### Risk 1 — Stale protected content on sign-out (MEDIUM)

**Description:** When `supabase.auth.signOut()` is called, `onAuthStateChange`
fires and sets `user = null`. Between the event and the next render, any
`AuthGuard`-wrapped component is still showing the protected UI for one render
cycle. On a fast machine this is invisible; on a slow device or under
throttling it can flash.

**Mitigation (Sub-Task 1):** Set `loading = true` in the `SIGNED_OUT` handler
before clearing `user`. This causes `AuthGuard` to render its loading state
(a spinner) for the one render cycle before redirecting, so no protected
content is briefly visible.

---

### Risk 2 — The anon key is public, but must not be over-trusted (LOW / by design)

**Description:** `VITE_SUPABASE_ANON_KEY` is visible in the browser bundle.
This is intentional and documented by Supabase — the anon key is not a secret.
Security is enforced server-side by Row Level Security, not by key secrecy.

**Mitigation:** RLS is enabled on all 15 tables (Phase 6 plan §8). The anon
key cannot bypass RLS. The service-role key is never in the frontend.

**What to verify:** Confirm in the Supabase dashboard that RLS is enabled and
that no "public" policies accidentally allow writes from the anon role.

---

### Risk 3 — Password sent over network (LOW — HTTPS mitigates)

**Description:** The login form POSTs a password to `supabase.auth.signInWithPassword`.
In HTTP the password would be visible in transit.

**Mitigation:** Supabase endpoints are always HTTPS. Vite's dev server serves
over HTTP on `localhost` only — this is acceptable for development. The
production deployment must enforce HTTPS. No additional code is required, but
the deployment checklist must include: "verify Supabase project URL uses
HTTPS" (it always does for hosted projects).

---

### Risk 4 — `next` redirect parameter open redirect (MEDIUM)

**Description:** `/login?next=/some-path` is used by `AuthGuard` to restore
the intended destination. If the `next` value is not validated, a crafted link
`/login?next=https://evil.com` could redirect users to an external site after
they log in.

**Mitigation (Sub-Task 2 / `AuthGuard`):** Before using the `next` parameter
in `navigate()`, validate that it is a relative path (starts with `/` and does
not contain `://`). If it fails validation, fall back to `/`.

Implementation note — add this helper, used in both `AuthGuard` and `LoginPage`:
```ts
function safeRedirectPath(next: string | null): string {
  if (!next) return '/'
  // Must be relative — no protocol, no double-slash at start
  if (next.startsWith('/') && !next.startsWith('//')) return next
  return '/'
}
```

This function should live in `src/lib/auth.ts` and be imported by both files.

---

### Risk 5 — Concurrent sign-up race: profile trigger failure (LOW)

**Description:** The profile trigger (`handle_new_user`) fires on
`auth.users` INSERT. If the trigger fails (e.g., network blip to the DB),
the user exists in `auth.users` but not in `profiles`. Subsequent reads from
`profiles` for that user return `null`.

**Mitigation:** The profile trigger uses `INSERT` without `ON CONFLICT`, so a
duplicate sign-up attempt does not silently create a second profile. The
`useProfile` hook (Sub-Task 6) falls back to showing an empty display name
and retrying (react-query retry: 1 is already configured). If the trigger
truly failed, the user can sign in and the profile page will show a degraded
state rather than crashing. A proper fix (idempotent `INSERT ... ON CONFLICT DO NOTHING`
in the trigger) should be in the Phase 6 migration, not here.

---

### Risk 6 — Session stored in `localStorage` — XSS risk (MEDIUM)

**Description:** Supabase JS client v2 stores the session JWT in
`localStorage` by default. An XSS attack on any page could read this token
and impersonate the user.

**Mitigation:**
- All page content is rendered via React's virtual DOM, which escapes text
  nodes automatically — there is no `dangerouslySetInnerHTML` usage in the
  codebase.
- User-generated content (book reviews, display names) is stored and
  retrieved through Supabase, which escapes values before writing them.
- The Supabase client can be configured to use `sessionStorage` or in-memory
  storage instead, but this breaks session persistence across tabs/refreshes —
  an unacceptable UX tradeoff.
- Content Security Policy headers should be set at the deployment level
  (Vercel / Netlify config) to restrict script sources. This is a
  deployment concern, not a code concern.

**What this phase does:** Ensures no `dangerouslySetInnerHTML` is introduced
and that no user-supplied content is placed directly into the DOM as HTML.

---

### Risk 7 — Exposing Supabase error messages to users (LOW)

**Description:** Raw Supabase error messages (e.g. "invalid login credentials",
"User already registered") may leak internal information or be confusing.

**Mitigation:** The current `LoginPage` and `RegisterPage` pass
`error.message` directly into the `Alert`. This is acceptable for the current
messages Supabase sends. If a message is clearly internal (e.g., a Postgres
error code), it should be replaced with a generic fallback. The `Auth` sub-task
does not change the error mapping, but adds a note to the implementation:
use `error.message` for Supabase auth errors (they are user-readable by
design) and log unexpected errors to the console rather than surfacing them
directly.

---

## Files Changed by This Phase

| File | Change type |
|---|---|
| `src/context/AuthContext.tsx` | Modify — SIGNED_OUT loading re-arm, displayName param |
| `src/components/AuthGuard.tsx` | Modify — LoadingState, safe redirect helper |
| `src/components/AuthRedirect.tsx` | **New** — inverse guard |
| `src/lib/auth.ts` | **New** — `safeRedirectPath` utility |
| `src/pages/LoginPage.tsx` | Modify — use `safeRedirectPath` |
| `src/pages/RegisterPage.tsx` | Modify — displayName field, email-confirm handling |
| `src/layouts/RootLayout.tsx` | Modify — sign-out button, `queryClient.clear()` |
| `src/hooks/useProfile.ts` | **New** — react-query hook for profiles table |
| `src/pages/ProfilePage.tsx` | Modify — replace stub |
| `src/components/AppLoadingGate.tsx` | **New** — global auth loading gate |
| `src/App.tsx` | Modify — wrap RouterProvider in AppLoadingGate |
| `src/router.tsx` | Modify — wrap login/register in AuthRedirect |
| `src/test/auth.test.tsx` | **New** — auth flow tests |

---

## Non-Goals for This Phase

- Password reset / forgot password flow
- OAuth / social login (Google, GitHub)
- Email change flow
- Full profile edit form (address management, avatar upload)
- Reward points display (requires Phase 6 DB to be live)
- Two-factor authentication
