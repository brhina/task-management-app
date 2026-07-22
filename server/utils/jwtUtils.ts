import jwt from "jsonwebtoken";

const JWT_SECRET: string = (() => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET environment variable is required. Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"",
    );
  }
  return process.env.JWT_SECRET;
})();

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
