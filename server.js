const express = require('express');
const kafka = require('kafka-node');
const http = require('http');
const WebSocket = require('ws');
const { v4 } = require('uuid');

const app = express();
const port = 3000;

app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const consumers = [];
const client = new kafka.KafkaClient({ kafkaHost: 'localhost:9092,localhost:9093,localhost:9094' });
const producer = new kafka.Producer(client);

const brokerMap = {
    0: 'localhost:9092',
    1: 'localhost:9093',
    2: 'localhost:9094'
    // Extend this map based on your setup
};

// TOPIC AVAILABLE <!-- topic-part2-repl2 -->


const consume = (topic, groupId, consumerName) => {
    const consumerOptions = {
        kafkaHost: 'localhost:9092,localhost:9093,localhost:9094',
        groupId: groupId,
        autoCommit: true,
        fromOffset: 'latest',
        protocol: ['roundrobin'],
        encoding: 'utf8',
        keyEncoding: 'utf8',
    };

    const consumer = new kafka.ConsumerGroup(consumerOptions, topic);
    consumers.push(consumer);

    consumer.on('connect', () => {
        console.log(`Consumer ${consumerName} connected`);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ action: 'consumerConnected', consumerName }));
            }
        });
    });

    consumer.on('message', (message) => {
        const broker = brokerMap[message.partition] || 'unknown';
        const msg = {
            consumerName,
            partition: message.partition,
            broker,
            message: JSON.stringify(message.value)
        };
        console.log(`Node name - ${consumerName} - Partition: ${message.partition} - Broker: ${broker} - Message: ${message.value}`);

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(msg));
            }
        });
    });

    consumer.on('error', (err) => {
        console.error('Error:', err);
    });
};

const produce = async (topic, numMessages) => {
    const messages = Array.from({ length: numMessages }, () => ({ value: `${v4()}` }));

    const payloads = [
        {
            topic: topic,
            messages: messages
        }
    ];

    producer.send(payloads, (err, data) => {
        if (err) {
            console.error('Error producing message:', err);
        } else {
            console.log('Produced message:', data);
        }
    });
};

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.action === 'startConsumers') {
            const { topic, groups } = data;
            groups.forEach(group => {
                const { groupId, consumers } = group;
                consumers.forEach(consumerName => {
                    consume(topic, groupId, consumerName);
                });
            });
        } else if (data.action === 'produceMessages') {
            const { topic, numMessages } = data;
            produce(topic, numMessages);
        }
    });
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

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
