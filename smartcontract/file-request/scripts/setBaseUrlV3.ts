import 'dotenv/config';
import hre from 'hardhat';

const CONTRACT_ADDRESS = (process.env.CONTRACT_ADDRESS ?? '0xaddressthatreceivedfromdeployment') as `0x${string}`;
const NEW_BASE_URL = process.env.OSINT_API_BASE_URL_V3?? 'https://osint.proxy.url/api';

async function main() {
  console.log('=== FileRequestV3 — setBaseUrl ===\n');
  console.log(`Contract : ${CONTRACT_ADDRESS}`);
  console.log(`New URL  : ${NEW_BASE_URL}\n`);

  const fileRequest = await hre.viem.getContractAt('FileRequestV3', CONTRACT_ADDRESS);

  const current = await fileRequest.read.baseUrl();
  console.log(`Current baseUrl : ${current}`);

  if (current === NEW_BASE_URL) {
    console.log('✅ baseUrl is already correct — nothing to do.');
    return;
  }

  const hash = await fileRequest.write.setBaseUrl([NEW_BASE_URL]);
  const publicClient = await hre.viem.getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash });

  const updated = await fileRequest.read.baseUrl();
  console.log(`✅ baseUrl updated to: ${updated}`);
  console.log(`   Tx: ${hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
