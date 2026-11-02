/* Pure game logic for Snake & Ladder (no DOM). Works in browser and Node. */
(function (root) {
  'use strict';

  var BOARD_SIZE = 100;

  // start -> end. Ladders go up, snakes go down.
  var LADDERS = { 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 72: 91, 80: 99 };
  var SNAKES = { 17: 7, 54: 34, 62: 19, 64: 60, 87: 36, 93: 73, 95: 75, 98: 79 };

  function rollDie(rng) {
    var r = (rng || Math.random)();
    return Math.min(6, Math.floor(r * 6) + 1);
  }

  /**
   * Resolve a move. Returns { path, landed, final, jump, won }.
   * - path: squares stepped through one at a time (excluding start)
   * - landed: square reached by the roll before snake/ladder
   * - jump: 'ladder' | 'snake' | null
   * - an overshoot of 100 means the player stays put (exact roll needed)
   */
  function move(position, roll) {
    var target = position + roll;
    if (target > BOARD_SIZE) {
      return { path: [], landed: position, final: position, jump: null, won: false, overshoot: true };
    }
    var path = [];
    for (var s = position + 1; s <= target; s++) path.push(s);
    var final = target;
    var jump = null;
    if (LADDERS[target]) { final = LADDERS[target]; jump = 'ladder'; }
    else if (SNAKES[target]) { final = SNAKES[target]; jump = 'snake'; }
    return { path: path, landed: target, final: final, jump: jump, won: final === BOARD_SIZE, overshoot: false };
  }

  /** Convert square number (1..100) to grid col/row, row 0 = top. Boustrophedon layout. */
  function squareToCell(square) {
    var idx = square - 1;
    var rowFromBottom = Math.floor(idx / 10);
    var colInRow = idx % 10;
    var col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
    return { col: col, row: 9 - rowFromBottom };
  }

  var api = {
    BOARD_SIZE: BOARD_SIZE, LADDERS: LADDERS, SNAKES: SNAKES,
    rollDie: rollDie, move: move, squareToCell: squareToCell
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SnlLogic = api;
})(this);
