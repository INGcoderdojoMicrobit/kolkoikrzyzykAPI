BigInt.prototype.toJSON = function () {
  return this.toString();
}; // monkey patch BigInt

import { PrismaClient } from "@prisma/client";
import bodyParser from "body-parser";
import "dotenv/config";
import express from "express";
import fs from "fs";

const prisma = new PrismaClient();

const app = express();

app.disable("x-powered-by");
app.disable("etag");
app.use(bodyParser.json());

app.use(async (req, res, next) => {
  req.prisma = prisma;
  if (!req.headers.authorization && !req.query.token) return next();
  const token = req.headers.authorization || req.query.token;

  const tokens = await prisma.token.findMany({
    where: {
      token: token
    }
  });

  if (!tokens[0]) return res.status(401).send("Unauthorized");

  if (tokens[0].expiresAt < new Date()) {
    await prisma.token.delete({
      where: {
        id: tokens[0].id
      }
    });
    return res.status(401).send("Unauthorized");
  }

  req.user = tokens[0].userId;
  req.token = tokens[0].token;
  next();
});

fs.readdirSync(__dirname + "/routes").forEach((version: string) => {
  if (fs.lstatSync(__dirname + "/routes/" + version).isDirectory()) {
    fs.readdirSync(__dirname + "/routes/" + version).forEach((file: string) => {
      const route = require(__dirname + "/routes/" + version + "/" + file);
      app.use("/" + version, route);
    });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
