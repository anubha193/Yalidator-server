const http = require('http');
const { MongoClient } = require('mongodb');
const cors = require('cors');

// Middleware for CORS
const corsMiddleware = cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// MongoDB connection URL and database name
const mongoUrl = 'mongodb://localhost:27017'; // Replace with your MongoDB URL
const dbName = 'fingerprintDB';
const collectionName = 'records';

// Create a MongoClient
const client = new MongoClient(mongoUrl);
let db, collection;

// Initialize MongoDB connection
async function initMongoDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(dbName);
    collection = db.collection(collectionName);
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
}

// Start MongoDB connection
initMongoDB();

const server = http.createServer(async (req, res) => {
  corsMiddleware(req, res, async () => {
    // Get the IP address
    let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;

    if (clientIp && clientIp.indexOf(',') !== -1) {
      clientIp = clientIp.split(',')[0];
    }

    console.log(`Client IP Address: ${clientIp}`);

    // Process POST requests
    if (req.method === 'POST') {
      let body = '';

      req.on('data', chunk => {
        body += chunk.toString(); // Collect the request body
      });

      req.on('end', async () => {
        console.log(`Received request body: ${body}`);

        let payload;
        try {
          payload = JSON.parse(body); // Parse the JSON payload
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }

        // Extract fingerprint and userAgent from payload
        const { fingerprint, userAgent ,timeStamp} = payload;
        console.log(timeStamp)
        if (!fingerprint || !userAgent) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Fingerprint and userAgent are required' }));
        }

        try {
          // Check if the fingerprint already exists
          const existingRecord = await collection.findOne({ fingerprint });

          if (existingRecord) {
            // If the IP or userAgent has changed, update the record
            if (existingRecord.ip !== clientIp) {
              console.log(`Adding new record for fingerprint: ${fingerprint}`);
              await collection.insertOne({
                fingerprint: existingRecord.fingerprint,
                ip: clientIp,
                userAgent: existingRecord.userAgent,
                timeStamp
              });              
            }else{
              console.log("No need to update this record");
            }
          } else {
            // Add a new record
            console.log(`Adding new record for fingerprint: ${fingerprint}`);
            await collection.insertOne({ fingerprint, ip: clientIp, userAgent, timeStamp});
          }

          // Retrieve all records for debugging (optional)
          const allRecords = await collection.find().toArray();
          console.log('Current Records:', allRecords);
        
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', message: 'Data stored successfully' }));
        } catch (dbErr) {
          console.error('Database operation failed', dbErr);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
