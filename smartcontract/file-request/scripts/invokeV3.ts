import hre from 'hardhat';

// ⚠️ Replace with your deployed FileRequest contract address
//const CONTRACT_ADDRESS = '0xcb1ae432706fd13843708fc2a3da4408635dd76a' as `0x${string}`; //v1
const CONTRACT_ADDRESS = '0xaddressthatreceivedfromdeployment' as `0x${string}`; //v2

const TARGET = process.env.TARGET || 'random person';
const QUERY_TYPE = 'lookup-personel';
const OSINT_SERVICE_URL = process.env.OSINT_API_BASE_URL_V3_KEY || 'http://localhost:3001';

const POLL_INTERVAL = 2000;
const TIMEOUT = 120_000;

async function main() {
  console.log('=== File Request — Invoking Mock Personel Lookup ===\n');

  // const fileRequest = await hre.viem.getContractAt('FileRequest', CONTRACT_ADDRESS); //v1
  const fileRequest = await hre.viem.getContractAt('FileRequestV3', CONTRACT_ADDRESS);
  const publicClient = await hre.viem.getPublicClient();

  console.log(`Network: ${hre.network.name}`);
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Query type: ${QUERY_TYPE}`);
  console.log(`Target: ${TARGET}`);
  console.log(`OSINT service: ${OSINT_SERVICE_URL}`);

  const encodedTarget = encodeURIComponent(TARGET);
  console.log(`Encoded target: ${encodedTarget}`);

  const [signer] = await hre.ethers.getSigners();
  const address = await signer.getAddress();
  console.log(`Requesting one-time API key for address: ${address}`);

  const apiKeyResponse = await fetch(`${OSINT_SERVICE_URL}/getApiKey`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });

  const apiKeyPayload = await apiKeyResponse.json();
  if (!apiKeyResponse.ok || !apiKeyPayload.success || !apiKeyPayload.apiKey) {
    throw new Error(`Failed to fetch API key: ${apiKeyPayload.error || apiKeyResponse.statusText}`);
  }

  const apiKey = apiKeyPayload.apiKey;
  console.log(`Received API key: ${apiKey}`);

  const deposit = await fileRequest.read.getRequiredDeposit();
  console.log(`Required deposit: ${(Number(deposit) / 1e18).toFixed(2)} STT`);

  console.log(`\n📡 Sending file request for ${QUERY_TYPE} to the OSINT service...`);
  const hash = await fileRequest.write.requestData([QUERY_TYPE, encodedTarget, apiKey], { value: deposit });
  console.log(`Transaction hash: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  const fromBlock = receipt.blockNumber;

  let requestId: bigint | undefined;
  try {
    const requestedEvents = await fileRequest.getEvents.RequestCreated(
      {},
      { fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber }
    );
    const requestedEvent = requestedEvents.find((e) => e.transactionHash === hash) ?? requestedEvents[0];
    requestId = requestedEvent?.args.requestId;
  } catch {
    // Best effort: event querying can fail on some RPCs.
  }

  if (requestId !== undefined) {
    console.log(`Request / subscription id: ${requestId}`);
    console.log('You can later fetch the response from the off-chain service using this request ID.');
  }

  console.log('\nWaiting for response processing off-chain...');
  console.log('The server will save the result file and validate it with the on-chain hash.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
