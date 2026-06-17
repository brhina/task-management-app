import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

export const testJWT = (): boolean => {
  try {
    const token = jwt.sign({ id: "test-user-id" }, JWT_SECRET, {
      expiresIn: "1h",
    });
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("JWT test passed. Decoded:", decoded);
    return true;
  } catch (error) {
    console.error("JWT test failed:", error);
    return false;
  }
};
