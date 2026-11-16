-- Live gifts were priced as if in dollars (Rose 1 ... Rocket 100), but gift
-- credit is now bought in real UGX through MarzPay, so a UGX 1,000 top-up
-- bought 1,000 Roses. This prices the gifts in UGX.
--
-- Only gifts still at their original price change, so a price an admin has
-- already set is kept. Admins can change any price in Admin settings.

update public.live_gifts g
   set price = v.new_price
  from (values
    ('rose',        1,    500),
    ('heart',       2,   1000),
    ('kiss',        5,   2000),
    ('champagne',  10,   5000),
    ('diamond',    20,  10000),
    ('crown',      50,  20000),
    ('rocket',    100,  50000)
  ) as v(slug, old_price, new_price)
 where g.slug = v.slug
   and g.price = v.old_price;

-- Bigger top-ups so Crown and Rocket can be bought. Hidden from users until
-- an admin pastes their MarzPay links on the Admin Panel.
insert into public.gift_topup_packages (amount, sort_order)
values (20000, 5), (50000, 6)
on conflict (amount) do nothing;

-- Verification
select slug, price from public.live_gifts order by sort_order;
