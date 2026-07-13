import type { JwtPayload } from "../types/JwtPayload";
import type { FastifyInstance } from "fastify";

const verifyRefreshToken = function (this: FastifyInstance, token: string): JwtPayload {
  try {
    const decoded = this.jwt.verify(token);
    return decoded as JwtPayload;
  } catch (_error) {
    throw new Error("Invalid refresh token");
  }
};

export default verifyRefreshToken;
