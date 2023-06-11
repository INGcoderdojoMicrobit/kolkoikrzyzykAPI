"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// /v1/hello
router.get("/hello", async (req, res) => {
    if (req.userId) {
        const u = await req.prisma.user.findUnique({
            where: {
                id: BigInt(req.userId.toJSON())
            }
        });
        res.send("Hello " + u?.username + "!");
    }
    else
        res.send("Hello world!");
});
router.get("/me", (req, res) => {
    if (!req.userId)
        return res.status(401).send("Unauthorized");
    res.json({
        user: req.userId
    });
});
module.exports = router;
