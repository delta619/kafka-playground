const kafka = require('kafka-node');

const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092,localhost:9093,localhost:9094' });

const topic = 'topic-part2-repl2';

const consumers = [];

const consume = (topic, id, name) => {
    const consumerOptions = {
        kafkaHost: 'localhost:9092,localhost:9093,localhost:9094',
        groupId: id,
        autoCommit: true,
        fromOffset: 'latest',
        protocol: ['roundrobin'],
        encoding: 'utf8',
        keyEncoding: 'utf8',
    };

    const consumer = new kafka.ConsumerGroup(consumerOptions, topic);
    consumers.push(consumer);  // Add the consumer to the list

    // consumer.on('connect', () => {
    //     console.log(`Consumer ${name} connected`);
    // });

    consumer.on('message', (message) => {
        // This assumes partition mapping to brokers is known beforehand
        const brokerMap = {
            0: 'localhost:9092',
            1: 'localhost:9093'
            // Map each partition to its respective broker
        };

        const broker = brokerMap[message.partition] || 'unknown';
        console.log()
        console.log(`Group name: ${id}\nConsumer name of that group - ${name}\nPartition number: ${message.partition}\nBroker: ${broker}\nMessage: ${message.value}\n`);
    });

    consumer.on('error', (err) => {
        console.error('Error:', err);
    });
};

// Call the consume function to start the consumer
consume(topic, '1', 'A');
consume(topic, '1', 'B');
consume(topic, '1', 'C');
consume(topic, '1', 'D');

// Handle graceful shutdown on Ctrl + C
process.on('SIGINT', () => {
    console.log('Caught interrupt signal');

    Promise.all(consumers.map(consumer => {
        return new Promise((resolve) => {
            consumer.close(true, () => {
                console.log('Consumer closed');
                resolve();
            });
        });
    })).then(() => {
        console.log('All consumers closed');
        process.exit(0);
    }).catch(err => {
        console.error('Error closing consumers', err);
        process.exit(1);
    });
});

