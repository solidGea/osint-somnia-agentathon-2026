import hre from 'hardhat';

// ⚠️ Replace with your deployed FileRequest contract address
const CONTRACT_ADDRESS = '0xaddressthatreceivedfromdeployment' as `0x${string}`; //v2

const TARGET = process.env.TARGET || 'random person';
const QUERY_TYPE = 'lookup-personel';

const POLL_INTERVAL = 2000;
const TIMEOUT = 120_000;

async function main() {
  console.log('=== File Request — Invoking Mock Personel Lookup ===\n');

  // const fileRequest = await hre.viem.getContractAt('FileRequest', CONTRACT_ADDRESS); //v1
  const fileRequest = await hre.viem.getContractAt('FileRequestV2', CONTRACT_ADDRESS);
  const publicClient = await hre.viem.getPublicClient();

  console.log(`Network: ${hre.network.name}`);
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Query type: ${QUERY_TYPE}`);
  console.log(`Target: ${TARGET}`);

  const encodedTarget = encodeURIComponent(TARGET);
  console.log(`Encoded target: ${encodedTarget}`);

  const deposit = await fileRequest.read.getRequiredDeposit();
  console.log(`Required deposit: ${(Number(deposit) / 1e18).toFixed(2)} STT`);

  console.log(`\n📡 Sending file request for ${QUERY_TYPE} to the OSINT service...`);
  const hash = await fileRequest.write.requestData([QUERY_TYPE, encodedTarget], { value: deposit });
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
    requestId = requestedEvent?.args.requesStId;
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
