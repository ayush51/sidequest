-- More fun quests, weighted toward Music, Nightlife and Fitness (the thinnest categories).
-- Run once: supabase db query --linked -f supabase/seed_fun.sql

insert into quests (title, description, category, area, cost, difficulty, points, status) values
  -- Music
  ('Open Mic Night', 'Catch an open mic at a cafe, bar or venue and clap for every act, even the shaky ones.', 'music', 'anywhere', '$', 'chill', 10, 'approved'),
  ('Record Store Dig', 'Visit an independent record store, flip through the bins and pick one album purely by its cover.', 'music', 'anywhere', '$', 'medium', 15, 'approved'),
  ('Free Live Set', 'Find a free live music show this week, in a park, library or on a street corner, and stay for at least three songs.', 'music', 'anywhere', 'free', 'medium', 15, 'approved'),
  ('Playlist Swap', 'Trade a five-song playlist with a friend, listen to theirs, then tell each other what you honestly thought.', 'music', 'anywhere', 'free', 'chill', 10, 'approved'),
  ('Wrong Genre Hour', 'Listen to a full hour of a genre you never touch. Find one song you would actually play again.', 'music', 'anywhere', 'free', 'chill', 10, 'approved'),
  ('Lyric Detective', 'Look up what a song you have sung along to for years is really about.', 'music', 'anywhere', 'free', 'chill', 5, 'approved'),
  ('Live Jazz Set', 'Catch a live jazz set at a club on U Street or in Georgetown and stay for the whole set.', 'music', 'u_street', '$$', 'medium', 25, 'approved'),

  -- Nightlife
  ('Trivia Night', 'Join a bar or cafe trivia night and invent your team name on the spot.', 'nightlife', 'dc_other', '$', 'medium', 20, 'approved'),
  ('Late Night Diner', 'Eat breakfast food after 9 pm at a diner or all-night spot.', 'nightlife', 'anywhere', '$', 'chill', 10, 'approved'),
  ('Comedy Night', 'See a live stand-up or improv show and laugh at least once out loud.', 'nightlife', 'dc_other', '$$', 'medium', 25, 'approved'),
  ('Rooftop Hour', 'Find a rooftop lounge or public rooftop view and watch the city lights come on. A mocktail counts.', 'nightlife', 'dc_other', '$$', 'medium', 20, 'approved'),
  ('Game Night', 'Host or join a board game night, and bring a game nobody there has played.', 'nightlife', 'anywhere', 'free', 'medium', 15, 'approved'),
  ('Dance Floor Dare', 'Be the first person on the dance floor and dance one full song.', 'nightlife', 'anywhere', '$', 'bold', 25, 'approved'),

  -- Fitness
  ('Plank Song', 'Pick a song and hold a plank for as much of it as you can. Ask a friend to join.', 'fitness', 'anywhere', 'free', 'chill', 10, 'approved'),
  ('Playground Workout', 'Do a 15-minute bodyweight workout at a public playground or outdoor fitness station.', 'fitness', 'anywhere', 'free', 'medium', 15, 'approved'),
  ('Memorial Steps', 'Climb the Lincoln Memorial steps five times, then enjoy the view of the Reflecting Pool.', 'fitness', 'national_mall', 'free', 'medium', 20, 'approved'),
  ('Hill Repeats', 'Find a hill near you and sprint up it five times, walking back down between each one.', 'fitness', 'anywhere', 'free', 'bold', 25, 'approved'),
  ('Rock Creek Loop', 'Walk or run for 30 minutes on a Rock Creek Park trail and turn around only when time is up.', 'fitness', 'dc_other', 'free', 'medium', 20, 'approved'),
  ('Bike to Brunch', 'Bike to your next meal out instead of driving or riding, and take the scenic route.', 'fitness', 'anywhere', '$', 'medium', 20, 'approved'),

  -- Food
  ('Ethnic Aisle', 'Visit a grocery store for a cuisine you have never cooked and buy one ingredient you cannot name.', 'food', 'anywhere', '$', 'medium', 15, 'approved'),
  ('Meet the Maker', 'At a farmers market, ask a vendor how they make or grow their best product, then buy it.', 'food', 'anywhere', '$', 'chill', 10, 'approved'),
  ('Dessert First', 'Eat dessert before dinner tonight. No guilt, no explanation.', 'food', 'anywhere', '$', 'chill', 10, 'approved'),
  ('Broth Rating', 'Try ramen, pho or another noodle soup at a spot you have not been to and rate the broth out of 10.', 'food', 'anywhere', '$', 'chill', 10, 'approved'),
  ('Hoagie Showdown', 'Order a hoagie from Wawa and one from Sheetz on the same day and crown a winner.', 'food', 'anywhere', '$', 'medium', 20, 'approved'),

  -- Outdoors
  ('Paddle Boat Lap', 'Rent a paddle boat on the Tidal Basin and do a full lap (it runs seasonally, so check ahead).', 'outdoors', 'national_mall', '$$', 'medium', 25, 'approved'),
  ('Geocache Hunt', 'Use a geocaching app to find one hidden cache near you, sign the log and put it back exactly as you found it.', 'outdoors', 'anywhere', 'free', 'medium', 15, 'approved'),
  ('Stargazing', 'Spend 15 minutes looking at the night sky from somewhere dark and open, and spot one planet or constellation.', 'outdoors', 'anywhere', 'free', 'chill', 10, 'approved'),

  -- Art, History, Wholesome
  ('Street Sketch', 'Sketch a building, a tree or a stranger''s dog in ten minutes. Bad drawings count.', 'art', 'anywhere', 'free', 'chill', 10, 'approved'),
  ('Cemetery Stroll', 'Walk through Congressional Cemetery in DC and find the oldest gravestone you can.', 'history', 'dc_other', 'free', 'chill', 10, 'approved'),
  ('Call Someone You Miss', 'Call, not text, someone you have not talked to in months and ask how they really are.', 'wholesome', 'anywhere', 'free', 'medium', 15, 'approved'),
  -- Heartfelt (more like Call Someone You Miss)
  ('Voice Memo', 'Send a friend a voice memo telling them one thing you really appreciate about them.', 'wholesome', 'anywhere', 'free', 'chill', 10, 'approved'),
  ('Old Photo Text', 'Dig up an old photo of you and a friend and send it to them with the memory it brings back.', 'wholesome', 'anywhere', 'free', 'chill', 5, 'approved'),
  ('Thank-You Letter', 'Handwrite a thank-you note to someone who helped you, then hand it over or mail it.', 'wholesome', 'anywhere', '$', 'medium', 15, 'approved'),
  ('Reconnect Coffee', 'Invite someone you have not seen in a year to coffee or a walk, and tell them you have been thinking about them.', 'wholesome', 'anywhere', '$', 'medium', 20, 'approved'),
  ('Story Time', 'Ask an older person in your life to tell you a story from when they were your age, and just listen.', 'wholesome', 'anywhere', 'free', 'medium', 15, 'approved'),
  ('Overdue Reply', 'Answer the message you have been avoiding, or send the apology you have been putting off.', 'wholesome', 'anywhere', 'free', 'bold', 20, 'approved'),
  ('Doorstep Treat', 'Drop a small treat on a friend''s doorstep with a note. No reason needed.', 'wholesome', 'anywhere', '$', 'medium', 20, 'approved'),

  -- Track
  ('Track Night', 'Run or walk four laps at a public or community track that is open to everyone. Never climb a fence to get in.', 'fitness', 'anywhere', 'free', 'medium', 15, 'approved'),
  ('Mile Time Trial', 'Run one all-out mile on a track, write down your time, and try to beat it next month.', 'fitness', 'anywhere', 'free', 'bold', 25, 'approved'),
  ('Track Showdown', 'Race a friend over 100 meters on a track. The loser carries the water bottles.', 'fitness', 'anywhere', 'free', 'medium', 15, 'approved'),
  ('Baton Pass', 'Run a relay lap with a friend, using a water bottle as the baton.', 'fitness', 'anywhere', 'free', 'chill', 10, 'approved'),
  ('Four by 400', 'Run four 400-meter laps on a track with a one-minute walk between each.', 'fitness', 'anywhere', 'free', 'bold', 25, 'approved'),
  ('Victory Lap', 'Walk or jog one lap of a track, then finish with your best victory pose.', 'fitness', 'anywhere', 'free', 'chill', 5, 'approved'),

  -- Random workouts
  ('Dice Workout', 'Roll a die for push-ups, squats, lunges and sit-ups. Do five times the number you roll for each.', 'fitness', 'anywhere', 'free', 'medium', 15, 'approved'),
  ('Card Deck Workout', 'Draw ten cards from a deck. The number is the reps and the suit picks the move.', 'fitness', 'anywhere', 'free', 'medium', 15, 'approved'),
  ('Bench Circuit', 'Do three rounds of step-ups, bench dips and incline push-ups on a park bench.', 'fitness', 'anywhere', 'free', 'medium', 15, 'approved'),
  ('Burpee Debt', 'Do 20 burpees today, in as many sets as you need.', 'fitness', 'anywhere', 'free', 'bold', 20, 'approved'),
  ('Friend''s Pick', 'Have a friend pick any body part, then do three moves that work it, ten reps each.', 'fitness', 'anywhere', 'free', 'medium', 15, 'approved'),

  -- Random bar quests (bars are 21+, and a non-alcoholic drink always counts)
  ('Bartender''s Pick', 'Give a bartender three words and let them make you a drink from them. A mocktail counts.', 'nightlife', 'anywhere', '$$', 'medium', 20, 'approved'),
  ('Jukebox Hero', 'Put a song on a bar jukebox, or request one from the DJ, and see if anyone sings along.', 'nightlife', 'anywhere', '$', 'chill', 10, 'approved'),
  ('Learn a Bar Game', 'Ask someone to teach you pool, darts, shuffleboard or cornhole, then play a full game.', 'nightlife', 'anywhere', '$', 'medium', 15, 'approved'),
  ('Regulars'' Pick', 'Ask a regular at a bar or cafe what they always order, and order it.', 'nightlife', 'anywhere', '$', 'chill', 10, 'approved'),
  ('Closest Unknown Bar', 'Walk into the nearest bar you have never been in and rate its vibe out of 10. A soda is fine.', 'nightlife', 'anywhere', '$$', 'medium', 20, 'approved'),
  ('Mocktail Menu', 'Order the most interesting non-alcoholic drink on a bar''s menu and rate it.', 'nightlife', 'anywhere', '$', 'chill', 10, 'approved'),
  ('Stranger''s Fact', 'Politely ask someone nearby at a bar what the best thing was that happened to them this week.', 'nightlife', 'anywhere', '$', 'bold', 20, 'approved');
