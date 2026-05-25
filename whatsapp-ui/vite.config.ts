import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'serve-media',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Capture media asset requests for local dev playbacks
          const prefix = '/Chat-History-With-Ayang/DOC-20260524-WA0015/';
          if (req.url && req.url.startsWith(prefix)) {
            const fileName = decodeURIComponent(req.url.slice(prefix.length));
            
            // Check both standard location (inside docs) and root fallback folder
            const docsPath = join(process.cwd(), '../docs/DOC-20260524-WA0015', fileName);
            const rootPath = join(process.cwd(), '../DOC-20260524-WA0015', fileName);
            
            const filePath = existsSync(docsPath) ? docsPath : (existsSync(rootPath) ? rootPath : null);
            
            if (filePath) {
              let contentType = 'application/octet-stream';
              const ext = fileName.toLowerCase();
              if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) contentType = 'image/jpeg';
              else if (ext.endsWith('.png')) contentType = 'image/png';
              else if (ext.endsWith('.webp')) contentType = 'image/webp';
              else if (ext.endsWith('.gif')) contentType = 'image/gif';
              else if (ext.endsWith('.mp4')) contentType = 'video/mp4';
              else if (ext.endsWith('.mp3')) contentType = 'audio/mpeg';
              else if (ext.endsWith('.wav')) contentType = 'audio/wav';
              else if (ext.endsWith('.ogg')) contentType = 'audio/ogg';
              else if (ext.endsWith('.pdf')) contentType = 'application/pdf';
              
              res.setHeader('Content-Type', contentType);
              res.end(readFileSync(filePath));
              return;
            }
          }
          next();
        });
      }
    }
  ],
  base: '/Chat-History-With-Ayang/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  }
})
