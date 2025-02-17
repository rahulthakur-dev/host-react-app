const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const mime = require('mime-types')

const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

const PROJECT_ID = process.env.PROJECT_ID

async function uploadToS3() {
    const distFolderPath = path.join(__dirname, 'output', 'dist')

    if (!fs.existsSync(distFolderPath)) {
        console.error(`Error: Directory not found - ${distFolderPath}`)
        process.exit(1)
    }

    const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true })

    for (const file of distFolderContents) {
        const filePath = path.join(distFolderPath, file)
        if (fs.lstatSync(filePath).isDirectory()) continue

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
}

function init() {
    console.log('Executing script.js')

    const outDirPath = path.join(__dirname, 'output')

    exec(`cd ${outDirPath} && npm install && npm run build`, async (error, stdout, stderr) => {
        if (error) {
            console.error(`Build Error: ${error.message}`)
            return
        }
        console.log(stdout)
        console.log('Build Complete')
        await uploadToS3()
    })
}

init()