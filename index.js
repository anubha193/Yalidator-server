const http = require('http');
const cors = require('cors');

// Middleware for CORS
const corsMiddleware = cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Data storage (Use a database like MongoDB, Redis, or any DB for production)
const userRecords = new Map(); // Map to store fingerprint, IP, and userAgent

const server = http.createServer((req, res) => {
  corsMiddleware(req, res, () => {
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

      req.on('end', () => {
        console.log(`Received request body: ${body}`);

        let payload;
        try {
          payload = JSON.parse(body); // Parse the JSON payload
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }

        // Extract fingerprint and userAgent from payload
        const { fingerprint, userAgent } = payload;

        if (!fingerprint || !userAgent) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Fingerprint and userAgent are required' }));
        }

        // Check if the fingerprint already exists
        if (userRecords.has(fingerprint)) {
          const record = userRecords.get(fingerprint);
          // If the IP or userAgent has changed, update the record
          if (record.ip !== clientIp || record.userAgent !== userAgent) {
            console.log(`Updating record for fingerprint: ${fingerprint}`);
            userRecords.set(fingerprint, { ip: clientIp, userAgent });
          }
        } else {
          // Add a new record
          console.log(`Adding new record for fingerprint: ${fingerprint}`);
          userRecords.set(fingerprint, { ip: clientIp, userAgent });
        }

        console.log('Current Records:', Array.from(userRecords.entries()));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Data stored successfully' }));
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
