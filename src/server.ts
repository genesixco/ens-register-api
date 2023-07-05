import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import publicRoutes from './routes/publicRoutes';
import privateRoutes from './routes/privateRoutes';
import swaggerUi from 'swagger-ui-express';
import specs from './swagger'
import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';

dotenv.config();

const app: Express = express();
app.use(cors());
app.use(express.json())

app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use(publicRoutes)
app.use(privateRoutes)


if (process.env.ENV === 'production') {

    if(process.env.HTTPS === 'true'){
        const keyPath = '/certificates/ens-api.genesix.xyz.key'
        const certPath = '/certificates/ens-api_genesix_xyz.crt'
        const caPath = '/certificates/ens-api_genesix_xyz.ca-bundle'
    
        const options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
            ca: fs.readFileSync(caPath)
        };
    
        https.createServer(options, app).listen(443, () => {
            console.log(`⚡️[server]: Server is running at https://ens-api.genesix.xyz:443 (HTTPS)`);
        });
    } else {
        app.listen(80, () => {
            console.log(`⚡️[server]: Server is running at http://ens-api.genesix.xyz:80 (HTTP)`);
        });
    }

} else {
    app.listen(8000, () => {
        console.log(`⚡️[server]: Server is running at http://ens-api.genesix.xyz:8000 (HTTP)`);
    });
}
