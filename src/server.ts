import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { basicAuthMiddleware } from './middlewareAuth';
import { makeCommitment, register } from './ensUtils';
import dotenv from 'dotenv';

import https from 'https';
import fs from 'fs';

dotenv.config();

const app: Express = express();
app.use(cors());
app.use(express.json())

const router = express.Router();

router.all('/api/v1/private/*', basicAuthMiddleware)

router.get('/api/v1/public/a', (req: Request, res: Response) => {
    res.send('Este si es public');
});

router.post('/api/v1/private/commitment', async (req: Request, res: Response) => {

    try {
        const { name, address } = req.body

        if (!name || !address) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const result = await makeCommitment(name, address)

        if (result.available === false) {
            return res.status(200).json({ available: false });
        }

        res.status(200).json({ salt: result.salt, tx: result.tx });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred on the server' });
    }
});


router.post('/api/v1/private/register', async (req: Request, res: Response) => {

    try {
        const { name, duration, salt, address } = req.body

        if (!name || !duration || !salt || !address) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const tx = await register(name, duration, salt, address)

        res.status(200).send({ tx: tx });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred on the server' });
    }
});


app.use(router)



if (process.env.ENV === 'production') {

    if(process.env.HTTPS === 'true'){
        const keyPath = '/certificates/genesix.xyz.key'
        const certPath = '/certificates/genesix_xyz.crt'
        const caPath = '/certificates/genesix_xyz.ca-bundle'
    
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
