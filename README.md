# Professor AI Math Helper
Chat with this AI math tutor to not just give you an answer to your math problems, but uses Socratic questioning to help arrive at your answer.
# Setup
1. Run ```npm install```
2. Get a free Gemini API key at https://aistudio.google.com/apikey
   - Rename .env.example to .env and set ```GEMINI_API_KEY=your_key_here```
3. Start the backend (ExpressJS server) with ```node index.js``` (http://localhost:3001)
4. Start the frontend (Vite) with ```npm run dev``` (http://localhost:5174)
   - If you get a permission denied error, run ```chmod +x node_modules/.bin/vite``` and try again
