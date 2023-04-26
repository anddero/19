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

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

class AsyncExecutor {
    constructor() {
        this.running = false;
    }
    stop() {
        this.running = false;
    }
    async start() {
        this.running = true;
        while (this.running) {
            this.singleJobRunImpl();
            await wait(200);
        }
    }
    togglePause() {
        if (this.running) {
            this.stop();
        } else {
            this.start();
        }
    }
    singleJobRunImpl() {
        console.error('AsyncExecutor singleJobRunImpl not implemented');
    }
}

class AsyncJobExecutor extends AsyncExecutor {
    constructor() {
        super();
        this.jobQueue = [];
    }
    schedule(job) {
        this.jobQueue.push(job);
    }
    singleJobRunImpl() {
        if (this.jobQueue.length > 0) this.jobQueue.shift()()
    }
}

class AsyncRepeatingExecutor extends AsyncExecutor {
    constructor(job) {
        super();
        this.job = job;
        this.running = false;
    }
    singleJobRunImpl() {
        this.job();
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
    areMatchingSquares(i1, i2) {
        if (i1 === i2) {
            console.error("i1 === i2", i1, i2, this);
            return false;
        }
        if (i1 > i2) {
            console.error("Expected i1 < i2", i1, i2, this);
            let tmp = i2;
            i2 = i1;
            i1 = tmp;
        }
        const sq1 = this.squares[i1];
        const sq2 = this.squares[i2];
        if (sq1.state === SquareStatus.USED || sq2.state === SquareStatus.USED) return false;
        if (sq1.value + sq2.value !== 10 && sq1.value !== sq2.value) return false;//console.error("Invalid selection made, square values need to add up to 10 or be equal", sq1, sq2, indexes, this.squares);
        if (!this.areNear(i1, i2)) return false;// console.error("Invalid selection made, squares must be consecutive", sq1, sq2, indexes, this.squares);
        return true;
    }
    useSelectedSquares() {
        let indexes = this.getSelectedSquaresIndexes();
        if (indexes.length > 2) console.error("Shouldn't be possible to have more than 2 squares selected, invalid state", indexes, this.squares);
        else if (indexes.length < 2) console.error("Need to select exactly 2 squares to use them", indexes, this.squares);
        else {
            if (!this.areMatchingSquares(indexes[0], indexes[1])) {
                console.error("Not matching squares", indexes, this);
                return false;
            }
            this.squares[indexes[0]].state = SquareStatus.USED;
            this.squares[indexes[1]].state = SquareStatus.USED;
            return true;
        }
        console.error("Couldn't use up the squares", indexes, this.squares);
        return false;
    }
    canCopyUnusedSquares() {
        let indexes = findAll(this.squares, (sq) => sq.state !== SquareStatus.USED);
        if (indexes.length === 0) {
//            console.error("Nothing to copy", this.squares);
            return false;
        }
        return true;
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
    getSquareIndexById(id) {
        for (let i = 0; i < this.squares.length; ++i) {
            if (this.squares[i].id === id) return i;
        }
        console.error('Square with given ID does not exist', id, this.squares);
        return null;
    }
    getRowIndexBySquareIndex(i) {
        return Math.trunc(i / 9);
    }
    getRowIndexBySquareId(id) {
        let squareIndex = this.getSquareIndexById(id);
        return this.getRowIndexBySquareIndex(squareIndex);
    }
    canRemoveRow(rowIndex) {
        if (rowIndex < 0 || (rowIndex + 2) * 9 >= this.squares.length) {
//            console.error('Not allowed to remove a row that is one of the last ones or negative', rowIndex, this.squares);
            return false;
        }
        let indices = [];
        for (let i = rowIndex * 9; i < (rowIndex + 1) * 9; ++i) {
            indices.push(i);
        }
        let countUsed = count(indices, (i) => this.isUsed(i));
        if (countUsed < 9) {
//            console.error('Cannot hide row with an unused square', countUsed, rowIndex, this.squares);
            return false;
        }
        return true;
    }
    canRemoveRowBySquareIndex(i) {
        return this.canRemoveRow(this.getRowIndexBySquareIndex(i));
    }
    removeUsedRowBySquareId(id) {
//        console.log('removeUsedRowBySquareId', id, this);
        const rowIndex = this.getRowIndexBySquareId(id);
        if (!this.canRemoveRow(rowIndex)) {
            console.error('Cannot remove this row', id, rowIndex, this.squares);
            return false;
        }
        this.squares.splice(rowIndex * 9, 9);
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
            let prevStateHasRow = prevState.squares.length > firstSqIndex;
            let newStateHasRow = newState.squares.length > firstSqIndex;
            if (prevStateHasRow) {
                if (newStateHasRow) {
                    let prevSq = prevState.squares[firstSqIndex];
                    let newSq = newState.squares[firstSqIndex];
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
//        console.log('calcStateChangeEvents', prevState, newState);
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
//        console.log('calcEvents', prevState, newState);
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
//        console.log('queueUpdates', squares);
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
        this.botToggle = () => console.error("No bot added");
        const botEl = document.getElementById('toggle-bot-button');
        botEl.onclick = () => this.botToggle();
    }
    addBot(toggleCallback) {
        this.botToggle = toggleCallback;
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
        /*sq.addEventListener('transitionend', () => {
          sq.classList.remove('fade-in');
        });*/
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
        this.asyncExe = new AsyncJobExecutor();
        this.asyncExe.start();
        this.dom = new GameViewDOM(() => this.asyncExe.togglePause(), () => this.copyUnusedSquares());
        this.init();
    }
    queueUpdates() {
//        console.log('GameView::queueUpdates', this);
        const count = this.eventQueue.queueUpdates(this.game.squares);
        for (let i = 0; i < count; ++i) {
            this.asyncExe.schedule(() => this.renderSingleUpdate());
        }
    }
    onClick(id) {
        if (this.game.getSquareById(id).state === SquareStatus.USED) {
            if (this.game.removeUsedRowBySquareId(id)) {
                this.queueUpdates();
            }
            return;
        }
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
            this.dom.updateSquare(event.square.id, event.square.cssClass);
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

// BOT

class Bot {
    constructor(gameView) {
        this.gameView = gameView;
        this.asyncExe = new AsyncRepeatingExecutor(() => this.nextAction());
        this.asyncExe.start();
        this.gameView.dom.addBot(() => this.asyncExe.togglePause());
        this.actionCount = 0;
    }
    nextAction() {
        if (this.gameView.eventQueue.eventQueue.length > 100) {
            console.log('Bot waiting due for DOM updates');
            return;
        }
        if (this.actionCount % 100 === 0) {
            this.logStats();
        }
        ++this.actionCount;
        if (this.removeUsedRow()) return;
        if (this.matchSquares()) return;
        if (this.copyUnusedSquares()) return;
        console.log('Stopping bot due to no possible actions to take.');
        this.asyncExe.stop();
    }
    removeUsedRow() {
        const squares = this.gameView.game.squares;
        for (let i = 0; i < squares.length; i += 9) {
            if (this.gameView.game.canRemoveRowBySquareIndex(i)) {
                this.gameView.onClick(squares[i].id);
                return true;
            }
        }
        return false;
    }
    matchSquares() {
        const squares = this.gameView.game.squares;
        for (let i1 = 0; i1 < squares.length; ++i1) {
            for (let i2 = i1 + 1; i2 < squares.length; ++i2) {
                if (this.gameView.game.areMatchingSquares(i1, i2)) {
//                    if (Math.random() < 0.01) continue;
                    this.gameView.onClick(squares[i1].id);
                    this.gameView.onClick(squares[i2].id);
                    return true;
                }
            }
        }
        return false;
    }
    copyUnusedSquares() {
        if (this.gameView.game.canCopyUnusedSquares()) {
            this.gameView.copyUnusedSquares();
            return true;
        }
        return false;
    }
    logStats() {
        const squares = this.gameView.game.squares;
        let counts = [];
        let used = count(squares, (sq) => sq.state === SquareStatus.USED);
        for (let i = 1; i <= 9; ++i) {
            let c = count(squares, (sq) => sq.value === i);
            counts.push(i+'='+c+'('+(c/squares.length*100).toFixed(0)+'%)');
        }
        console.log('Stats', this.actionCount, squares.length, used + '(' + (used/squares.length*100).toFixed(0)+'%)', ...counts);
    }
}

const gameView = new GameView();
const bot = new Bot(gameView);
