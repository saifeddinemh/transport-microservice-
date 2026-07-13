import type { JwtPayload } from "../types/JwtPayload";
import type { FastifyInstance } from "fastify";

const generateRefreshToken = function (this: FastifyInstance, payload: JwtPayload) {
  return this.jwt.sign(payload, { expiresIn: "1d" });
};

export default generateRefreshToken;
