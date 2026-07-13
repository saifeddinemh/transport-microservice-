import type { FastifyReply, FastifyRequest } from "fastify";
import type { JwtPayload } from "../types/JwtPayload";

const checkRole = (...roles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const owner = request.owner as JwtPayload;

    if (!owner || !roles.includes(owner.role)) {
      return reply.status(403).send({ message: "Forbidden: Accesss is not allowed for the role" });
    }
  };
};

export default checkRole;
