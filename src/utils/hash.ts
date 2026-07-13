import bcrypt from "bcrypt";
import { ServerErrors } from "./serverErrors";

/**
 * Hash the provided password using salt and a pepper.
 * @param password - The password provided by the user.
 * @returns An object containing the hashesd passwrod and the used salt.
 */
export async function hashPassword(
  password: string
): Promise<{ hashedPassword: string; salt: string }> {
  const saltRounds = Number(process.env.SALT_ROUNDS) || 10;
  const pepper = process.env.PEPPER_SECRET_KEY;

  if (!pepper) {
    throw new Error("Missing PEPPER_SECRET_KEY in environment variables");
  }

  // Generate a unique salt
  const salt = await bcrypt.genSalt(saltRounds);

  // Hash the password with the salt and pepper
  const hashedPassword = await bcrypt.hash(password + pepper, salt);

  return { hashedPassword, salt };
}

/**
 * Verifies if the provided plain password matches the stored hashed password.
 * @param plainPassword - The password provided by the user.
 * @param hashedPassword - The hashed password stored in the database.
 * @param salt - The unique salt stored for this user.
 * @returns A boolean indicating whether the passwords match.
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
  salt: string
): Promise<boolean> {
  const pepper = process.env.PEPPER_SECRET_KEY;

  // Ensure the environment variable is set
  if (!pepper) {
    throw new ServerErrors("PEPPER_SECRET_KEY is not set in environment variables", 500);
  }

  // Hash the provided password with the same salt & pepper
  const hashedInputPassword = await bcrypt.hash(plainPassword + pepper, salt);

  // Compare the newly hashed password with the stored hashed password
  return hashedInputPassword === hashedPassword;
}
