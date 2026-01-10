import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { clickRoute } from './routes/click';
import { installRoute } from './routes/install';
import { wellKnownRoute } from './routes/wellknown';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use(wellKnownRoute);
app.use(clickRoute);
app.use(installRoute);

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});