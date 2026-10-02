import Phaser from 'phaser';
import { PartyFrog } from '../entities/PartyFrog';
import { Prey } from '../entities/Critters';
import { MapView } from '../world/mapView';
import { MAP, POOLS, step } from '../world/map';
import { ensureArt } from '../world/Art';
import { BOOSTS, ROUNDS } from '../data/game';
import { parseLook, lookColor } from '../data/looks';
import { classPlayer } from '../systems/ClassPlayer';
import { sound } from '../systems/Sound';
import { BOOST_KINDS, FACINGS, FLAG, PREY_KINDS, frogPace, type FrogRow, type WorldSnapshot } from '../systems/world';
import { controls } from './controls';

/** Another player's frog: drawn where the projector last saw it, gliding between snapshots. */
interface Remote { frog: PartyFrog; tx: number; ty: number; moving: boolean; seq: number; flags: number }
interface Hunter { sprite: Phaser.GameObjects.Image; beam: Phaser.GameObjects.Image; lamp: Phaser.GameObjects.Image; tx: number; ty: number; angle: number; walking: boolean }
interface Pig { sprite: Phaser.GameObjects.Image; tx: number; ty: number; dir: number; charging: boolean }
interface Cloud { glow: Phaser.GameObjects.Image; spores: Phaser.GameObjects.Particles.ParticleEmitter; tx: number; ty: number }
interface Pickup { icon: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image }

const BOOST_FLAGS = [['speed', FLAG.speed], ['tongue', FLAG.tongue], ['double', FLAG.double], ['shield', FLAG.shield]] as const;
const MOVE_EVERY = 100;
const ease = (delta: number, ms: number): number => 1 - Math.exp(-delta / ms);

/**
 * A player's own view of the map: the forest around their frog, with the camera following it.
 * The phone moves its own frog straight away (and tells the projector where it is); everything
 * else (other frogs, bugs, hunters, pigs, fungus) comes from the projector's snapshots.
 */
export class PlayerScene extends Phaser.Scene {
  private map!: MapView;
  private me?: PartyFrog;
  private focus!: Phaser.GameObjects.Zone;
  private arrow!: Phaser.GameObjects.Image;
  private others = new Map<string, Remote>();
  private roster = new Map<string, { name: string; look: string }>();
  private bugs = new Map<number, Prey>();
  private hunters: Hunter[] = [];
  private pigs: Pig[] = [];
  private clouds: Cloud[] = [];
  private pickups = new Map<number, Pickup>();
  private traps = new Map<number, Phaser.GameObjects.Image>();
  private edges: Phaser.GameObjects.Text[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private tongues!: Phaser.GameObjects.Graphics;
  private fireflies?: Phaser.GameObjects.Particles.ParticleEmitter;
  private seq = 0;
  private flags = 0;
  private score = -1;
  private sent = { x: 0, y: 0, m: 0, at: 0 };
  private lastReveal = 0;
  private lastMinimap = 0;
  private round = 0;
  private minimapBase?: HTMLCanvasElement;
  private offs: (() => void)[] = [];

  constructor() { super('PlayerScene'); }

  create(): void {
    ensureArt(this);
    this.map = new MapView(this);
    this.tongues = this.add.graphics().setDepth(3600);
    this.focus = this.add.zone(MAP.width / 2, MAP.height / 2, 1, 1);
    this.arrow = this.add.image(0, 0, 'you-arrow').setScale(4).setDepth(4100).setVisible(false);
    this.tweens.add({ targets: this.arrow, scaleY: 3.2, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const camera = this.cameras.main;
    camera.setBounds(0, 0, MAP.width, MAP.height).startFollow(this.focus, true, .14, .14).setBackgroundColor('#22331f');
    this.fitZoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitZoom, this);
    for (let i = 0; i < 2; i++) this.edges.push(this.add.text(0, 0, '', { fontFamily: 'PressStart', fontSize: '16px', color: '#fff6dc', backgroundColor: '#c93a2a', padding: { x: 8, y: 6 } }).setScrollFactor(0).setDepth(6000).setOrigin(.5).setVisible(false));
    this.offs.push(classPlayer.onWorld(world => this.apply(world)), classPlayer.subscribe(() => this.onState()));
    const stop = () => { this.offs.forEach(off => off()); this.offs = []; this.scale.off(Phaser.Scale.Events.RESIZE, this.fitZoom, this); };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
    this.events.once(Phaser.Scenes.Events.DESTROY, stop);
    this.onState();
    (window as unknown as { player?: object }).player = { scene: this, controls };
  }

  /** About 560 world pixels across the short side of the screen; never more than the whole map. */
  private fitZoom(): void {
    const { width, height } = this.scale.gameSize;
    const zoom = Phaser.Math.Clamp(Math.min(width, height) / 560, .5, 1.15);
    this.cameras.main.setZoom(Math.max(zoom, width / MAP.width, height / MAP.height));
  }

  // ---------------------------------------------------------------- state

  private onState(): void {
    const state = classPlayer.state;
    if (state.mode === 'round' && state.round !== this.round) {
      this.round = state.round;
      const round = ROUNDS[state.round - 1];
      this.map.setDarkness(round?.darkness ?? 0);
      this.fireflies?.destroy(); this.fireflies = undefined;
      if ((round?.darkness ?? 0) > .3) this.fireflies = this.add.particles(0, 0, 'firefly', { x: { min: 0, max: MAP.width }, y: { min: 0, max: MAP.height }, lifespan: 3600, speed: { min: 4, max: 14 }, scale: { start: 2.5, end: 0 }, alpha: { start: .9, end: 0 }, frequency: 90, blendMode: 'ADD' }).setDepth(3200);
      for (const label of this.labels) label.destroy();
      this.labels = round?.fungus ? POOLS.map(pool => {
        const label = this.add.text(pool.x, pool.y - 80, 'WARM SPRING', { fontFamily: 'PressStart', fontSize: '18px', color: '#fff6dc', backgroundColor: '#c93a2a', padding: { x: 8, y: 6 } }).setOrigin(.5).setDepth(3900);
        label.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
        return label;
      }) : [];
    } else if (state.mode === 'lobby' && this.round) {
      this.round = 0;
      this.map.setDarkness(0);
      this.fireflies?.destroy(); this.fireflies = undefined;
      for (const label of this.labels) label.destroy();
      this.labels = [];
    }
  }

  /** Whether your frog may move right now. */
  private get free(): boolean {
    const mode = classPlayer.state.mode;
    return controls.enabled && (mode === 'lobby' || mode === 'round') && !(this.flags & (FLAG.frozen | FLAG.captured | FLAG.hidden));
  }

  // ---------------------------------------------------------------- snapshots

  private apply(world: WorldSnapshot): void {
    const now = this.time.now;
    for (const [id, name, look] of world.r ?? []) {
      this.roster.set(id, { name, look });
      const remote = this.others.get(id);
      if (remote) { if (remote.frog.name !== name) remote.frog.rename(name); remote.frog.setLook(parseLook(look)); }
      if (id === classPlayer.id && this.me) { this.me.setLook(parseLook(look)); if (this.me.name !== name) this.me.rename(name); }
    }
    // Tongues first: the bugs they ate are still on screen.
    for (const [frogId, bugId] of world.l ?? []) {
      const frog = frogId === classPlayer.id ? this.me : this.others.get(frogId)?.frog;
      const bug = this.bugs.get(bugId);
      if (!frog || !bug) continue;
      frog.lick(bug.sprite.x, bug.sprite.y, now);
      const mouth = frog.mouth();
      bug.eat(mouth.x, mouth.y, 60);
      this.bugs.delete(bugId);
    }
    const seen = new Set<string>();
    for (const row of world.f) {
      seen.add(row[0]);
      if (row[0] === classPlayer.id) this.applyMine(row, now);
      else this.applyOther(row, now);
    }
    for (const [id, remote] of this.others) if (!seen.has(id)) { remote.frog.destroy(); this.others.delete(id); }

    this.syncBugs(world, now);
    this.syncHunters(world);
    this.syncPigs(world);
    this.syncClouds(world);
    this.syncPickups(world);
    this.syncTraps(world);
  }

  private applyMine(row: FrogRow, now: number): void {
    const [id, x, y, , flags, seq, score] = row;
    if (!this.me) {
      const info = this.roster.get(id);
      this.me = new PartyFrog(this, { id, name: info?.name ?? classPlayer.name, look: parseLook(info?.look), control: 'phone', tagSize: 22 }, x, y);
      this.me.drop(now);
      this.seq = seq;
      this.focus.setPosition(x, y);
      this.cameras.main.centerOn(x, y);
      this.arrow.setVisible(true);
    }
    const me = this.me;
    if (seq !== this.seq) {
      // The projector moved your frog (new round, caught, knocked over, out of the cave).
      const far = Math.hypot(x - me.x, y - me.y);
      this.seq = seq;
      me.release();
      me.teleport(x, y);
      me.drop(now, far > 300 ? 380 : 90);
      if (far > 300) { this.focus.setPosition(x, y); this.cameras.main.centerOn(x, y); }
      this.sendMove(true);
    }
    if (flags & FLAG.captured && !(this.flags & FLAG.captured)) { me.capture(now, null, 2600); this.cameras.main.shake(300, .01); }
    this.flags = flags;
    this.applyFlags(me, flags, now);
    if (this.score >= 0 && score !== this.score) this.float(me.x, me.y - 90, score > this.score ? `+${score - this.score}` : `${score - this.score}`, score > this.score ? '#fff6b0' : '#ff8a6a');
    if (score > this.score && this.score >= 0) sound.play(score - this.score >= 3 ? 'catch' : 'gulp', score - this.score);
    this.score = score;
  }

  private applyOther(row: FrogRow, now: number): void {
    const [id, x, y, motion, flags, seq] = row;
    let remote = this.others.get(id);
    if (!remote) {
      const info = this.roster.get(id);
      const frog = new PartyFrog(this, { id, name: info?.name ?? '…', look: parseLook(info?.look), control: flags & FLAG.bot ? 'bot' : 'phone', tagSize: 22 }, x, y);
      remote = { frog, tx: x, ty: y, moving: false, seq, flags: 0 };
      this.others.set(id, remote);
    }
    const { frog } = remote;
    if (seq !== remote.seq) {
      const far = Math.hypot(x - frog.x, y - frog.y);
      remote.seq = seq;
      frog.release();
      frog.teleport(x, y);
      frog.drop(now, far > 300 ? 380 : 90);
    }
    if (flags & FLAG.captured && !(remote.flags & FLAG.captured)) frog.capture(now, null, 2600);
    remote.tx = x; remote.ty = y; remote.moving = (motion & 1) === 1; remote.flags = flags;
    frog.facing = FACINGS[motion >> 1] ?? 'down';
    frog.online = !(flags & FLAG.away);
    this.applyFlags(frog, flags, now);
  }

  private applyFlags(frog: PartyFrog, flags: number, now: number): void {
    frog.hide(!!(flags & FLAG.hidden));
    frog.sick = !!(flags & FLAG.sick);
    frog.safeUntil = flags & FLAG.safe ? now + 400 : 0;
    for (const [kind, flag] of BOOST_FLAGS) { if (flags & flag) frog.boosts.set(kind, now + 600); else frog.boosts.delete(kind); }
  }

  private syncBugs(world: WorldSnapshot, now: number): void {
    const seen = new Set<number>();
    const night = this.map.night;
    for (const [id, kind, x, y] of world.b) {
      seen.add(id);
      const bug = this.bugs.get(id);
      if (bug) { bug.moveTo(x, y); continue; }
      const prey = new Prey(this, PREY_KINDS[kind] ?? 'cricket', x, y, undefined, id);
      const size = prey.sprite.scale;
      prey.sprite.setScale(0);
      this.tweens.add({ targets: prey.sprite, scale: size, duration: 240, ease: 'Back.easeOut' });
      prey.setGlow(night);
      this.bugs.set(id, prey);
    }
    for (const [id, bug] of this.bugs) if (!seen.has(id)) { bug.destroy(); this.bugs.delete(id); }
    void now;
  }

  private syncHunters(world: WorldSnapshot): void {
    const rows = world.h ?? [];
    while (this.hunters.length < rows.length) {
      const [x, y] = rows[this.hunters.length];
      this.hunters.push({
        sprite: this.add.image(x, y, 'hunter').setOrigin(.5, .9).setScale(4.6),
        beam: this.add.image(x, y, 'beam').setOrigin(0, .5).setScale(3.8, 4.6).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD),
        lamp: this.add.image(x, y, 'glow').setScale(3).setDepth(3100).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0a0),
        tx: x, ty: y, angle: 0, walking: false,
      });
    }
    while (this.hunters.length > rows.length) { const hunter = this.hunters.pop()!; hunter.sprite.destroy(); hunter.beam.destroy(); hunter.lamp.destroy(); }
    rows.forEach(([x, y, angle, walking], i) => Object.assign(this.hunters[i], { tx: x, ty: y, angle: Phaser.Math.DegToRad(angle), walking: walking === 1 }));
  }

  private syncPigs(world: WorldSnapshot): void {
    const rows = world.p ?? [];
    while (this.pigs.length < rows.length) {
      const [x, y] = rows[this.pigs.length];
      const sprite = this.add.image(x, y, 'pig').setOrigin(.5, .9).setScale(4.4).setAlpha(0);
      this.tweens.add({ targets: sprite, alpha: 1, duration: 400 });
      this.pigs.push({ sprite, tx: x, ty: y, dir: 1, charging: false });
    }
    while (this.pigs.length > rows.length) this.pigs.pop()!.sprite.destroy();
    rows.forEach(([x, y, dir, charging], i) => {
      const pig = this.pigs[i];
      if (!pig.charging && charging) sound.play('spotted');
      Object.assign(pig, { tx: x, ty: y, dir, charging: charging === 1 });
    });
  }

  private syncClouds(world: WorldSnapshot): void {
    const rows = world.c ?? [];
    while (this.clouds.length < rows.length) {
      const [x, y, r] = rows[this.clouds.length];
      const glow = this.add.image(x, y, 'glow').setScale(r / 10).setDepth(3050).setTint(0x3f9a2a).setAlpha(0);
      this.tweens.add({ targets: glow, alpha: .85, duration: 800 });
      const spores = this.add.particles(x, y, 'spore', { lifespan: 1400, speed: { min: 10, max: 40 }, scale: { start: 3.4, end: 0 }, frequency: 90, blendMode: 'ADD', emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, r * .8), quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData }).setDepth(3060);
      this.clouds.push({ glow, spores, tx: x, ty: y });
    }
    while (this.clouds.length > rows.length) { const cloud = this.clouds.pop()!; cloud.glow.destroy(); cloud.spores.destroy(); }
    rows.forEach(([x, y], i) => { this.clouds[i].tx = x; this.clouds[i].ty = y; });
  }

  private syncPickups(world: WorldSnapshot): void {
    const seen = new Set<number>();
    for (const [id, kind, x, y] of world.u ?? []) {
      seen.add(id);
      if (this.pickups.has(id)) continue;
      const glow = this.add.image(x, y, 'glow').setScale(3.4).setDepth(1).setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff0a0).setAlpha(.8);
      const icon = this.add.image(x, y, BOOSTS[BOOST_KINDS[kind] ?? 'speed'].icon).setScale(0).setDepth(y + 5);
      this.tweens.add({ targets: icon, scale: 3.6, duration: 300, ease: 'Back.easeOut' });
      this.tweens.add({ targets: icon, y: y - 10, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 300 });
      this.pickups.set(id, { icon, glow });
    }
    for (const [id, pickup] of this.pickups) if (!seen.has(id)) { pickup.icon.destroy(); pickup.glow.destroy(); this.pickups.delete(id); }
  }

  private syncTraps(world: WorldSnapshot): void {
    const seen = new Set<number>();
    for (const [id, x, y, shut] of world.k ?? []) {
      seen.add(id);
      let trap = this.traps.get(id);
      if (!trap) { trap = this.add.image(x, y + 20, 'trap').setOrigin(.5, .9).setScale(3.4).setDepth(y); this.traps.set(id, trap); }
      if (shut && trap.texture.key !== 'trap-shut') { trap.setTexture('trap-shut').setPosition(x, y + 20).setDepth(y + 2); sound.play('trap', 1); }
    }
    for (const [id, trap] of this.traps) if (!seen.has(id)) { trap.destroy(); this.traps.delete(id); }
  }

  // ---------------------------------------------------------------- every frame

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 100);
    const me = this.me;
    if (me) {
      let moving = false;
      if (this.free && (controls.x || controls.y)) {
        const length = Math.hypot(controls.x, controls.y);
        const pace = frogPace(this.flags) * dt / 1000 * Math.min(1, length);
        const next = step(me.x, me.y, controls.x / length * pace, controls.y / length * pace);
        me.face(controls.x, controls.y);
        moving = next.x !== me.x || next.y !== me.y;
        me.x = next.x; me.y = next.y;
      }
      me.update(time, dt, moving);
      this.focus.setPosition(me.x, me.y);
      this.arrow.setPosition(me.tag.x, me.tag.y - 30).setVisible(!me.isHidden && !me.isCaptured(time));
      if (time - this.sent.at > MOVE_EVERY) this.sendMove(false, moving);
    }
    for (const remote of this.others.values()) {
      const { frog } = remote;
      const dx = remote.tx - frog.x, dy = remote.ty - frog.y;
      if (Math.hypot(dx, dy) > 400) frog.teleport(remote.tx, remote.ty);
      else { const k = ease(dt, 90); frog.x += dx * k; frog.y += dy * k; }
      frog.update(time, dt, remote.moving || Math.hypot(dx, dy) > 3);
    }
    for (const bug of this.bugs.values()) bug.follow(dt);
    this.moveDangers(time, dt);
    this.tongues.clear();
    me?.drawTongue(this.tongues, time);
    for (const remote of this.others.values()) remote.frog.drawTongue(this.tongues, time);
    if (me && time - this.lastReveal > 150) { this.lastReveal = time; this.map.reveal([me]); this.map.cull(this.cameras.main.worldView); }
    if (time - this.lastMinimap > 250) { this.lastMinimap = time; this.drawMinimap(); }
  }

  private moveDangers(time: number, dt: number): void {
    const k = ease(dt, 90);
    for (const hunter of this.hunters) {
      const { sprite } = hunter;
      sprite.x += (hunter.tx - sprite.x) * k; sprite.y += (hunter.ty - sprite.y) * k;
      const left = Math.cos(hunter.angle) < 0;
      const rotation = Phaser.Math.Angle.RotateTo(hunter.beam.rotation, hunter.angle, 6 * dt / 1000);
      sprite.setDepth(sprite.y).setFlipX(left).setTexture(hunter.walking && Math.floor(time / 250) % 2 ? 'hunter-1' : 'hunter');
      hunter.beam.setPosition(sprite.x + (left ? -20 : 20), sprite.y - 44).setRotation(rotation);
      hunter.lamp.setPosition(sprite.x, sprite.y - 100);
    }
    // Pigs: shown where they are, plus a warning at the edge of the screen when one is coming your way.
    const view = this.cameras.main.worldView;
    this.edges.forEach(edge => edge.setVisible(false));
    let edgeIndex = 0;
    for (const pig of this.pigs) {
      const { sprite } = pig;
      const far = Math.abs(pig.tx - sprite.x) > 300;
      sprite.x = far ? pig.tx : sprite.x + (pig.tx - sprite.x) * ease(dt, 50);
      sprite.y = pig.ty + (pig.charging ? Math.abs(Math.sin(sprite.x / 30)) * -6 : 0);
      sprite.setDepth(pig.ty).setFlipX(pig.dir < 0).setTexture(pig.charging && Math.floor(sprite.x / 40) % 2 ? 'pig-1' : 'pig');
      const coming = (pig.dir > 0 && sprite.x < view.left) || (pig.dir < 0 && sprite.x > view.right);
      if (coming && pig.ty > view.top - 40 && pig.ty < view.bottom + 40 && edgeIndex < this.edges.length) {
        const edge = this.edges[edgeIndex++];
        const camera = this.cameras.main;
        const screenY = Phaser.Math.Clamp((pig.ty - view.top) * camera.zoom, 40, camera.height - 40);
        edge.setText(pig.dir > 0 ? '◀ PIG!' : 'PIG! ▶').setPosition(pig.dir > 0 ? 70 : camera.width - 70, screenY).setVisible(Math.floor(time / 200) % 2 === 0 || pig.charging);
      }
    }
    for (const cloud of this.clouds) {
      const x = cloud.glow.x + (cloud.tx - cloud.glow.x) * k, y = cloud.glow.y + (cloud.ty - cloud.glow.y) * k;
      cloud.glow.setPosition(x, y); cloud.spores.setPosition(x, y);
    }
  }

  /** Tells the projector where your frog is: often while moving, now and then while still. */
  private sendMove(force: boolean, moving = false): void {
    const me = this.me;
    if (!me || !classPlayer.open) return;
    const now = this.time.now;
    const m = moving ? 1 : 0;
    const changed = Math.abs(me.x - this.sent.x) >= 1 || Math.abs(me.y - this.sent.y) >= 1 || m !== this.sent.m;
    if (!force && !changed && now - this.sent.at < 1000) return;
    this.sent = { x: me.x, y: me.y, m, at: now };
    classPlayer.move(me.x, me.y, FACINGS.indexOf(me.facing), m, this.seq);
  }

  private float(x: number, y: number, text: string, color: string): void {
    const label = this.add.text(x, y, text, { fontFamily: 'PressStart', fontSize: '22px', color, stroke: '#1d1712', strokeThickness: 6 }).setOrigin(.5).setDepth(5000);
    label.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.tweens.add({ targets: label, y: y - 50, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => label.destroy() });
  }

  /** The little map in the corner: where you are, and everyone else. (The cave isn't marked.) */
  private drawMinimap(): void {
    const canvas = document.getElementById('minimap') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height, sx = w / MAP.width, sy = h / MAP.height;
    if (!this.minimapBase) {
      const source = this.textures.get('map-ground').getSourceImage() as HTMLCanvasElement;
      this.minimapBase = document.createElement('canvas');
      this.minimapBase.width = w; this.minimapBase.height = h;
      const base = this.minimapBase.getContext('2d')!;
      base.imageSmoothingEnabled = true;
      base.drawImage(source, 0, 0, w, h);
    }
    ctx.drawImage(this.minimapBase, 0, 0);
    if (this.map.night > .3) { ctx.fillStyle = 'rgba(6,18,38,.45)'; ctx.fillRect(0, 0, w, h); }
    const dot = (x: number, y: number, size: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x * sx - size / 2), Math.round(y * sy - size / 2), size, size); };
    for (const pickup of this.pickups.values()) dot(pickup.icon.x, pickup.icon.y, 3, '#fff0a0');
    for (const hunter of this.hunters) dot(hunter.sprite.x, hunter.sprite.y, 4, '#ff3a2a');
    for (const remote of this.others.values()) if (!remote.frog.isHidden) dot(remote.frog.x, remote.frog.y, 4, lookColor(remote.frog.look).hex);
    const me = this.me;
    if (me) {
      const blink = Math.floor(this.time.now / 400) % 2 === 0;
      dot(me.x, me.y, 8, '#1d1712');
      dot(me.x, me.y, 6, blink ? '#ffffff' : lookColor(me.look).hex);
      // The part of the map on screen.
      const view = this.cameras.main.worldView;
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(view.x * sx) + .5, Math.round(view.y * sy) + .5, Math.round(view.width * sx), Math.round(view.height * sy));
    }
  }
}
