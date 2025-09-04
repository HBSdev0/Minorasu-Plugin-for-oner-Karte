const fs = require('fs');
const path = require('path');

/**
 * ライセンスヘッダーをファイルに追加するスクリプト
 * ビルド完了後にdesktop.jsとconfig.jsにライセンスヘッダーを自動追加
 */

// ライセンスヘッダーファイルのパス
const LICENSE_HEADER_PATH = path.join(__dirname, 'LICENSE_HEADER.txt');

// 対象ファイルのパス
const TARGET_FILES = [
  path.join(__dirname, 'dist', 'desktop.js'),
  path.join(__dirname, 'dist', 'js', 'config.js')
];

// ビルド日時を取得
const buildDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式

function addLicenseHeader() {
  try {
    // ライセンスヘッダーファイルを読み込み
    if (!fs.existsSync(LICENSE_HEADER_PATH)) {
      console.error('❌ LICENSE_HEADER.txt が見つかりません:', LICENSE_HEADER_PATH);
      process.exit(1);
    }

    let licenseHeader = fs.readFileSync(LICENSE_HEADER_PATH, 'utf8');
    
    // ビルド日時を置換
    licenseHeader = licenseHeader.replace('${BUILD_DATE}', buildDate);

    console.log('📄 ライセンスヘッダーを追加中...');

    // 各対象ファイルにライセンスヘッダーを追加
    TARGET_FILES.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        // 既存のファイル内容を読み込み
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // 既にライセンスヘッダーが含まれているかチェック
        if (fileContent.includes('オーナーカルテ用試算ダッシュボード追加プラグイン')) {
          console.log(`⚠️  ${path.basename(filePath)} には既にライセンスヘッダーが含まれています`);
          return;
        }

        // ライセンスヘッダーを先頭に追加
        const newContent = licenseHeader + '\n' + fileContent;
        
        // ファイルに書き込み
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✅ ${path.basename(filePath)} にライセンスヘッダーを追加しました`);
      } else {
        console.log(`⚠️  ${path.basename(filePath)} が見つかりません: ${filePath}`);
      }
    });

    console.log('🎉 ライセンスヘッダーの追加が完了しました');
  } catch (error) {
    console.error('❌ ライセンスヘッダーの追加中にエラーが発生しました:', error.message);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみ実行
if (require.main === module) {
  addLicenseHeader();
}

module.exports = { addLicenseHeader };
