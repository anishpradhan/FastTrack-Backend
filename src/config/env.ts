import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import {dirname, join} from 'path'


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

interface Env {
    // PORT: number;
    DATABASE_URL: string;
    CARRIERS_API_BASE_URL: string;
    SYNC_INTERVAL_MINUTES: number;
    LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

function getEnvVar(key: string, defaultValue?: string): string {
    const value = process.env[key] || defaultValue;
    if(!value){
        throw new Error(`Environment variable ${key} is required`);
    }
    return value
}

export const env: Env = {
    // PORT: parseInt(getEnvVar('PORT', '3000')),
    DATABASE_URL: getEnvVar('DATABASE_URL'),
    CARRIERS_API_BASE_URL: getEnvVar('CARRIERS_API_BASE_URL'),
    SYNC_INTERVAL_MINUTES: parseInt(getEnvVar('SYNC_INTERVAL_MINUTES', '5')),
    LOG_LEVEL: (getEnvVar('LOG_LEVEL', 'info') as Env['LOG_LEVEL'])
}