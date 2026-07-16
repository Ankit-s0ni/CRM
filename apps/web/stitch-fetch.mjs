import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function run() {
  try {
    const apiKey = process.env.STITCH_API_KEY;
    if (!apiKey) {
      throw new Error("STITCH_API_KEY is required");
    }

    const transport = new SSEClientTransport(new URL("https://stitch.googleapis.com/mcp"), {
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
    
    const tools = await client.listTools();
    console.log("Tools:", JSON.stringify(tools, null, 2));
    
    const prompts = await client.listPrompts();
    console.log("Prompts:", JSON.stringify(prompts, null, 2));

    await transport.close();
  } catch (error) {
    console.error("Error:", error);
  }
}
run();
