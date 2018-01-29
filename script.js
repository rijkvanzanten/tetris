import pieces from './pieces.js';

const rows = 20;
const columns = 10;
const tileSize = 24;
const startLevel = 1;
const board = createEmptyBoard(rows, columns);

const canvas = document.getElementById('board');
const context = canvas.getContext('2d');

const defaultState = {
  linesCompleted: 0,
  piece: null,
  gameOver: false,
  paused: false,
  countdown: 0,
  prevLoop: null,
  get level() {
    const { linesCompleted } = this;
    if (linesCompleted <= 0) return 1;
    if (linesCompleted >= 91) return 10;

    return 1 + ((linesCompleted - 1) / 10);
  },
};

let state = defaultState;

class Piece {
  constructor({ shapes, color }) {
    this.shapeIndex = 0;
    this.shapes = shapes;
    this.currentShape = shapes[this.shapeIndex];
    this.color = color;

    this.x = 6;
    this.y = -2;
  }

  _fill(color) {
    const { fillStyle } = context;
    context.fillStyle = color;

    this.currentShape.forEach((row, y) => {
      row.forEach((column, x) => {
        if (Boolean(column)) {
          drawSquare(this.x + x, this.y + y);
        }
      });
    });

    context.fillStyle = fillStyle;
  }

  _collides(dx, dy, shape) {
    return shape.some((row, y) =>
      row.some((column, x) => {
        if (Boolean(column) === false) return false;

        const newX = this.x + x + dx;
        const newY = this.y + y + dy;

        if (newY < 0) return false;

        if (newY >= rows || newX < 0 || newX >= columns) return true;
        if (board[newY][newX]) return true;
      })
    );
  }

  draw() {
    this._fill(this.color);
  }

  undraw() {
    this._fill('white');
  }

  rotate() {
    const nextShape = this.shapes[(this.shapeIndex + 1) % this.shapes.length];
    let nudge = 0;

    if (this._collides(0, 0, nextShape)) {
      nudge = (this.x > (columns / 2)) ? -1 : 1;
    }

    if (this._collides(nudge, 0, nextShape) === false) {
      this.undraw();
      this.x += nudge;
      this.shapeIndex = (this.shapeIndex + 1) % this.shapes.length;
      this.currentShape = this.shapes[this.shapeIndex];
      this.draw();
    }
  }

  down() {
    if (this._collides(0, 1, this.currentShape)) {
      this.lock();
      state.piece = newPiece();
      return true;
    } else {
      this.undraw();
      this.y++;
      this.draw();
      return false;
    }
  }

  right() {
    if (this._collides(1, 0, this.currentShape) === false) {
      this.undraw();
      this.x++;
      this.draw();
    }
  }

  left() {
    if (this._collides(-1, 0, this.currentShape) === false) {
      this.undraw();
      this.x--;
      this.draw();
    }
  }

  drop() {
    while(this.down() === false);
  }

  lock() {
    this.currentShape.forEach((row, y) => {
      row.forEach((column, x) => {
        if (!column) return;

        if (this.y + y < 0) return gameOver()

        board[this.y + y][this.x + x] = this.color;
      });
    });

    board
      .map((row, y) => {
        if(row.every((column) => Boolean(column) === true)) {
          return y;
        }
      })
      .filter(val => val !== undefined)
      .forEach(line => {
        for (let x = line; x > 1; x--) {
          board[x] = board[x].map((_, i) => board[x - 1][i]);
        }

        state.linesCompleted++;
      });

    drawBoard();
  }
}

start();


/**
 * Start the game.
 *   - Adds button listeners to window
 *   - Resets the state
 */
function start() {
  window.addEventListener('keydown', mapButtonInput, {
    passive: true,
    useCapture: false
  });

  canvas.width = columns * tileSize;
  canvas.height = rows * tileSize;

  drawBoard();
  state = defaultState;

  loop(true);
}

/**
 * Main game loop
 *
 * Will run as long as state.gameOver is false
 */
function loop(first = false) {
  if (state.gameOver) return;
  if (state.paused) return;

  if (first === true) {
    state.prevLoop = Date.now();
    state.piece = newPiece();
  }

  const now = Date.now();
  const delta = now - state.prevLoop;

  state.prevLoop = now;
  state.countdown -= delta;

  if (state.countdown <= 0) {
    state.countdown = 50 * (11 - state.level);
    state.piece.down();
  }

  requestAnimationFrame(loop);
}

function gameOver() {
  state.gameOver = true;
  alert('Game over!');
  window.removeEventListener('keydown', mapButtonInput);
}

/**
 * Maps button input to piece modifiers
 */
function mapButtonInput({ key }) {
  const { piece } = state;

  switch (key) {
    case 'ArrowUp': return piece.rotate();
    case 'ArrowDown': return piece.drop();
    case 'ArrowRight': return piece.right();
    case 'ArrowLeft': return piece.left();
  }
}

/**
 * Creates array of arrays for each row and column
 *  respectively. Each field on the board is set to false
 *
 * @param {number} rows The amount of rows to create
 * @param {number} columns The amount of columns to create
 * @returns {array} Array of arrays of arrays containing all false
 *
 * @example
 * var board = createEmptyBoard(20, 10);
 * board[5][8]; // => false
 */
function createEmptyBoard(rows, columns) {
  var board = [];

  for (var i = 0; i < rows; i++) {
    board[i] = [];
    for (var x = 0; x < columns; x++) {
      board[i][x] = false;
    }
  }

  return board;
}

function newPiece() {
  const rand = Math.floor(Math.random() * pieces.length);
  return new Piece(pieces[rand]);
}

/**
 * Draws a square on the provided canvas
 * @param {number} x The X position of the square
 * @param {number} y The Y position of the square
 */
function drawSquare(x, y) {
  const { strokeStyle } = context;

  context.fillRect(
    x * tileSize,
    y * tileSize,
    tileSize,
    tileSize
  );

  context.strokeStyle = '#555';

  context.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);

  context.strokeStyle = strokeStyle;
}

/**
 * Draw the provided board to the provided context
 * @param {array} board The gameboard to draw
 * @param {object} context The canvas context to draw to
 */
function drawBoard() {
  const { fillStyle } = context;

  board.forEach((row, y) => {
    row.forEach((column, x) => {
      context.fillStyle = board[y][x] || 'white';
      drawSquare(x, y);
    });
  });

  context.fillStyle = fillStyle;
}

