import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { prisma } from '../../db/client';

export const authRouter = Router();

const institutionalAuthUrl = process.env.INSTITUTIONAL_AUTH_URL || 'http://10.0.0.59:53614/';
const institutionalSuccessMarker = process.env.INSTITUTIONAL_AUTH_SUCCESS_MARKER || '/Principal/Principal';

function createToken(userId: string, username: string) {
  const secret: jwt.Secret = process.env.JWT_SECRET || 'secret';
  return jwt.sign(
    { userId, username },
    secret,
    { expiresIn: '8h' }
  );
}

authRouter.post('/login', async (req: Request, res: Response) => {
  const { username, password, authType = 'local' } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  if (authType === 'institutional') {
    const form = new URLSearchParams({
      Usuario: username,
      Contrasenia: password,
    });

    try {
      const response = await axios.post(institutionalAuthUrl, form.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
        timeout: 10000,
      });

      const responseBody = typeof response.data === 'string' ? response.data : '';
      if (!responseBody.includes(institutionalSuccessMarker)) {
        res.status(401).json({ error: 'Invalid institutional credentials' });
        return;
      }

      const token = createToken(`institutional:${username}`, username);
      res.json({ token, username, authType: 'institutional' });
      return;
    } catch (error: any) {
      const serverUnavailable = !error.response || ['ECONNABORTED', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error.code);
      if (serverUnavailable) {
        res.status(503).json({
          code: 'INSTITUTIONAL_AUTH_UNAVAILABLE',
          error: 'El servidor de autenticación institucional está desconectado',
        });
        return;
      }

      res.status(401).json({ error: 'Credenciales institucionales inválidas' });
      return;
    }
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = createToken(user.id, user.username);

  res.json({ token, username: user.username, authType: 'local' });
});

authRouter.post('/change-password', async (req: Request, res: Response) => {
  const { username, currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: 'Invalid current password' }); return; }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ message: 'Password changed successfully' });
});
