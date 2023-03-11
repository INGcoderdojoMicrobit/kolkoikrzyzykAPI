"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get("/games", async (req, res) => {
    if (!req.userId)
        return res.status(401).send("Unauthorized");
    const games = await req.prisma.game.findMany({
        where: {
            status: "waiting"
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
        return res.status(401).send("Game create - Unauthorized");
    const avaliableGames = await req.prisma.game.findMany({
        where: {
            status: "waiting"
        }
    });
    if (avaliableGames.length > 0) {
        if (avaliableGames[0].user1 == req.userId)
            return res.status(401).send("Game create - game in waiting state...");
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
            status: "waiting"
        }
    });
    res.json(game);
});
// funkcja zwraca plansze o podany gameid i status gry
// robimy strefe kibica - kazdy zalogowany moze wyswietlic dowolna plansze
router.get("/board", async (req, res) => {
    if (!req.userId)
        return res.status(401).send("Unauthorized");
    if (!req.query.gameid)
        return res.status(401).send("Query board - ngid"); //nie podano ID gry
    const queryboard = await req.prisma.game.findUnique({
        where: {
            id: BigInt(req.query.gameid.toString())
        },
        select: {
            board: true,
            status: true
        }
    });
    res.json(queryboard);
});
// funkcja sprawdza czy moge wykonac ruch w grze gameid
router.get("/checknextmove", async (req, res) => {
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
            nextMove: true
        }
    });
    if (!queryboard)
        return res.status(401).send("Query board - gameid=" + `${req.query.gameid} not found`); //nie ma takiego ID gry
    if (queryboard.status != "playing")
        return res.status(401).send("Query board - gameid=" + `${req.query.gameid} not in playing status`); //gra nie jest w trybie "playing"
    if (queryboard.user1 != req.userId && queryboard.user2 != req.userId)
        return res.status(401).send("Query board - jestes tylko w strefie kibica"); //gra nie twoja
    res.json(queryboard.nextMove == req.userId ? true : false);
});
// funkcja sprawdza jaki jest mój symbol w grze gameid
router.get("/checkmysymbolingame", async (req, res) => {
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
            nextMove: true
        }
    });
    if (!queryboard)
        return res.status(401).send("Query board - gameid=" + `${req.query.gameid} not found`); //nie ma takiego ID gry
    //if (queryboard.status != "playing") return res.status(401).send("Query board - gameid=" + `${req.query.gameid} not in playing status`); gra nie jest w trybie "playing"
    if (queryboard.user1 != req.userId && queryboard.user2 != req.userId)
        return res.status(401).send("Query board - jestes tylko w strefie kibica"); //gra nie twoja
    if (queryboard.user1 == req.userId)
        res.json("X");
    else if (queryboard.user2 == req.userId)
        res.json("O");
    else
        return res.status(401).send("Query board - jestes tylko w strefie kibica"); //gra nie twoja
});
// funkcja ruchu w grze - wysyłamy:
// gameid=
// row=
// col=
// co powoduje wstawienie odpowiedniego symbolu na planszy
router.post("/move", async (req, res) => {
    if (!req.userId)
        return res.status(401).send("Unauthorized");
    if (!req.query.gameid)
        return res.status(401).send("Query board - ngid"); //nie podano ID gry
    if (!req.query.row)
        return res.status(401).send("Query board - nr"); //nie podano wiersza
    if (Number(req.query.row) < 0 || Number(req.query.row) > 2)
        return res.status(401).send("Query board - wr"); //zła wartość wiersza
    if (!req.query.col)
        return res.status(401).send("Query board - nc"); //nie podano kolumny
    if (Number(req.query.col) < 0 || Number(req.query.col) > 2)
        return res.status(401).send("Query board - wc"); //zła wartość kolumny
    const queryboard = await req.prisma.game.findUnique({
        where: {
            id: BigInt(req.query.gameid.toString())
        },
        select: {
            user1: true,
            user2: true,
            status: true,
            nextMove: true,
            board: true
        }
    });
    if (!queryboard)
        return res.status(401).send("Query board - gameid=" + `${req.query.gameid} not found`); //nie ma takiego ID gry
    else {
        if (queryboard.status != "playing")
            return res.status(401).send("Query board - gameid=" + `${req.query.gameid} not in playing status`); //gra nie jest w trybie "playing"
        if (queryboard.user1 != req.userId && queryboard.user2 != req.userId)
            return res.status(401).send("Query board - jestes tylko w strefie kibica"); //gra nie twoja
        if (queryboard.nextMove != req.userId)
            return res.status(401).send("Query board - to nie jest twój ruch"); //ruch przeciwnika
        /*
                      col
                  1     2     3
            1 [null, null, null]
        row  2 [null, null, null]
            3 [null, null, null]
        
        */
        console.log(queryboard.board);
        if (queryboard.board[Number(req.query.row)][Number(req.query.col)] != null)
            return res.status(401).send("Query board - błędny ruch"); //pole zajęte
        if (queryboard.user1 == req.userId) {
            //"X"
            queryboard.board[Number(req.query.row)][Number(req.query.col)] = "X";
        }
        else if (queryboard.user2 == req.userId) {
            //"O"
            queryboard.board[Number(req.query.row)][Number(req.query.col)] = "O";
        }
        console.log(queryboard.board);
        const game = await req.prisma.game.update({
            where: {
                id: BigInt(req.query.gameid.toString())
            },
            data: {
                nextMove: queryboard.nextMove == queryboard.user1 ? queryboard.user2 : queryboard.user1,
                board: queryboard.board
            }
        });
        res.json(queryboard.board);
    }
});
module.exports = router;
