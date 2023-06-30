
export const basicAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      // Extrae el usuario y la contraseña de las credenciales
      const [username, password] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  
      if (username === process.env.USERNAME && password === process.env.PASSWORD) {
        next();
      } else {
        res.status(401).send('Unauthorized: Invalid credentials.');
      }
    } else {
      res.status(401).send('Unauthorized: Required Credentials');
    }
};
