import type { Owner } from "@prisma/client";
import { format } from "date-fns";

/**
 * TypeScript model representing the Owner entity in the API.
 */
export interface OwnerModel {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  telephone: string;
  birthDate: string;
  identityType?: string | null;
  identityNumber?: string | null;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  postcode?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Converts a Prisma `Owner` type into an API-safe `OwnerModel`.
 * @param owner Prisma Owner object
 * @returns API-safe OwnerModel
 */
export const mapPrismaOwnerToModel = (owner: Owner): OwnerModel => ({
  id: owner.id,
  email: owner.email,
  firstName: owner.firstName,
  lastName: owner.lastName,
  telephone: owner.telephone,
  birthDate: format(owner.birthDate, "dd-MM-yyyy"),
  identityType: owner.identityType ?? null,
  identityNumber: owner.identityNumber ?? null,
  address: owner.address ?? null,
  country: owner.country ?? null,
  city: owner.city ?? null,
  postcode: owner.postcode ?? null,
  createdAt: format(owner.createdAt, "dd-MM-yyyy HH:mm"),
  updatedAt: format(owner.updatedAt, "dd-MM-yyyy HH:mm"),
});

/**
 * Converts an array of Prisma `Owner` type into an API-safe an array of `OwnerModel`.
 * @param Owners Array of Prisma Owner object
 * @returns API-safe array of OwnerModel
 */
export const mapPrismaOwnersToModel = (owners: Owner[]): OwnerModel[] => {
  return owners.map(mapPrismaOwnerToModel);
};
