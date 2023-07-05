import { Router, Request, Response } from 'express';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check the health status of the service.
 *     tags:
 *       - Public Endpoints
 *     responses:
 *       '200':
 *         description: Successful response.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the service.
 *                   example: OK
 */
router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'OK' });
});

export default router;