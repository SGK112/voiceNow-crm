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
  'privacy.html',
  'terms.html',
  'contact.html',
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
  
  // Add shared-styles.css if not present
  if (!content.includes('shared-styles.css')) {
    content = content.replace(
      '</head>',
      '    <link rel="stylesheet" href="/shared-styles.css">\n</head>'
    );
  }
  
  // Add shared-components.js if not present
  if (!content.includes('shared-components.js')) {
    content = content.replace(
      '</body>',
      '    <script src="/shared-components.js"></script>\n</body>'
    );
  }
  
  // Add nav placeholder after <body> if not present
  if (!content.includes('id="nav-placeholder"')) {
    content = content.replace(
      '<body>',
      '<body>\n    <div id="nav-placeholder"></div>\n'
    );
  }
  
  // Add footer placeholder before </body> if not present
  if (!content.includes('id="footer-placeholder"')) {
    content = content.replace(
      '<script src="/shared-components.js"></script>',
      '    <div id="footer-placeholder"></div>\n    <script src="/shared-components.js"></script>'
    );
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Updated ${pageName}`);
});

console.log('\n🎉 All pages updated successfully!');
