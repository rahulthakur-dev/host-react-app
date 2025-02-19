const express = require('express')
const { generateSlug } = require('random-word-slugs')
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs')
const Redis = require('ioredis')
const { Server } = require('socket.io')

require('dotenv').config()

const app = express()
const PORT = 9000

const subscriber = new Redis(process.env.REDIS_URL)
const io = new Server({ cors: '*' })

io.on('connection', socket => {
    socket.on('subscribe', channel => {
        socket.join(channel)
        socket.emit('message', `Joined ${channel}`)
    })
})

io.listen(9002, () => console.log('Socket Server 9002'))

const ecsClient = new ECSClient({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

const config = {
    CLUSTER: process.env.AWS_ECS_CLUSTER_ARN,
    TASK: process.env.AWS_ECS_TASK_ARN
}

app.use(express.json())

app.post('/project', async (req, res) => {
    const { gitURL, slug } = req.body;
    const projectSlug = slug ? slug : generateSlug();

    // Spin the container
    const command = new RunTaskCommand({
        cluster: config.CLUSTER,
        taskDefinition: config.TASK,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                assignPublicIp: 'ENABLED',
                subnets: process.env.AWS_SUBNETS.split(','),
                securityGroups: process.env.AWS_SECURITY_GROUPS.split(',')
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: 'builder-image',
                    environment: [
                        { name: 'GIT_REPOSITORY_URL', value: gitURL },
                        { name: 'PROJECT_ID', value: projectSlug }
                    ]
                }
            ]
        }
    });

    await ecsClient.send(command);

    return res.json({ 
        status: 'queued', 
        data: { 
            projectSlug, 
            url: `http://${projectSlug}.rahulthakur.dev`  // 👈 Update to your domain
        }
    });
});

async function initRedisSubscribe() {
    console.log('Subscribed to logs....')
    subscriber.psubscribe('logs:*')
    subscriber.on('pmessage', (pattern, channel, message) => {
        io.to(channel).emit('message', message)
    })
}


initRedisSubscribe()

app.listen(PORT, () => console.log(`API Server Running..${PORT}`))