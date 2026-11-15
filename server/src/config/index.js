require('dotenv').config();

const required = ['DATABASE_URL', 'JWT_SECRET'];

function readConfig() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy server/.env.example to server/.env and fill in the values.'
    );
  }

  return {
    env: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 5000,
    databaseUrl: process.env.DATABASE_URL,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  };
}

module.exports = readConfig();
