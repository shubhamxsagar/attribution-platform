import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { clickRoute } from './routes/click';
import { installRoute } from './routes/install';
// 1. Import the new route
import { wellKnownRoute } from './routes/wellknown'; 
import './workers/matchWorker';

const app = express();

app.use(cors());
app.use(bodyParser.json());

// 2. Use the route
app.use(wellKnownRoute); // <--- ADD THIS
app.use(clickRoute);
app.use(installRoute);

const PORT = 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Attribution Server running on port ${PORT}`);
});