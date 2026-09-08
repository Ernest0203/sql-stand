import express from 'express';
import cors from 'cors';
import { router } from './routes.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SQL stand API running on http://localhost:${PORT}`);
});