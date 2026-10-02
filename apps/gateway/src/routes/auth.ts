import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

const router: Router = Router();

router.post('/oauth/token', (req: Request, res: Response) => {
  const { client_id, client_secret } = req.body || {};

  if (!client_id || !client_secret) {
    res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing client_id or client_secret parameter',
    });
    return;
  }

  if (client_id !== config.oauthClientId || client_secret !== config.oauthClientSecret) {
    res.status(401).json({
      error: 'invalid_client',
      error_description: 'Invalid client credentials',
    });
    return;
  }

  const payload = {
    sub: client_id,
    clientId: client_id,
  };

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });

  res.status(200).json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 3600,
  });
});

export default router;
