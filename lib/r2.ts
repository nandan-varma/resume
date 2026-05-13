import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.R2_ENDPOINT || '',
});

export async function uploadToR2(
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<string> {
  const key = `${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || 'resume',
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  try {
    await r2Client.send(command);
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    return publicUrl;
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error('Failed to upload file to R2');
  }
}

export function generateR2Url(key: string): string {
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
