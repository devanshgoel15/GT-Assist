import "dotenv/config";
import { initDB } from "./db.js";

initDB()
  .then(() => {
    console.log("✅ Tables created successfully on Neon!");
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Error:", e.message);
    process.exit(1);
  });
