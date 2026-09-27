import { GET as healthGet } from "../health/route";

export async function GET() {
  return healthGet();
}
