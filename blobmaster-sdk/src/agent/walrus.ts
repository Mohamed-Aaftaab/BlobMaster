/**
 * Walrus SDK integration — interacts directly with Walrus Publisher and Aggregator via HTTP.
 */

export class WalrusClient {
  private publisherUrl: string;
  private aggregatorUrl: string;

  constructor(publisherUrl = 'https://publisher.walrus-testnet.walrus.space', aggregatorUrl = 'https://aggregator.walrus-testnet.walrus.space') {
    this.publisherUrl = publisherUrl;
    this.aggregatorUrl = aggregatorUrl;
  }

  /**
   * Store a buffer in Walrus for a given number of epochs.
   * Returns the newly minted blobId.
   */
  async store(buffer: Buffer | Uint8Array, epochs: number = 5): Promise<string> {
    const res = await fetch(`${this.publisherUrl}/v1/store?epochs=${epochs}`, {
      method: 'PUT',
      body: buffer as any,
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Walrus store failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    
    // Walrus returns either newlyCreated or alreadyCertified
    if (data.newlyCreated && data.newlyCreated.blobObject) {
      return data.newlyCreated.blobObject.blobId;
    } else if (data.alreadyCertified && data.alreadyCertified.blobId) {
      return data.alreadyCertified.blobId;
    }

    throw new Error('Walrus store returned unexpected JSON format');
  }

  /**
   * Retrieve a blob's contents from Walrus.
   * Returns the buffer.
   */
  async retrieve(blobId: string): Promise<Buffer> {
    const res = await fetch(`${this.aggregatorUrl}/v1/${blobId}`, {
      method: 'GET',
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Walrus retrieve failed (${res.status}): ${text}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

// Default export instance for quick usage
export const walrus = new WalrusClient();
