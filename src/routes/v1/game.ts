import { Request, Response, Router } from "express";

const router = Router();

router.get("/games", async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  const games = await req.prisma.game.findMany({
    where: {
      status: "waiting"
    },
    include: {
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
  if (!req.user) return res.status(401).send("Unauthorized");

  const avaliableGames = await req.prisma.game.findMany({
    where: {
      status: "waiting"
    }
  });

  if (avaliableGames.length > 0) {
    const game = await req.prisma.game.update({
      where: {
        id: avaliableGames[0].id
      },
      data: {
        user2: req.user,
        status: "playing",
        nextMove: Math.random() > 0.5 ? avaliableGames[0].user1 : req.user
      }
    });

    return res.json(game);
  }

  const game = await req.prisma.game.create({
    data: {
      user1: req.user,
      status: "waiting"
    }
  });

  res.json(game);
});

module.exports = router;
