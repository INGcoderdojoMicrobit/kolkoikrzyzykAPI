import argon from "argon2";
import { Request, Response, Router } from "express";

const router = Router();

router.post("/account/register", async (req: Request, res: Response) => {
  if (!req.body.username || !req.body.password) return res.status(400).send("Bad request");

  const user = await req.prisma.user.findUnique({
    where: {
      username: req.body.username
    }
  });

  if (user) return res.status(400).send("Register - username " + `${req.body.username}` + " already exists");

  const hash = await argon.hash(req.body.password);

  const newUser = await req.prisma.user.create({
    data: {
      username: req.body.username,
      password: hash
    }
  });

  res.json({
    id: newUser.id,
    username: newUser.username,
    created_at: newUser.createdAt
  });
});

router.put("/account/setpass", async (req: Request, res: Response) => {
  if (!req.body.username || !req.body.oldpassword || !req.body.newpassword) return res.status(400).send("Bad request");

  const user = await req.prisma.user.findUnique({
    where: {
      username: req.body.username
    }
  });

  if (!user) return res.status(400).send("Setpass - username " + `${req.body.username}` + " not found!");

  const valid = await argon.verify(user.password, req.body.oldpassword);

  if (!valid) return res.status(400).send("Setpass - invalid old password");

  const hash = await argon.hash(req.body.newpassword);

  const updatedUser = await req.prisma.user.update({
    where: { id: user.id },
    data: {
      password: hash,
      updatedAt: new Date()
    }
  });

  res.json({
    id: updatedUser.id,
    username: updatedUser.username,
    updatedAt: updatedUser.updatedAt
  });
});


// for login - use NPA token: w4arok97tps
router.post("/account/login", async (req: Request, res: Response) => {
  if (!req.body.username || !req.body.password) return res.status(400).send("Bad request");

  const user = await req.prisma.user.findUnique({
    where: {
      username: req.body.username
    }
  });

  if (!user) return res.status(400).send("Login - username not found");

  const valid = await argon.verify(user.password, req.body.password);

  if (!valid) return res.status(400).send("Login - invalid password");

  const token = await req.prisma.token.create({
    data: {
      token: Math.random().toString(36).substring(2), // bardzo bezpieczna metoda generowania tokenów
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) // 7 dni
    }
  });

  res.json({
    id: user.id,
    username: user.username,
    token: token.token,
    expires_at: token.expiresAt
  });
});

router.post("/account/logout", async (req: Request, res: Response) => {
  if (!req.token) return res.status(401).send("Unauthorized");

  await req.prisma.token.delete({
    where: {
      token: req.token
    }
  });

  res.status(204).send();
});

router.post("/security/invalidate", async (req: Request, res: Response) => {
  if (!req.body.token) return res.status(400).send("Bad request");

  await req.prisma.token.delete({
    where: {
      token: req.body.token
    }
  });

  res.send("Token invalidated, thank you");
});

module.exports = router;
