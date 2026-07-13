import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import type { OwnerModel } from "../models/ownerModels";
import { mapPrismaOwnerToModel } from "../models/ownerModels";
import type { RegisterOwnerInput, LoginOwnerInput } from "../schemas/ownerSchemas";
import { registerOwnerSchema, loginOwnerSchema } from "../schemas/ownerSchemas";
import { hashPassword, verifyPassword } from "../utils/hash";
import { ServerErrors } from "../utils/serverErrors";
import { z } from "zod";

/**
 * Service module for managing owner requests in the system.
 */
export const ownerServices = {
  /**
   * Registers a new owner in the database.
   * @param data - Owner registration input.
   * @returns The newly created owner model.
   */
  async registerOwner(data: RegisterOwnerInput): Promise<OwnerModel> {
    try {
      // Validate request data
      const validatedData = registerOwnerSchema.parse(data);

      // Hash password and generate salt
      const { hashedPassword, salt } = await hashPassword(validatedData.password);

      // Create Owner in DB
      const newOwner = await prisma.owner.create({
        data: { ...validatedData, password: hashedPassword, salt },
      });

      return mapPrismaOwnerToModel(newOwner);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ServerErrors("An owner is already registered with the given email.", 409);
      }
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      throw new ServerErrors("An unexpected error occurred", 500, error);
    }
  },

  /**
   * Authenticates an owner and returns a JWT token.
   * @param data - Owner login input.
   * @returns An object containing the access token.
   */
  async loginOwner(data: LoginOwnerInput): Promise<OwnerModel> {
    try {
      // Validate request data
      const validatedData = loginOwnerSchema.parse(data);

      // Find owner by email
      const owner = await prisma.owner.findUnique({
        where: { email: validatedData.email },
      });

      if (!owner || !(await verifyPassword(validatedData.password, owner.password, owner.salt))) {
        throw new ServerErrors("Invalid email or password", 401);
      }

      return mapPrismaOwnerToModel(owner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ServerErrors("Validation failed", 400, error.errors);
      }
      throw error instanceof ServerErrors
        ? error
        : new ServerErrors("An unexpected error occurred", 500, error);
    }
  },
};
