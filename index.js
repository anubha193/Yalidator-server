const express = require("express");
const cors = require("cors");

// Initialize an Express app
const app = express();

// Use CORS middleware
app.use(
  cors({
    origin: "*", // Allow all origins (you can change this to a specific domain if needed)
    methods: ["GET", "POST"], // Allow GET and POST methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
  })
);

// Middleware to parse JSON bodies
app.use(express.json());

app.get("/", (req, res) => {
  res.status("Hey This is Yallidator Server");
});
// Route for POST requests
app.post("/data", (req, res) => {
  // Get the client's IP address
  let clientIp =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress;

  // If the X-Forwarded-For header contains multiple IPs, the first one is the real client IP
  if (clientIp && clientIp.indexOf(",") !== -1) {
    clientIp = clientIp.split(",")[0];
  }

  console.log(`Client IP Address: ${clientIp}`);

  console.log(`Received request body: ${JSON.stringify(req.body)}`);

  // Send a response
  res.status(200).json({
    status: "success",
    received: req.body,
  });
});

// Handle non-POST requests
app.all("*", (req, res) => {
  res.status(405).json({ error: "Method not allowed" });
});

// Start the server
const PORT = process.env.PORT || 3000; // Default to 3000 if no environment variable is set
app.listen(PORT, "0.0.0.0", () => {
  // Ensure it's listening on 0.0.0.0
  console.log(`Server is running on http://localhost:${PORT}`);
});