import { Request, Response, Router } from "express";

const router = Router();

router.get("/games", async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Unauthorized");

  const games = await req.prisma.game.findMany({
    where: {
      status: "waiting",
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

router.post("/game/create", async (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Game create - Unauthorized");

  const avaliableGames = await req.prisma.game.findMany({
    where: {
      status: "waiting"
    }
  });

  if (avaliableGames.length > 0) {
      if (avaliableGames[0].user1==req.userId) return res.status(401).send("Game create - game in waiting state...");

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

module.exports = router;
