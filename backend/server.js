import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES6 equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import eventRoutes from './routes/eventRoutes.js';
// import { connectDB } from './config/db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Mount API routes
app.use('/api/events', eventRoutes);

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Initial DB connection check for All Apps
  // await connectDB('All Apps');
});
