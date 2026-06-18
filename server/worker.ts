import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { startWorkers } from "./infra/queue/workers.js";

dotenv.config();

const start = async () => {
  await connectDB();
  startWorkers();
  console.log("Intelligence worker process running");
};

start().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
