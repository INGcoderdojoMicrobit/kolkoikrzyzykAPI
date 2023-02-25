import { Request, Response, Router } from "express";

const router = Router();

// /v1/hello
router.get("/hello", async (req: Request, res: Response) => {
  if (req.user) {
    const u = await req.prisma.user.findUnique({
      where: {
        id: req.user
      }
    });

    res.send("Hello " + u?.username + "!");
  } else res.send("Hello world!");
});

router.get("/me", (req: Request, res: Response) => {
  if (!req.user) return res.status(401).send("Unauthorized");

  res.json({
    user: req.user
  });
});

module.exports = router;
