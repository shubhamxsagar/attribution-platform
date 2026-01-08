import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { clickRoute } from './routes/click';
import { installRoute } from './routes/install';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use(clickRoute);
app.use(installRoute);

// AASA File (iOS)
app.get('/.well-known/apple-app-site-association', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    "applinks": {
      "apps": [],
      "details": [{
          "appID": "YOUR_TEAM_ID.com.creditsea.app",
          "paths": [ "/r/*" ]
      }]
    }
  });
});

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});