-- Upgrade existing projects. No book data or access policies are changed.
begin;
alter table public.kk_sections drop constraint kk_sections_content_html_check;
alter table public.kk_sections add constraint kk_sections_content_html_check
  check (octet_length(content_html) <= 16000000);
update storage.buckets set file_size_limit=10000000 where id='kk-covers';
commit;
