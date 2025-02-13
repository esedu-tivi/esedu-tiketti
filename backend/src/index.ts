import { httpServer } from './app.js';

const port = process.env.PORT || 3000;

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 
