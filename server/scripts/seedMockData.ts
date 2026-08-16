import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User";

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/tasks-db";

// Helper to hash passwords
async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

// Seed data
async function seedMockData() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Clear existing user data only
    console.log("\nClearing existing user data...");
    await User.deleteMany({});
    console.log("✓ Cleared users collection");

    // Create Users
    console.log("\nCreating users...");
    const users = await User.insertMany([
      {
        name: "Brie Wubet",
        email: "brwubet@gmail.com",
        password: await hashPassword("briewubet1192"),
        role: "Admin",
      },
    ]);
    console.log(`✓ Created ${users.length} users`);

    console.log("\n✅ User seeding completed successfully!");
    console.log(`  - ${users.length} users created`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding mock data:", error);
    process.exit(1);
  }
}

// Run the seeding function
seedMockData();
