-- No position by default: someone who signs up alone waits without a
-- position, and the general director chooses it when approving. An approved
-- access always has a position (constraint below); an invitation carries the
-- one the director chose (invite_member).

alter table public.memberships
  alter column role drop not null,
  alter column role drop default;

-- Pending requests only got a position from the former default.
update public.memberships set role = null where status = 'pending';

alter table public.memberships
  add constraint memberships_approved_requires_role
    check (status <> 'approved' or role is not null);
