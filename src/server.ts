import express from 'express';
import anreuRouter from './routes/anreu';
import kycRouter from './routes/kyc';
import auctionRouter from './routes/auction';
import swaggerUi from 'swagger-ui-express';
const swaggerSpec = require('../../swagger');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/v1/anreu', anreuRouter);
app.use('/api/v1/kyc', kycRouter);
app.use('/api/v1/auction', auctionRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
