"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
BigInt.prototype.toJSON = function () {
    return this.toString();
}; // monkey patch BigInt
const client_1 = require("@prisma/client");
const body_parser_1 = tslib_1.__importDefault(require("body-parser"));
require("dotenv/config");
const express_1 = tslib_1.__importDefault(require("express"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
app.disable("x-powered-by");
app.disable("etag");
app.use(body_parser_1.default.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});
app.use(async (req, res, next) => {
    req.prisma = prisma;
    if (!req.headers.authorization && !req.query.token)
        return next();
    const reqtoken = req.headers.authorization?.split(' ')[1] || req.query.token;
    const tokens = await prisma.token.findMany({
        where: {
            token: String(reqtoken)
        },
        orderBy: [{
                expiresAt: 'desc'
            }]
    });
    if (!tokens[0])
        return res.status(401).send("Unauthorized - tnf"); //token not found
    if (tokens[0].expiresAt < new Date()) {
        await prisma.token.delete({
            where: {
                id: tokens[0].id
            }
        });
        return res.status(401).send("Unauthorized - te"); //token expired
    }
    req.userId = tokens[0].userId;
    req.token = tokens[0].token;
    next();
});
fs_1.default.readdirSync(__dirname + "/routes").forEach((version) => {
    if (fs_1.default.lstatSync(__dirname + "/routes/" + version).isDirectory()) {
        fs_1.default.readdirSync(__dirname + "/routes/" + version).forEach((file) => {
            const route = require(__dirname + "/routes/" + version + "/" + file);
            app.use("/" + version, route);
        });
    }
});
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
