-- 004_average_rating_trigger.sql
-- Maintains books.average_rating as a denormalised aggregate so catalogue
-- queries never need to compute avg(reviews.rating) on the fly.
-- Fires after every INSERT, UPDATE, or DELETE on reviews.

create or replace function public.update_book_average_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_book_id uuid;
begin
  -- Determine which book was affected
  if tg_op = 'DELETE' then
    target_book_id := old.book_id;
  else
    target_book_id := new.book_id;
  end if;

  update public.books
  set average_rating = coalesce(
    (select round(avg(rating)::numeric, 2)
     from public.reviews
     where book_id = target_book_id),
    0
  )
  where id = target_book_id;

  return null;
end;
$$;

-- Drop and recreate trigger so migrations are re-runnable
drop trigger if exists trg_update_book_average_rating on public.reviews;

create trigger trg_update_book_average_rating
  after insert or update or delete on public.reviews
  for each row
  execute function public.update_book_average_rating();
