// controllers/ownerController.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { ownerServices } from "../services/ownerServices";
import type { LoginOwnerInput, RegisterOwnerInput } from "../schemas/ownerSchemas";
import { ServerErrors } from "../utils/serverErrors";

/**
 * Controller for handling owner-related requests.
 */
export const ownerController = {
  /**
   * Registers a new owner.
   */
  async registerOwnerHandler(
    request: FastifyRequest<{ Body: RegisterOwnerInput }>,
    reply: FastifyReply
  ) {
    try {
      const newOwner = await ownerServices.registerOwner(request.body);

      return reply.status(201).send(newOwner);
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      } else {
        return reply.status(500).send({ message: "Internal Server Error" });
      }
    }
  },

  /**
   * Authenticates an owner and returns JWT tokens.
   */
  async loginOwnerHandler(request: FastifyRequest<{ Body: LoginOwnerInput }>, reply: FastifyReply) {
    try {
      const foundOwner = await ownerServices.loginOwner(request.body);

      const accessToken = await reply.jwtSign(
        { id: foundOwner.id, email: foundOwner.email, role: "OWNER" },
        { expiresIn: "15m" }
      );
      const refreshToken = await reply.jwtSign(
        { id: foundOwner.id, email: foundOwner.email, role: "OWNER" },
        { expiresIn: "1d" }
      );

      return reply.status(200).send({ accessToken, refreshToken });
    } catch (error) {
      if (error instanceof ServerErrors) {
        return reply
          .status(error.statusCode)
          .send({ message: error.message, details: error.details });
      } else {
        return reply.status(500).send({ message: "Internal Server Error" });
      }
    }
  },
};
