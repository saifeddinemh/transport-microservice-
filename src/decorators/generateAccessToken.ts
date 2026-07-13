import type { JwtPayload } from "../types/JwtPayload";
import type { FastifyInstance } from "fastify";

const generateAccessToken = function (this: FastifyInstance, payload: JwtPayload) {
  return this.jwt.sign(payload, { expiresIn: "15m" });
};

export default generateAccessToken;
