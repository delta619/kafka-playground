const { Kafka, logLevel } = require('kafkajs')
const { v4 } = require('uuid')

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['localhost:9092', 'localhost:9093', 'localhost:9094'],
    logLevel: logLevel.NOTHING
})

let topic = "topic-part2-repl2"

const produce = async (topic, id) => {
    const producer = kafka.producer()
    await producer.connect()
    
    // Sending a message
    await producer.send({
        topic: topic,
        messages: [
            { value: `${v4()}` },
        ],
    })

    await producer.disconnect()
}


// Producing and consuming messages
produce(topic, "1").catch(console.error)
