import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pages = [
  'features.html',
  'how-it-works.html',
  'integrations.html',
  'pricing.html',
  'about.html',
  'blog.html',
  'careers.html',
  'documentation.html',
  'api-reference.html',
  'support.html',
  'status.html',
  'cookies.html',
  'security.html'
];

const publicDir = path.join(__dirname, 'frontend', 'public');

pages.forEach(pageName => {
  const filePath = path.join(publicDir, pageName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${pageName} - file not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove old header sections
  content = content.replace(/<header class="header">[\s\S]*?<\/header>/g, '');
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Cleaned ${pageName}`);
});

console.log('\n🎉 All pages cleaned successfully!');
