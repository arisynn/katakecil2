-- Kata Kecil: public reader, private publishing. Apply to the dedicated project only.
begin;
create table public.kk_author_members (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.kk_author_members enable row level security;
grant select on public.kk_author_members to authenticated;
create policy author_own_membership on public.kk_author_members for select to authenticated
  using (user_id = (select auth.uid()));

create table public.kk_books (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{0,119}$'),
  title text not null check (length(title) between 1 and 300),
  author text not null default 'Kata Kecil',
  synopsis text not null default '',
  cover_url text,
  language text not null default 'id',
  status text not null default 'ongoing' check (status in ('ongoing','completed','hiatus')),
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.kk_sections (
  id uuid primary key,
  book_id text not null references public.kk_books(id) on delete cascade,
  position integer not null check (position >= 0),
  title text not null check (length(title) between 1 and 300),
  content_html text not null check (octet_length(content_html) <= 3000000),
  is_enabled boolean not null default true,
  release_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (book_id, position)
);
-- Contains public schedule metadata only, never manuscript content.
create table public.kk_release_schedule (
  section_id uuid primary key references public.kk_sections(id) on delete cascade,
  book_id text not null references public.kk_books(id) on delete cascade,
  release_at timestamptz not null,
  is_enabled boolean not null default true
);
create index kk_sections_publication on public.kk_sections(book_id, release_at) where is_enabled;
create index kk_release_schedule_book on public.kk_release_schedule(book_id, release_at) where is_enabled;
alter table public.kk_books enable row level security;
alter table public.kk_sections enable row level security;
alter table public.kk_release_schedule enable row level security;
grant select on public.kk_books, public.kk_sections, public.kk_release_schedule to anon, authenticated;
grant insert, update, delete on public.kk_books, public.kk_sections, public.kk_release_schedule to authenticated;
create policy books_public on public.kk_books for select to anon, authenticated using (is_published);
create policy books_author on public.kk_books for all to authenticated
  using (exists(select 1 from public.kk_author_members where user_id = (select auth.uid())))
  with check (exists(select 1 from public.kk_author_members where user_id = (select auth.uid())));
create policy sections_public on public.kk_sections for select to anon, authenticated
  using (is_enabled and release_at <= now() and exists(select 1 from public.kk_books b where b.id = book_id and b.is_published));
create policy sections_author on public.kk_sections for all to authenticated
  using (exists(select 1 from public.kk_author_members where user_id = (select auth.uid())))
  with check (exists(select 1 from public.kk_author_members where user_id = (select auth.uid())));
create policy schedule_public on public.kk_release_schedule for select to anon, authenticated
  using (is_enabled and exists(select 1 from public.kk_books b where b.id = book_id and b.is_published));
create policy schedule_author on public.kk_release_schedule for all to authenticated
  using (exists(select 1 from public.kk_author_members where user_id = (select auth.uid())))
  with check (exists(select 1 from public.kk_author_members where user_id = (select auth.uid())));

create function public.kk_publish_book(book jsonb, sections jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
declare item jsonb; v_section_id uuid;
begin
  if jsonb_typeof(sections) <> 'array' or jsonb_array_length(sections) > 600 then
    raise exception 'Maximum 600 sections per publication';
  end if;
  insert into public.kk_books(id,title,author,synopsis,cover_url,language,status,is_published)
  values(book->>'id',book->>'title',coalesce(book->>'author','Kata Kecil'),coalesce(book->>'synopsis',''),
    book->>'cover_url',coalesce(book->>'language','id'),coalesce(book->>'status','ongoing'),coalesce((book->>'is_published')::boolean,false))
  on conflict(id) do update set title=excluded.title,author=excluded.author,synopsis=excluded.synopsis,
    cover_url=excluded.cover_url,language=excluded.language,status=excluded.status,is_published=excluded.is_published,updated_at=now();
  -- Remove only sections explicitly absent from this complete publication snapshot.
  delete from public.kk_sections s where s.book_id=book->>'id'
    and not exists(select 1 from jsonb_array_elements(sections) x where (x->>'id')::uuid=s.id);
  -- Avoid temporary position collisions when a chapter is inserted/reordered.
  update public.kk_sections set position=position+1000000 where book_id=book->>'id';
  for item in select value from jsonb_array_elements(sections) loop
    v_section_id := (item->>'id')::uuid;
    if exists(select 1 from public.kk_sections where id=v_section_id and book_id<>book->>'id') then
      raise exception 'Section belongs to another book';
    end if;
    insert into public.kk_sections(id,book_id,position,title,content_html,is_enabled,release_at)
    values(v_section_id,book->>'id',(item->>'position')::integer,item->>'title',item->>'content_html',
      coalesce((item->>'is_enabled')::boolean,true),(item->>'release_at')::timestamptz)
    on conflict(id) do update set position=excluded.position,title=excluded.title,content_html=excluded.content_html,
      is_enabled=excluded.is_enabled,release_at=excluded.release_at,
      updated_at=case when (public.kk_sections.title,public.kk_sections.content_html) is distinct from (excluded.title,excluded.content_html)
        then now() else public.kk_sections.updated_at end;
    insert into public.kk_release_schedule(section_id,book_id,release_at,is_enabled)
    values(v_section_id,book->>'id',(item->>'release_at')::timestamptz,coalesce((item->>'is_enabled')::boolean,true))
    on conflict(section_id) do update set release_at=excluded.release_at,is_enabled=excluded.is_enabled;
  end loop;
end $$;
revoke all on function public.kk_publish_book(jsonb,jsonb) from public, anon;
grant execute on function public.kk_publish_book(jsonb,jsonb) to authenticated, service_role;

create table public.kk_read_budgets(visitor text primary key, window_start timestamptz not null, requests integer not null);
alter table public.kk_read_budgets enable row level security;
revoke all on public.kk_read_budgets from anon, authenticated;
create function public.kk_consume_read_budget(visitor_key text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare used integer;
begin
  insert into public.kk_read_budgets values(visitor_key,date_trunc('minute',now()),1)
  on conflict(visitor) do update set
    requests=case when public.kk_read_budgets.window_start < date_trunc('minute',now()) then 1 else public.kk_read_budgets.requests+1 end,
    window_start=date_trunc('minute',now()) returning requests into used;
  delete from public.kk_read_budgets where window_start < now()-interval '1 day';
  return used <= 60;
end $$;
revoke all on function public.kk_consume_read_budget(text) from public, anon, authenticated;
grant execute on function public.kk_consume_read_budget(text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('kk-sources','kk-sources',false,20000000,array['application/epub+zip']),
 ('kk-covers','kk-covers',true,5000000,array['image/png','image/jpeg','image/webp']);
create policy kk_sources_author on storage.objects for all to authenticated
  using (bucket_id='kk-sources' and exists(select 1 from public.kk_author_members where user_id=(select auth.uid())))
  with check (bucket_id='kk-sources' and exists(select 1 from public.kk_author_members where user_id=(select auth.uid())));
create policy kk_covers_author on storage.objects for all to authenticated
  using (bucket_id='kk-covers' and exists(select 1 from public.kk_author_members where user_id=(select auth.uid())))
  with check (bucket_id='kk-covers' and exists(select 1 from public.kk_author_members where user_id=(select auth.uid())));
create function public.kk_touch_updated_at() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end $$;
revoke all on function public.kk_touch_updated_at() from public, anon, authenticated;
create trigger kk_books_touch before update on public.kk_books for each row execute function public.kk_touch_updated_at();
create trigger kk_sections_touch before update on public.kk_sections for each row
when ((old.title,old.content_html,old.is_enabled,old.release_at) is distinct from (new.title,new.content_html,new.is_enabled,new.release_at))
execute function public.kk_touch_updated_at();
create policy budget_service_only on public.kk_read_budgets for all to service_role using (true) with check (true);

commit;
