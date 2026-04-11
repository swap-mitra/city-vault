import { PinataSDK } from "pinata-web3";

let pinataClient: PinataSDK | null = null;

function requireEnv(name: "PINATA_JWT" | "NEXT_PUBLIC_GATEWAY_URL") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

function normalizeGatewayUrl(gatewayUrl: string) {
  return gatewayUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export function getPinataClient() {
  if (!pinataClient) {
    pinataClient = new PinataSDK({
      pinataJwt: requireEnv("PINATA_JWT"),
      pinataGateway: requireEnv("NEXT_PUBLIC_GATEWAY_URL"),
    });
  }

  return pinataClient;
}

export function getGatewayUrl(cid: string) {
  const gatewayHost = normalizeGatewayUrl(
    requireEnv("NEXT_PUBLIC_GATEWAY_URL")
  );

  return `https://${gatewayHost}/ipfs/${cid}`;
}
