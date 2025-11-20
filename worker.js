import { httpServerHandler } from 'cloudflare:node';
import app from './src/index.js'; // Import your express app instance

export default httpServerHandler(app);