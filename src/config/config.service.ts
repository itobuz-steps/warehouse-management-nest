import { registerAs } from '@nestjs/config';
import { SignOptions } from 'jsonwebtoken';

export const config = {
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,

  DB_URI: process.env.DB_URI,

  TOKEN_SECRET: process.env.TOKEN_SECRET || 'secret_key',
  TOKEN_EXPIRE: process.env.TOKEN_EXPIRE as SignOptions['expiresIn'],

  MAIL_SERVICE: process.env.MAIL_SERVICE,
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASS: process.env.MAIL_PASS,

  ACCESS_SECRET_KEY: process.env.ACCESS_SECRET_KEY,
  ACCESS_TOKEN_EXPIRY: process.env
    .ACCESS_TOKEN_EXPIRY as SignOptions['expiresIn'],

  REFRESH_SECRET_KEY: process.env.REFRESH_SECRET_KEY,
  REFRESH_TOKEN_EXPIRY: process.env
    .REFRESH_TOKEN_EXPIRY as SignOptions['expiresIn'],

  UPLOAD_FILE_SIZE: Number(process.env.UPLOAD_FILE_SIZE ?? 0),

  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,

  LIMIT: process.env.LIMIT,
  PAGE: process.env.PAGE,

  DEFAULT_QUANTITY: process.env.DEFAULT_QUANTITY,
};

export default registerAs('app', () => {
  return {
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL,

    DB_URI: process.env.DB_URI,

    TOKEN_SECRET: process.env.TOKEN_SECRET || 'secret_key',
    TOKEN_EXPIRE: process.env.TOKEN_EXPIRE as SignOptions['expiresIn'],

    MAIL_SERVICE: process.env.MAIL_SERVICE,
    MAIL_USER: process.env.MAIL_USER,
    MAIL_PASS: process.env.MAIL_PASS,

    ACCESS_SECRET_KEY: process.env.ACCESS_SECRET_KEY,
    ACCESS_TOKEN_EXPIRY: process.env
      .ACCESS_TOKEN_EXPIRY as SignOptions['expiresIn'],

    REFRESH_SECRET_KEY: process.env.REFRESH_SECRET_KEY,
    REFRESH_TOKEN_EXPIRY: process.env
      .REFRESH_TOKEN_EXPIRY as SignOptions['expiresIn'],

    UPLOAD_FILE_SIZE: Number(process.env.UPLOAD_FILE_SIZE ?? 0),

    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,

    LIMIT: process.env.LIMIT,
    PAGE: process.env.PAGE,

    DEFAULT_QUANTITY: process.env.DEFAULT_QUANTITY,
  };
});
