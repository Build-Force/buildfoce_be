import dotenv from "dotenv";
import path from "path";

// Determine which .env file to load based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || "development";
// Usually in dev we use .env, and .env.production for prod
const envFile = nodeEnv === "production" ? ".env.production" : ".env";

// Load the appropriate .env file
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(`Loading environment from: ${envFile}`);

interface EnvConfig {
    APP_URL: string;
    PORT: number;
    NODE_ENV: string;
    MONGODB_URI: string;
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;
    FRONTEND_URL: string;
    API_URL: string;
    // Thêm thông tin thanh toán (PayOS) theo guild.txt
    PAYOS_CLIENT_ID: string;
    PAYOS_API_KEY: string;
    PAYOS_CHECKSUM_KEY: string;
}

const getEnvVar = (key: string, required: boolean = true): string => {
    const value = process.env[key];
    if (!value && required) {
        // Trong môi trường dev có thể linh động cảnh báo thay vì throw error ngay lập tức
        // để anh em có thể start lên mà chưa cần cài đặt đầy đủ ngay
        if (nodeEnv !== "production") {
            console.warn(`⚠️ Warning: Missing environment variable: ${key}`);
            return "";
        }
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || "";
};

export const env: EnvConfig = {
    APP_URL: getEnvVar("APP_URL", false),
    PORT: parseInt(getEnvVar("PORT", false) || "5000", 10),
    NODE_ENV: nodeEnv,
    MONGODB_URI: getEnvVar("MONGODB_URI", true) || "mongodb://localhost:27017/buildforce",
    JWT_SECRET: getEnvVar("JWT_SECRET", false) || "supersecretkey",
    JWT_EXPIRES_IN: getEnvVar("JWT_EXPIRES_IN", false) || "7d",
    FRONTEND_URL: getEnvVar("FRONTEND_URL", false) || "http://localhost:3000",
    API_URL: getEnvVar("API_URL", false),
    PAYOS_CLIENT_ID: getEnvVar("PAYOS_CLIENT_ID", false),
    PAYOS_API_KEY: getEnvVar("PAYOS_API_KEY", false),
    PAYOS_CHECKSUM_KEY: getEnvVar("PAYOS_CHECKSUM_KEY", false),
};
