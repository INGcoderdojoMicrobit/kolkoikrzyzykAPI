"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeComputerMove = exports.hasGameEnded = void 0;
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get("/games", async (req, res) => {
    if (!req.userId)
        return res.status(401).send("Unauthorized - nup");
    const games = await req.prisma.game.findMany({
        where: {
            AND: [
                { OR: [{ user1: BigInt(req.userId.toString()) }, { user2: BigInt(req.userId.toString()) }], },
                { OR: [{ status: "waiting" }, { status: "playing" }], }
            ]
        },
        select: {
            id: true,
            createdAt: true,
            user1: true,
            user2: true,
            status: true
        }
    });
    res.json(games);
});
// zakladamy, ze user1 jest "X" a user2 jest "O"
router.post("/game/create", async (req, res) => {
    if (!req.userId)
        return res.status(401).send("Unauthorized - nup");
    const avaliableGames = await req.prisma.game.findMany({
        where: {
            status: "waiting"
        }
    });
    if (avaliableGames.length > 0) {
        if (avaliableGames[0].user1 == req.userId)
            return res.status(400).send("You are already in a game");
        const game = await req.prisma.game.update({
            where: {
                id: avaliableGames[0].id
            },
            data: {
                user2: BigInt(req.userId.toString()),
                status: "playing",
                nextMove: BigInt(Math.random() > 0.5 ? avaliableGames[0].user1.toString() : req.userId.toString()) //losujemy kto rozpoczyna grę
            }
        });
        return res.json(game);
    }
    const game = await req.prisma.game.create({
        data: {
            user1: BigInt(req.userId.toString()),
            status: "waiting",
            board: {
                create: {
                    row1: ["", "", ""],
                    row2: ["", "", ""],
                    row3: ["", "", ""]
                }
            }
        },
        select: {
            id: true,
            createdAt: true,
            user1: true,
            user2: true,
            status: true,
            board: true,
            nextMove: true
        }
    });
    res.send(game);
});
// funkcja zwraca plansze o podany gameid i status gry
// robimy strefe kibica - kazdy zalogowany moze wyswietlic dowolna plansze
router.get("/board", async (req, res) => {
    if (!req.userId)
        return res.status(401).send("Unauthorized");
    if (!req.query.gameid)
        return res.status(400).send("Bad request");
    const queryboard = await req.prisma.game.findUnique({
        where: {
            id: BigInt(req.query.gameid.toString())
        },
        select: {
            board: true,
            status: true
        }
    });
    res.send(queryboard);
});
// funkcja sprawdza czy moge wykonac ruch w grze gameid
router.get("/checknextmove", async (req, res) => {
    if (!req.userId)
        return res.status(401).send("Unauthorized");
    if (!req.query.gameid)
        return res.status(400).send("Bad request");
    const queryboard = await req.prisma.game.findUnique({
        where: {
            id: BigInt(req.query.gameid.toString())
        },
        select: {
            user1: true,
            user2: true,
            status: true,
            nextMove: true
        }
    });
    if (!queryboard)
        return res.status(404).send("Game not found"); //nie ma takiego ID gry
    if (queryboard.status != "playing")
        return res.status(400).send("Game not in playing status");
    if (queryboard.user1 != req.userId && queryboard.user2 != req.userId)
        return res.status(403).send("You are not player in this game");
    res.json(queryboard.nextMove == req.userId ? true : false);
});
// funkcja sprawdza jaki jest mój symbol w grze gameid
router.get("/checkmysymbolingame", async (req, res) => {
    if (!req.userId)
        return res.status(401).send("Unauthorized");
    if (!req.query.gameid)
        return res.status(400).send("Bad request");
    const queryboard = await req.prisma.game.findUnique({
        where: {
            id: BigInt(req.query.gameid.toString())
        },
        select: {
            user1: true,
            user2: true,
            status: true,
            nextMove: true
        }
    });
    if (!queryboard)
        return res.status(404).send("Game not found"); //nie ma takiego ID gry
    if (queryboard.user1 != req.userId && queryboard.user2 != req.userId)
        return res.status(403).send("You are not player in this game");
    if (queryboard.user1 == req.userId)
        res.json("X");
    else if (queryboard.user2 == req.userId)
        res.json("O");
    else
        return res.status(500).send("Internal server error");
});
// funkcja ruchu w grze - wysyłamy:
// gameid=
// row=
// col=
// co powoduje wstawienie odpowiedniego symbolu na plansz
router.post("/move", async (req, res) => {
    if (!req.userId)
        return res.status(401).send("Unauthorized");
    if (!req.query.gameid)
        return res.status(400).send("Bad request");
    if (!req.query.row)
        return res.status(400).send("Bad request"); //nie podano wiersza
    if (Number(req.query.row) < 0 || Number(req.query.row) > 2)
        return res.status(400).send("Bad request"); //zła wartość wiersza
    if (!req.query.col)
        return res.status(400).send("Bad request"); //nie podano kolumny
    if (Number(req.query.col) < 0 || Number(req.query.col) > 2)
        return res.status(400).send("Bad request"); //zła wartość kolumny
    const queryboard = await req.prisma.game.findUnique({
        where: {
            id: BigInt(req.query.gameid.toString())
        },
        select: {
            user1: true,
            user2: true,
            status: true,
            nextMove: true,
            board: true,
            winner: true
        }
    });
    if (!queryboard)
        return res.status(404).send("Game not found"); //nie ma takiego ID gry
    if (queryboard.status != "playing")
        return res.status(401).send("Game not in playing status"); //gra nie w toku
    if (queryboard.user1 != req.userId && queryboard.user2 != req.userId)
        return res.status(403).send("You are not player in this game"); //nie jesteś graczem w tej grze
    if (queryboard.nextMove != req.userId)
        return res.status(401).send("Not your turn"); //nie jest twoja kolej
    /*
            row1: ['', '', '']
       row  row2: ['', '', '']
            row3: ['', '', '']
        
        */
    if (!queryboard.board)
        return res.status(401).send("Query board - brak planszy"); //brak planszy
    let row;
    if (Number(req.query.row) === 0)
        row = queryboard.board.row1;
    else if (Number(req.query.row) === 1)
        row = queryboard.board.row2;
    else if (Number(req.query.row) === 2)
        row = queryboard.board.row3;
    else
        return res.status(401).send("Query board - brak wiersza"); //brak wiersza
    if (row[Number(req.query.col)] != "")
        return res.status(401).send("Query board - pole zajęte"); //pole zajęte
    if (queryboard.user1 == req.userId)
        row[Number(req.query.col)] = "X";
    else if (queryboard.user2 == req.userId)
        row[Number(req.query.col)] = "O";
    const updateboard = await req.prisma.board.update({
        where: {
            id: queryboard.board.id
        },
        data: {
            row1: Number(req.query.row) === 0 ? row : queryboard.board.row1,
            row2: Number(req.query.row) === 1 ? row : queryboard.board.row2,
            row3: Number(req.query.row) === 2 ? row : queryboard.board.row3
        },
        select: {
            row1: true,
            row2: true,
            row3: true
        }
    });
    console.log(updateboard);
    let kolko = false;
    let krzyzyk = false;
    if (queryboard.board.row1[0] === "O" && queryboard.board.row1[1] === "O" && queryboard.board.row1[2] === "O") {
        kolko = true;
        console.log("pierwszy wiersz pełny O");
    }
    if (queryboard.board.row2[0] === "O" && queryboard.board.row2[1] === "O" && queryboard.board.row2[2] === "O") {
        kolko = true;
        console.log("drugi wiersz pełny O");
    }
    if (queryboard.board.row3[0] === "O" && queryboard.board.row3[1] === "O" && queryboard.board.row3[2] === "O") {
        kolko = true;
        console.log("trzeci wiersz pełny O");
    }
    if (queryboard.board.row1[0] === "O" && queryboard.board.row2[0] === "O" && queryboard.board.row3[0] === "O") {
        kolko = true;
        console.log("pierwsza kolumna pełna O");
    }
    if (queryboard.board.row1[1] === "O" && queryboard.board.row2[1] === "O" && queryboard.board.row3[1] === "O") {
        kolko = true;
        console.log("druga kolumna pełna O");
    }
    if (queryboard.board.row1[2] === "O" && queryboard.board.row2[2] === "O" && queryboard.board.row3[2] === "O") {
        kolko = true;
        console.log("trzecia kolumna pełna O");
    }
    if (queryboard.board.row1[0] === "O" && queryboard.board.row2[1] === "O" && queryboard.board.row3[2] === "O") {
        kolko = true;
        console.log("lewo w dol prawo pełna O");
    }
    if (queryboard.board.row1[2] === "O" && queryboard.board.row2[1] === "O" && queryboard.board.row3[0] === "O") {
        kolko = true;
        console.log("lewo w gore prawo pełna O");
    }
    // to samo sprawdzenie dla krzyzyka
    if (queryboard.board.row1[0] === "X" && queryboard.board.row1[1] === "X" && queryboard.board.row1[2] === "X") {
        krzyzyk = true;
        console.log("pierwszy wiersz pełny X");
    }
    if (queryboard.board.row2[0] === "X" && queryboard.board.row2[1] === "X" && queryboard.board.row2[2] === "X") {
        krzyzyk = true;
        console.log("drugi wiersz pełny X");
    }
    if (queryboard.board.row3[0] === "X" && queryboard.board.row3[1] === "X" && queryboard.board.row3[2] === "X") {
        krzyzyk = true;
        console.log("trzeci wiersz pełny X");
    }
    if (queryboard.board.row1[0] === "X" && queryboard.board.row2[0] === "X" && queryboard.board.row3[0] === "X") {
        krzyzyk = true;
        console.log("pierwsza kolumna pełna X");
    }
    if (queryboard.board.row1[1] === "X" && queryboard.board.row2[1] === "X" && queryboard.board.row3[1] === "X") {
        krzyzyk = true;
        console.log("druga kolumna pełna X");
    }
    if (queryboard.board.row1[2] === "X" && queryboard.board.row2[2] === "X" && queryboard.board.row3[2] === "X") {
        krzyzyk = true;
        console.log("trzecia kolumna pełna X");
    }
    if (queryboard.board.row1[0] === "X" && queryboard.board.row2[1] === "X" && queryboard.board.row3[2] === "X") {
        krzyzyk = true;
        console.log("lewo w dol prawo pełna X");
    }
    if (queryboard.board.row1[2] === "X" && queryboard.board.row2[1] === "X" && queryboard.board.row3[0] === "X") {
        krzyzyk = true;
        console.log("lewo w gore prawo pełna X");
    }
    let full = true;
    for (let y = 0; y < 3; y++) {
        if (queryboard.board.row1[y] === "")
            full = false;
        if (queryboard.board.row2[y] === "")
            full = false;
        if (queryboard.board.row3[y] === "")
            full = false;
    }
    if (full) {
        queryboard.status = "draw";
    }
    if (kolko || krzyzyk) {
        queryboard.status = "won";
    }
    if (kolko) {
        queryboard.winner = queryboard.user2;
    }
    if (krzyzyk) {
        queryboard.winner = queryboard.user1;
    }
    const gameupdate = await req.prisma.game.update({
        where: {
            id: BigInt(req.query.gameid.toString())
        },
        data: {
            nextMove: queryboard.nextMove == queryboard.user1 ? queryboard.user2 : queryboard.user1,
            status: queryboard.status,
            winner: queryboard.winner
        },
        select: {
            id: true,
            board: true,
            winner: true,
            user1: true,
            user2: true,
            createdAt: true,
            updatedAt: true,
            status: true
        }
    });
    console.log(gameupdate);
    res.json(gameupdate);
});
/**
 * Sprawdza, czy któryś gracz wygrał
 * @param row1:string[], row2:string[], row3:string[] - plansza gry
 */
function hasGameEnded(row1, row2, row3) {
    return checkDiagonals(row1, row2, row3) || checkRows(row1, row2, row3) || checkColumns(row1, row2, row3) || "";
}
exports.hasGameEnded = hasGameEnded;
function checkDiagonals(row1, row2, row3) {
    return (row1[0] === row2[1] && row2[1] === row3[2]) || (row1[2] === row2[1] && row2[1] === row3[0]) ? row2[1] : null;
}
function checkRows(row1, row2, row3) {
    for (let i = 0; i < 3; i++) {
        if (row1[i] === row2[i] && row2[i] === row3[i]) {
            return row1[i];
        }
    }
    return null;
}
function checkColumns(row1, row2, row3) {
    if (row1[0] === row1[1] && row1[1] === row1[2]) {
        return row1[0];
    }
    if (row2[0] === row2[1] && row2[1] === row2[2]) {
        return row2[0];
    }
    if (row3[0] === row3[1] && row3[1] === row3[2]) {
        return row3[0];
    }
    return null;
}
function convertRowToBoard(row1, row2, row3) {
    let board = [
        ["", "", ""],
        ["", "", ""],
        ["", "", ""]
    ];
    board[0][0] = row1[0];
    board[0][1] = row1[1];
    board[0][2] = row1[2];
    board[1][0] = row2[0];
    board[1][1] = row2[1];
    board[1][2] = row2[2];
    board[2][0] = row3[0];
    board[2][1] = row3[1];
    board[2][2] = row3[2];
    return board;
}
/**
 * Funkcja obliczająca ruch komputerowego gracza. Powinna zwrócić współrzędne, gdzie połozyć symbol.
 * @param {*[][]} board - tablica przechowująca zawartość planszy
 */
function computeComputerMove(board, player) {
    console.log("-- Szukam nowego ruchu --");
    // tworzymy wezel na podstawie aktualnego stanu planszy
    let node = new TreeNode(board, null);
    nodeCount = 0;
    node = generateNextMoves(node, player);
    console.log(`Wygenerowano ${nodeCount} możliwych stanów gry`);
    console.log(`Od korzenia wychodzi ${node.children.length} gałązek/liści`);
    console.dir(node, { depth: 4 });
    // szukamy następnego ruchu algorytmem Minimax
    const foundNode = minimax(node, true, 0);
    console.log(`====================`);
    console.log(`Minmax zwrócił: `);
    console.dir(foundNode, { depth: 3 });
    // zwracamy ruch ze znalezionego najlepszego wezla; jezeli takiego nie ma, to zwracamy pustą wartość
    return foundNode ? foundNode.move : null;
}
exports.computeComputerMove = computeComputerMove;
/**
 * Klasa pomocnicza do reprezentacji drzewa
 */
class TreeNode {
    board;
    move;
    children;
    value;
    constructor(board, move, value = 0) {
        this.board = board;
        this.move = move;
        this.children = [];
        this.value = value;
    }
    // ponizej znajduje sie część związana z generowaniem drzewa stanu gry
    addChild(node) {
        this.children.push(node);
    }
}
/**
 * Funkcja wyznaczająca
 * @param {*} node - wezel dla ktorego uruchamiamy algorytm
 * @param {*} shouldMax - true jesli liczymy wartosc max, false gdy min
 * @param {*} depth - głębokość rekursji
 */ /*
function minimax(node: TreeNode, shouldMax: Boolean, depth: number) {
 if (node.children.length === 0) {
   console.log(`Nie ma już dzieci - jest listek, głębokość ${depth} !`);
   // dojechalismy do liscia drzewa, wiec obliczamy jego wartosc
   if (depth === 0) {
     // jezeli nie bylo to wywolanie rekurencyjne, zwrocmy pusta wartosc
     return null;
   }
   // wykorzystamy funkcje sprawdzajaca zwyciezce gry do podania wartosci planszy
   
 //TODO POPRAWIĆ
 //TODO POPRAWIĆ
 //TODO POPRAWIĆ
 //TODO POPRAWIĆ
 //TODO POPRAWIĆ
 
   const whoWon = hasGameEnded(node.board[0], node.board[1], node.board[2]);
   //const whoWon = "";
   switch (whoWon) {
     case "X":
       return Number.NEGATIVE_INFINITY;
     case "O":
       return Number.POSITIVE_INFINITY;
     default:
       return 0;
   }
 }

 // zmienne pomocnicze do przechowania max lub min wartosci oraz odpowiadajacego jej wezla
 let foundNode = null;
 let value = shouldMax ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
 console.log(`Są dzieci - ${node.children.length} sztuk!`);
 // iterujmey po kolei po dzieciach wezla
 for (const child of node.children) {
   // wywolujemy rekursywnie minimax, aby poznac wartosc wezla
   const childValue = minimax(child, !shouldMax, depth++);

   if (!childValue) {
     return;
   }

   console.log(`Minmax wyliczył - ${childValue} !`);
   if (shouldMax) {
     // w tym przypadku maksymalizujemy
     if (childValue > value) {
       value = childValue;
       foundNode = child;
     }
   } else {
     // przypadek minimalizacji
     if (childValue < value) {
       value = childValue;
       foundNode = child;
     }
   }
 }

 if (depth > 0) {
   // jezeli jestesmy wewnatrz wywolania rekursywnego, przekazmy dalej wartosc
   return value;
 } else {
   console.log(`Wybrano ruch ${foundNode.move} o wartości ${value}`);
   // jezeli nie jestesmy w wywolaniu rekursywnym, zwrocmy wezel
   return foundNode;
 }
}*/
const minimax = (node, shouldMax, depth) => {
    if (node.children.length === 0) {
        //console.log(`Nie ma już dzieci - jest listek, głębokość ${depth} !`);
        if (depth === 0) {
            node.value = -99;
            return node;
        }
        //logika sprawdzenia czy na liściu jest wygrana, przergrana lub remis
        const whoWon = hasGameEnded(node.board[0], node.board[1], node.board[2]);
        switch (whoWon) {
            case "X":
                node.value = -1000;
                break;
            case "O":
                node.value = 1000;
                break;
            default:
                node.value = 0;
        }
        //console.log(`Wartość liścia ${node.value}`)
        return node;
    }
    let foundNode = node; // w teorii może być tak, że nie znajdziemy żadnego dziecka, więc zwracamy node
    let value = shouldMax ? -1000 : 1000;
    for (const child of node.children) {
        const childValue = minimax(child, !shouldMax, depth++).value;
        //if (childValue == -1000 || childValue == 1000 )
        //{
        //  console.log(`Wartość liścia ${childValue}`)
        //}
        if (childValue > value) {
            value = childValue;
            foundNode = child;
        }
        else {
            if (childValue < value) {
                value = childValue;
                foundNode = child;
            }
        }
    }
    return foundNode;
};
let nodeCount = 0;
const generateNextMoves = (node, player) => {
    const nextPlayer = player === "X" ? "O" : "X";
    const nextMoves = [];
    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            const board = JSON.parse(JSON.stringify(node.board));
            if (board[x][y] === "") {
                board[x][y] = player;
                nextMoves.push(new TreeNode(board, `${x},${y}`, 0));
            }
        }
    }
    for (const move of nextMoves) {
        //logika sprawdzenia czy wygraliśmy
        const whoWon = hasGameEnded(move.board[0], move.board[1], move.board[2]);
        if (whoWon == "X")
            move.value = 1000;
        if (whoWon == "O")
            move.value = -1000;
        if (whoWon == "")
            move.value = 0;
        node.children.push(move);
    }
    for (const move of node.children) {
        generateNextMoves(move, nextPlayer);
    }
    nodeCount++;
    return node;
};
// funkcja sugerująca kolejny ruch - wysyłamy:
// gameid=
// zwraca współrzędne ruchu proponowanego algorytmem minmax
router.get("/minmaxmove", async (req, res) => {
    if (!req.userId)
        return res.status(401).send("Unauthorized");
    if (!req.query.gameid)
        return res.status(401).send("Query board - ngid"); //nie podano ID gry
    const queryboard = await req.prisma.game.findUnique({
        where: {
            id: BigInt(req.query.gameid.toString())
        },
        select: {
            user1: true,
            user2: true,
            status: true,
            nextMove: true,
            board: true,
            winner: true
        }
    });
    if (!queryboard)
        return res.status(401).send("Query board - gameid=" + `${req.query.gameid} not found`); //nie ma takiego ID gry
    if (queryboard.status != "playing")
        return res.status(401).send("Query board - gameid=" + `${req.query.gameid} not in playing status`); //gra nie jest w trybie "playing"
    // kibice mile widziani
    //if (queryboard.user1 != req.userId && queryboard.user2 != req.userId)
    //  return res.status(401).send("Query board - jestes tylko w strefie kibica"); //gra nie twoja
    //if (queryboard.nextMove != req.userId) return res.status(401).send("Query board - to nie jest twój ruch"); //ruch przeciwnika
    /*
            row1: ['', '', '']
       row  row2: ['', '', '']
            row3: ['', '', '']
        
        */
    console.log(queryboard.board);
    if (!queryboard.board)
        return res.status(401).send("Query board - brak planszy"); //brak planszy
    let row;
    let symbolgracza = "";
    // wyznaczamy jaki symbol ma kolejny ruch
    if (queryboard.user1 == queryboard.nextMove)
        symbolgracza = "X";
    else if (queryboard.user2 == queryboard.nextMove)
        symbolgracza = "O";
    console.log("wyznaczamy ruch dla gracza " + `>${symbolgracza}<`);
    let kolko = false;
    let krzyzyk = false;
    /*
    if (queryboard.board.row1[0] === "O" && queryboard.board.row1[1] === "O" && queryboard.board.row1[2] === "O")
    {
      kolko = true;
    }
    if (queryboard.board.row2[0] === "O" && queryboard.board.row2[1] === "O" && queryboard.board.row2[2] === "O")
    {
      kolko = true;
    }
    if (queryboard.board.row3[0] === "O" && queryboard.board.row3[1] === "O" && queryboard.board.row3[2] === "O")
    {
      kolko = true;
    }
    if (queryboard.board.row1[0] === "O" && queryboard.board.row2[0] === "O" && queryboard.board.row3[0] === "O")
    {
      kolko = true;
    }
    if (queryboard.board.row1[1] === "O" && queryboard.board.row2[1] === "O" && queryboard.board.row3[1] === "O")
    {
      kolko = true;
    }
    if (queryboard.board.row1[2] === "O" && queryboard.board.row2[2] === "O" && queryboard.board.row3[2] === "O")
    {
      kolko = true;
    }
    if (queryboard.board.row1[0] === "O" && queryboard.board.row2[1] === "O" && queryboard.board.row3[2] === "O")
    {
      kolko = true;
    }
    if (queryboard.board.row1[2] === "O" && queryboard.board.row2[1] === "O" && queryboard.board.row3[0] === "O")
    {
      kolko = true;
    }
  
  // to samo sprawdzenie dla krzyzyka
    if (queryboard.board.row1[0] === "X" && queryboard.board.row1[1] === "X" && queryboard.board.row1[2] === "X")
    {
      krzyzyk = true;
    }
    if (queryboard.board.row2[0] === "X" && queryboard.board.row2[1] === "X" && queryboard.board.row2[2] === "X")
    {
      krzyzyk = true;
    }
    if (queryboard.board.row3[0] === "X" && queryboard.board.row3[1] === "X" && queryboard.board.row3[2] === "X")
    {
      krzyzyk = true;
    }
    if (queryboard.board.row1[0] === "X" && queryboard.board.row2[0] === "X" && queryboard.board.row3[0] === "X")
    {
      krzyzyk = true;
    }
    if (queryboard.board.row1[1] === "X" && queryboard.board.row2[1] === "X" && queryboard.board.row3[1] === "X")
    {
      krzyzyk = true;
    }
    if (queryboard.board.row1[2] === "X" && queryboard.board.row2[2] === "X" && queryboard.board.row3[2] === "X")
    {
      krzyzyk = true;
    }
    if (queryboard.board.row1[0] === "X" && queryboard.board.row2[1] === "X" && queryboard.board.row3[2] === "X")
    {
      krzyzyk = true;
    }
    if (queryboard.board.row1[2] === "X" && queryboard.board.row2[1] === "X" && queryboard.board.row3[0] === "X")
    {
      krzyzyk = true;
    }
  */
    //const node = new TreeNode(convertRowToBoard(queryboard.board.row1, queryboard.board.row2, queryboard.board.row3), "X");
    const jakiruch = computeComputerMove(convertRowToBoard(queryboard.board.row1, queryboard.board.row2, queryboard.board.row3), symbolgracza);
    //generateNextMoves(node, "X");
    const ktowygral = hasGameEnded(queryboard.board.row1, queryboard.board.row2, queryboard.board.row3);
    if (ktowygral === "O")
        kolko = true;
    else if (ktowygral === "X")
        krzyzyk = true;
    console.log("Czy koniec gry - czy ktoś wygrał?" + ktowygral + " !");
    if (kolko || krzyzyk) {
        queryboard.status = "won";
    }
    if (kolko) {
        queryboard.winner = queryboard.user2;
    }
    if (krzyzyk) {
        queryboard.winner = queryboard.user1;
    }
    let x1 = 0;
    let y1 = 0;
    console.log(queryboard);
    res.send({
        result: { row: jakiruch?.charAt(0), column: jakiruch?.charAt(2) }
    });
});
module.exports = router;
