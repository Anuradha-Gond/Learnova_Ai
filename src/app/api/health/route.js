export const dynamic = "force-dynamic";

/**
 * GET /api/health — System health and architecture status check
 */
export async function GET() {
  return Response.json({
    status: "healthy",
    platform: "Learnova AI",
    version: "0.1.0",
    designSystem: "educational-light-indigo-teal",
    timestamp: new Date().toISOString(),
  });
}
