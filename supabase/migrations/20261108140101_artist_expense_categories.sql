-- More kinds of spend for a signed artist's « Budget » (Sacha, 08/11/2026 :
-- « rajoute des choses comme ça dans un artiste […] budget transport, uber
-- eat, restauration, studio, marketing etc. »).
--
-- Uber Eats was folded into « Restauration »: it gets its own kind, as Sacha
-- named the two apart. The others are what a signed artist usually costs
-- outside a release: per diem, gear, coaching, image (styling, hair, make-up),
-- photo and video. Existing rows keep their kind.

alter table public.artist_expenses
  drop constraint artist_expenses_category_check;

alter table public.artist_expenses
  add constraint artist_expenses_category_check
    check (category in ('transport', 'lodging', 'food', 'food_delivery', 'per_diem',
                        'studio', 'equipment', 'coaching', 'image', 'photo_video',
                        'marketing', 'other'));
