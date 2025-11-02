// ??????? ????? ? ????????? ?????????? ?? Canvas ? ?? (???????? + ?????-????)
// ????????????? ?????: 8x8, ??????? 0..7. ????????:
//  0: ?????
//  1: ????? ?????, 2: ????? ?????
// -1: ?????? ?????, -2: ?????? ?????

const SIZE = 8;
const CELL_PX = 80;
const DARK = "#7a5230";
const LIGHT = "#f0d7b1";
const HILIGHT = "#2b7a78";
const TARGET = "#22c55e";
const CAPTURE = "#ef4444";

const WHITE = 1;
const WHITE_K = 2;
const BLACK = -1;
const BLACK_K = -2;

function cloneBoard(board) {
  const b = new Array(SIZE);
  for (let r = 0; r < SIZE; r++) b[r] = board[r].slice();
  return b;
}

function opposite(side) { return side > 0 ? -1 : 1; }
function isWhite(v) { return v > 0; }
function isBlack(v) { return v < 0; }
function isKing(v) { return Math.abs(v) === 2; }
function sign(v) { return v === 0 ? 0 : (v > 0 ? 1 : -1); }

function inside(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

function startPosition() {
  const b = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < SIZE; c++) {
      if ((r + c) % 2 === 1) b[r][c] = BLACK; // ?????? ??????
    }
  }
  for (let r = SIZE - 3; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if ((r + c) % 2 === 1) b[r][c] = WHITE; // ????? ?????
    }
  }
  return b;
}

// ????????? ????? ?? ???????? ??????? ?????
// ???????????? ???, ????????????? ????; ????? ???? ????-??????; ????? ????????????
// ?????, ????????? ????????? ???? ?? ????? ???, ?????????? ?????????? ?????? ? ?????????? ??? ??? ?????

function getAllMoves(board, side) {
  const captureMoves = [];
  const quietMoves = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c];
      if (v === 0 || sign(v) !== side) continue;
      const pieceMoves = generateMovesForPiece(board, r, c);
      for (const m of pieceMoves) {
        if (m.captures && m.captures.length > 0) captureMoves.push(m); else quietMoves.push(m);
      }
    }
  }
  if (captureMoves.length === 0) return quietMoves;
  // ??????? ??????????? ? ???????? ?????? ???? ? ???????????? ?????? ??????
  let maxCap = 0;
  for (const m of captureMoves) if (m.captures.length > maxCap) maxCap = m.captures.length;
  return captureMoves.filter(m => m.captures.length === maxCap);
}

function generateMovesForPiece(board, r, c) {
  const v = board[r][c];
  const side = sign(v);
  const res = [];

  // ??????? ??? ??? (???????????). ???? ???? ? ?? ????????? ????? ????
  const captures = generateCaptures(board, r, c, v);
  if (captures.length > 0) return captures;

  // ????? ????
  if (isKing(v)) {
    // ??????? ??? ?? ??????????, ??? ???????
    const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (inside(rr, cc) && board[rr][cc] === 0) {
        res.push({ from: [r,c], to: [rr,cc], captures: [], path: [[r,c],[rr,cc]] });
        rr += dr; cc += dc;
      }
    }
  } else {
    // ????? ? ?????? ?????? ?? ????, ?? ?????
    const forward = side > 0 ? -1 : 1; // ????? ???? ????? ?????? (? ???????? ???????)
    for (const dc of [-1, 1]) {
      const rr = r + forward, cc = c + dc;
      if (inside(rr, cc) && board[rr][cc] === 0) {
        res.push({ from: [r,c], to: [rr,cc], captures: [], path: [[r,c],[rr,cc]] });
      }
    }
  }
  return res;
}

function generateCaptures(board, r, c, v) {
  const side = sign(v);
  const results = [];

  if (isKing(v)) {
    // ?????: ???? ?????? ????? ?????????? ?? ????????? ? ?????? ?????? ?? ???
    const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      let enemySeen = null;
      while (inside(rr, cc)) {
        if (board[rr][cc] === 0) {
          rr += dr; cc += dc;
          continue;
        }
        if (sign(board[rr][cc]) === side) break;
        enemySeen = [rr, cc];
        // ?? ????????? ????? ???? ????????? ?????? ?????? ???????????
        let lr = rr + dr, lc = cc + dc;
        while (inside(lr, lc) && board[lr][lc] === 0) {
          const b2 = cloneBoard(board);
          // ??????: ??????? ?????, ????????? ?????
          b2[r][c] = 0;
          b2[enemySeen[0]][enemySeen[1]] = 0;
          b2[lr][lc] = v;
          const cont = continueCaptures(b2, lr, lc, v, new Set([enemySeen[0]+","+enemySeen[1]]));
          if (cont.length === 0) {
            results.push({ from: [r,c], to: [lr,lc], captures: [enemySeen], path: [[r,c],[lr,lc]] });
          } else {
            for (const m of cont) {
              results.push({ from: [r,c], to: m.to, captures: [enemySeen, ...m.captures], path: [[r,c], ...m.path.slice(1)] });
            }
          }
          lr += dr; lc += dc;
        }
        break; // ?????? ?????? ??????????? ?????? ????? ???? ?? ?????? ?????????
      }
    }
  } else {
    // ?????: ???? ?????? ? ?????
    const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [dr, dc] of dirs) {
      const mr = r + dr, mc = c + dc;
      const lr = r + 2*dr, lc = c + 2*dc;
      if (!inside(lr, lc)) continue;
      if (board[mr][mc] !== 0 && sign(board[mr][mc]) === -side && board[lr][lc] === 0) {
        const b2 = cloneBoard(board);
        b2[r][c] = 0;
        b2[mr][mc] = 0;
        let becameKing = false;
        let newVal = v;
        if ((side > 0 && lr === 0) || (side < 0 && lr === SIZE - 1)) {
          // ??????????? ? ????? ? ???????? ??? ? ??????????? ??? ?????
          newVal = side > 0 ? WHITE_K : BLACK_K;
          becameKing = true;
        }
        b2[lr][lc] = newVal;
        const cont = continueCaptures(b2, lr, lc, newVal, new Set([mr+","+mc]));
        if (cont.length === 0) {
          results.push({ from: [r,c], to: [lr,lc], captures: [[mr,mc]], path: [[r,c],[lr,lc]] });
        } else {
          for (const m of cont) {
            results.push({ from: [r,c], to: m.to, captures: [[mr,mc], ...m.captures], path: [[r,c], ...m.path.slice(1)] });
          }
        }
      }
    }
  }

  return results;
}

function continueCaptures(board, r, c, v, capturedSet) {
  const side = sign(v);
  const res = [];
  if (isKing(v)) {
    const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      let enemyPos = null;
      while (inside(rr, cc)) {
        if (board[rr][cc] === 0) { rr += dr; cc += dc; continue; }
        if (sign(board[rr][cc]) === side) break;
        const key = rr+","+cc;
        if (capturedSet.has(key)) break; // ?????? ???? ?? ?? ????? ??????
        enemyPos = [rr, cc];
        let lr = rr + dr, lc = cc + dc;
        while (inside(lr, lc) && board[lr][lc] === 0) {
          const b2 = cloneBoard(board);
          b2[r][c] = 0;
          b2[enemyPos[0]][enemyPos[1]] = 0;
          b2[lr][lc] = v;
          const newSet = new Set(capturedSet);
          newSet.add(key);
          const tail = continueCaptures(b2, lr, lc, v, newSet);
          if (tail.length === 0) {
            res.push({ from: [r,c], to: [lr,lc], captures: [enemyPos], path: [[r,c],[lr,lc]] });
          } else {
            for (const m of tail) {
              res.push({ from: [r,c], to: m.to, captures: [enemyPos, ...m.captures], path: [[r,c], ...m.path.slice(1)] });
            }
          }
          lr += dr; lc += dc;
        }
        break;
      }
    }
  } else {
    const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [dr, dc] of dirs) {
      const mr = r + dr, mc = c + dc;
      const lr = r + 2*dr, lc = c + 2*dc;
      if (!inside(lr, lc)) continue;
      if (board[mr][mc] !== 0 && sign(board[mr][mc]) === -side && board[lr][lc] === 0) {
        const key = mr+","+mc;
        if (capturedSet.has(key)) continue;
        const b2 = cloneBoard(board);
        b2[r][c] = 0;
        b2[mr][mc] = 0;
        let newVal = v;
        if ((side > 0 && lr === 0) || (side < 0 && lr === SIZE - 1)) {
          newVal = side > 0 ? WHITE_K : BLACK_K;
        }
        b2[lr][lc] = newVal;
        const newSet = new Set(capturedSet);
        newSet.add(key);
        const tail = continueCaptures(b2, lr, lc, newVal, newSet);
        if (tail.length === 0) {
          res.push({ from: [r,c], to: [lr,lc], captures: [[mr,mc]], path: [[r,c],[lr,lc]] });
        } else {
          for (const m of tail) {
            res.push({ from: [r,c], to: m.to, captures: [[mr,mc], ...m.captures], path: [[r,c], ...m.path.slice(1)] });
          }
        }
      }
    }
  }
  return res;
}

function applyMove(board, move) {
  const b = cloneBoard(board);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const v = b[fr][fc];
  b[fr][fc] = 0;
  for (const [cr, cc] of (move.captures || [])) b[cr][cc] = 0;
  let nv = v;
  if (!isKing(v)) {
    if ((v === WHITE && tr === 0) || (v === BLACK && tr === SIZE - 1)) nv = v > 0 ? WHITE_K : BLACK_K;
  }
  b[tr][tc] = nv;
  return b;
}

function evaluate(board) {
  // ??????? ?????????: ???????? + ???????????
  let score = 0;
  let whiteMoves = 0, blackMoves = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c];
      if (v === 0) continue;
      const abs = Math.abs(v);
      const val = abs === 2 ? 3.5 : 1.0;
      score += (v > 0 ? val : -val);
    }
  }
  // ???????????
  whiteMoves = getAllMoves(board, 1).length;
  blackMoves = getAllMoves(board, -1).length;
  score += 0.05 * (whiteMoves - blackMoves);
  return score;
}

function isTerminal(board) {
  const wm = getAllMoves(board, 1);
  const bm = getAllMoves(board, -1);
  if (wm.length === 0) return { over: true, winner: bm.length === 0 ? 0 : -1 };
  if (bm.length === 0) return { over: true, winner: 1 };
  return { over: false, winner: 0 };
}

function orderMoves(moves) {
  // ??????? ???, ????? ??????? ????, ????? ??????
  return moves.slice().sort((a, b) => (b.captures.length - a.captures.length) || (b.path.length - a.path.length));
}

function minimax(board, depth, alpha, beta, side) {
  const term = isTerminal(board);
  if (depth === 0 || term.over) {
    const val = evaluate(board);
    return { score: val, move: null };
  }
  const moves = orderMoves(getAllMoves(board, side));
  if (moves.length === 0) {
    const val = evaluate(board);
    return { score: val, move: null };
  }
  let bestMove = null;
  if (side > 0) {
    let best = -Infinity;
    for (const m of moves) {
      const b2 = applyMove(board, m);
      const { score } = minimax(b2, depth - 1, alpha, beta, -1);
      if (score > best) { best = score; bestMove = m; }
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return { score: best, move: bestMove };
  } else {
    let best = Infinity;
    for (const m of moves) {
      const b2 = applyMove(board, m);
      const { score } = minimax(b2, depth - 1, alpha, beta, 1);
      if (score < best) { best = score; bestMove = m; }
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return { score: best, move: bestMove };
  }
}

// UI
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const aiSideSel = document.getElementById('aiSide');
const newGameBtn = document.getElementById('newGameBtn');
const depthInput = document.getElementById('depth');
const depthLabel = document.getElementById('depthLabel');

let game = {
  board: startPosition(),
  side: 1, // 1 ????? ????? ???????
  selected: null,
  legalForSelected: [],
  aiSide: -1, // ?? ????????? ?? ?? ??????
  depth: 3,
  over: false,
  winner: 0,
};

a iSideSel.value = 'black';

depthLabel.textContent = String(game.depth);

function draw() {
  // ????
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const dark = (r + c) % 2 === 1;
      ctx.fillStyle = dark ? DARK : LIGHT;
      ctx.fillRect(c * CELL_PX, r * CELL_PX, CELL_PX, CELL_PX);
    }
  }

  // ????????? ?????? ? ?????
  if (game.selected) {
    const [sr, sc] = game.selected;
    ctx.fillStyle = HILIGHT + '55';
    ctx.fillRect(sc * CELL_PX, sr * CELL_PX, CELL_PX, CELL_PX);
    for (const m of game.legalForSelected) {
      const [tr, tc] = m.to;
      ctx.beginPath();
      ctx.arc(tc * CELL_PX + CELL_PX/2, tr * CELL_PX + CELL_PX/2, 12, 0, Math.PI*2);
      ctx.fillStyle = (m.captures.length ? CAPTURE : TARGET);
      ctx.fill();
    }
  }

  // ??????
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = game.board[r][c];
      if (v === 0) continue;
      const isW = isWhite(v);
      ctx.beginPath();
      ctx.arc(c * CELL_PX + CELL_PX/2, r * CELL_PX + CELL_PX/2, 28, 0, Math.PI*2);
      ctx.fillStyle = isW ? '#f8fafc' : '#0f172a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isW ? '#cbd5e1' : '#334155';
      ctx.stroke();
      if (isKing(v)) {
        ctx.beginPath();
        ctx.arc(c * CELL_PX + CELL_PX/2, r * CELL_PX + CELL_PX/2, 18, 0, Math.PI*2);
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }

  // ??????
  if (game.over) {
    statusEl.textContent = game.winner === 0 ? '?????' : (game.winner > 0 ? '?????? ?????' : '?????? ??????');
  } else {
    statusEl.textContent = game.side > 0 ? '??? ?????' : '??? ??????';
  }
}

draw();

function cellFromMouse(evt) {
  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  const c = Math.floor(x / CELL_PX);
  const r = Math.floor(y / CELL_PX);
  return [r, c];
}

function sameCell(a, b) { return a && b && a[0] === b[0] && a[1] === b[1]; }

function allMovesForSide() { return getAllMoves(game.board, game.side); }

function legalMovesForPiece(r, c) {
  const all = allMovesForSide();
  return all.filter(m => m.from[0] === r && m.from[1] === c);
}

function doMove(m) {
  game.board = applyMove(game.board, m);
  const term = isTerminal(game.board);
  if (term.over) {
    game.over = true;
    game.winner = term.winner;
  } else {
    game.side *= -1;
  }
  game.selected = null;
  game.legalForSelected = [];
  draw();
}

canvas.addEventListener('click', (evt) => {
  if (game.over) return;
  if (game.aiSide === game.side) return; // ???? ??
  const [r, c] = cellFromMouse(evt);
  if (!inside(r, c)) return;
  const v = game.board[r][c];
  if (v !== 0 && sign(v) === game.side) {
    // ??????? ???? ??????
    const moves = legalMovesForPiece(r, c);
    game.selected = [r, c];
    game.legalForSelected = moves;
    draw();
  } else if (game.selected) {
    // ????????, ???? ?? ??? ? ??? ??????
    const found = game.legalForSelected.find(m => m.to[0] === r && m.to[1] === c);
    if (found) {
      doMove(found);
      maybeAIMove();
    }
  }
});

async function maybeAIMove() {
  if (game.over) return;
  if (game.aiSide !== game.side) return;
  // ????????? ???????? ??? UX
  await new Promise(r => setTimeout(r, 150));
  const { move } = minimax(game.board, game.depth, -Infinity, Infinity, game.side);
  if (!move) {
    // ??? ?????
    game.over = true;
    game.winner = -game.side;
    draw();
    return;
  }
  doMove(move);
  // ???? ?? ????? ?? ??? ???????
  if (!game.over) maybeAIMove();
}

newGameBtn.addEventListener('click', () => {
  game.board = startPosition();
  game.side = 1;
  game.over = false;
  game.winner = 0;
  game.selected = null;
  game.legalForSelected = [];
  draw();
  if (game.aiSide === 1) maybeAIMove();
});

a iSideSel.addEventListener('change', () => {
  const v = aiSideSel.value;
  if (v === 'white') game.aiSide = 1; else if (v === 'black') game.aiSide = -1; else game.aiSide = 0;
  if (!game.over) maybeAIMove();
});

 depthInput.addEventListener('input', () => {
  game.depth = parseInt(depthInput.value, 10);
  depthLabel.textContent = String(game.depth);
});

// ?????? ????-????, ???? ?? ?? ?????
if (game.aiSide === 1) maybeAIMove();
