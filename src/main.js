/* Nokia-style Snakes & Ladders: rendering, input, sound and screen flow. */
(function () {
  'use strict';
  var G = window.SnlGame;
  var W = 168, H = 96;
  var BG = '#c7f0d8', FG = '#43523d';
  var canvas = document.getElementById('lcd');
  var ctx = canvas.getContext('2d');

  // ---------- 3x5 pixel font ----------
  var FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
    '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
    '8': '111101111101111', '9': '111101111001110',
    '!': '010010010000010', '.': '000000000000010', ':': '000010000010000', '-': '000000111000000',
    '>': '100010001010100', '<': '001010100010001', '?': '110001010000010', '/': '001001010100100',
    '+': '000010111010000', '#': '101111101111101', '*': '101010101000000', "'": '010010000000000',
    ' ': '000000000000000'
  };

  var color = FG;
  function px(x, y) { if (x >= 0 && y >= 0 && x < W && y < H) ctx.fillRect(x | 0, y | 0, 1, 1); }
  function rect(x, y, w, h) { ctx.fillRect(x, y, w, h); }
  function text(str, x, y, scale) {
    scale = scale || 1;
    str = String(str).toUpperCase();
    for (var i = 0; i < str.length; i++) {
      var g = FONT[str[i]] || FONT['?'];
      for (var j = 0; j < 15; j++) {
        if (g[j] === '1') ctx.fillRect(x + (j % 3) * scale, y + Math.floor(j / 3) * scale, scale, scale);
      }
      x += 4 * scale;
    }
  }
  function textWidth(str, scale) { return String(str).length * 4 * (scale || 1) - (scale || 1); }
  function line(x0, y0, x1, y1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (;;) {
      px(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }

  // ---------- Sound (square-wave beeps like the original) ----------
  var audio = null, soundOn = true;
  function beep(freq, dur, when) {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var t = audio.currentTime + (when || 0);
      var o = audio.createOscillator(), g = audio.createGain();
      o.type = 'square'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.06, t); g.gain.setValueAtTime(0, t + dur);
      o.connect(g); g.connect(audio.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* audio unavailable */ }
  }
  function tune(notes) {
    var t = 0;
    notes.forEach(function (n) { if (n[0]) beep(n[0], n[1] * 0.9, t); t += n[1]; });
  }
  var E = 0.14;
  var NOKIA_TUNE = [[659, E], [587, E], [370, 2 * E], [415, 2 * E], [554, E], [494, E], [294, 2 * E],
    [330, 2 * E], [494, E], [440, E], [277, 2 * E], [330, 2 * E], [440, 4 * E]];

  // ---------- Board geometry ----------
  var BX = 2, BY = 2, CELL = 9;
  function cellOrigin(n) { var g = G.cellToGrid(n); return { x: BX + g.col * CELL, y: BY + g.row * CELL }; }
  function cellCenter(n) { var o = cellOrigin(n); return { x: o.x + 4, y: o.y + 4 }; }
  var TOKEN_OFF = [{ x: 1, y: 1 }, { x: 5, y: 5 }];
  function tokenPos(i, n) {
    if (n === 0) return { x: BX + (i === 0 ? 0 : 4), y: BY + 10 * CELL + 1 }; // start: just below square 1
    var o = cellOrigin(n); return { x: o.x + TOKEN_OFF[i].x, y: o.y + TOKEN_OFF[i].y };
  }

  function drawBoard() {
    color = FG; ctx.fillStyle = FG;
    rect(BX, BY, CELL * 10 + 1, 1); rect(BX, BY + CELL * 10, CELL * 10 + 1, 1);
    rect(BX, BY, 1, CELL * 10 + 1); rect(BX + CELL * 10, BY, 1, CELL * 10 + 1);
    // dotted inner grid
    for (var k = 1; k < 10; k++) {
      for (var t = 0; t <= CELL * 10; t += 2) { px(BX + k * CELL, BY + t); px(BX + t, BY + k * CELL); }
    }
    // goal flag on 100
    var f = cellOrigin(100);
    rect(f.x + 2, f.y + 2, 1, 6); rect(f.x + 3, f.y + 2, 3, 3);
    Object.keys(G.LADDERS).forEach(function (a) { drawLadder(+a, G.LADDERS[a]); });
    Object.keys(G.SNAKES).forEach(function (a) { drawSnake(+a, G.SNAKES[a]); });
  }
  function drawLadder(a, b) {
    var p = cellCenter(a), q = cellCenter(b);
    var dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len * 1.6, ny = dx / len * 1.6;
    line(p.x + nx, p.y + ny, q.x + nx, q.y + ny);
    line(p.x - nx, p.y - ny, q.x - nx, q.y - ny);
    for (var s = 2; s < len - 1; s += 3) {
      var cx = p.x + dx * s / len, cy = p.y + dy * s / len;
      line(cx + nx, cy + ny, cx - nx, cy - ny);
    }
  }
  function drawSnake(head, tail) {
    var p = cellCenter(head), q = cellCenter(tail);
    var dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len, ny = dx / len, prev = null;
    for (var s = 0; s <= len; s += 0.5) {
      var w = Math.sin(s / 2.2) * 1.8 * Math.min(1, (len - s) / 4 + 0.3);
      var x = Math.round(p.x + dx * s / len + nx * w), y = Math.round(p.y + dy * s / len + ny * w);
      if (prev) line(prev.x, prev.y, x, y); prev = { x: x, y: y };
    }
    rect(p.x - 1, p.y - 1, 3, 3); // head
    ctx.fillStyle = BG; px(p.x, p.y); ctx.fillStyle = FG; // eye
  }
  function drawToken(i, x, y) {
    ctx.fillStyle = FG;
    if (i === 0) rect(x, y, 3, 3);
    else { rect(x, y, 3, 1); rect(x, y + 2, 3, 1); px(x, y + 1); px(x + 2, y + 1); }
  }
  var PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
  function drawDie(x, y, v) {
    ctx.fillStyle = FG;
    rect(x + 1, y, 15, 1); rect(x + 1, y + 16, 15, 1); rect(x, y + 1, 1, 15); rect(x + 16, y + 1, 1, 15);
    if (!v) { text('?', x + 7, y + 6); return; }
    PIPS[v].forEach(function (p) { rect(x + 3 + p[0] * 4, y + 3 + p[1] * 4, 3, 3); });
  }

  // ---------- State ----------
  var screen = 'splash', menuIdx = 0, helpScroll = 0;
  var game = null, disp = [], busy = false, dieFace = 0, msg = '', msg2 = '', blink = 0;
  var MENU = function () { return ['1 PLAYER', '2 PLAYERS', 'INSTRUCTIONS', 'SOUND: ' + (soundOn ? 'ON' : 'OFF')]; };
  var HELP = ['RACE TO SQUARE 100!', '', '5 / ENTER: ROLL DIE', 'LADDERS TAKE YOU UP', 'SNAKES BRING YOU', 'DOWN.', '',
    'YOU NEED THE EXACT', 'ROLL TO LAND ON 100', '', 'SOLID BLOCK: P1', 'HOLLOW BLOCK: P2/CPU', '', 'C / ESC: BACK', '# : SOUND ON/OFF'];

  function newGame(twoPlayer) {
    game = G.createGame([{ name: twoPlayer ? 'P1' : 'YOU' }, { name: twoPlayer ? 'P2' : 'CPU', cpu: !twoPlayer }]);
    disp = [tokenPos(0, 0), tokenPos(1, 0)];
    dieFace = 0; busy = false; msg = ''; msg2 = '';
    screen = 'game';
    beep(880, 0.08); beep(1320, 0.1, 0.1);
    maybeCpu();
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function tween(i, to, ms) {
    var from = { x: disp[i].x, y: disp[i].y }, start = performance.now();
    return new Promise(function (resolve) {
      (function step() {
        var t = Math.min(1, (performance.now() - start) / ms);
        disp[i] = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
        if (t < 1) requestAnimationFrame(step); else resolve();
      })();
    });
  }

  function roll() {
    if (busy || !game || game.winner !== null) return;
    busy = true; msg = ''; msg2 = '';
    var who = game.current, value = G.rollDie();
    var shakes = 0;
    (function shake() {
      dieFace = 1 + Math.floor(Math.random() * 6); beep(300 + shakes * 40, 0.03);
      if (++shakes < 8) return setTimeout(shake, 55);
      dieFace = value;
      var move = G.applyRoll(game, value);
      animateMove(who, move);
    })();
  }

  function animateMove(who, move) {
    var p = Promise.resolve();
    if (move.overshoot) { msg = 'NEED ' + (G.BOARD_SIZE - move.from); msg2 = 'EXACTLY!'; beep(200, 0.15); }
    move.steps.forEach(function (n) {
      p = p.then(function () { beep(1000, 0.025); return tween(who, tokenPos(who, n), 110); }).then(function () { return wait(40); });
    });
    if (move.jump) {
      p = p.then(function () {
        var up = move.jump.type === 'ladder';
        msg = up ? 'LADDER!' : 'SNAKE!';
        msg2 = move.jump.from + (up ? ' UP TO ' : ' DOWN TO ') + move.jump.to;
        tune(up ? [[523, 0.06], [659, 0.06], [784, 0.06], [1047, 0.1]] : [[600, 0.08], [450, 0.08], [300, 0.08], [180, 0.16]]);
        return wait(250);
      }).then(function () {
        var a = cellCenter(move.jump.from), b = cellCenter(move.jump.to);
        var dist = Math.hypot(b.x - a.x, b.y - a.y);
        return tween(who, tokenPos(who, move.jump.to), Math.max(300, dist * 12));
      });
    }
    p.then(function () {
      disp[who] = tokenPos(who, move.final);
      if (game.winner !== null) { tune(NOKIA_TUNE); screen = 'win'; }
      return wait(move.jump || move.overshoot ? 500 : 150);
    }).then(function () { busy = false; maybeCpu(); });
  }

  function maybeCpu() {
    if (screen !== 'game' || !game || game.winner !== null) return;
    if (game.players[game.current].cpu) {
      busy = true;
      setTimeout(function () { busy = false; if (screen === 'game') roll(); }, 800);
    }
  }

  // ---------- Input ----------
  function press(key) {
    if (key === 'hash') { soundOn = !soundOn; beep(1200, 0.05); return; }
    if (screen === 'splash') { if (key === 'ok') { screen = 'menu'; beep(1200, 0.05); } return; }
    if (screen === 'menu') {
      var n = MENU().length;
      if (key === 'up') { menuIdx = (menuIdx + n - 1) % n; beep(1400, 0.02); }
      else if (key === 'down') { menuIdx = (menuIdx + 1) % n; beep(1400, 0.02); }
      else if (key === 'back') { screen = 'splash'; }
      else if (key === 'ok') {
        if (menuIdx === 0) newGame(false);
        else if (menuIdx === 1) newGame(true);
        else if (menuIdx === 2) { screen = 'help'; helpScroll = 0; beep(1200, 0.05); }
        else { soundOn = !soundOn; beep(1200, 0.05); }
      }
      return;
    }
    if (screen === 'help') {
      var max = Math.max(0, HELP.length - 12);
      if (key === 'up') helpScroll = Math.max(0, helpScroll - 1);
      else if (key === 'down') helpScroll = Math.min(max, helpScroll + 1);
      else if (key === 'back' || key === 'ok') screen = 'menu';
      return;
    }
    if (screen === 'game') {
      if (key === 'back') { screen = 'menu'; game = null; return; }
      if (key === 'ok' && !game.players[game.current].cpu) roll();
      return;
    }
    if (screen === 'win') {
      if (key === 'ok' || key === 'back') { screen = 'menu'; game = null; }
    }
  }
  var KEYMAP = { Enter: 'ok', ' ': 'ok', '5': 'ok', ArrowUp: 'up', '2': 'up', w: 'up', ArrowDown: 'down', '8': 'down', s: 'down',
    Escape: 'back', Backspace: 'back', c: 'back', '#': 'hash', m: 'hash' };
  document.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.key];
    if (!k) return;
    e.preventDefault();
    if (!e.repeat) press(k);
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-key]'), function (b) {
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); press(b.getAttribute('data-key')); });
  });

  // ---------- Screens ----------
  function invertedBar(y, h) { ctx.fillStyle = FG; rect(0, y, W, h); ctx.fillStyle = BG; }
  function centered(str, y, scale) { text(str, Math.round((W - textWidth(str, scale)) / 2), y, scale); }

  function drawSplash() {
    ctx.fillStyle = FG;
    centered('SNAKES', 8, 3);
    centered('+ LADDERS', 28, 2);
    // decorative snake & ladder
    drawLadderAt(20, 82, 40, 48);
    var prev = null;
    for (var x = 60; x <= 140; x++) {
      var y = 66 + Math.round(Math.sin(x / 6) * 5);
      if (prev) line(prev.x, prev.y, x, y); prev = { x: x, y: y };
    }
    rect(140, 64, 5, 4); ctx.fillStyle = BG; px(143, 65); ctx.fillStyle = FG; px(146, 66); px(147, 65);
    if (Math.floor(blink / 30) % 2 === 0) centered('PRESS 5 TO START', 86);
  }
  function drawLadderAt(x0, y0, x1, y1) {
    line(x0, y0, x1, y1); line(x0 + 5, y0, x1 + 5, y1);
    for (var t = 0.1; t < 1; t += 0.15) { var x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; line(x, y, x + 5, y); }
  }
  function drawMenu() {
    invertedBar(0, 11); centered('MENU', 3); ctx.fillStyle = FG;
    MENU().forEach(function (item, i) {
      var y = 16 + i * 14;
      if (i === menuIdx) { invertedBar(y - 3, 11); text(item, 8, y); ctx.fillStyle = FG; }
      else text(item, 8, y);
    });
    // scroll bar
    rect(W - 4, 14, 1, 80);
    rect(W - 6, 14 + menuIdx * 20, 5, 20);
  }
  function drawHelp() {
    invertedBar(0, 11); centered('INSTRUCTIONS', 3); ctx.fillStyle = FG;
    HELP.slice(helpScroll, helpScroll + 12).forEach(function (l, i) { text(l, 4, 14 + i * 7); });
    var max = Math.max(1, HELP.length - 12);
    rect(W - 3, 13, 1, 82); rect(W - 5, 13 + Math.round(helpScroll / max * 70), 5, 12);
  }
  function drawGame() {
    drawBoard();
    disp.forEach(function (d, i) { drawToken(i, Math.round(d.x), Math.round(d.y)); });
    var x = 96;
    ctx.fillStyle = FG;
    text('TURN ' + game.turn, x, 3);
    rect(x, 10, 70, 1);
    game.players.forEach(function (p, i) {
      var y = 14 + i * 9;
      if (game.current === i && game.winner === null && Math.floor(blink / 15) % 2 === 0) text('>', x, y);
      drawToken(i, x + 5, y + 1);
      text(p.name, x + 10, y);
      var pos = String(p.pos || '-');
      text(pos, W - 2 - textWidth(pos), y);
    });
    rect(x, 32, 70, 1);
    if (screen === 'win') {
      var w = game.players[game.winner];
      text(w.name === 'YOU' ? 'YOU WIN!' : w.name + ' WINS!', x, 37);
      text('IN ' + game.turn + ' TURNS', x, 45);
      if (Math.floor(blink / 30) % 2 === 0) text('5: MENU', x, 86);
      drawDie(x + 50, 66, dieFace);
      return;
    }
    if (msg) text(msg, x, 37);
    if (msg2) text(msg2, x, 45);
    drawDie(x + 26, 58, dieFace);
    var cur = game.players[game.current];
    if (!busy) {
      if (cur.cpu) text('CPU...', x, 86);
      else if (Math.floor(blink / 30) % 2 === 0) text(cur.name + ': PRESS 5', x, 86);
    } else if (cur.cpu && !msg) text('CPU...', x, 86);
  }

  function frame() {
    blink++;
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); ctx.fillStyle = FG;
    if (screen === 'splash') drawSplash();
    else if (screen === 'menu') drawMenu();
    else if (screen === 'help') drawHelp();
    else drawGame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
