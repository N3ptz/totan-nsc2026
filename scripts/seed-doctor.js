/**
 * Seed a doctor account for development/demo.
 * Run from repo root: node scripts/seed-doctor.js
 *
 * Credentials created:
 *   Email:    doctor@totan.app
 *   Password: Doctor@1234
 *   Role:     doctor  (status: active — skips OTP flow)
 */

const bcrypt = require("../apps/auth-service/node_modules/bcryptjs");
const { Client } = require("../apps/auth-service/node_modules/pg");

const DOCTOR_ID   = "a1f9f839-30b7-4f5b-a324-370bd0d2b3fd"; // matches seed-patients.sql
const EMAIL       = "doctor@totan.app";
const PASSWORD    = "Doctor@1234";
const FULL_NAME   = "Dr. Demo Account";

async function main() {
  const client = new Client({
    connectionString: "postgresql://totan:totan_secret@localhost:5432/totan_auth",
  });
  await client.connect();
  console.log("Connected to totan_auth");

  const hash = await bcrypt.hash(PASSWORD, 12);

  // Upsert user row
  await client.query(`
    INSERT INTO users (id, email, "passwordHash", role, status,
      "verifyOtp", "verifyOtpExpiresAt", "verifyOtpAttempts",
      "createdAt", "updatedAt")
    VALUES ($1, $2, $3, 'doctor', 'active',
      NULL, NULL, 0,
      NOW(), NOW())
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          "passwordHash" = EXCLUDED."passwordHash",
          status = 'active',
          "updatedAt" = NOW();
  `, [DOCTOR_ID, EMAIL, hash]);
  console.log("✅ users row upserted");

  // Upsert doctor profile
  await client.query(`
    INSERT INTO doctors (id, "userId", "fullName", phone, "avatarUrl")
    VALUES (gen_random_uuid(), $1, $2, NULL, NULL)
    ON CONFLICT ("userId") DO UPDATE
      SET "fullName" = EXCLUDED."fullName";
  `, [DOCTOR_ID, FULL_NAME]);
  console.log("✅ doctors profile upserted");

  await client.end();

  console.log("\n──────────────────────────────────");
  console.log("  Email:    doctor@totan.app");
  console.log("  Password: Doctor@1234");
  console.log("  Role:     doctor");
  console.log("──────────────────────────────────");
}

main().catch(err => { console.error("❌", err.message); process.exit(1); });
