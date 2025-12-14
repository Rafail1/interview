

const { DataSource } = require('typeorm');
const dotenv = require('dotenv');
const path = require('path');


dotenv.config();

module.exports = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: true,
  
  
  entities: [path.join(__dirname, 'dist/**/*.entity.js')],
  
  
  migrations: [path.join(__dirname, 'dist/migrations/**/*.js')],
  subscribers: [],
});
