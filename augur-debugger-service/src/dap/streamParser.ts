/**
 * Helper class to parse DAP (Debug Adapter Protocol) messages from a raw Buffer stream.
 * DAP messages consist of a header "Content-Length: <size>\r\n\r\n" followed by JSON data.
 */
export class DapStreamParser {
    private buffer: Buffer;
    private contentLength: number | null;

    constructor() {
        this.buffer = Buffer.alloc(0);
        this.contentLength = null;
    }

    /**
     * Handles incoming raw data chunks and returns extracted JSON messages.
     */
    public handleData(data: Buffer): any[] {
        this.buffer = Buffer.concat([this.buffer, data]);
        const messages: any[] = [];

        while (true) {
            if (this.contentLength === null) {
                // We are looking for the header
                const headerSep = '\r\n\r\n';
                const idx = this.buffer.indexOf(headerSep);
                
                if (idx !== -1) {
                    const header = this.buffer.toString('utf8', 0, idx);
                    const match = header.match(/Content-Length: (\d+)/);
                    
                    if (match) {
                        this.contentLength = parseInt(match[1], 10);
                        // Remove header from buffer
                        this.buffer = this.buffer.subarray(idx + headerSep.length);
                    } else {
                        // Malformed header? Skip it or throw error. For now, clear buffer.
                        console.error('[DapStreamParser] Malformed header, clearing buffer');
                        this.buffer = Buffer.alloc(0);
                        break;
                    }
                } else {
                    // Header not fully received yet
                    break;
                }
            }

            if (this.contentLength !== null) {
                // We are looking for the body
                if (this.buffer.length >= this.contentLength) {
                    const bodyBuf = this.buffer.subarray(0, this.contentLength);
                    const bodyStr = bodyBuf.toString('utf8');
                    
                    try {
                        const message = JSON.parse(bodyStr);
                        messages.push(message);
                    } catch (e) {
                        console.error('[DapStreamParser] JSON parse error:', e);
                    }

                    // Remove body from buffer
                    this.buffer = this.buffer.subarray(this.contentLength);
                    this.contentLength = null; // Reset state to look for next header
                } else {
                    // Body not fully received yet
                    break;
                }
            }
        }

        return messages;
    }
}