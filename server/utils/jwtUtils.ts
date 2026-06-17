import jwt from "jsonwebtoken";

const JWT_SECRET: string =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

export const generateToken = (id: string): string => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const verifyToken = (token: string): jwt.JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
  } catch (error) {
    throw error;
  }
};

export const decodeToken = (token: string): jwt.JwtPayload | null => {
  try {
    return jwt.decode(token) as jwt.JwtPayload | null;
  } catch (error) {
    throw error;
  }
};

export { JWT_SECRET };
