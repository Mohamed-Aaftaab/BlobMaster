import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';
import { BlobMaster } from './blobmaster-sdk/src/BlobMaster.ts';

async function runTest() {
  console.log('Starting E2E Test...');
  
  // 1. User Setup
  const userRaw = fromB64('AE91sjevEqeLzyGNcvFa+zdnwmHBL9kzhkN3kBhk+2Y6');
  const userKeypair = Ed25519Keypair.fromSecretKey(userRaw.slice(1));
  console.log('User Address:', userKeypair.toSuiAddress());

  // 2. Initialize SDK
  const bm = new BlobMaster({
    network: 'testnet',
    suiRpc: 'https://testnet.sui.rpcpool.com/'
  });

  // 3. Create Vault
  console.log('Creating Vault...');
  const createTx = bm.createVaultTx();
  const createResult = await bm.suiClient.signAndExecuteTransactionBlock({
    signer: userKeypair,
    transactionBlock: createTx,
    options: { showEffects: true, showEvents: true, showObjectChanges: true }
  });
  
  if (createResult.effects?.status.status !== 'success') {
    throw new Error('Failed to create vault: ' + createResult.effects?.status.error);
  }

  // Find the created Vault ID
  const vaultId = createResult.objectChanges?.find(c => c.type === 'created' && c.objectType.includes('Vault')) as any;
  if (!vaultId?.objectId) throw new Error('Could not parse vault ID');
  console.log('✅ Vault Created:', vaultId.objectId);

  await new Promise(r => setTimeout(r, 2000));

  // 4. Deposit SUI
  console.log('Depositing 0.5 SUI...');
  const depositTx = bm.depositSuiTx(vaultId.objectId, 0.5);
  const depositResult = await bm.suiClient.signAndExecuteTransactionBlock({
    signer: userKeypair,
    transactionBlock: depositTx,
    options: { showEffects: true }
  });
  if (depositResult.effects?.status.status !== 'success') {
    throw new Error('Failed to deposit: ' + depositResult.effects?.status.error);
  }
  console.log('✅ Deposited SUI to Vault');

  await new Promise(r => setTimeout(r, 2000));

  // 5. Upload a dummy blob to Walrus Publisher
  console.log('Uploading dummy blob to Walrus...');
  const randomData = 'Test data ' + Date.now();
  const blobId = await bm.uploadBlob(randomData, 30);
  console.log('✅ Blob Uploaded! ID:', blobId);

  // 6. Register Autopilot Rule (Set threshold to 50 so it triggers immediately)
  console.log('Registering Autopilot Rule (threshold 50)...');
  const registerTx = bm.registerAutopilotTx(vaultId.objectId, {
    blobId,
    renewWhenEpochsLeft: 50, // Immediate trigger!
    epochsToAdd: 30
  });

  const registerResult = await bm.suiClient.signAndExecuteTransactionBlock({
    signer: userKeypair,
    transactionBlock: registerTx,
    options: { showEffects: true }
  });
  
  if (registerResult.effects?.status.status !== 'success') {
    throw new Error('Failed to register autopilot: ' + registerResult.effects?.status.error);
  }
  console.log('✅ Autopilot Registered!');
  console.log('--- TEST DATA READY FOR KEEPER ---');
}

runTest().catch(console.error);
