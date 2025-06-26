import express from 'express';
import dotenv from 'dotenv';
import snaptradeRoutes from './routes/snaptradeRoutes';
import { NotFoundErrorHandler } from './errors/NotFoundErrorHandler';
import { GlobalErrorHandler } from './errors/GlobalErrorHandler';
import cors from 'cors';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));


app.use('/api/snaptrade', snaptradeRoutes);

app.use(NotFoundErrorHandler);  
app.use(GlobalErrorHandler);  

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});