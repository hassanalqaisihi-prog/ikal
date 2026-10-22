# عكال · Ikal

Bilingual (Arabic + English) question-and-answer community.
Next.js 14 (App Router) + Supabase (auth + Postgres + RLS) + Resend (email) + Vercel.

> **Honest status:** this code was written without being installed, compiled or run
> (the authoring environment had no internet or browser). Expect to fix a few small
> things on the first run. Section 6 is the test checklist; run it before going live.

## 1. Create the services (all have free tiers)
1. **Supabase**: create a project. Keep the database password somewhere safe.
2. **Resend**: create an account and an API key. For real users you must verify a domain
   (Resend > Domains). Without one, Resend only delivers to your own account email.
3. **Vercel**: create an account and connect your Git host.

## 2. Database
Supabase > SQL Editor > New query > paste all of `supabase/migrations/001_init.sql` > Run.
It creates tables, row-level security, triggers, limits and 5 starter categories.

## 3. Supabase settings
- **Authentication > Providers > Email**: enabled, "Confirm email" ON.
- **Authentication > URL Configuration**:
  - Site URL: your site address (`http://localhost:3000` while testing)
  - Redirect URLs: add `http://localhost:3000/auth/callback` and later
    `https://YOUR-VERCEL-ADDRESS/auth/callback`
- **Authentication > SMTP Settings** (so confirm / reset emails go through Resend):
  host `smtp.resend.com`, port `465`, username `resend`, password = your Resend API key,
  sender = an address on your verified domain.

## 4. Environment
```
cp .env.local.example .env.local
```
Fill in every value (Supabase URL, anon key, **service-role key**, Resend key and sender,
admin email, site URL). `.env.local` is git-ignored. Never paste these keys in chat,
code or commits. The service-role key is used only in server code (`lib/supabase/admin.ts`).

## 5. Run
```
npm install
npm run typecheck     # fix anything it reports
npm run dev           # http://localhost:3000
```
After typecheck is clean, set `typescript.ignoreBuildErrors` to `false` in `next.config.mjs`.

**First admin:** sign up in the app, confirm the email, then in Supabase SQL Editor run:
```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'YOUR-EMAIL');
```

## 6. Test checklist (do it once as owner, once as visitor)
**Visitor (not logged in; use a private window)**
- [ ] Home shows questions; tabs Newest / Unanswered / Top work; category and tag filters work; search works
- [ ] Question page opens; answers, comments, vote counts visible
- [ ] Clicking vote, answer, comment, ask sends you to login, and back afterwards
- [ ] Language button switches Arabic (RTL) and English (LTR)
- [ ] `/admin` and `/settings` redirect to login

**Owner (logged in)**
- [ ] Sign up > confirmation email arrives > link logs you in > welcome email arrives
- [ ] Wrong password shows an error; "Forgot password" email arrives and resets it
- [ ] Ask a question with category and tags; edit it; delete it
- [ ] With a second account: answer, comment, vote (cannot vote on own post), report
- [ ] Question author gets bell notification + email for new answer and comment
- [ ] Accept an answer (moves to top, "Solved" badge, answer author notified)
- [ ] Profile shows reputation changes; Settings saves name, bio, language, email switches
- [ ] Admin: report appears, Hide removes the post for others, Dismiss clears it; add/rename a category
- [ ] Answer a 2nd time on the same question is refused; 6th question in a day is refused

## 7. Deploy to Vercel
1. Push the project to a Git repository (`.env.local` is ignored; confirm with `git status`).
2. Vercel > Add New > Project > import the repo (framework: Next.js, no changes needed).
3. Settings > Environment Variables: add every variable from `.env.local.example`, with
   `NEXT_PUBLIC_SITE_URL` set to the live address.
4. Deploy. Then add the live `/auth/callback` URL in Supabase (step 3) and re-test signup.

## 8. Known differences from SPEC.md
- Comments can be deleted but not edited.
- Hidden posts simply disappear for other people (they do not show "removed by admin");
  the author and admins still see them marked as hidden.
- Votes and forms reload the page (no instant client-side updates).
- No "similar questions" suggestions while typing a title.
- A comment on an answer stores both `question_id` and `answer_id`.
- Rate limits: 5 questions, 20 answers, 60 comments per user per day.
