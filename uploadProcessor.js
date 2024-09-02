// uploadProcessor.js
const Queue = require('bull');
const sharp = require('sharp');
const fs = require('fs').promises;
const pool = require('./config/db'); // Import your MySQL connection pool

// Create a Bull queue named 'upload'
const uploadQueue = new Queue('upload', {
    redis: {
        host: '127.0.0.1',  // Redis is running locally
        port: 6379          // Default Redis port
    }
});

// Process jobs in the queue
uploadQueue.process(async (job) => {
    const {
        filePath,
        resizedImagePath,
        id_kondisi,
        catatan,
        id_user,
        id_tipe_lantai,
        id_department,
        target_completion_date,
    } = job.data;

    try {
        // Process the image using Sharp
        await sharp(filePath)
            .rotate()  // Optional: Remove this if not needed
            .resize(800)
            .jpeg({ quality: 70 })
            .toFile(resizedImagePath);

        // Insert data into the database
        const query = `
            INSERT INTO aset (
                foto, id_kondisi, catatan, id_user, id_tipe_lantai, id_department, target_completion_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const queryValues = [
            resizedImagePath, 
            id_kondisi, 
            catatan, 
            id_user,
            id_tipe_lantai,
            id_department, 
            target_completion_date || null
        ];

        // Execute the query
        await new Promise((resolve, reject) => {
            pool.query(query, queryValues, (err, result) => {
                if (err) {
                    console.error('Failed to insert into database:', err);
                    return reject(new Error('Database insertion failed.'));
                }
                resolve(result);
            });
        });

        // Clean up the original file asynchronously
        await fs.unlink(filePath);

        console.log('Job completed successfully:', job.id);
    } catch (error) {
        console.error('Error processing job:', job.id, error);

        // Cleanup both original and resized files on error
        await fs.unlink(filePath).catch(err => console.error('Failed to delete original file:', err));
        await fs.unlink(resizedImagePath).catch(err => console.error('Failed to delete resized file:', err));

        throw error; // Re-throw the error so Bull marks the job as failed
    }
});

module.exports = uploadQueue;
