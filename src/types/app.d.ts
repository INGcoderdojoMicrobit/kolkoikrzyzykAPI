declare namespace Express {
  interface Request {
    user: BigInt | undefined;
    token: string | undefined;
    prisma: import("@prisma/client").PrismaClient;
  }
}

interface BigInt {
  toJSON: () => string;
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};
