const SquareStatus = {
  ACTIVE: 'active',
  USED: 'used',
  SELECTED: 'selected'
};

class Square {
    constructor(id, value) {
        this.id = id;
        this.state = SquareStatus.ACTIVE;
        this.value = value;
    }
}

class Game {
    constructor() {
        this.squares = [];
        this.idCounter = 0;
    }
    addSquare(value) {
        this.squares.push(new Square(this.idCounter, value));
        return this.idCounter++;
    }
}

class GameWithView {
    constructor() {
        this.game = new Game();
        this.gridEl = document.getElementById('grid-container');
    }
    addRowEl() {
        const row = document.createElement('div');
        row.classList.add('grid-row');
        this.gridEl.appendChild(row);
    }
    lastRow() {
        const count = this.gridEl.childNodes.length;
        return this.gridEl.childNodes[count - 1];
    }
    addSquare(n) {
        if (this.game.squares.length === 0 || this.lastRow().childNodes.length === 9) {
            this.addRowEl();
        }
        const id = this.game.addSquare(n);
        const sq = document.createElement('div');
        sq.id = id;
        sq.classList.add('grid-square');
        const text = document.createTextNode(n.toString());
        sq.appendChild(text);
        this.lastRow().appendChild(sq);
    }
    createInitialState() {
        for (let i = 1; i <= 9; ++i) {
            this.addSquare(i);
        }
        for (let i = 1; i <= 9; ++i) {
            this.addSquare(1);
            this.addSquare(i);
        }
    }
}

const gameWithView = new GameWithView();
gameWithView.createInitialState();
