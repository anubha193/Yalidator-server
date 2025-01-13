const http = require('http');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const os = require('os');
const https = require('https');

const corsMiddleware = cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Function to get the local IP address of the server
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  console.log("interfaces" +interfaces);
  for (const interfaceName in interfaces) {
    const interfaceDetails = interfaces[interfaceName];
    for (const iface of interfaceDetails) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // Default to localhost if no local IP found
}

// Function to get the public IP address of the server
async function getPublicIP() {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data.trim()));
    }).on('error', (err) => reject(err));
  });
}

// Determine whether we are on a remote server or localhost
async function getMongoUrl() {
  try {
    // Check if the server is running locally by inspecting the hostname
    const localIP = getLocalIP();
    console.log("localIP = "+localIP);
    console.log("localIP = "+os.hostname());
    if (localIP === '127.0.0.1' || localIP === '10.5.48.124') {
      // It's a local environment, use the local MongoDB URL
      return 'mongodb://127.0.0.1:27017';
    }

    // Otherwise, fetch the public IP for remote servers
    const publicIp = await getPublicIP();
    console.log("publicIP = "+ publicIp);
    console.log(`mongodb://${publicIp}:27017`);
    return `mongodb://${publicIp}:27017`; // Use public IP if available
  } catch (err) {
    console.error('Failed to fetch public IP. Falling back to local IP.', err);
    return 'mongodb://127.0.0.1:27017'; // Fallback to localhost IP if error occurs
  }
}

(async () => {
  const mongoUrl = 'mongodb+srv://User123:Anubha88%40%40%23@cluster0.fu8ny.mongodb.net/?retryWrites=true&w=majority'; //'mongodb://127.0.0.1:27017';
  const dbName = 'fingerprintDB';
  const collectionName = 'records';

  const client = new MongoClient(mongoUrl, {
    ssl: true,
  });
  let db, collection;

  async function initMongoDB() {
    try {
      await client.connect();
      console.log('Connected to MongoDB');
      db = client.db(dbName);
      collection = db.collection(collectionName);

      const PORT = 3000;
      server.listen(PORT, () => {
        console.log(`Server is running on ${mongoUrl.replace('mongodb://', '').replace(':27017', '')}:${PORT}`);
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
            console.log(fingerprint)
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
})();
