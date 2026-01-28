const { BloomFilter } = require('bloom-filters');

/**
 * Bloom Filter Service - Email Existence Check (Minimal Storage)
 * 
 * HOW IT WORKS:
 * 1. Each email is run through multiple hash functions (e.g., 3-7 hash functions)
 * 2. Each hash function produces a number that identifies a specific BIT position
 * 3. Those bits are SET to 1 in a bit-array
 * 4. The email itself is NOT stored - only the bits are set
 * 
 * EXAMPLE:
 * - Email "user@example.com" → Hash1(email)=42, Hash2(email)=157, Hash3(email)=891
 * - Bits 42, 157, and 891 in the bit-array are set to 1
 * - Total storage: ~10 bits per email (not the full string!)
 * 
 * CHECKING:
 * - To check if "user@example.com" exists:
 * - Compute Hash1(email)=42, Hash2(email)=157, Hash3(email)=891
 * - Check if bits 42, 157, 891 are ALL set to 1
 * - If yes → "might exist", If no → "definitely doesn't exist"
 */
class BloomFilterService {
    constructor() {
        this.filter = null;
        this.itemCount = 0;
        this.initialized = false;
    }

    /**
     * Initialize the Bloom Filter with existing emails from database
     * 
     * @param {Array<string>} emails - Array of existing emails to hash
     */
    async initialize(emails = []) {
        try {
            this.itemCount = emails.length || 1000; // Default 1000 for empty DB


            const errorRate = 0.01; // 1% false positive
            const bitsPerItem = Math.ceil((this.itemCount * Math.abs(Math.log(errorRate))) / Math.pow(Math.log(2), 2));
            const hashFunctions = Math.ceil((bitsPerItem / this.itemCount) * Math.log(2));//what this hash func actually does is it takes the email and hashes it multiple times and returns the index of the bit to be set to 1

            this.filter = new BloomFilter(bitsPerItem, hashFunctions);

            emails.forEach(email => {
                if (email) {
                    this.filter.add(email.toLowerCase());
                }
            });

            this.initialized = true;

            console.log('✅ Bloom Filter initialized (Email-Only):');
            console.log(`   - Emails loaded: ${emails.length}`);
            console.log(`   - Bit array size: ${bitsPerItem} bits (${Math.ceil(bitsPerItem / 8)} bytes)`);
            console.log(`   - Hash functions: ${hashFunctions}`);
            console.log(`   - Bits per email: ~${(bitsPerItem / this.itemCount).toFixed(1)} bits`);
            console.log(`   - Expected false positive rate: 1%`);

            return {
                success: true,
                itemsLoaded: emails.length,
                storageBytes: this.getStorageEstimate()
            };
        } catch (error) {
            console.error('❌ Bloom Filter initialization failed:', error);
            throw error;
        }
    }

    mightExistEmail(email) {
        if (!this.initialized || !email) {
            return true; // Fallback to DB check if filter not ready
        }

        // Hash the email → check if corresponding bits are set
        return this.filter.has(email.toLowerCase());
    }


    addEmail(email) {
        if (this.initialized && email) {
            // Hash email → set corresponding bits to 1
            this.filter.add(email.toLowerCase());
        }
    }

    getStorageEstimate() {
        if (!this.filter) {
            return 0;
        }
        const bitsPerItem = 9.6;
        const totalBits = this.itemCount * bitsPerItem;
        const bytes = Math.ceil(totalBits / 8);

        return bytes;
    }

    getStats() {
        return {
            initialized: this.initialized,
            emailCount: this.itemCount,
            storageBytes: this.getStorageEstimate(),
            bitsPerEmail: '~10 bits',
            estimatedFalsePositiveRate: '1%',
            note: 'Only bit positions stored, NOT actual email strings'
        };
    }

    reset() {
        this.filter = null;
        this.itemCount = 0;
        this.initialized = false;
    }
}

module.exports = new BloomFilterService();
