import 'dotenv/config';
import hre from 'hardhat';

async function main() {
  const baseUrl = process.env.OSINT_API_BASE_URL ?? 'https://osint.proxy.url/';
  const defaultSelector = process.env.OSINT_API_SELECTOR ?? 'result';
  const feeRecipient = process.env.FEE_RECIPIENT;

  if (!feeRecipient) {
    throw new Error('FEE_RECIPIENT env var is required (address to receive the additional 1 ETH fee)');
  }

  console.log('Deploying FileRequestV2 to Somnia Testnet...\n');
  console.log(`Configuration:`);
  console.log(`  Base URL: ${baseUrl}`);
  console.log(`  Default Selector: ${defaultSelector}`);
  console.log(`  Fee Recipient: ${feeRecipient}`);
  console.log(`  Additional Fee: 0.5 ETH (changeable by owner)\n`);

  const fileRequest = await hre.viem.deployContract('FileRequestV2', [baseUrl, defaultSelector, feeRecipient]);

  console.log(`✅ FileRequestV2 deployed at: ${fileRequest.address}`);
  console.log('\nNext steps:');
  console.log('  1. Copy the contract address above');
  console.log('  2. Update CONTRACT_ADDRESS in scripts/invoke.ts');
  console.log('  3. Run: npm run invoke:file-request');
  console.log('  4. Check the result on the explorer:');
  console.log(`     https://shannon-explorer.somnia.network/address/${fileRequest.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
