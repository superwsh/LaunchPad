import contractAddresses from '../../../c2n-contracts/deployments/contract-addresses.json';
export default {
    "31337": [
        // { label: "ETH", value: "ETH", contractAddress: null, chainId: 31337 },
        {
            label: "C2N", value: "C2N", contractAddress: contractAddresses['local']['C2N-TOKEN'], chainId: 31337
        },
        {
            label: "MCK", value: "MCK", contractAddress: contractAddresses['local']['MOCK-TOKEN'], chainId: 31337
        }
    ]
}
// dex暂时只支持local 31337链
export const dex_valid_chain_ids = [31337]