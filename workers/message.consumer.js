const queueConfig = require('../configs/queue.config');
const messageRepository = require('../repositories/message.repository');

/**
 * Message Consumer Worker
 * Consumes messages from RabbitMQ queue and batches them for efficient database writes
 */
class MessageConsumer {
    constructor() {
        this.messageBatch = [];
        this.batchTimer = null;
        this.isProcessing = false;

        // Configuration
        this.BATCH_SIZE = 100;           // Flush after 100 messages
        this.BATCH_TIMEOUT_MS = 10000;     // Flush after 10 seconds of inactivity
        this.MAX_RETRIES = 3;             // Retry failed batches 3 times
    }

    /**
     * Start consuming messages from the queue
     */
    async start() {
        try {
            const channel = queueConfig.getChannel();
            const queueName = queueConfig.getQueueName();

            console.log('[MessageConsumer] Starting message consumer...');

            // Set prefetch to control how many messages to fetch at once
            await channel.prefetch(this.BATCH_SIZE);

            // Start consuming messages
            await channel.consume(queueName, async (msg) => {
                if (msg === null) {
                    console.warn('[MessageConsumer] Consumer cancelled by server');
                    return;
                }

                try {
                    // Parse message data
                    const messageData = JSON.parse(msg.content.toString());

                    // Add to batch with acknowledgment info
                    this.messageBatch.push({
                        data: messageData,
                        msg: msg
                    });

                    console.log(`[MessageConsumer] Message added to batch (${this.messageBatch.length}/${this.BATCH_SIZE})`);

                    // Check if batch is full
                    if (this.messageBatch.length >= this.BATCH_SIZE) {
                        await this.flushBatch();
                    } else {
                        // Reset timeout to flush even if batch not full
                        this.resetBatchTimer();
                    }

                } catch (error) {
                    console.error('[MessageConsumer] Error processing message:', error);
                    // Reject message and don't requeue (dead letter)
                    channel.nack(msg, false, false);
                }
            }, {
                noAck: false
            });

            console.log('[MessageConsumer] ✅ Consumer started successfully');
            console.log(`[MessageConsumer] Batch config: size=${this.BATCH_SIZE}, timeout=${this.BATCH_TIMEOUT_MS}ms`);

        } catch (error) {
            console.error('[MessageConsumer] ❌ Failed to start consumer:', error);
            throw error;
        }
    }

    /**
     * Flush current batch to database
     */
    async flushBatch(retryCount = 0) {
        // Prevent concurrent flushes
        if (this.isProcessing || this.messageBatch.length === 0) {
            return;
        }

        this.isProcessing = true;
        clearTimeout(this.batchTimer);

        const batchToProcess = [...this.messageBatch];
        const batchSize = batchToProcess.length;

        console.log(`[MessageConsumer] 🚀 Flushing batch of ${batchSize} messages...`);

        try {
            const messagesData = batchToProcess.map(item => item.data);

            const startTime = Date.now();
            await messageRepository.bulkCreateMessages(messagesData);
            const duration = Date.now() - startTime;

            console.log(`[MessageConsumer] ✅ Successfully inserted ${batchSize} messages in ${duration}ms`);

            const channel = queueConfig.getChannel();
            batchToProcess.forEach(item => {
                channel.ack(item.msg);
            });

            this.messageBatch = [];

            const messagesPerSecond = Math.round((batchSize / duration) * 1000);
            console.log(`[MessageConsumer] 📊 Performance: ${messagesPerSecond} messages/second`);

        } catch (error) {
            console.error(`[MessageConsumer] ❌ Batch insert failed:`, error.message);

            if (retryCount < this.MAX_RETRIES) {
                console.log(`[MessageConsumer] 🔄 Retrying... (${retryCount + 1}/${this.MAX_RETRIES})`);
                await this.delay(1000 * (retryCount + 1));
                return this.flushBatch(retryCount + 1);
            } else {
                console.error(`[MessageConsumer] ❌ Max retries reached. Rejecting batch.`);

                const channel = queueConfig.getChannel();
                batchToProcess.forEach(item => {
                    channel.nack(item.msg, false, false);
                });

                this.messageBatch = [];
            }
        } finally {
            this.isProcessing = false;
        }
    }

    resetBatchTimer() {
        clearTimeout(this.batchTimer);
        this.batchTimer = setTimeout(() => {
            console.log('[MessageConsumer] ⏰ Batch timeout reached, flushing...');
            this.flushBatch();
        }, this.BATCH_TIMEOUT_MS);
    }

    /**
     * Delay helper for retry logic
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async stop() {
        console.log('[MessageConsumer] Stopping consumer...');

        if (this.messageBatch.length > 0) {
            console.log('[MessageConsumer] Flushing remaining messages before shutdown...');
            await this.flushBatch();
        }

        clearTimeout(this.batchTimer);
        console.log('[MessageConsumer] Consumer stopped');
    }

    getStats() {
        return {
            batchSize: this.messageBatch.length,
            isProcessing: this.isProcessing,
            maxBatchSize: this.BATCH_SIZE,
            batchTimeout: this.BATCH_TIMEOUT_MS
        };
    }
}

module.exports = MessageConsumer;
