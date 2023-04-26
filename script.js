// UTIL

function map(arr, mapper) {
    let newArr = [];
    for (let i = 0; i < arr.length; ++i) {
        let newEl = mapper(arr[i]);
        newArr.push(newEl);
    }
    return newArr;
}

function count(arr, predicate) {
    let c = 0;
    for (let i = 0; i < arr.length; ++i) {
        if (predicate(arr[i]) === true) ++c;
    }
    return c;
}

function findAll(arr, predicate) {
    let indexes = [];
    for (let i = 0; i < arr.length; ++i) {
        if (predicate(arr[i]) === true) indexes.push(i);
    }
    return indexes;
}

class AsyncJobExecutor {
    constructor() {
        this.jobQueue = [];
        this.running = false;
    }
    schedule(job) {
        this.jobQueue.push(job);
    }
    wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    stop() {
        this.running = false;
    }
    async start() {
        this.running = true;
        while (this.running) {
            if (this.jobQueue.length > 0) this.jobQueue.shift()()
            await this.wait(100);
        }
    }
}

// GAME BACKEND LOGICAL STATE

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
    leftIndex(index) {
        return index - 1;
    }
    rightIndex(index) {
        return index + 1;
    }
    upIndex(index) {
        return index - 9;
    }
    downIndex(index) {
        return index + 9;
    }
    getSquareByIndex(index) {
        if (index < 0 || index >= this.squares.length) return null;
        return this.squares[index];
    }
    left(index) {
        return getSquareByIndex(leftIndex(index));
    }
    right(index) {
        return getSquareByIndex(rightIndex(index));
    }
    up(index) {
        return getSquareByIndex(upIndex(index));
    }
    down(index) {
        return getSquareByIndex(downIndex(index));
    }
    getSquareById(id) {
        return this.squares.find(sq => sq.id === id);
    }
    isUsed(i) {
        return this.squares[i].state === SquareStatus.USED;
    }
    areNearH(a, b) {
        if (a >= b) console.error("Expected a < b", a, b, this.squares);
        for (let i = a + 1; i <= b; ++i) {
            if (!this.isUsed(i)) return i === b;
        }
        return false;
    }
    areNearV(a, b) {
        if (a >= b) console.error("Expected a < b", a, b, this.squares);
        for (let i = a + 9; i <= b; i += 9) {
            if (!this.isUsed(i)) return i === b;
        }
        return false;
    }
    areNear(a, b) {
        if (a >= b) console.error("Expected a < b", a, b, this.squares);
        return this.areNearH(a, b) || this.areNearV(a, b)
    }
    init() {
        if (this.squares.length > 0) {
            console.error('Game state is already initialized', this.squares);
            return false;
        }
        for (let i = 1; i <= 9; ++i) {
            this.addSquare(i);
        }
        for (let i = 1; i <= 9; ++i) {
            this.addSquare(1);
            this.addSquare(i);
        }
        return true;
    }
    toggleSelection(id) {
        let sq = this.getSquareById(id);
        if (sq.state == SquareStatus.ACTIVE) {
            let selectedCount = this.countSelectedSquares();
            if (selectedCount > 2) console.error("Shouldn't be possible to have more than 2 squares selected, invalid state", this.squares);
            else if (selectedCount === 2) console.error("Already 2 squares selected", this.squares);
            else {
                sq.state = SquareStatus.SELECTED;
                return true;
            }
        } else if (sq.state == SquareStatus.SELECTED) {
            sq.state = SquareStatus.ACTIVE;
            return true;
        }
        console.error("Cannot select this square", id, this.squares);
        return false;
    }
    getSelectedSquaresIndexes() {
        return findAll(this.squares, (sq) => sq.state == SquareStatus.SELECTED);
    }
    countSelectedSquares() {
        return count(this.squares, (sq) => sq.state == SquareStatus.SELECTED);
    }
    useSelectedSquares() {
        let indexes = this.getSelectedSquaresIndexes();
        if (indexes.length > 2) console.error("Shouldn't be possible to have more than 2 squares selected, invalid state", indexes, this.squares);
        else if (indexes.length < 2) console.error("Need to select exactly 2 squares to use them", indexes, this.squares);
        else {
            const sq1 = this.squares[indexes[0]];
            const sq2 = this.squares[indexes[1]];
            if (sq1.value + sq2.value !== 10 && sq1.value !== sq2.value) console.error("Invalid selection made, square values need to add up to 10 or be equal", sq1, sq2, indexes, this.squares);
            else if (!this.areNear(indexes[0], indexes[1])) console.error("Invalid selection made, squares must be consecutive", sq1, sq2, indexes, this.squares);
            else {
                sq1.state = SquareStatus.USED;
                sq2.state = SquareStatus.USED;
                return true;
            }
        }
        console.error("Couldn't use up the squares", indexes, this.squares);
        return false;
    }
    copyUnusedSquares() {
        let indexes = findAll(this.squares, (sq) => sq.state !== SquareStatus.USED);
        if (indexes.length === 0) {
            console.error("Nothing to copy", this.squares);
            return false;
        }
        for (let i = 0; i < indexes.length; ++i) {
            this.addSquare(this.squares[indexes[i]].value);
        }
        return true;
    }
}

// GAME VIEW INTERMEDIATE STATE

const GameViewEventType = {
  HIDE_ROW: 'hide_row',
  UPDATE_SQUARE: 'update_square',
  ADD_SQUARE: 'add_square'
};

class GameViewEvent {
    constructor(type, index, square) {
        this.type = type;
        this.index = index;
        this.square = square;
    }
}

class GameViewStateSquare {
    constructor(id, value, cssClass) {
        this.id = id;
        this.value = value;
        this.cssClass = cssClass;
    }
    clone() {
        return new GameViewStateSquare(this.id, this.value, this.cssClass);
    }
    static fromSquare(square) {
        return new GameViewStateSquare(square.id, square.value, "sq-" + square.state);
    }
    isEqualTo(square) {
        return this.id === square.id && this.value === square.value && this.cssClass === square.cssClass;
    }
}

class GameViewState {
    constructor(squares) {
        this.squares = squares;
    }
    static fromSquares(squares) {
        return new GameViewState(map(squares, sq => GameViewStateSquare.fromSquare(sq)));
    }
    clone() {
        return new GameViewState(map(this.squares, sq => sq.clone()));
    }
    removeRow(rowIndex) {
        let cp = this.clone();
        cp.squares.splice(rowIndex * 9, 9);
        return [new GameViewEvent(GameViewEventType.HIDE_ROW, rowIndex, null), cp];
    }
    pushSquare(square) {
        let cp = this.clone();
        cp.squares.push(square.clone());
        return [new GameViewEvent(GameViewEventType.ADD_SQUARE, -1, square.clone()), cp];
    }
    updateSquare(index, square) {
        let cp = this.clone();
        cp.squares[index] = square.clone();
        return [new GameViewEvent(GameViewEventType.UPDATE_SQUARE, index, square.clone()), cp];
    }
    isEqualTo(state) {
        if (this.squares.length !== state.squares.length) return false;
        for (let i = 0; i < this.squares.length; ++i) {
            if (!this.squares[i].isEqualTo(state.squares[i])) return false;
        }
        return true;
    }
}

class GameViewEventQueue {
    constructor(squares) {
        this.latestState = new GameViewState([]);
        this.eventQueue = [];
        if (squares.length > 0) this.queueUpdates(squares);
    }

    findFirstRowRemoval(prevState, newState) {
        let rowIndex = 0;
        while (true) {
            let firstSqIndex = 9 * rowIndex;
            let prevStateHasRow = prevState.length > firstSqIndex;
            let newStateHasRow = newState.length > firstSqIndex;
            if (prevStateHasRow) {
                if (newStateHasRow) {
                    let prevSq = prevState[firstSqIndex];
                    let newSq = newState[firstSqIndex];
                    if (newSq.id > prevSq.id) return rowIndex;
                    else if (newSq.id < prevSq.id) console.error('New sq ID < prev sq ID', rowIndex, prevState, newState);
                } else {
                    console.error('Missing row from new state', rowIndex, prevState, newState);
                    return -1;
                }
            } else return -1;
            ++rowIndex;
        }
    }

    calcHideRowEvents(prevState, newState) {
        let hideRowEvents = [];
        while (true) {
            let rowToRemove = this.findFirstRowRemoval(prevState, newState);
            if (rowToRemove < 0) {
                return [hideRowEvents, prevState];
            }
            let event;
            [event, prevState] = prevState.removeRow(rowToRemove);
            hideRowEvents.push(event);
        }
    }

    calcStateChangeEvents(prevState, newState) {
        let stateChangeEvents = [];
        for (let i = 0; i < prevState.squares.length; ++i) {
            let prevSq = prevState.squares[i];
            let newSq = newState.squares[i];
            if (prevSq.id !== newSq.id || prevSq.value !== newSq.value) {
                console.error('Squares are different in ID or value', i, prevState, newState);
            }
            if (prevSq.cssClass !== newSq.cssClass) {
                let event;
                [event, prevState] = prevState.updateSquare(i, newSq);
                stateChangeEvents.push(event);
            }
        }
        return [stateChangeEvents, prevState];
    }

    calcSquareAddEvents(prevState, newState) {
        let squareAddEvents = [];
        for (let i = prevState.squares.length; i < newState.squares.length; ++i) {
            let event;
            [event, prevState] = prevState.pushSquare(newState.squares[i]);
            squareAddEvents.push(event);
        }
        return [squareAddEvents, prevState];
    }

    calcEvents(prevState, newState) {
        let hideRowEvents = [];
        [hideRowEvents, prevState] = this.calcHideRowEvents(prevState, newState);
        let stateChangeEvents = [];
        [stateChangeEvents, prevState] = this.calcStateChangeEvents(prevState, newState);
        let squareAddEvents = [];
        [squareAddEvents, prevState] = this.calcSquareAddEvents(prevState, newState);
        if (!newState.isEqualTo(prevState)) {
            console.error('Resulting states after transitions are not equal', prevState, newState);
        }
        return [hideRowEvents.concat(stateChangeEvents).concat(squareAddEvents), prevState];
    }

    queueUpdates(squares) {
        let newState = GameViewState.fromSquares(squares);
        let events = [];
        [events, newState] = this.calcEvents(this.latestState, newState);
        if (events.length === 0) console.error('Queued 0 events', this.latestState, newState, squares);
        this.latestState = newState;
        this.eventQueue = this.eventQueue.concat(events);
        return events.length;
    }

    takeNextEvent() {
        return this.eventQueue.shift();
    }
}

// GAME VIEW DOM

class GameViewDOM {
    constructor(pauseToggle, copyCallback) {
        this.gridEl = document.getElementById('grid-container');
        while (this.gridEl.childNodes.length > 0) {
            this.gridEl.firstChild.remove();
        }
        const pauseEl = document.getElementById('pause-button');
        pauseEl.onclick = pauseToggle;
        const copyEl = document.getElementById('copy-button');
        copyEl.onclick = copyCallback;
    }
    addRow() {
        const row = document.createElement('div');
        row.classList.add('grid-row');
        this.gridEl.appendChild(row);
    }
    lastRow() {
        let count = this.gridEl.childNodes.length;
        if (count === 0) {
            this.addRow();
            ++count;
        }
        let node = this.gridEl.childNodes[count - 1];
        if (node.childNodes.length < 9) return node;
        this.addRow();
        ++count;
        return this.gridEl.childNodes[count - 1];
    }
    addSquare(id, value, cssClass, onClick) {
        const sq = document.createElement('div');
        sq.id = id;
        sq.className = "grid-square " + cssClass;
        const text = document.createTextNode(value.toString());
        sq.appendChild(text);
        sq.onclick = onClick;
        const r = this.lastRow()
        r.appendChild(sq);
    }
    updateSquare(id, cssClass) {
        const sq = document.getElementById(id);
        sq.className = "grid-square " + cssClass;
    }
    hideRow(rowIndex) {
        this.gridEl.childNodes[rowIndex].remove();
    }
    check(squares) {
        let rowCount = this.gridEl.childNodes.length;
        if (rowCount * 9 < squares.length || (rowCount - 1) * 9 >= squares.length) {
            console.error('Invalid row count', rowCount, squares);
        }
        for (let row = 0; row < rowCount; ++row) {
            const rowEl = this.gridEl.childNodes[row];
            let colCount = rowEl.childNodes.length;
            let leftoverColCount = squares.length - row * 9;
            if (leftoverColCount >= 9 && colCount !== 9) {
                console.error('Expected 9 columns', row, colCount, leftoverColCount, squares);
            } else if (leftoverColCount < 9 && colCount !== leftoverColCount) {
                console.error('Not correct number of columns', row, colCount, leftoverColCount, squares);
            }
            for (let col = 0; col < colCount; ++col) {
                const sq = squares[row * 9 + col];
                const colEl = rowEl.childNodes[col];
                if (colEl.childNodes.length !== 1) {
                    console.error('Not exactly one child on square', row, col);
                }
                if (colEl.className !== 'grid-square ' + sq.cssClass) {
                    console.error('Invalid className on square', colEl.className, row, col, sq, squares);
                }
                if (colEl.firstChild.nodeValue !== sq.value.toString()) {
                    console.error('Invalid value', colEl.firstChild.nodeValue, row, col, sq, squares);
                }
                if (colEl.id !== sq.id.toString()) {
                    console.error('Invalid ID', colEl.id, row, col, sq, squares);
                }
            }
        }
    }
}

// GAME WITH ALL COMPONENTS

class GameView {
    constructor() {
        this.game = new Game();
        this.eventQueue = new GameViewEventQueue(this.game.squares);
        this.dom = new GameViewDOM(() => this.togglePause(), () => this.copyUnusedSquares());
        this.asyncExe = new AsyncJobExecutor();
        this.asyncExe.start();
    }
    togglePause() {
        if (this.asyncExe.running) {
            this.asyncExe.stop();
        } else {
            this.asyncExe.start();
        }
    }
    queueUpdates() {
        const count = this.eventQueue.queueUpdates(this.game.squares);
        for (let i = 0; i < count; ++i) {
            this.asyncExe.schedule(() => this.renderSingleUpdate());
        }
    }
    onClick(id) {
        if (this.game.toggleSelection(id)) {
            this.queueUpdates();
        }
        if (this.game.countSelectedSquares() >= 2 && this.game.useSelectedSquares()) {
            this.queueUpdates();
        }
    }
    copyUnusedSquares() {
        if (this.game.copyUnusedSquares()) {
            this.queueUpdates();
        }
    }
    init() {
        if (this.game.init()) {
            this.queueUpdates();
        }
    }
    renderSingleUpdate() {
        let event = this.eventQueue.takeNextEvent();
        if (event === undefined) {
            console.error("No event to take");
            return false;
        } else if (event.type === GameViewEventType.HIDE_ROW) {
            this.dom.hideRow(event.index);
        } else if (event.type === GameViewEventType.UPDATE_SQUARE) {
            this.dom.updateSquare(event.index, event.square.cssClass);
        } else if (event.type === GameViewEventType.ADD_SQUARE) {
            this.dom.addSquare(event.square.id, event.square.value, event.square.cssClass, () => this.onClick(event.square.id));
        } else {
            console.error("Unhandled event type", event);
            return false;
        }
        if (this.eventQueue.eventQueue.length === 0) {
            this.dom.check(this.eventQueue.latestState.squares);
            return false;
        }
        return true;
    }
    renderUpdates(count) {
        for (let i = 0; i < count; ++i) {
            if (!this.renderSingleUpdate()) break;
        }
    }
}

const gameView = new GameView();
gameView.init();
