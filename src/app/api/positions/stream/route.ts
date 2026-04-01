import { onPositionUpdates, type PositionUpdate, type VehicleStateUpdate } from "@/lib/position-events";
import { getApiSession } from "@/lib/auth";

const HEARTBEAT_INTERVAL_MS = 30_000;

export async function GET(request: Request): Promise<Response> {
  const session = await getApiSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { signal } = request;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(chunk: string) {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Stream may already be closed
        }
      }

      // Subscribe to position updates
      const unsubscribe = onPositionUpdates((updates: PositionUpdate[]) => {
        const payload: VehicleStateUpdate = { vehicles: updates };
        send(`data: ${JSON.stringify(payload)}\n\n`);
      });

      // Heartbeat to keep the connection alive
      const heartbeat = setInterval(() => {
        send(": heartbeat\n\n");
      }, HEARTBEAT_INTERVAL_MS);

      // Clean up when the client disconnects
      signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
