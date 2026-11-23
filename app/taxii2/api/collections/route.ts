import { collectionInfo } from "@/lib/taxii/core";
import { checkAccept, taxiiJson } from "@/lib/taxii/http";

/** TAXII 2.1 — Get Collections. */
export async function GET(request: Request) {
  return checkAccept(request) ?? taxiiJson({ collections: [collectionInfo()] });
}
