const { BloomFilter } = require('bloom-filters');

/**
 * Bloom Filter Service - Probabilistic Data Structure for Username/Email Existence Checks
 * 
 * This service uses a bit-array (not storing actual strings) to check if a username/email
 * MIGHT exist in the system. It hashes the input and sets specific bits in memory.
 * 
 * Storage: ~1-2 bits per item (extremely efficient)
 * False Positive Rate: ~1% (configurable)
 * False Negative Rate: 0% (if it says "NO", it's definitely not there)
 */
class BloomFilterService {
    constructor() {
        this.filter = null;
        this.itemCount = 0;
        this.initialized = false;
    }

    /**
     * Initialize the Bloom Filter with existing usernames and emails from database
     * 
     * @param {Array<string>} emails - Array of existing emails
     * @param {Array<string>} usernames - Array of existing usernames
     */
    async initialize(emails = [], usernames = []) {
        try {
            // Calculate total items
            this.itemCount = emails.length + usernames.length;

            if (this.itemCount === 0) {
                // Start with a small filter for empty database
                this.itemCount = 1000; // Expected growth
            }

            // Create Bloom Filter optimized for minimal storage
            // errorRate: 0.01 means 1% false positive rate
            // This gives us ~9.6 bits per item (minimum storage)
            this.filter = new BloomFilter(this.itemCount, 0.01);

            // Add all existing emails with prefix (hash each email, set bits)
            emails.forEach(email => {
                if (email) {
                    this.filter.add(`email:${email.toLowerCase()}`);
                }
            });

            // Add all existing usernames with prefix (hash each username, set bits)
            usernames.forEach(username => {
                if (username) {
                    this.filter.add(`username:${username.toLowerCase()}`);
                }
            });

            this.initialized = true;

            // Log initialization stats
            console.log('✅ Bloom Filter initialized:');
            console.log(`   - Items loaded: ${emails.length + usernames.length}`);
            console.log(`   - Expected false positive rate: 1%`);
            console.log(`   - Storage: ~${this.getStorageEstimate()} bytes (bit-array)`);

            return {
                success: true,
                itemsLoaded: emails.length + usernames.length,
                storageBytes: this.getStorageEstimate()
            };
        } catch (error) {
            console.error('❌ Bloom Filter initialization failed:', error);
            throw error;
        }
    }

    /**
     * Check if an email MIGHT exist in the system
     * Uses hashing - does NOT store the actual email
     * 
     * @param {string} email 
     * @returns {boolean} true = MAYBE exists (needs DB check), false = DEFINITELY doesn't exist
     */
    mightExistEmail(email) {
        if (!this.initialized || !email) {
            return true; // Fallback to DB check if filter not ready
        }

        // Hash the email and check bits
        return this.filter.has(`email:${email.toLowerCase()}`);
    }

    /**
     * Check if a username MIGHT exist in the system
     * Uses hashing - does NOT store the actual username
     * 
     * @param {string} username 
     * @returns {boolean} true = MAYBE exists (needs DB check), false = DEFINITELY doesn't exist
     */
    mightExistUsername(username) {
        if (!this.initialized || !username) {
            return true; // Fallback to DB check if filter not ready
        }

        // Hash the username and check bits
        return this.filter.has(`username:${username.toLowerCase()}`);
    }

    /**
     * Add email to the filter (after successful registration)
     * Hashes the email and sets specific bits
     * 
     * @param {string} email 
     */
    addEmail(email) {
        if (this.initialized && email) {
            this.filter.add(`email:${email.toLowerCase()}`);
        }
    }

    /**
     * Add username to the filter (after successful registration)
     * Hashes the username and sets specific bits
     * 
     * @param {string} username 
     */
    addUsername(username) {
        if (this.initialized && username) {
            this.filter.add(`username:${username.toLowerCase()}`);
        }
    }

    /**
     * Get estimated storage size in bytes (for monitoring)
     * 
     * @returns {number} Approximate storage in bytes
     */
    getStorageEstimate() {
        if (!this.filter) {
            return 0;
        }

        // Bloom filter uses bit array
        // With 1% error rate, it's approximately 9.6 bits per item
        const bitsPerItem = 9.6;
        const totalBits = this.itemCount * bitsPerItem;
        const bytes = Math.ceil(totalBits / 8);

        return bytes;
    }

    /**
     * Get filter statistics (for monitoring/debugging)
     * 
     * @returns {Object} Filter stats
     */
    getStats() {
        return {
            initialized: this.initialized,
            itemCount: this.itemCount,
            storageBytes: this.getStorageEstimate(),
            estimatedFalsePositiveRate: '1%'
        };
    }

    /**
     * Reset the filter (useful for testing)
     */
    reset() {
        this.filter = null;
        this.itemCount = 0;
        this.initialized = false;
    }
}

module.exports = new BloomFilterService();
