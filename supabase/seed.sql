-- Starter data: interests and 12 DMV quests (more come in later slices).
-- Run once: supabase db query --linked -f supabase/seed.sql

insert into interests (slug, label, emoji) values
  ('food', 'Food & Drink', '🍜'),
  ('outdoors', 'Outdoors', '🌳'),
  ('fitness', 'Fitness', '🏃'),
  ('art', 'Art & Culture', '🎨'),
  ('music', 'Music', '🎶'),
  ('history', 'History', '🏛️'),
  ('nightlife', 'Nightlife', '🌙'),
  ('wholesome', 'Wholesome Chaos', '🦆')
on conflict do nothing;

insert into quests (title, description, category, area, cost, difficulty, points, status) values
  ('Canal Stroll', 'Walk the C&O Canal towpath for 20 minutes and spot three different birds or boats.', 'outdoors', 'georgetown', 'free', 'chill', 10, 'approved'),
  ('Exorcist Steps', 'Climb the famous Exorcist Steps and strike a victory pose at the top.', 'history', 'georgetown', 'free', 'medium', 15, 'approved'),
  ('Monument Loop', 'Walk from the Lincoln Memorial to the Washington Monument and take a photo at each stop.', 'history', 'national_mall', 'free', 'medium', 20, 'approved'),
  ('Museum Speed-Run', 'Pick any free Smithsonian museum and find your favorite object in 30 minutes.', 'art', 'national_mall', 'free', 'medium', 20, 'approved'),
  ('Waterfront Wander', 'Walk the Alexandria waterfront and watch the boats for 10 minutes.', 'outdoors', 'old_town_alexandria', 'free', 'chill', 10, 'approved'),
  ('Market Mystery Snack', 'Buy one thing at Eastern Market you have never tried.', 'food', 'eastern_market', '$', 'medium', 15, 'approved'),
  ('Falls Overlook', 'Hike to a Great Falls overlook and stay for five quiet minutes.', 'outdoors', 'great_falls', '$', 'medium', 25, 'approved'),
  ('Trail Bike Ride', 'Ride a stretch of the Capital Crescent Trail and stop somewhere you have never seen.', 'fitness', 'capital_crescent_trail', 'free', 'medium', 25, 'approved'),
  ('Mural Hunt', 'Find and photograph three murals around U Street.', 'art', 'u_street', 'free', 'medium', 20, 'approved'),
  ('Half-Smoke Quest', 'Try a half-smoke from a classic DC spot.', 'food', 'u_street', '$', 'chill', 15, 'approved'),
  ('Four Mile Run Walk', 'Walk a stretch of the Four Mile Run Trail and find one new view.', 'outdoors', 'shirlington', 'free', 'chill', 15, 'approved'),
  ('Compliment Mission', 'Give three genuine compliments to people you meet today.', 'wholesome', 'dc_other', 'free', 'bold', 25, 'approved');
