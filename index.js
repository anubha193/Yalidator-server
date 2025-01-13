const http = require('http');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const corsMiddleware = cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

const mongoUrl = 'mongodb://127.0.0.1:27017'; // Update with your MongoDB URL
const dbName = 'fingerprintDB';
const collectionName = 'records';

const client = new MongoClient(mongoUrl);
let db, collection;

async function initMongoDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(dbName);
    collection = db.collection(collectionName);

    const PORT = 3000;
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1); // Exit the application if the database fails to connect
  }
}

// Initialize MongoDB connection
initMongoDB();

const server = http.createServer(async (req, res) => {
  corsMiddleware(req, res, async () => {
    if (!collection) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Database is not initialized' }));
    }

    let clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const payload = JSON.parse(body);
          const { fingerprint, userAgent, timeStamp } = payload;

          if (!fingerprint || !userAgent) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Fingerprint and userAgent are required' }));
          }

          const existingRecord = await collection.findOne({ fingerprint });

          if (existingRecord) {
            if (existingRecord.ip !== clientIp) {
              await collection.insertOne({ fingerprint, ip: clientIp, userAgent, timeStamp });
            }
          } else {
            await collection.insertOne({ fingerprint, ip: clientIp, userAgent, timeStamp });
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success', message: 'Data stored successfully' }));
        } catch (err) {
          console.error('Error processing request', err);
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
