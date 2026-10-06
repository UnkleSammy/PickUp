// PickUp demo-data seeder. Creates demo users + fixtures for the visual preview.
// Uses the service_role key (admin) — this is demo-fixture seeding, not app writes.
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const REF = 'gxjzyujojcwdugagfknk';
const URL = `https://${REF}.supabase.co`;
const PAT = process.env.SUPABASE_ACCESS_TOKEN;
const PASSWORD = 'PickupDemo123!';

if (!PAT) { console.error('SUPABASE_ACCESS_TOKEN missing'); process.exit(1); }

// 1. Fetch service_role legacy JWT from Management API.
const keysResp = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys`, {
  headers: { Authorization: `Bearer ${PAT}` },
});
if (!keysResp.ok) { console.error('api-keys', keysResp.status, await keysResp.text()); process.exit(1); }
const keys = await keysResp.json();
const sr = keys.find((k) => k.id === 'service_role');
if (!sr || !sr.api_key) { console.error('no service_role legacy key'); process.exit(1); }
const SERVICE_KEY = sr.api_key;

const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

const USERS = [
  { email: 'demo.host@pickupdemo.app',  username: 'host_marcus' },
  { email: 'demo.jalen@pickupdemo.app', username: 'jalen_runs' },
  { email: 'demo.toni@pickupdemo.app',  username: 'toni_hoops' },
  { email: 'demo.ray@pickupdemo.app',   username: 'ref_ray' },
  { email: 'demo.kay@pickupdemo.app',   username: 'clock_kay' },
  { email: 'demo.sam@pickupdemo.app',   username: 'sam_newbie' },
];

const created = [];
for (const u of USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username: u.username },
  });
  if (error) {
    // tolerate already-exists (idempotent re-run)
    if (/already been registered|already registered|unique/i.test(error.message)) {
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
      const existing = list.data?.users?.find((x) => x.email === u.email);
      if (existing) { created.push({ ...u, id: existing.id }); continue; }
    }
    console.error('createUser', u.email, error.message); process.exit(1);
  }
  created.push({ ...u, id: data.user.id });
}

const byName = Object.fromEntries(created.map((u) => [u.username, u.id]));
console.log('users:', byName);

// Slight trust-score variety for the roster chips.
const trust = {
  jalen_runs: 4.9,
  toni_hoops: 4.6,
  ref_ray: 4.8,
  clock_kay: 3.9,
};
for (const [uname, score] of Object.entries(trust)) {
  await admin.from('profiles').update({ trust_score: score }).eq('id', byName[uname]);
}

const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();

// Game A — lobby (dashboard card + lobby screenshot), host = host_marcus.
const gameA = await admin.from('games').insert({
  host_id: byName.host_marcus,
  sport: 'Basketball',
  rules_text: 'Half-court 5s. Winner stays on. Call your own fouls — no blood, no foul.',
  rules_penalties: { fouls_limit: 6, penalty_type: 'Personal foul', half_duration_mins: 20 },
  roles_required: { referee: true, timekeeper: true },
  player_limit: 10,
  require_approval: true,
  latitude: 40.7801,
  longitude: -73.9847,
  court_name: 'Riverside Courts',
  scheduled_at: iso(now + 26 * 3600 * 1000),
  status: 'lobby',
}).select('id').single();
if (gameA.error) { console.error('gameA', gameA.error.message); process.exit(1); }
const gameAId = gameA.data.id;

// Game B — live (live-match screenshot), host = host_marcus.
const gameB = await admin.from('games').insert({
  host_id: byName.host_marcus,
  sport: 'Basketball',
  rules_text: 'Full court 5s. Running clock. Two 20-minute halves.',
  rules_penalties: { fouls_limit: 6, penalty_type: 'Personal foul', half_duration_mins: 20 },
  roles_required: { referee: true, timekeeper: true },
  player_limit: 10,
  require_approval: false,
  latitude: 40.7966,
  longitude: -73.9536,
  court_name: 'Central Park North',
  scheduled_at: iso(now - 15 * 60 * 1000),
  status: 'live',
}).select('id').single();
if (gameB.error) { console.error('gameB', gameB.error.message); process.exit(1); }
const gameBId = gameB.data.id;

// Game C — scheduling (extra dashboard card), host = jalen_runs.
const gameC = await admin.from('games').insert({
  host_id: byName.jalen_runs,
  sport: 'Soccer',
  rules_text: '7-a-side. Slide tackles allowed, no cleats on the turf.',
  rules_penalties: { fouls_limit: 5, penalty_type: 'Yellow card', half_duration_mins: 25 },
  roles_required: { referee: true, timekeeper: false },
  player_limit: 14,
  require_approval: false,
  latitude: 40.7196,
  longitude: -73.9496,
  court_name: 'McCarren Park',
  scheduled_at: iso(now + 3 * 24 * 3600 * 1000),
  status: 'scheduling',
}).select('id').single();
if (gameC.error) { console.error('gameC', gameC.error.message); process.exit(1); }
const gameCId = gameC.data.id;

// Participants for Game A (lobby roster with all four statuses + a pending request).
const partA = [
  { game_id: gameAId, user_id: byName.jalen_runs, role: 'player',     status: 'accepted',   host_invited: true },
  { game_id: gameAId, user_id: byName.toni_hoops, role: 'player',     status: 'checked_in', host_invited: true },
  { game_id: gameAId, user_id: byName.ref_ray,    role: 'referee',    status: 'invited',    host_invited: true },
  { game_id: gameAId, user_id: byName.clock_kay,  role: 'timekeeper', status: 'declined',   host_invited: true },
  { game_id: gameAId, user_id: byName.sam_newbie, role: 'player',     status: 'invited',    host_invited: false },
];
const resA = await admin.from('game_participants').insert(partA);
if (resA.error) { console.error('partA', resA.error.message); process.exit(1); }

// Participants for Game B (live) — all checked in.
const partB = [
  { game_id: gameBId, user_id: byName.jalen_runs, role: 'player',     status: 'checked_in', host_invited: true },
  { game_id: gameBId, user_id: byName.toni_hoops, role: 'player',     status: 'checked_in', host_invited: true },
  { game_id: gameBId, user_id: byName.ref_ray,    role: 'referee',    status: 'checked_in', host_invited: true },
  { game_id: gameBId, user_id: byName.clock_kay,  role: 'timekeeper', status: 'checked_in', host_invited: true },
];
const resB = await admin.from('game_participants').insert(partB);
if (resB.error) { console.error('partB', resB.error.message); process.exit(1); }

// Events for Game B (live) — running clock, some scoring + a foul.
const eventsB = [
  { game_id: gameBId, created_by: byName.clock_kay, event_type: 'timer_start', event_data: { started_at: iso(now - 4 * 60 * 1000) } },
  { game_id: gameBId, created_by: byName.ref_ray,   event_type: 'score_change', event_data: { player_id: byName.jalen_runs, points: 2 } },
  { game_id: gameBId, created_by: byName.ref_ray,   event_type: 'penalty_foul', event_data: { player_id: byName.toni_hoops, penalty_name: 'Personal' } },
  { game_id: gameBId, created_by: byName.ref_ray,   event_type: 'score_change', event_data: { player_id: byName.toni_hoops, points: 3 } },
  { game_id: gameBId, created_by: byName.ref_ray,   event_type: 'score_change', event_data: { player_id: byName.jalen_runs, points: 2 } },
];
// Spread created_at so the feed orders nicely.
for (let i = 0; i < eventsB.length; i++) {
  eventsB[i].created_at = iso(now - (4 - i) * 45 * 1000);
}
const resE = await admin.from('game_events').insert(eventsB);
if (resE.error) { console.error('eventsB', resE.error.message); process.exit(1); }

fs.writeFileSync('/tmp/seed-ids.json', JSON.stringify({
  users: byName,
  gameA: gameAId,
  gameB: gameBId,
  gameC: gameCId,
  email: 'demo.host@pickupdemo.app',
  password: PASSWORD,
}, null, 2));
console.log('SEEDED OK');
console.log(JSON.stringify({ gameA: gameAId, gameB: gameBId, gameC: gameCId }));
