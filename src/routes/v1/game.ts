import { Request, Response, Router } from "express";

const router = Router();

router.get("/games", async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Unauthorized");

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
router.post("/game/create", async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Game create - Unauthorized");

  const avaliableGames = await req.prisma.game.findMany({
    where: {
      status: "waiting"
    }
  });

  if (avaliableGames.length > 0) {
    if (avaliableGames[0].user1 == req.userId) return res.status(401).send("Game create - game in waiting state...");

    const game = await req.prisma.game.update({
      where: {
        id: avaliableGames[0].id
      },
      data: {
        user2: BigInt(req.userId.toString()),
        status: "playing",
        nextMove: BigInt(Math.random() > 0.5 ? avaliableGames[0].user1.toString() : req.userId.toString())
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
router.get("/board", async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  if (!req.query.gameid) return res.status(401).send("Query board - ngid"); //nie podano ID gry

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
router.get("/checknextmove", async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Unauthorized");
  if (!req.query.gameid) return res.status(401).send("Query board - ngid"); //nie podano ID gry

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

  if (!queryboard) return res.status(401).send("Query board - gameid=" + `${req.query.gameid} not found`); //nie ma takiego ID gry
  if (queryboard.status != "playing") return res.status(401).send("Query board - gameid=" + `${req.query.gameid} not in playing status`); //gra nie jest w trybie "playing"
  if (queryboard.user1 != req.userId && queryboard.user2 != req.userId)
    return res.status(401).send("Query board - jestes tylko w strefie kibica"); //gra nie twoja
  res.json(queryboard.nextMove == req.userId ? true : false);
});

module.exports = router;
