const crypto = require('crypto');

// --- Configuration ---
// 32 bytes of random data is equivalent to 256 bits, which is a common, strong length.
// When encoded as hex, 32 bytes results in a 64-character string (2 hex characters per byte).
const BYTES_LENGTH = 32; 

/**
 * Generates a strong, random hexadecimal string suitable for a secret key.
 * @param {number} bytes The number of random bytes to generate.
 * @returns {string} The cryptographically secure random key.
 */
function generateSecretKey(bytes) {
    // 1. Generate random bytes using the cryptographically secure source
    const randomBytes = crypto.randomBytes(bytes);
    
    // 2. Convert the buffer of bytes into a hexadecimal string
    return randomBytes.toString('hex');
}

// Generate the key
const SECRET_KEY = generateSecretKey(BYTES_LENGTH);

// Output the key for immediate use
// console.log('--- GENERATED SECRET KEY (Copy and paste into your .env file) ---');
// console.log(`\nSECRET_KEY_JWT="${SECRET_KEY}"\n`);
// console.log(`Length: ${SECRET_KEY.length} characters (${BYTES_LENGTH} bytes)`);