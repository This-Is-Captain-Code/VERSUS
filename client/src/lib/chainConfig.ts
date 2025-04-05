// Configuration for the pSAGA Chainlet network
export const PSAGA_CHAINLET_CONFIG = {
  chainId: 'oracle_2743084370893000-1',
  chainName: 'pSAGA Chainlet',
  rpcEndpoint: 'https://oracle-2743084370893000-1.jsonrpc.sagarpc.io',
  restEndpoint: 'https://oracle-2743084370893000-1.jsonrpc.sagarpc.io',
  stakeCurrency: {
    coinDenom: 'pSAGA',
    coinMinimalDenom: 'upsaga',
    coinDecimals: 6,
  },
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: 'saga',
    bech32PrefixAccPub: 'sagapub',
    bech32PrefixValAddr: 'sagavaloper',
    bech32PrefixValPub: 'sagavaloperpub',
    bech32PrefixConsAddr: 'sagavalcons',
    bech32PrefixConsPub: 'sagavalconspub',
  },
  currencies: [
    {
      coinDenom: 'pSAGA',
      coinMinimalDenom: 'upsaga',
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'pSAGA',
      coinMinimalDenom: 'upsaga',
      coinDecimals: 6,
    },
  ],
  gasPriceStep: {
    low: 0.01,
    average: 0.025,
    high: 0.04,
  },
  features: ["ibc-transfer", "ibc-go"],
  explorerUrl: 'https://oracle-2743084370893000-1.sagaexplorer.io'
};

// For ethers.js, we need to format the chain ID as a hex string
export const getFormattedChainId = () => {
  try {
    // Since the chainId is not a standard hex format, we'll create a custom identifier
    // This is a simplified approach - in a production app you'd need proper chain ID handling
    // based on specific requirements of the pSAGA network
    return `0x${Number(42).toString(16)}`;
  } catch (error) {
    console.error("Error formatting chain ID:", error);
    return null;
  }
};
