import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { basicAuthMiddleware } from './middlewareAuth';
import { makeCommitment, register } from './ensUtils';
import dotenv from 'dotenv';

import http from 'http';
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

    const { name, owner } = req.body

    const { salt, tx } = await makeCommitment(name, owner)

    res.status(200).json({ salt: salt, tx: tx });
});

router.get('/api/v1/private/register', async (req: Request, res: Response) => {

    const { name, owner, duration, salt } = req.body

    if (!name || !owner || !duration || !salt) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const tx = await register(name, owner, duration, salt)

    res.status(200).send({ tx: tx });
});

app.use(router)

//const port = process.env.PORT;


if (process.env.ENV === 'production' && process.env.HTTPS === 'true') {

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
