/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    // Strip console.* from production bundles (keep errors/warnings).
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  async redirects() {
    return [
      {
        // ลิงก์สั้นสำหรับแบบสอบถาม UX/UI — ภาพ X-ray ตัวอย่างบน Google Drive
        source: "/xray",
        destination:
          "https://drive.google.com/drive/folders/1IENuOOBLpJfjr5LHC44zZhhLxcqjZkCp",
        permanent: false,
      },
      {
        // แบบสอบถามประเมิน UX/UI (Google Forms)
        source: "/form",
        destination:
          "https://docs.google.com/forms/d/e/1FAIpQLSeFyUmsCmahwlrW6MVe5ruqVI9-DuRRBlh-PQVnw-zFfWv_1Q/viewform",
        permanent: false,
      },
    ];
  },
};
module.exports = nextConfig;
