/**
 * Seed all demo accounts for development/testing.
 * Run from repo root: node scripts/seed-all-accounts.js
 *
 * Accounts created:
 *   doctor@totan.app  / Doctor@1234   (role: doctor)
 *   admin@totan.app   / Admin@1234    (role: admin)
 *   parent@totan.app  / Parent@1234   (role: parent)
 */

const bcrypt = require("../apps/auth-service/node_modules/bcryptjs");
const { Client } = require("../apps/auth-service/node_modules/pg");

const DB = "postgresql://totan:totan_secret@localhost:5432/totan_auth";

const DOCTOR_ID = "a1f9f839-30b7-4f5b-a324-370bd0d2b3fd";
const ADMIN_ID  = "b2e8a120-40c8-4e6c-b435-481ce1e3c4ae";
const PARENT_ID = "c3d7b231-51d9-4f7d-c546-592df2f4d5bf";

const accounts = [
  { id: DOCTOR_ID, email: "doctor@totan.app", password: "Doctor@1234", role: "doctor",  label: "Doctor" },
  { id: ADMIN_ID,  email: "admin@totan.app",  password: "Admin@1234",  role: "admin",   label: "Admin"  },
  { id: PARENT_ID, email: "parent@totan.app", password: "Parent@1234", role: "parent",  label: "Parent" },
];

async function main() {
  const client = new Client({ connectionString: DB });
  await client.connect();
  console.log("Connected to totan_auth\n");

  for (const acc of accounts) {
    const hash = await bcrypt.hash(acc.password, 12);

    await client.query(`
      INSERT INTO users (id, email, "passwordHash", role, status,
        "verifyOtp", "verifyOtpExpiresAt", "verifyOtpAttempts",
        "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, 'active', NULL, NULL, 0, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
        SET email         = EXCLUDED.email,
            "passwordHash"= EXCLUDED."passwordHash",
            status        = 'active',
            "updatedAt"   = NOW();
    `, [acc.id, acc.email, hash, acc.role]);

    if (acc.role === "doctor") {
      await client.query(`
        INSERT INTO doctors (id, "userId", "fullName", phone, "avatarUrl")
        VALUES (gen_random_uuid(), $1, 'Dr. Demo Account', NULL, NULL)
        ON CONFLICT ("userId") DO UPDATE SET "fullName" = 'Dr. Demo Account';
      `, [acc.id]);
    }

    if (acc.role === "parent") {
      await client.query(`
        INSERT INTO parents (id, "userId", "fullName", phone, relationship, "avatarUrl")
        VALUES (gen_random_uuid(), $1, 'Demo Parent', '0812345678', 'mother', NULL)
        ON CONFLICT ("userId") DO UPDATE
          SET "fullName" = 'Demo Parent', phone = '0812345678';
      `, [acc.id]);
    }

    console.log(`✅ ${acc.label}: ${acc.email} / ${acc.password}`);
  }

  await client.end();

  console.log("\n──────────────────────────────────────────────");
  console.log("  Role    │ Email               │ Password    ");
  console.log("──────────┼─────────────────────┼─────────────");
  for (const acc of accounts) {
    const role  = acc.label.padEnd(8);
    const email = acc.email.padEnd(21);
    console.log(`  ${role}│ ${email}│ ${acc.password}`);
  }
  console.log("──────────────────────────────────────────────");
}

main().catch(err => { console.error("❌", err.message); process.exit(1); });
