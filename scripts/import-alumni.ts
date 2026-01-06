import fs from "fs";
import csv from "csv-parser";
import bcrypt from "bcrypt";
import { PrismaClient, UserRole } from "@prisma/client";
import path from "path";

const prisma = new PrismaClient();
const csvFilePath = path.join(__dirname, "alumni_users_21.csv");

async function run() {
  let created = 0;
  let skipped = 0;

  const rows: any[] = [];

  fs.createReadStream(csvFilePath)
    .pipe(
      csv({
        mapHeaders: ({ header }) =>
          header
            .replace(/\uFEFF/g, "")
            .replace(/\r?\n|\r/g, "")
            .trim(),
      })
    )
    .on("data", (row) => {
      rows.push(row);
    })
    .on("end", async () => {
      console.log(`Found ${rows.length} rows`);

      for (const row of rows) {
        // 🔥 FORCE LOG FIRST ROW STRUCTURE (ONCE)
        if (created === 0 && skipped === 0) {
          console.log("DEBUG ROW:", row);
          console.log("DEBUG KEYS:", Object.keys(row));
        }

        // 🔴 DO NOT TRUST HEADER NAMES
        const values = Object.values(row);

        if (values.length < 3) {
          skipped++;
          continue;
        }

        const usn = String(values[0]).trim();
        const name = String(values[1]).trim();
        const email = String(values[2]).trim().toLowerCase();

        if (!usn || !name || !email) {
          skipped++;
          continue;
        }

        const passwordHash = await bcrypt.hash(usn, 10);

        try {
          await prisma.user.create({
            data: {
              email,
              name,
              passwordHash,
              role: UserRole.ALUMNI,
              passwordResetRequired: true,
            },
          });
          created++;
        } catch {
          skipped++;
        }
      }

      console.log(`✅ Created users: ${created}`);
      console.log(`⚠️ Skipped rows: ${skipped}`);

      await prisma.$disconnect();
      process.exit(0);
    });
}

run().catch(console.error);
