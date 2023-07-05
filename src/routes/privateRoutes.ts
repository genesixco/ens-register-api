import { Router, Request, Response } from 'express';
import { basicAuthMiddleware } from '../middlewareAuth';
import { makeCommitment, register, checkAvailability, setAddress, getRegisteredENS, getEnsInfo, transferEns, transferRegister } from '../ensUtils';

const router = Router();

router.all('/api/v1/private/*', basicAuthMiddleware)

/**
 * @swagger
 * /api/v1/private/commitment:
 *   post:
 *     summary: Create a commitment to register a domain in the ENS smart contract.
 *     description: Creates a commitment in the ENS smart contract before registering a domain to prevent front-running.
 *     tags:
 *       - Private Endpoints
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the domain to register.
 *               address:
 *                 type: string
 *                 description: The address for which the commitment is being created.
 *             example:
 *               name: "genesixco"
 *               address: "0x1234567890abcdef1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: Commitment created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 salt:
 *                   type: string
 *                   description: The generated salt value for the commitment.
 *                 tx:
 *                   type: string
 *                   description: The transaction hash associated with the commitment.
 *             example:
 *               salt: "0xffa3ec03eb4f949a2453f6c65e76b45df1a4e76019724bf8c17c292c9881d47a"
 *               tx: "0x0e2f780b8c4785a84e9d9a22ff038441c0cdd7e51b38cb3c72e3fa944297438d"
 *       400:
 *         description: Missing or invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Description of the error.
 *               example:
 *                 error: Missing required parameters
 *       401:
 *         description: "Unauthorized: Invalid credentials."
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *             example: "Unauthorized: Invalid credentials."
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Description of the error.
 *               example:
 *                 error: An error occurred on the server.
 */
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
})

/**
 * @swagger
 * /api/v1/private/register:
 *   post:
 *     summary: Register a domain in the ENS smart contract.
 *     description: Registers a domain in the ENS smart contract.
 *     tags:
 *       - Private Endpoints
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the domain to register.
 *               duration:
 *                 type: number
 *                 description: The duration (in seconds) for which the domain will be registered.
 *               salt:
 *                 type: string
 *                 description: The salt value associated with the commitment.
 *               address:
 *                 type: string
 *                 description: The address for which the domain is being registered.
 *             example:
 *               name: "genesixco"
 *               duration: 3600000
 *               salt: "0xffa3ec03eb4f949a2453f6c65e76b45df1a4e76019724bf8c17c292c9881d47a"
 *               address: "0x1234567890abcdef1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: Domain registration tx successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tx:
 *                   type: string
 *                   description: The transaction hash associated with the domain registration.
 *               example:
 *                 tx: "0x0e2f780b8c4785a84e9d9a22ff038441c0cdd7e51b38cb3c72e3fa944297438d"
 *       400:
 *         description: Missing or invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Description of the error.
 *               example:
 *                 error: Missing required parameters
 *       401:
 *         description: "Unauthorized: Invalid credentials."
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *             example: "Unauthorized: Invalid credentials."
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Description of the error.
 *               example:
 *                 error: An error occurred on the server.
 */
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
})

/**
 * @swagger
 * /api/v1/private/check:
 *   get:
 *     summary: Check the availability of a domain in the ENS smart contract.
 *     description: Checks the availability of a domain in the ENS smart contract.
 *     tags:
 *       - Private Endpoints
 *     security:
 *       - BasicAuth: []
 *     parameters:
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: The name of the domain to check availability for.
 *     responses:
 *       200:
 *         description: Domain availability check successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                   description: Indicates whether the domain is available (true) or not (false).
 *               example:
 *                 available: true
 *       400:
 *         description: Missing or invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Description of the error.
 *               example:
 *                 error: Missing required parameters
 *       401:
 *         description: "Unauthorized: Invalid credentials."
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *             example: "Unauthorized: Invalid credentials."
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Description of the error.
 *               example:
 *                 error: An error occurred on the server.
 */
router.get('/api/v1/private/check', async(req: Request, res: Response)=>{
    try{

        const name = req.query.name as string

        const available:boolean = await checkAvailability(name)

        res.status(200).send({ available: available });

    } catch (error){
        console.error(error);
        res.status(500).json({ error: 'An error occurred on the server' });
    }
})

/**
 * @swagger
 * /api/v1/private/setAddress:
 *   post:
 *     summary: Set the address for a domain in the ENS smart contract.
 *     description: Sets the address associated with a domain in the ENS smart contract. This endpoint allows the resolver to resolve the ENS domain to the provided address.
 *     tags:
 *       - Private Endpoints
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the domain to set the address for.
 *               newAddress:
 *                 type: string
 *                 description: The new address to associate with the domain.
 *             example:
 *               name: "genesixco"
 *               newAddress: "0x1234567890abcdef1234567890abcdef12345678"
 *     responses:
 *       200:
 *         description: Address set successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tx:
 *                   type: string
 *                   description: The transaction hash associated with the address set operation.
 *               example:
 *                 tx: "0x0e2f780b8c4785a84e9d9a22ff038441c0cdd7e51b38cb3c72e3fa944297438d"
 *       400:
 *         description: Missing or invalid parameters, or domain not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Description of the error.
 *               example:
 *                 error: Missing required parameters
 *       401:
 *         description: "Unauthorized: Invalid credentials."
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *             example: "Unauthorized: Invalid credentials."
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Description of the error.
 *               example:
 *                 error: An error occurred on the server.
 */
router.post('/api/v1/private/setAddress', async(req: Request, res: Response)=>{
    try{

        const { name, newAddress } = req.body

        if (!name || !newAddress) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const result = await setAddress(name, newAddress)

        if(result && result.error){
            return res.status(400).json({error: result.error})
        }

        return res.status(200).send({ tx: result.tx });


    } catch(error){
        console.error(error)
        res.status(500).json({ error: 'An error ocurred on the server' })
    }
})

/**
 * @swagger
 * /api/v1/private/ens:
 *   get:
 *     summary: Get the list of registered domains with the API.
 *     tags:
 *       - Private Endpoints
 *     security:
 *       - BasicAuth: []
 *     responses:
 *       200:
 *         description: OK. Returns the list of registered domains.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 domains:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of registered domains.
 *       401:
 *         description: Unauthorized. User is not authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the unauthorized access.
 *       500:
 *         description: Internal Server Error. An error occurred on the server.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the server error.
 */
router.get('/api/v1/private/ens', async(req: Request, res: Response)=>{
    try{

        const result = await getRegisteredENS()

        return res.status(200).send({ ...result });

    } catch(error){
        console.error(error)
        res.status(500).json({ error: 'An error ocurred on the server' })
    }
})

/**
 * @swagger
 * /api/v1/private/ens/{name}:
 *   get:
 *     summary: Get information for a specific ENS name.
 *     tags:
 *       - Private Endpoints
 *     security:
 *       - BasicAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The ENS name to retrieve information for.
 *     responses:
 *       '200':
 *         description: Successful response.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 domains:
 *                   type: array
 *                   description: An array of domain objects.
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: The ID of the domain.
 *                       name:
 *                         type: string
 *                         description: The name of the domain.
 *                       labelName:
 *                         type: string
 *                         description: The label name of the domain.
 *                       labelhash:
 *                         type: string
 *                         description: The label hash of the domain.
 *                       expiryDate:
 *                         type: string
 *                         description: The expiry date of the domain.
 *       '400':
 *         description: Bad request. Missing required parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message.
 *       '401':
 *         description: Unauthorized. User is not authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the unauthorized access.
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message.
 */
router.get('/api/v1/private/ens/:name',async(req: Request, res: Response)=>{
    try{

        const { name } = req.params

        if (!name) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const result = await getEnsInfo(name)

        return res.status(200).send({ ...result });

    } catch(error){
        console.error(error)
        res.status(500).json({ error: 'An error ocurred on the server' })
    }
})

/**
 * @swagger
 * /api/v1/private/transferEns:
 *   post:
 *     summary: Transfer ENS token ownership to a new address.
 *     tags:
 *       - Private Endpoints
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The ENS name to transfer ownership.
 *               address:
 *                 type: string
 *                 description: The new address to transfer ownership to.
 *             example:
 *               name: "genesixco"
 *               address: "0x1234567890abcdef1234567890abcdef12345678"
 *     responses:
 *       '200':
 *         description: Successful response.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tx:
 *                   type: string
 *                   description: Transaction hash of the transfer.
 *       '400':
 *         description: Bad request. Missing required parameters or error in the result.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message.
 *       '401':
 *         description: Unauthorized. User is not authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the unauthorized access.
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message.
 */
router.post('/api/v1/private/transferEns', async(req: Request, res: Response)=>{
    try{

        const { name, address } = req.body

        if (!name || !address) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const result = await transferEns(name, address)

        if(result && result.error){
            return res.status(400).json({error: result.error})
        }

        return res.status(200).send({ tx: result.tx });

    } catch(error){
        console.error(error)
        res.status(500).json({ error: 'An error ocurred on the server' })
    }
})

/**
 * @swagger
 * /api/v1/private/transferRegister:
 *   post:
 *     summary: Transfer ownership of a register to a new address.
 *     tags:
 *       - Private Endpoints
 *     security:
 *       - BasicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The register name to transfer ownership.
 *               address:
 *                 type: string
 *                 description: The new address to transfer ownership to.
 *             example:
 *               name: "genesixco"
 *               address: "0x1234567890abcdef1234567890abcdef12345678"
 *             
 *     responses:
 *       '200':
 *         description: Successful response.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tx:
 *                   type: string
 *                   description: Transaction hash of the transfer.
 *       '400':
 *         description: Bad request. Missing required parameters or error in the result.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message.
 *       '401':
 *         description: Unauthorized. User is not authenticated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message indicating the unauthorized access.
 *       '500':
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message.
 */
router.post('/api/v1/private/transferRegister', async(req: Request, res: Response)=>{
    try{

        const { name, address } = req.body

        if (!name || !address) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const result = await transferRegister(name, address)

        if(result && result.error){
            return res.status(400).json({error: result.error})
        }

        return res.status(200).send({ tx: result.tx });

    } catch(error){
        console.error(error)
        res.status(500).json({ error: 'An error ocurred on the server' })
    }
})


export default router