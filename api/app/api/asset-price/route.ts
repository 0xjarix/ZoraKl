import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// @ts-ignore
import Client from "mina-signer";
import fetch from "node-fetch";
const client = new Client({ network: process.env.NETWORK_KIND ?? "testnet" });

// Implement toJSON for BigInt so we can include values in response
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function getSignedPriceData(asset: string) {
  // The private key of our account. When running locally the hardcoded key will
  // be used. In production the key will be loaded from a Vercel environment
  // variable.
  let privateKey = process.env.PRIVATE_KEY ?? "";
  ("EKF65JKw9Q1XWLDZyZNGysBbYG21QbJf3a4xnEoZPZ28LKYGMw53");

  let coin = "mina-protocol";
  switch (asset) {
    case "mina":
      coin = "mina-protocol";
      break;
    case "btc":
      coin = "bitcoin";
      break;
    case "bitcoin":
      coin = "bitcoin";
      break;
    case "eth":
      coin = "ethereum";
      break;
    case "ethereum":
      coin = "ethereum";
      break;

    default:
      coin = "mina-protocol";
      break;
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-cg-demo-api-key": process.env.COINGECKO_API_KEY || "",
    },
  });
  const resData: any = await response.json();
  const price = resData[coin]["usd"];
  const priceWithDecimals = Math.trunc(price * 10 ** 8);

  // Use our private key to sign
  const unixTimestamp = Math.trunc(Date.now() / 1000);
  const signature = client.signFields(
    [BigInt(priceWithDecimals), BigInt(unixTimestamp)],
    privateKey
  );

  return {
    data: { price: priceWithDecimals, time: unixTimestamp },
    signature: signature.signature,
    publicKey: signature.publicKey,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = new URLSearchParams(request.nextUrl.search);
  return NextResponse.json(
    await getSignedPriceData(searchParams.get("asset") || ""),
    { status: 200 }
  );
}
