"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const argon2_1 = tslib_1.__importDefault(require("argon2"));
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post("/account/register", async (req, res) => {
    if (!req.body.username || !req.body.password)
        return res.status(400).send("Bad request - nu or np");
    console.log("Register - szukam usera: " + `${req.body.username}` + " w bazie");
    const user = await req.prisma.user.findUnique({
        where: {
            username: req.body.username
        }
    });
    if (user)
        return res.status(400).send("Register - username " + `${req.body.username}` + " already exists");
    const hash = await argon2_1.default.hash(req.body.password);
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
router.put("/account/setpass", async (req, res) => {
    if (!req.body.username || !req.body.oldpassword || !req.body.newpassword)
        return res.status(400).send("Bad request - nu or nop or nnp");
    console.log("Setpass - szukam usera: " + `${req.body.username}` + " w bazie");
    const user = await req.prisma.user.findUnique({
        where: {
            username: req.body.username
        }
    });
    if (!user)
        return res.status(400).send("Setpass - username " + `${req.body.username}` + " not found!");
    const valid = await argon2_1.default.verify(user.password, req.body.oldpassword);
    if (!valid)
        return res.status(400).send("Setpass - invalid old password");
    const hash = await argon2_1.default.hash(req.body.newpassword);
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
router.post("/account/login", async (req, res) => {
    if (!req.body.username || !req.body.password)
        return res.status(400).send("Login - bad request");
    const user = await req.prisma.user.findUnique({
        where: {
            username: req.body.username
        }
    });
    if (!user)
        return res.status(400).send("Login - username not found");
    const valid = await argon2_1.default.verify(user.password, req.body.password);
    if (!valid)
        return res.status(400).send("Login - invalid password");
    const token = await req.prisma.token.create({
        data: {
            token: Math.random().toString(36).substring(2),
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
router.post("/account/logout", async (req, res) => {
    if (!req.token)
        return res.status(401).send("Logout - Unauthorized");
    await req.prisma.token.delete({
        where: {
            token: req.token
        }
    });
    res.status(204).send();
});
router.post("/security/invalidate", async (req, res) => {
    if (!req.body.token)
        return res.status(400).send("Bad request");
    await req.prisma.token.delete({
        where: {
            token: req.body.token
        }
    });
    res.send("Token invalidated, thank you");
});
module.exports = router;
