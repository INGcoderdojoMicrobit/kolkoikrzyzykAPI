declare namespace Express {
  interface Request {
    user: BigInt | undefined;
    prisma: import("@prisma/client").PrismaClient;
  }
}

interface BigInt {
  toJSON: () => string;
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};
