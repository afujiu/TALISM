#tauriビルド
npm run tauri build

# macでビルドしたファルの署名削除
xattr -dr com.apple.quarantine /Applications/talism.app
