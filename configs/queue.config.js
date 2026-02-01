const amqp = require('amqplib');

class QueueConfig {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.QUEUE_NAME = 'chat_messages';
    }
    async connect() {
        try {
            const rabbitMQUrl = process.env.RABBITMQ_URL;

            console.log('[QueueConfig] Connecting to RabbitMQ...');
            this.connection = await amqp.connect(rabbitMQUrl);

            console.log('[QueueConfig] Creating channel...');
            this.channel = await this.connection.createChannel();

            // Declare queue with durability settings
            await this.channel.assertQueue(this.QUEUE_NAME, {
                durable: true,      // Queue survives broker restart
                maxLength: 10000,   // Prevent memory overflow
                messageTtl: 86400000 // Messages expire after 24 hours
            });

            console.log(`[QueueConfig] ✅ Queue "${this.QUEUE_NAME}" is ready`);


            this.connection.on('error', (err) => {
                console.error('[QueueConfig] Connection error:', err);
            });

            this.connection.on('close', () => {
                console.warn('[QueueConfig] Connection closed');
            });

        } catch (error) {
            console.error('[QueueConfig] ❌ Failed to connect to RabbitMQ:', error.message);
            throw error;
        }
    }


    getChannel() {
        if (!this.channel) {
            throw new Error('Queue channel not initialized. Call connect() first.');
        }
        return this.channel;
    }


    getQueueName() {
        return this.QUEUE_NAME;
    }


    isConnected() {
        return this.connection !== null && this.channel !== null;
    }

    async close() {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            console.log('[QueueConfig] Connection closed gracefully');
        } catch (error) {
            console.error('[QueueConfig] Error closing connection:', error);
        }
    }
}

module.exports = new QueueConfig();
