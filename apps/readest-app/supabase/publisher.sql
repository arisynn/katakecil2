-- Scoped terminal publisher: credentials never grant general Supabase administration.
begin;
create table public.kk_publisher_tokens (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  label text not null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.kk_publisher_tokens enable row level security;
revoke all on public.kk_publisher_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.kk_publisher_tokens to service_role;
create policy publisher_tokens_service on public.kk_publisher_tokens
  for all to service_role using (true) with check (true);

create table public.kk_publisher_state (
  book_id text primary key references public.kk_books(id) on delete cascade,
  kinds jsonb not null default '{}'
);
alter table public.kk_publisher_state enable row level security;
revoke all on public.kk_publisher_state from public, anon, authenticated;
grant select, insert, update, delete on public.kk_publisher_state to service_role;
create policy publisher_state_service on public.kk_publisher_state
  for all to service_role using (true) with check (true);

create table public.kk_publisher_requests (
  request_id text primary key check (request_id ~ '^[a-f0-9]{64}$'),
  book_id text not null references public.kk_books(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.kk_publisher_requests enable row level security;
revoke all on public.kk_publisher_requests from public, anon, authenticated;
grant select, insert, update, delete on public.kk_publisher_requests to service_role;
create policy publisher_requests_service on public.kk_publisher_requests
  for all to service_role using (true) with check (true);

create function public.kk_terminal_save(
  p_book jsonb, p_sections jsonb, p_kinds jsonb,
  p_expected_updated_at timestamptz, p_request_id text
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare current_version timestamptz;
begin
  -- Serialize even the first insert, when there is no book row to lock yet.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_book->>'id', 0));
  if exists(select 1 from public.kk_publisher_requests where request_id=p_request_id and book_id=p_book->>'id') then
    return true;
  end if;
  select updated_at into current_version from public.kk_books where id=p_book->>'id' for update;
  if current_version is distinct from p_expected_updated_at then
    return false;
  end if;
  perform public.kk_publish_book(p_book, p_sections);
  insert into public.kk_publisher_state(book_id,kinds) values(p_book->>'id',p_kinds)
    on conflict(book_id) do update set kinds=excluded.kinds;
  insert into public.kk_publisher_requests(request_id,book_id) values(p_request_id,p_book->>'id');
  return true;
end $$;
revoke all on function public.kk_terminal_save(jsonb,jsonb,jsonb,timestamptz,text) from public, anon, authenticated;
grant execute on function public.kk_terminal_save(jsonb,jsonb,jsonb,timestamptz,text) to service_role;
commit;
