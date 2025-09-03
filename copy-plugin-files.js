const fs = require('fs');
const path = require('path');

// コピーするファイル・ディレクトリ（publicディレクトリから）
const filesToCopy = [
  'manifest.json',
  'css',
  'html', 
  'image',
  'js'
];

// publicディレクトリのパス
const publicDir = 'public';

// ディレクトリを再帰的にコピーする関数
function copyDir(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.readdirSync(srcDir).forEach(file => {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    
    if (fs.statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}

// ファイル・ディレクトリをコピー
filesToCopy.forEach(item => {
  const srcPath = path.resolve(publicDir, item);
  const destPath = path.resolve('dist', item);
  
  if (fs.existsSync(srcPath)) {
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
    console.log(`Copied: ${item}`);
  } else {
    console.log(`Not found: ${item}`);
  }
});

console.log('Plugin files copied to dist/ directory');
