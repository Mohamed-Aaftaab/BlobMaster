const fs = require('fs')
const path = require('path')

const REPLACEMENTS = [
  { from: /storkeep-sdk/g, to: 'blobmaster-sdk' },
  { from: /StorKeep/g, to: 'BlobMaster' },
  { from: /storkeep/g, to: 'blobmaster' },
  { from: /dealId/g, to: 'blobId' },
  { from: /deals/g, to: 'blobs' },
  { from: /Deal/g, to: 'Blob' },
  { from: /deal/g, to: 'blob' },
  { from: /getDealFromChain/g, to: 'getBlobStorageInfo' },
  { from: /filecoinTxHash/g, to: 'suiTxHash' },
  { from: /FILFOX/g, to: 'SUIVISION' },
  { from: /filfox/g, to: 'suivision' },
  { from: /Filecoin/g, to: 'Sui' },
  { from: /filecoin/g, to: 'sui' },
  { from: /lighthouse/g, to: 'walrus' },
  { from: /Lighthouse/g, to: 'Walrus' },
  { from: /RaaS/g, to: 'native extension' },
]

function processDir(dir) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'migrate.js') continue
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      processDir(fullPath)
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.md')) {
      let content = fs.readFileSync(fullPath, 'utf8')
      let changed = false
      for (const { from, to } of REPLACEMENTS) {
        if (content.match(from)) {
          content = content.replace(from, to)
          changed = true
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8')
        console.log(`Updated ${fullPath}`)
      }
    }
  }
}

processDir(__dirname)
console.log('Migration complete.')
