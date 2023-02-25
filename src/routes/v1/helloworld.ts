import { Request, Response, Router } from "express";

const router = Router();

// /v1/hello
router.get("/hello", async (req: Request, res: Response) => {
  if (req.userId) {
    const u = await req.prisma.user.findUnique({
      where: {
        id: BigInt(req.userId.toJSON())
      }
    });

    res.send("Hello " + u?.username + "!");
  } else res.send("Hello world!");
});

router.get("/me", (req: Request, res: Response) => {
  if (!req.userId) return res.status(401).send("Me - unauthorized - nup");

  res.json({
    user: req.userId
  });
});

module.exports = router;
