const queueConfig = require('../configs/queue.config');

class QueueService {

    /**
     * Publish a message to the queue for batch processing
     * @param {Object} messageData - Message data to queue
     * @returns {boolean} Success status
     */
    async publishMessage(messageData) {
        try {
            if (!queueConfig.isConnected()) {
                console.error('[QueueService] Queue not connected. Cannot publish message.');
                return false;
            }

            const channel = queueConfig.getChannel();
            const queueName = queueConfig.getQueueName();

            const messageBuffer = Buffer.from(JSON.stringify(messageData));

            // Send to queue with persistence
            const sent = channel.sendToQueue(queueName, messageBuffer, {
                persistent: true // Message survives broker restart
            });

            if (sent) {
                console.log(`[QueueService] ✅ Message queued for room ${messageData.room_id}`);
            } else {
                console.warn(`[QueueService] ⚠️ Queue buffer full, message queued internally`);
            }

            return true;

        } catch (error) {
            console.error('[QueueService] ❌ Failed to publish message:', error.message);
            return false;
        }
    }

    /**
     * Publish multiple messages at once (bulk operation)
     * @param {Array} messagesArray - Array of message data objects
     * @returns {number} Number of successfully queued messages
     */
    async publishMessages(messagesArray) {
        let successCount = 0;

        for (const messageData of messagesArray) {
            const success = await this.publishMessage(messageData);
            if (success) successCount++;
        }

        console.log(`[QueueService] Queued ${successCount}/${messagesArray.length} messages`);
        return successCount;
    }

    /**
     * Get queue statistics (for monitoring)
     * @returns {Object} Queue stats
     */
    async getQueueStats() {
        try {
            const channel = queueConfig.getChannel();
            const queueName = queueConfig.getQueueName();

            const stats = await channel.checkQueue(queueName);
            return {
                messageCount: stats.messageCount,
                consumerCount: stats.consumerCount
            };
        } catch (error) {
            console.error('[QueueService] Failed to get queue stats:', error);
            return null;
        }
    }
}

module.exports = new QueueService();
