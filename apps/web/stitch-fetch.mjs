import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function run() {
  try {
    const apiKey = process.env.STITCH_API_KEY;
    if (!apiKey) {
      throw new Error("STITCH_API_KEY is required");
    }

    const transport = new StreamableHTTPClientTransport(new URL("https://stitch.googleapis.com/mcp"), {
      requestInit: {
        headers: { "X-Goog-Api-Key": apiKey }
      }
    });
    
    const client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transport);
    
    console.log("Connected to Stitch MCP Server.");
    
    await transport.close();
    console.log("Stitch MCP connection verified.");
  } catch (error) {
    console.error("Error:", error);
  }
}
run();
