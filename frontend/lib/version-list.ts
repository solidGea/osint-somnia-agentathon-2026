export interface VersionInfo {
  version: string;
  date: string;
  summary: string;
  highlights: string[];
  status?: string;
}

export const versionList: VersionInfo[] = [
  {
    version: '1.1.0',
    date: '2026-05-28',
    summary: 'New API key flow, retry support, and UI version carousel.',
    highlights: [
      'Backend now issues reversible API keys with up to 3 validator retries.',
      'Frontend fetches the server API key before submitting `requestData`.',
      'Added privServer proxy route for secure API key lookup.',
      'Version tab now displays release notes as a carousel.',
    ],
    status: 'Improved',
  },
  {
    version: '1.0.0',
    date: '2026-05-24',
    summary: 'Initial Somnia lookup flow with receipts and retrieval links.',
    highlights: [
      'Submit lookups on-chain and save receipt metadata locally.',
      'Generate signed retrieval links for private response access.',
      'Support for Somnia testnet and receipt / data tab workflows.',
    ],
    status: 'Launch',
  },
];
