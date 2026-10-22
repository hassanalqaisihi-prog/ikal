-- عكال / Ikal: initial schema, row-level security, triggers.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

-- ---------- Tables ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 300),
  avatar_color text not null default '#7A3CFF',
  language text not null default 'ar' check (language in ('ar','en')),
  reputation int not null default 0,
  is_admin boolean not null default false,
  email_on_answer boolean not null default true,
  email_on_comment boolean not null default true,
  email_on_accepted boolean not null default true,
  welcomed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  slug text not null unique,
  sort_order int not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 15 and 200),
  body text not null check (char_length(body) between 30 and 10000),
  category_id uuid not null references public.categories(id),
  accepted_answer_id uuid,
  score int not null default 0,
  answer_count int not null default 0,
  view_count int not null default 0,
  status text not null default 'open' check (status in ('open','hidden','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('simple', title || ' ' || body)) stored
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 20 and 10000),
  score int not null default 0,
  status text not null default 'open' check (status in ('open','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, author_id)
);

alter table public.questions
  add constraint questions_accepted_fk foreign key (accepted_answer_id)
  references public.answers(id) on delete set null;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 30 and name = lower(name))
);

create table public.question_tags (
  question_id uuid not null references public.questions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (question_id, tag_id)
);

-- A comment always has question_id; answer_id is set when the comment is on an answer.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  status text not null default 'open' check (status in ('open','hidden')),
  created_at timestamptz not null default now()
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete cascade,
  value smallint not null check (value in (1,-1)),
  created_at timestamptz not null default now(),
  check (num_nonnulls(question_id, answer_id) = 1),
  unique (user_id, question_id),
  unique (user_id, answer_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('answer','comment','accepted')),
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('question','answer','comment')),
  target_id uuid not null,
  reason text not null check (reason in ('spam','offensive','off_topic','other')),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open','hidden','dismissed')),
  handled_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index on public.questions (created_at desc);
create index on public.questions (category_id);
create index on public.questions (score desc);
create index on public.questions using gin (search);
create index on public.answers (question_id);
create index on public.comments (question_id);
create index on public.notifications (user_id, is_read);
create index on public.reports (status);

-- ---------- Helper functions ----------
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger questions_touch before update on public.questions
  for each row execute function public.touch_updated_at();
create trigger answers_touch before update on public.answers
  for each row execute function public.touch_updated_at();

-- Create a profile whenever someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, language)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data->>'display_name'), 40), ''), left(split_part(new.email, '@', 1), 40)),
    case when new.raw_user_meta_data->>'language' = 'en' then 'en' else 'ar' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reputation: question upvote +5, answer upvote +10, accepted answer +15, downvote received -2.
create or replace function public.recalc_reputation(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles p set reputation =
    (select 5 * count(*) filter (where v.value = 1) - 2 * count(*) filter (where v.value = -1)
       from public.votes v join public.questions q on q.id = v.question_id where q.author_id = uid)
    +
    (select 10 * count(*) filter (where v.value = 1) - 2 * count(*) filter (where v.value = -1)
       from public.votes v join public.answers a on a.id = v.answer_id where a.author_id = uid)
    +
    (select 15 * count(*) from public.questions q join public.answers a on a.id = q.accepted_answer_id
       where a.author_id = uid)
  where p.id = uid;
end $$;

-- Votes: block self-vote, keep scores and reputation current.
create or replace function public.block_self_vote() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.question_id is not null then
    if exists (select 1 from public.questions where id = new.question_id and author_id = new.user_id) then
      raise exception 'cannot vote on own post';
    end if;
  else
    if exists (select 1 from public.answers where id = new.answer_id and author_id = new.user_id) then
      raise exception 'cannot vote on own post';
    end if;
  end if;
  return new;
end $$;

create trigger votes_block_self before insert on public.votes
  for each row execute function public.block_self_vote();

create or replace function public.on_vote_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare tq uuid; ta uuid; author uuid;
begin
  if tg_op = 'DELETE' then tq := old.question_id; ta := old.answer_id;
  else tq := new.question_id; ta := new.answer_id; end if;
  if tq is not null then
    update public.questions set score = (select coalesce(sum(value), 0) from public.votes where question_id = tq)
      where id = tq returning author_id into author;
  else
    update public.answers set score = (select coalesce(sum(value), 0) from public.votes where answer_id = ta)
      where id = ta returning author_id into author;
  end if;
  if author is not null then perform public.recalc_reputation(author); end if;
  return null;
end $$;

create trigger votes_after after insert or update or delete on public.votes
  for each row execute function public.on_vote_change();

-- Answer counter.
create or replace function public.on_answer_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare qid uuid;
begin
  qid := case when tg_op = 'DELETE' then old.question_id else new.question_id end;
  update public.questions set answer_count =
    (select count(*) from public.answers where question_id = qid and status = 'open')
    where id = qid;
  return null;
end $$;

create trigger answers_count after insert or update of status or delete on public.answers
  for each row execute function public.on_answer_change();

-- In-app notifications.
create or replace function public.notify_on_answer() returns trigger
language plpgsql security definer set search_path = public as $$
declare asker uuid;
begin
  select author_id into asker from public.questions where id = new.question_id;
  if asker is not null and asker <> new.author_id then
    insert into public.notifications (user_id, type, question_id, answer_id, actor_id)
    values (asker, 'answer', new.question_id, new.id, new.author_id);
  end if;
  return new;
end $$;

create trigger answers_notify after insert on public.answers
  for each row execute function public.notify_on_answer();

create or replace function public.notify_on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if new.answer_id is not null then
    select author_id into target from public.answers where id = new.answer_id;
  else
    select author_id into target from public.questions where id = new.question_id;
  end if;
  if target is not null and target <> new.author_id then
    insert into public.notifications (user_id, type, question_id, answer_id, actor_id)
    values (target, 'comment', new.question_id, new.answer_id, new.author_id);
  end if;
  return new;
end $$;

create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_on_comment();

-- Daily limits: 5 questions, 20 answers, 60 comments per user per 24h.
create or replace function public.enforce_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int; lim int;
begin
  if tg_table_name = 'questions' then
    select count(*) into n from public.questions where author_id = new.author_id and created_at > now() - interval '1 day'; lim := 5;
  elsif tg_table_name = 'answers' then
    select count(*) into n from public.answers where author_id = new.author_id and created_at > now() - interval '1 day'; lim := 20;
  else
    select count(*) into n from public.comments where author_id = new.author_id and created_at > now() - interval '1 day'; lim := 60;
  end if;
  if n >= lim then raise exception 'rate_limit'; end if;
  return new;
end $$;

create trigger questions_rate before insert on public.questions for each row execute function public.enforce_rate_limit();
create trigger answers_rate before insert on public.answers for each row execute function public.enforce_rate_limit();
create trigger comments_rate before insert on public.comments for each row execute function public.enforce_rate_limit();

-- Accept / un-accept an answer (only the asker).
create or replace function public.accept_answer(p_answer uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q uuid; asker uuid; ans_author uuid; prev uuid;
begin
  select question_id, author_id into q, ans_author from public.answers where id = p_answer and status = 'open';
  if q is null then raise exception 'not found'; end if;
  select author_id, accepted_answer_id into asker, prev from public.questions where id = q;
  if asker is distinct from auth.uid() then raise exception 'only the asker can accept'; end if;
  if prev = p_answer then
    update public.questions set accepted_answer_id = null where id = q;
  else
    update public.questions set accepted_answer_id = p_answer where id = q;
    if ans_author <> auth.uid() then
      insert into public.notifications (user_id, type, question_id, answer_id, actor_id)
      values (ans_author, 'accepted', q, p_answer, auth.uid());
    end if;
  end if;
  perform public.recalc_reputation(ans_author);
  if prev is not null and prev <> p_answer then
    perform public.recalc_reputation((select author_id from public.answers where id = prev));
  end if;
end $$;

create or replace function public.bump_view(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.questions set view_count = view_count + 1 where id = p_id and status = 'open';
$$;

revoke all on function public.recalc_reputation(uuid) from public, anon, authenticated;
revoke all on function public.accept_answer(uuid) from public, anon, authenticated;
grant execute on function public.accept_answer(uuid) to authenticated;
grant execute on function public.bump_view(uuid) to anon, authenticated;

-- ---------- Privileges (column level: users can only touch what they should) ----------
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, bio, avatar_color, language, email_on_answer, email_on_comment, email_on_accepted)
  on public.profiles to authenticated;

revoke insert, update, delete on public.categories from anon, authenticated;
grant insert (name_ar, name_en, slug, sort_order, is_hidden) on public.categories to authenticated;
grant update (name_ar, name_en, sort_order, is_hidden) on public.categories to authenticated;

revoke insert, update, delete on public.questions from anon, authenticated;
grant insert (author_id, title, body, category_id) on public.questions to authenticated;
grant update (title, body, category_id, status) on public.questions to authenticated;

revoke insert, update on public.answers from anon, authenticated;
grant insert (question_id, author_id, body) on public.answers to authenticated;
grant update (body, status) on public.answers to authenticated;

revoke insert, update on public.comments from anon, authenticated;
grant insert (author_id, question_id, answer_id, body) on public.comments to authenticated;
grant update (status) on public.comments to authenticated;

revoke insert, update on public.votes from anon, authenticated;
grant insert (user_id, question_id, answer_id, value) on public.votes to authenticated;
grant update (value) on public.votes to authenticated;

revoke insert, update, delete on public.tags from anon, authenticated;
grant insert (name) on public.tags to authenticated;

revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;

revoke insert, update, delete on public.reports from anon, authenticated;
grant insert (reporter_id, target_type, target_id, reason, note) on public.reports to authenticated;
grant update (status, handled_by) on public.reports to authenticated;

-- ---------- Row-level security ----------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.tags enable row level security;
alter table public.question_tags enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

-- profiles
create policy profiles_read on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- categories
create policy categories_read on public.categories for select using (not is_hidden or public.is_admin());
create policy categories_admin_insert on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_admin_update on public.categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- questions
create policy questions_read on public.questions for select
  using (status = 'open' or public.is_admin() or (author_id = auth.uid() and status <> 'deleted'));
create policy questions_insert on public.questions for insert to authenticated with check (author_id = auth.uid());
create policy questions_update_own on public.questions for update to authenticated
  using (author_id = auth.uid() and status = 'open')
  with check (author_id = auth.uid() and status in ('open','deleted'));
create policy questions_update_admin on public.questions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- answers
create policy answers_read on public.answers for select
  using (status = 'open' or public.is_admin() or author_id = auth.uid());
create policy answers_insert on public.answers for insert to authenticated
  with check (author_id = auth.uid()
    and exists (select 1 from public.questions q where q.id = question_id and q.status = 'open'));
create policy answers_update_own on public.answers for update to authenticated
  using (author_id = auth.uid() and status = 'open') with check (author_id = auth.uid() and status = 'open');
create policy answers_update_admin on public.answers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy answers_delete on public.answers for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- tags
create policy tags_read on public.tags for select using (true);
create policy tags_insert on public.tags for insert to authenticated with check (true);

create policy question_tags_read on public.question_tags for select using (true);
create policy question_tags_insert on public.question_tags for insert to authenticated
  with check (exists (select 1 from public.questions q where q.id = question_id and q.author_id = auth.uid()));
create policy question_tags_delete on public.question_tags for delete to authenticated
  using (exists (select 1 from public.questions q where q.id = question_id and q.author_id = auth.uid()));

-- comments
create policy comments_read on public.comments for select
  using (status = 'open' or public.is_admin() or author_id = auth.uid());
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = auth.uid()
    and exists (select 1 from public.questions q where q.id = question_id and q.status = 'open'));
create policy comments_update_admin on public.comments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- votes (private to the voter)
create policy votes_read_own on public.votes for select to authenticated using (user_id = auth.uid());
create policy votes_insert_own on public.votes for insert to authenticated with check (user_id = auth.uid());
create policy votes_update_own on public.votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy votes_delete_own on public.votes for delete to authenticated using (user_id = auth.uid());

-- notifications
create policy notifications_read_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_update_admin on public.reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Starter categories ----------
insert into public.categories (name_ar, name_en, slug, sort_order) values
  ('عام', 'General', 'general', 1),
  ('تقنية', 'Tech', 'tech', 2),
  ('ألعاب', 'Games', 'games', 3),
  ('حياة يومية', 'Daily life', 'daily-life', 4),
  ('تعلّم ودراسة', 'Learning', 'learning', 5);
