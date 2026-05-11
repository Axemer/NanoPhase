// ========== NanoPhase ENGINE v7 ==========
(function() {
  const NanoPhase = window.NanoPhase = {};

  NanoPhase.AUTO = 'auto';
  NanoPhase.Scale = { RESIZE: 4, CENTER_BOTH: 1 };

  NanoPhase.Math = {
    Clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
    Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) },
    Linear: (a, b, t) => a + (b - a) * t,
    Easing: {
      Sine: { InOut: t => -(Math.cos(Math.PI * t) - 1) / 2 },
      Back: { easeOut: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); } },
      Cubic: { easeOut: t => 1 - Math.pow(1 - t, 3) },
      Linear: t => t,
    },
  };

  // --- Camera ---
  class Camera {
    constructor(x, y, w, h) {
      this._scrollX = 0; this._scrollY = 0; this._zoom = 1;
      this.width = w; this.height = h; this.x = x; this.y = y;
    }
    get scrollX() { return this._scrollX; } set scrollX(v) { this._scrollX = v; }
    get scrollY() { return this._scrollY; } set scrollY(v) { this._scrollY = v; }
    get zoom() { return this._zoom; } set zoom(v) { this._zoom = v; }
    get worldView() { return { x: this._scrollX, y: this._scrollY, width: this.width / this._zoom, height: this.height / this._zoom }; }
    getWorldPoint(sx, sy) { return { x: sx / this._zoom + this._scrollX, y: sy / this._zoom + this._scrollY }; }
    setZoom(z) { this.zoom = z; }
    setScroll(sx, sy) { this.scrollX = sx; this.scrollY = sy; }
    setSize(w, h) { this.width = w; this.height = h; }
    get centerX() { return this.x + this.width / 2; }
    get centerY() { return this.y + this.height / 2; }
  }

  // --- Sprite ---
  class Sprite {
    constructor(scene, x, y, key) {
      this.scene = scene;
      this.x = x || 0; this.y = y || 0;
      this._scaleX = 1; this._scaleY = 1;
      this._alpha = 1; this._tint = 0xffffff;
      this._visible = true;
      this.originX = 0.5; this.originY = 0.5;
      this.textureKey = key; this.width = 64; this.height = 64;
      this.destroyed = false; this._depth = 0;
      this.type = 'sprite';
      this._animatingAutoClose = false;
    }
    get scale() { return this._scaleX; }
    set scale(v) { this._scaleX = v; this._scaleY = v; }
    get scaleX() { return this._scaleX; } set scaleX(v) { this._scaleX = v; }
    get scaleY() { return this._scaleY; } set scaleY(v) { this._scaleY = v; }
    get alpha() { return this._alpha; } set alpha(v) { this._alpha = v; }
    setOrigin(ox, oy) { this.originX = ox; this.originY = oy; return this; }
    setTint(color) { this._tint = color; return this; }
    setScale(sx, sy) { this._scaleX = sx; this._scaleY = (sy !== undefined ? sy : sx); return this; }
    setAlpha(a) { this._alpha = a; return this; }
    setDepth(d) { this._depth = d; return this; }
    setVisible(v) { this._visible = v; return this; }
    removeAllListeners() {}
    destroy() {
      if (this.scene && this.scene.displayList) {
        const idx = this.scene.displayList.indexOf(this);
        if (idx > -1) this.scene.displayList.splice(idx, 1);
      }
      this.destroyed = true;
      this.scene = null;
    }
  }

  // --- Graphics ---
  class Graphics {
    constructor(scene) {
      this.scene = scene;
      this.commands = [];
      this._x = 0; this._y = 0;
      this._alpha = 1;
      this._visible = true;
      this._depth = 0;
      this._tint = 0xffffff;
      this.type = 'graphics';
      this._followBlock = null;
    }
    get x() { return this._x; } set x(v) { this._x = v; }
    get y() { return this._y; } set y(v) { this._y = v; }
    get alpha() { return this._alpha; } set alpha(v) { this._alpha = v; }
    setDepth(d) { this._depth = d; return this; }
    setVisible(v) { this._visible = v; return this; }
    fillStyle(color, alpha) { this.commands.push(['fillStyle', color, alpha]); return this; }
    lineStyle(width, color, alpha) { this.commands.push(['lineStyle', width, color, alpha]); return this; }
    fillRect(x, y, w, h) { this.commands.push(['fillRect', x, y, w, h]); return this; }
    strokeRect(x, y, w, h) { this.commands.push(['strokeRect', x, y, w, h]); return this; }
    beginPath() { this.commands.push(['beginPath']); return this; }
    arc(x, y, r, a0, a1) { this.commands.push(['arc', x, y, r, a0, a1]); return this; }
    fillPath() { this.commands.push(['fill']); return this; }

    generateTexture(key, w, h) {
      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const ctx = off.getContext('2d');
      for (const cmd of this.commands) {
        if (cmd[0] === 'fillStyle') { ctx.fillStyle = '#' + (cmd[1] & 0xffffff).toString(16).padStart(6, '0'); ctx.globalAlpha = cmd[2]; }
        else if (cmd[0] === 'lineStyle') { ctx.lineWidth = cmd[1]; ctx.strokeStyle = '#' + (cmd[2] & 0xffffff).toString(16).padStart(6, '0'); ctx.globalAlpha = cmd[3]; }
        else if (cmd[0] === 'fillRect') ctx.fillRect(cmd[1], cmd[2], cmd[3], cmd[4]);
        else if (cmd[0] === 'strokeRect') ctx.strokeRect(cmd[1], cmd[2], cmd[3], cmd[4]);
        else if (cmd[0] === 'beginPath') ctx.beginPath();
        else if (cmd[0] === 'arc') { ctx.arc(cmd[1], cmd[2], cmd[3], cmd[4], cmd[5]); }
        else if (cmd[0] === 'fill') ctx.fill();
      }
      ctx.globalAlpha = 1;
      this.scene.game.textures.addImage(key, off);
      return this;
    }

    render(ctx) {
      if (!this._visible || this.destroyed) return;
      ctx.save();
      ctx.globalAlpha = this._alpha;
      ctx.translate(this._x, this._y);
      for (const cmd of this.commands) {
        if (cmd[0] === 'fillStyle') { ctx.fillStyle = '#' + (cmd[1] & 0xffffff).toString(16).padStart(6, '0'); ctx.globalAlpha = cmd[2] * this._alpha; }
        else if (cmd[0] === 'lineStyle') { ctx.lineWidth = cmd[1]; ctx.strokeStyle = '#' + (cmd[2] & 0xffffff).toString(16).padStart(6, '0'); ctx.globalAlpha = cmd[3] * this._alpha; }
        else if (cmd[0] === 'fillRect') ctx.fillRect(cmd[1], cmd[2], cmd[3], cmd[4]);
        else if (cmd[0] === 'strokeRect') ctx.strokeRect(cmd[1], cmd[2], cmd[3], cmd[4]);
        else if (cmd[0] === 'beginPath') ctx.beginPath();
        else if (cmd[0] === 'arc') { ctx.arc(cmd[1], cmd[2], cmd[3], cmd[4], cmd[5]); }
        else if (cmd[0] === 'fill') ctx.fill();
      }
      ctx.restore();
    }

    destroy() {
      if (this.scene && this.scene.displayList) {
        const idx = this.scene.displayList.indexOf(this);
        if (idx > -1) this.scene.displayList.splice(idx, 1);
      }
      this.destroyed = true;
      this.scene = null;
    }
  }

  // --- Texture Manager ---
  class TextureManager {
    constructor() { this.textures = {}; }
    exists(key) { return !!this.textures[key]; }
    remove(key) { delete this.textures[key]; }
    addImage(key, source) { this.textures[key] = { key, source, width: source.width, height: source.height }; }
    get(key) { return this.textures[key]; }
  }

  // --- Tween ---
  class Tween {
    constructor(scene, targets, config) {
      this.scene = scene; this.targets = targets;
      this.props = config || {};
      this._elapsed = 0;
      this._duration = this.props.duration || 500;
      this._totalDuration = this.props.yoyo ? this._duration * 2 : this._duration;
      this._ease = this.props.ease || 'Linear';
      this._onComplete = this.props.onComplete;
      this._onYoyo = this.props.onYoyo;
      this._yoyo = !!this.props.yoyo;
      this._repeat = this.props.repeat !== undefined ? this.props.repeat : 0;
      this._infinite = this._repeat === -1;
      this._startValues = {};
      this._endValues = {};
      this._active = true;
      this._yoyoFired = false;
      if (targets) {
        if (!Array.isArray(targets)) targets = [targets];
        targets.forEach(t => this._initTarget(t));
        this.targets = targets;
      }
    }
    _initTarget(target) {
      for (const key in this.props) {
        if (['targets','duration','ease','onComplete','onYoyo','repeat','yoyo'].includes(key)) continue;
        const startVal = target[key] !== undefined ? target[key] : 0;
        this._startValues[key] = startVal;
        const val = this.props[key];
        if (typeof val === 'object' && val.from !== undefined) {
          this._startValues[key] = val.from;
          this._endValues[key] = val.to;
        } else {
          this._endValues[key] = val;
        }
      }
    }
    update(delta) {
      if (!this._active) return;
      this._elapsed += delta;
      let t = Math.min(this._elapsed / this._totalDuration, 1);
      if (this._yoyo) {
        if (!this._yoyoFired && this._elapsed >= this._duration) {
          this._yoyoFired = true;
          if (this._onYoyo) this._onYoyo();
        }
        if (t > 0.5) t = 1 - (t - 0.5) * 2;
        else t = t * 2;
      }
      const eased = this._applyEase(t);
      for (const target of this.targets) {
        for (const key in this._endValues) {
          target[key] = this._startValues[key] + (this._endValues[key] - this._startValues[key]) * eased;
        }
      }
      if (this._elapsed >= this._totalDuration) {
        if (this._infinite) {
          this._elapsed -= this._totalDuration;
          this._yoyoFired = false;
          for (const key in this._endValues) {
            this._startValues[key] = this.targets[0][key];
          }
        } else if (this._repeat > 0) {
          this._repeat--;
          this._elapsed = 0;
          this._yoyoFired = false;
        } else {
          this._active = false;
          if (this._onComplete) this._onComplete();
        }
      }
    }
    _applyEase(t) {
      const e = NanoPhase.Math.Easing;
      switch (this._ease) {
        case 'Sine.easeInOut': return e.Sine.InOut(t);
        case 'Back.easeOut': return e.Back.easeOut(t);
        case 'Cubic.easeOut': return e.Cubic.easeOut(t);
        case 'Linear': case 'linear': return e.Linear(t);
        default: return t;
      }
    }
    stop() { this._active = false; }
  }

  class TweenManager {
    constructor() { this.tweens = []; }
    add(config) {
      if (!config || !config.targets) return null;
      const targs = Array.isArray(config.targets) ? config.targets : [config.targets];
      const tween = new Tween(null, targs, config);
      this.tweens.push(tween);
      return tween;
    }
    update(delta) { this.tweens = this.tweens.filter(t => { t.update(delta); return t._active; }); }
  }

  // --- Time ---
  class TimerManager {
    constructor() { this.events = []; }
    delayedCall(delay, callback, args, scope) {
      const id = setTimeout(() => {
        if (args && args.length) {
          callback.apply(scope, args);
        } else {
          callback.call(scope);
        }
      }, delay);
      return { remove: () => clearTimeout(id) };
    }
    update() {}
  }

  // --- Sound (Web Audio) ---
  class SoundManager {
    constructor(game) {
      this.game = game;
      this.ctx = null;
      this.buffers = {};
      this._volume = 1;
      this._mute = false;
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    get volume() { return this._volume; } set volume(v) { this._volume = v; }
    get mute() { return this._mute; } set mute(v) { this._mute = v; }
    play(key) {
      if (!this.ctx || this._mute || !this.buffers[key]) return;
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      src.buffer = this.buffers[key];
      gain.gain.value = this._volume;
      src.connect(gain).connect(this.ctx.destination);
      src.start(0);
    }
    decodeAudio(key, buf) {
      if (!this.ctx) return;
      this.ctx.decodeAudioData(buf, buffer => { this.buffers[key] = buffer; });
    }
  }

  // --- Loader ---
  class Loader {
    constructor(scene) { this.scene = scene; }
    audio(key, urls) {
      urls = Array.isArray(urls) ? urls : [urls];
      const url = urls[0];
      if (url) {
        fetch(url).then(r => r.arrayBuffer())
          .then(buf => this.scene.sound.decodeAudio(key, buf))
          .catch(e => console.warn('Audio fail', key, e));
      }
    }
    start() {}
  }

  // --- Keyboard ---
  class Keyboard {
    constructor() {
      this.listeners = {};
      window.addEventListener('keydown', e => {
        if (this.listeners.keydown) this.listeners.keydown.forEach(fn => fn(e));
      });
    }
    on(event, cb) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(cb);
    }
  }

  class Input {
    constructor() { this.keyboard = new Keyboard(); }
  }

  class GameObjectCreator {
    constructor(scene) { this.scene = scene; }
    graphics(config) {
      const g = new Graphics(this.scene);
      this.scene.displayList.push(g);
      return g;
    }
  }

  // --- Scene ---
  class Scene {
    constructor(config) {
      if (config) Object.assign(this, config);
      this.game = null;
      this.sys = { settings: {}, isBooted: false, canInput: () => true };
    }
    get add() { return this._add; }
    get make() { return this._make; }
    get cameras() { return this._cameras; }
    get sound() { return this._sound; }
    get time() { return this._time; }
    get tweens() { return this._tweens; }
    get textures() { return this._textures; }
    get input() { return this._input; }
    get load() { return this._loader; }
    init() {}
    preload() {}
    create() {}
    update() {}
  }

  // ======================
  //   Game (основной цикл с FPS / VSync)
  // ======================
  class Game {
    constructor(config) {
      this.config = config;

      // --- Настройки FPS и VSync ---
      const fpsCfg = config.fps || {};
      this.fpsTarget = fpsCfg.target || 0;               // 0 = без ограничения
      this.forceSetTimeOut = !!fpsCfg.forceSetTimeOut;   // true → setTimeout вместо rAF
      this._frameInterval = this.fpsTarget ? 1000 / this.fpsTarget : 0;
      this._lastFrameTime = 0;

      // --- Сохраняем render-настройки на будущее ---
      this.renderConfig = config.render || {};

      // --- Canvas ---
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'game-canvas';
      this.canvas.style.cssText = 'display:block;position:absolute;top:0;left:0;width:100%;height:100%;';
      const parent = config.parent ? document.getElementById(config.parent) : document.body;
      parent.appendChild(this.canvas);

      // Пока движок работает только с 2D, но render-опции можно использовать при переходе на WebGL
      this.ctx = this.canvas.getContext('2d');

      this.textures = new TextureManager();
      this.scenes = [];
      this.currentScene = null;
      this.lastTime = 0;
      this._initScenes(config.scene);

      window.addEventListener('resize', () => this._resize());
      this._resize();

      // --- Запуск игрового цикла в зависимости от forceSetTimeOut ---
      if (this.forceSetTimeOut) {
        // Цикл на setTimeout – полный контроль частоты, без привязки к vsync
        const loop = () => {
          const now = performance.now();
          if (this._lastFrameTime === 0) this._lastFrameTime = now;
          const delta = now - this._lastFrameTime;
          this._lastFrameTime = now;

          if (this.currentScene) {
            if (this.currentScene.update) this.currentScene.update(now, delta);
            this.currentScene._tweens.update(delta);
          }
          this._render();

          setTimeout(loop, this._frameInterval || 16); // fallback ~60 fps если target = 0
        };
        this._lastFrameTime = performance.now();
        setTimeout(loop, this._frameInterval || 16);
      } else {
        // Цикл на requestAnimationFrame с программным ограничением FPS
        this._loop = (timestamp) => {
          if (this._lastFrameTime === 0) this._lastFrameTime = timestamp;

          const elapsed = timestamp - this._lastFrameTime;

          // Если задан лимит и ещё не прошло нужное время — пропускаем кадр
          if (this.fpsTarget > 0 && elapsed < this._frameInterval) {
            requestAnimationFrame(this._loop);
            return;
          }

          const delta = timestamp - this._lastFrameTime;
          this._lastFrameTime = timestamp;

          if (this.currentScene) {
            if (this.currentScene.update) this.currentScene.update(timestamp, delta);
            this.currentScene._tweens.update(delta);
          }
          this._render();

          requestAnimationFrame(this._loop);
        };
        requestAnimationFrame(this._loop);
      }
    }

    _initScenes(defs) {
      defs = Array.isArray(defs) ? defs : [defs];
      defs.forEach(SceneClass => {
        const scene = new SceneClass();
        scene.game = this;
        scene._add = {
          sprite: (x,y,key) => {
            const s = new Sprite(scene,x,y,key);
            scene.displayList.push(s);
            return s;
          },
          graphics: (config) => {
            const g = new Graphics(scene);
            scene.displayList.push(g);
            return g;
          }
        };
        scene._make = new GameObjectCreator(scene);
        scene._cameras = { main: new Camera(0,0,this.canvas.width,this.canvas.height), all: [] };
        scene._sound = new SoundManager(this);
        scene._time = new TimerManager();
        scene._tweens = new TweenManager();
        scene._textures = this.textures;
        scene._input = new Input();
        scene._loader = new Loader(scene);
        scene.displayList = [];
        scene.events = { on:()=>{}, once:()=>{}, emit:()=>{}, off:()=>{} };
        scene.sys.game = this;
        scene.sys.scale = { width: this.canvas.width, height: this.canvas.height, baseSize: { width: this.canvas.width, height: this.canvas.height } };
        scene.sys.canvas = this.canvas;
        scene.sys.displayList = scene._add;
        scene.sys.updateList = scene._add;
        scene.sys.input = scene._input;
        scene.sys.textures = this.textures;
        scene.sys.anims = { on:()=>{}, off:()=>{} };
        scene.sys.cameras = scene._cameras;
        scene.sys.events = scene.events;
        scene.sys.sound = scene._sound;
        scene.sys.load = scene._loader;
        scene.sys.game.config = this.config;
        scene.sys.settings = { input:{}, loader:{}, mapAdd:{} };
        if (scene.preload) scene.preload();
        if (scene.create) scene.create();
        if (scene.init) scene.init();
        this.scenes.push(scene);
        this.currentScene = scene;
      });
    }

    _render() {
      const ctx = this.ctx;
      const W = this.canvas.width, H = this.canvas.height;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      if (!this.currentScene) return;
      const cam = this.currentScene._cameras.main;
      ctx.save();
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.scrollX, -cam.scrollY);

      const list = [...this.currentScene.displayList];
      list.sort((a, b) => (a._depth || 0) - (b._depth || 0));

      for (const obj of list) {
        if (!obj._visible || obj.destroyed) continue;
        if (obj.type === 'sprite') {
          const spr = obj;
          const tex = this.textures.get(spr.textureKey);
          if (!tex) continue;
          const img = tex.source;
          ctx.globalAlpha = spr._alpha;
          ctx.save();
          ctx.translate(spr.x, spr.y);
          ctx.scale(spr._scaleX, spr._scaleY);
          ctx.translate(-spr.originX * spr.width, -spr.originY * spr.height);
          ctx.drawImage(img, 0, 0, spr.width, spr.height);
          if (spr._tint !== 0xffffff) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = '#' + (spr._tint & 0xffffff).toString(16).padStart(6, '0');
            ctx.fillRect(0, 0, spr.width, spr.height);
            ctx.globalCompositeOperation = 'source-over';
          }
          ctx.restore();
        } else if (obj.type === 'graphics') {
          obj.render(ctx);
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    _resize() {
      const W = window.innerWidth, H = window.innerHeight;
      this.canvas.width = W; this.canvas.height = H;
      if (this.currentScene) {
        const cam = this.currentScene._cameras.main;
        cam.setSize(W, H);
      }
    }
  }

  NanoPhase.Scene = Scene;
  NanoPhase.Game = Game;
})();