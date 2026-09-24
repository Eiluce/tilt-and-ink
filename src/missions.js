// Missions, in the spirit of 3D Pinball Space Cadet: a mission is always on
// offer, hitting a standup target cycles to the next one, and landing in the
// kickout saucer accepts it. Each mission is one objective counted from table
// events (ramps, pops, drop banks...), some against the clock. Completing
// missions promotes the player up the ranks, which unlocks harder missions.
//
// Rank and the list of completed missions carry over from turn to turn and
// are saved in localStorage, so they survive a reload. A mission in progress
// ends with the turn.

const MISSION_SAVE_KEY = 'tilt-and-ink.missions';

const RANKS = [
  { name: 'Cadet', missions: 0 },
  { name: 'Ensign', missions: 1 },
  { name: 'Lieutenant', missions: 3 },
  { name: 'Captain', missions: 5 },
  { name: 'Commander', missions: 8 },
  { name: 'Admiral', missions: 12 },
];

// event: what counts toward the goal (see MissionControl.event callers in
// main.js). tier: the rank index needed before it's offered. seconds: time
// limit, if any. halos: which table features pulse while it's active.
// The reward is MISSION_REWARDS[tier] (scoring.js).
const MISSIONS = [
  { id: 'flight', name: 'Flight School', goal: 'Make 3 ramp shots', event: 'ramp', count: 3, tier: 0, halos: ['ramps'] },
  { id: 'asteroids', name: 'Asteroid Field', goal: 'Hit the pop bumpers 15 times', event: 'pop', count: 15, seconds: 35, tier: 0, halos: ['pops'] },
  { id: 'target', name: 'Target Practice', goal: 'Clear the 1-2-3 drop targets', event: 'dropBank', count: 1, tier: 0, halos: ['drops'] },
  { id: 'orbit', name: 'Orbit Run', goal: 'Shoot the left orbit twice', event: 'orbit', count: 2, tier: 1, halos: ['orbit'] },
  { id: 'radio', name: 'Radio Contact', goal: 'Roll through the R·O·W lanes 5 times', event: 'lane', count: 5, tier: 1, halos: ['lanes'] },
  { id: 'satellite', name: 'Satellite Sweep', goal: 'Spin the orbit spinner 15 times', event: 'spinner', count: 15, tier: 1, halos: ['spinner'] },
  { id: 'saucer', name: 'Saucer Chase', goal: 'Hit the UFO 6 times', event: 'ufo', count: 6, seconds: 40, tier: 2, halos: ['ufo'] },
  { id: 'relay', name: 'Ramp Relay', goal: 'Make a ramp, then the other one while its arrow blinks, twice', event: 'rampCombo', count: 2, seconds: 45, tier: 2, halos: ['ramps'] },
  { id: 'rescue', name: 'Tractor Beam Rescue', goal: 'Shoot the UFO scoop twice', event: 'scoop', count: 2, tier: 2, halos: ['drops', 'scoop'] },
  { id: 'cliffhanger', name: 'Cliffhanger', goal: 'Clear the drop targets 3 times', event: 'dropBank', count: 3, seconds: 60, tier: 3, halos: ['drops'] },
  { id: 'doubleFeature', name: 'Double Feature', goal: 'Make 5 ramp shots', event: 'ramp', count: 5, seconds: 45, tier: 3, halos: ['ramps'] },
  { id: 'finale', name: 'The Grand Finale', goal: 'Hit the UFO 10 times', event: 'ufo', count: 10, seconds: 45, tier: 4, halos: ['ufo'] },
];

class MissionControl {
  constructor({ addScore, fx, announce }) {
    this.addScore = addScore;
    this.fx = fx;
    this.announce = announce;
    this.completedTotal = 0;
    this.completedIds = new Set();
    this.load();
    this.rank = this.rankFor(this.completedTotal);
    this.newTurn();
  }

  // Start of a turn: drop any unfinished mission, keep rank and progress.
  newTurn() {
    this.active = null; // { mission, progress, timeLeftMs }
    this.offerIndex = 0;
    this.offered = this.pool()[0];
    this.lastResult = null; // { text, until } shown briefly in the panel
  }

  rankFor(completed) {
    return RANKS.reduce((r, rank, i) => (completed >= rank.missions ? i : r), 0);
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(MISSION_SAVE_KEY));
      if (!saved) return;
      this.completedTotal = Number(saved.completedTotal) || 0;
      this.completedIds = new Set(Array.isArray(saved.completedIds) ? saved.completedIds : []);
    } catch (e) {
      // No storage (private window, blocked site data): start fresh.
    }
  }

  save() {
    try {
      localStorage.setItem(MISSION_SAVE_KEY, JSON.stringify({
        completedTotal: this.completedTotal,
        completedIds: [...this.completedIds],
      }));
    } catch (e) {
      // Progress just won't survive a reload.
    }
  }

  // Missions available at the current rank that haven't been done yet this
  // turn. Once all are done they come round again.
  pool() {
    let list = MISSIONS.filter((m) => m.tier <= this.rank && !this.completedIds.has(m.id));
    if (list.length === 0) {
      this.completedIds.clear();
      list = MISSIONS.filter((m) => m.tier <= this.rank);
    }
    return list;
  }

  // Standup hit: offer the next mission.
  cycle() {
    if (this.active) return;
    const list = this.pool();
    this.offerIndex = (this.offerIndex + 1) % list.length;
    this.offered = list[this.offerIndex];
  }

  // Kickout saucer: accept the offered mission. Returns true if it started.
  accept() {
    if (this.active || !this.offered) return false;
    const m = this.offered;
    this.active = { mission: m, progress: 0, timeLeftMs: m.seconds ? m.seconds * 1000 : null };
    this.fx.title(m.name, m.goal + (m.seconds ? ` in ${m.seconds}s` : ''), 1800);
    this.announce(`Mission: ${m.name}`);
    return true;
  }

  // A table event happened; count it if it's what the active mission wants.
  event(type, amount = 1) {
    if (!this.active || this.active.mission.event !== type) return;
    this.active.progress = Math.min(this.active.mission.count, this.active.progress + amount);
    if (this.active.progress >= this.active.mission.count) this.complete();
  }

  complete() {
    const m = this.active.mission;
    this.active = null;
    this.completedIds.add(m.id);
    this.completedTotal += 1;
    this.addScore(MISSION_REWARDS[m.tier], `mission: ${m.name}`, { flat: true, bonus: BONUS.mission });
    this.lastResult = { text: `${m.name} complete!`, until: performance.now() + 4000 };

    const newRank = this.rankFor(this.completedTotal);
    this.save();
    if (newRank > this.rank) {
      this.rank = newRank;
      this.addScore(POINTS.promotion * newRank, 'promotion', { flat: true });
      this.fx.title(`Promoted to ${RANKS[newRank].name}!`, `${m.name} complete`, 2200);
      this.fx.shake(300, 4);
    } else {
      this.fx.title('Mission Complete!', m.name, 1600);
    }
    this.offerIndex = 0;
    this.offered = this.pool()[0];
  }

  fail(reason) {
    if (!this.active) return;
    const m = this.active.mission;
    this.active = null;
    this.lastResult = { text: `${m.name} failed: ${reason}`, until: performance.now() + 4000 };
    this.fx.title('Mission Failed', reason, 1400);
    this.offered = this.pool()[this.offerIndex % this.pool().length];
  }

  // Called every physics tick. The clock only runs while a ball is in play,
  // not while the next ball waits on the plunger.
  tick(dtMs, ballInPlay) {
    const a = this.active;
    if (!a || a.timeLeftMs === null || !ballInPlay) return;
    a.timeLeftMs -= dtMs;
    if (a.timeLeftMs <= 0) this.fail('out of time');
  }

  // Which table features should pulse on the lamp layer.
  halos() {
    if (this.active) return this.active.mission.halos;
    return this.offered ? ['kickout'] : [];
  }

  // Snapshot for the HUD panel.
  view(now) {
    const rank = RANKS[this.rank].name;
    const next = RANKS[this.rank + 1];
    const toNext = next ? `${next.missions - this.completedTotal} more for ${next.name}` : 'Top rank';
    if (this.active) {
      const { mission: m, progress, timeLeftMs } = this.active;
      return {
        rank,
        toNext,
        label: 'Mission active',
        name: m.name,
        goal: m.goal,
        progress: progress / m.count,
        count: `${progress} / ${m.count}`,
        status: timeLeftMs === null ? '' : `${Math.ceil(timeLeftMs / 1000)}s left`,
        urgent: timeLeftMs !== null && timeLeftMs < 10000,
      };
    }
    const result = this.lastResult && now < this.lastResult.until ? this.lastResult.text : '';
    const m = this.offered;
    return {
      rank,
      toNext,
      label: 'Mission offered',
      name: m ? m.name : '',
      goal: m ? m.goal + (m.seconds ? ` in ${m.seconds}s` : '') : '',
      progress: 0,
      count: '',
      status: result || 'Kickout hole accepts · standups change mission',
      urgent: false,
    };
  }
}
