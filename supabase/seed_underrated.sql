-- Underrated quests sourced from local guides (Washingtonian hidden gems, Fun in Fairfax).
-- Run once: supabase db query --linked -f supabase/seed_underrated.sql

insert into quests (title, description, category, area, cost, difficulty, points, status) values
  ('Bear''s Den Sunset', 'Hike the half-mile uphill to Bear''s Den Overlook in Bluemont and watch the light change from the rocks.', 'outdoors', 'virginia_other', 'free', 'medium', 25, 'approved'),
  ('Boardwalk Birding', 'Walk the Neabsco Creek Boardwalk in Woodbridge and spot three birds in the wetland.', 'outdoors', 'virginia_other', 'free', 'chill', 15, 'approved'),
  ('Dyke Marsh by Bike', 'Bike the Mount Vernon Trail to Dyke Marsh Wildlife Preserve and walk out to the viewing platform.', 'fitness', 'virginia_other', 'free', 'medium', 25, 'approved'),
  ('Huntley Meadows Tower', 'Walk the boardwalk at Huntley Meadows Park and climb the observation tower. A $2 parking donation is requested.', 'outdoors', 'virginia_other', '$', 'chill', 15, 'approved'),
  ('Follow the Stream', 'Walk Donaldson Run Trail in Arlington and find the small cascades along the creek.', 'outdoors', 'virginia_other', 'free', 'chill', 15, 'approved'),
  ('Monastery Garden Stroll', 'Wander the gardens of the Franciscan Monastery in Northeast DC, best in spring.', 'wholesome', 'dc_other', 'free', 'chill', 15, 'approved'),
  ('Van Gogh Bridge', 'Visit the Van Gogh Bridge at Lake Anne in Reston and walk the lakefront for its mid-century architecture.', 'art', 'virginia_other', 'free', 'chill', 15, 'approved'),
  ('Clifton Marker Hunt', 'Walk Main Street in historic Clifton and read three house markers. Share the oddest fact you find.', 'history', 'virginia_other', 'free', 'chill', 15, 'approved'),
  ('Frank Lloyd Wright Tour', 'Take the guided tour of the Pope-Leighey House, a Frank Lloyd Wright home in Alexandria (tours run April to December).', 'art', 'virginia_other', '$$', 'medium', 25, 'approved'),
  ('1933 Apothecary', 'Step inside the Stabler-Leadbeater Apothecary in Old Town and find the oddest old bottle.', 'history', 'old_town_alexandria', '$', 'chill', 15, 'approved'),
  ('Country Road Drive', 'Drive the two-lane Snickersville Turnpike from Aldie to Bluemont and stop at one historic store.', 'outdoors', 'virginia_other', 'free', 'medium', 20, 'approved'),
  ('Suffragist Memorial', 'Visit the National Turning Point Suffragist Memorial at Occoquan Regional Park and read the story behind it.', 'history', 'virginia_other', 'free', 'chill', 15, 'approved');
