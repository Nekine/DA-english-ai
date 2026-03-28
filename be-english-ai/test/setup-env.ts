process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test_jwt_secret";
process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? "EngAce";
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "EngAceUsers";
process.env.JWT_EXPIRE_MINUTES = process.env.JWT_EXPIRE_MINUTES ?? "60";
process.env.DB_URL = process.env.DB_URL ?? "test_db_url";
