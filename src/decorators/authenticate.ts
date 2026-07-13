import type { FastifyReply, FastifyRequest } from "fastify";
import type { JwtPayload } from "../types/JwtPayload";

const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const decoded = await request.jwtVerify<JwtPayload>();
    request.owner = decoded;
  } catch (_error) {
    return reply.status(401).send({ message: "Invalid or missing token" });
  }
};

export default authenticate;
