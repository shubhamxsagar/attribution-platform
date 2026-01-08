import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { clickRoute } from './routes/click';
import { installRoute } from './routes/install';

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Register Routes
app.use(clickRoute);   // Handles web clicks
app.use(installRoute); // Handles app installs

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Attribution Server running on port ${PORT}`);
});