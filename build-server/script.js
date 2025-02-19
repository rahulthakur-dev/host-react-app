const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const mime = require('mime-types')
const Redis = require('ioredis')

const publisher = new Redis(process.env.REDIS_URL)


const PROJECT_ID = process.env.PROJECT_ID

function publishLog(log) {
    publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify(log))
}

const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})


async function uploadToS3() {
    const distFolderPaths = [
        path.join(__dirname, 'output', 'dist'),
        path.join(__dirname, 'output', 'build'),
    ];

    let distFolderPath = distFolderPaths.find(fs.existsSync);

    if (!distFolderPath) {
        publishLog(`Error: Neither 'dist' nor 'build' directory found`);
        console.error(`Error: Neither 'dist' nor 'build' directory found`);
        process.exit(1);
    }

    const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true })

    for (const file of distFolderContents) {
        const filePath = path.join(distFolderPath, file)
        if (fs.lstatSync(filePath).isDirectory()) continue

        publishLog(`Uploading: ${filePath}`)
        console.log('Uploading:', filePath)

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `__outputs/${PROJECT_ID}/${file}`,
            Body: fs.createReadStream(filePath),
            ContentType: mime.lookup(filePath) || 'application/octet-stream'
        })

        await s3Client.send(command)
        console.log('Uploaded:', filePath)
    }
    console.log('Upload complete...')
    publishLog('Upload completed')
}

function init() {
    console.log('Executing script.js')
    publishLog('Build Started...')

    const outDirPath = path.join(__dirname, 'output')

    exec(`cd ${outDirPath} && npm install && npm run build`, async (error, stdout, stderr) => {
        if (error) {
            publishLog(`Build Error: ${error.message}`)
            console.error(`Build Error: ${error.message}`)
            return
        }
        console.log(stdout)
        publishLog('Build Complete')
        console.log('Build Complete')
        await uploadToS3()
    })
}

init()