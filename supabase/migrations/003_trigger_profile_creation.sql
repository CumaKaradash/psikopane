-- ============================================================
-- PsikoPanel — Trigger for automatic profile creation
-- This trigger creates a basic profile when a new user signs up
-- ============================================================

-- Function to create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, slug, full_name, email)
  values (
    new.id,
    substr(new.email, 1, strpos(new.email, '@') - 1),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

-- Trigger to call the function after user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
