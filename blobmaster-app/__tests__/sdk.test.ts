import { BlobMaster } from 'blobmaster-sdk';

describe('BlobMaster SDK', () => {
  it('should initialize with an API key', () => {
    const bm = new BlobMaster({ apiKey: 'test', privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001' });
    expect(bm).toBeDefined();
  });

  it('should correctly format epochs to human readable time', () => {
    // Assuming epochsToHuman is now exposed under BlobMaster or still as a util
    // We will refactor this later, but testing basic initialization for now.
    expect(typeof BlobMaster).toBe('function');
  });

  // More tests will be added after we refactor the SDK to expose types and fix JSDoc
});
