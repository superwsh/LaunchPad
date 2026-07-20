import contractAddresses from '../../../c2n-contracts/deployments/contract-addresses.json';

// staking address
export const stakingPoolAddresses = [
    {
        chainId: 11155111,
        stakingAddress: contractAddresses['sepolia']['AllocationStakingProxy'],
        depositTokenAddress: contractAddresses['sepolia']['C2N-TOKEN'], // 填C2N-Token的地址
        earnedTokenAddress: contractAddresses['sepolia']['C2N-TOKEN'], // 填C2N-Token的地址
    },
    {
        chainId: 31337,
        stakingAddress: contractAddresses['local']['AllocationStakingProxy'], // 填AllocationStakingProxy的地址
        // TODO
        depositTokenAddress: contractAddresses['local']['C2N-TOKEN'], // 填C2N-Token的地址
        earnedTokenAddress: contractAddresses['local']['C2N-TOKEN'], // 填C2N-Token的地址
    },
];

export const API_DOMAIN = process.env.NEXT_PUBLIC_SERVER_DOMAIN;

export const VALID_CHAIN_IDS = [
    // Boba Network
    288,
    // Boba Rinkeby test
    28,
    // bsc main network
    56,
    // bsc test network
    97,
    31337,
];

export * from "./valid_chains";

// 0: bre pool 1: boba pool
export const STAKING_POOL_ID = 0;

export const APPROVE_STAKING_AMOUNT_ETHER = 1000000;

export const TELEGRAM_BOT_ID = process.env.NEXT_PUBLIC_TG_BOT_ID;

export const BASE_URL = "https://pancakeswap.finance";
export const BASE_BSC_SCAN_URL = "https://bscscan.com";

export const tokenAbi = [
    // Read-Only Functions
    "function deposited(uint256 pid, address to) view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function userInfo(uint pid, address spender) view returns (uint256)",
    "function poolInfo(uint pid) view returns (uint256)",

    // Authenticated Functions
    "function deposit(uint256 pid, uint256 amount) returns (bool)",
    "function withdraw(uint256 pid, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint amount) returns (bool)",

    // Events
];

export const tokenImage =
    "http://bobabrewery.oss-ap-southeast-1.aliyuncs.com/brewery_logo.jpg";

export const tokenSymbols = [
    { chainId: 11155111, symbol: 'C2N', address: contractAddresses['sepolia']['C2N-TOKEN'] },
    { chainId: 31337, symbol: 'C2N', address: contractAddresses['local']['C2N-TOKEN'] },
]

export const tokenInfos = [
    { chainId: 11155111, symbol: 'C2N', address: contractAddresses['sepolia']['C2N-TOKEN'] },
    { chainId: 31337, symbol: 'C2N', address: contractAddresses['local']['C2N-TOKEN'] },
]

export const airdropContract = [{
    chainId: 11155111,
    address: contractAddresses['sepolia']['Airdrop-C2N'],
}, {
    chainId: 31337,
    address: contractAddresses['local']['Airdrop-C2N'],
}] // AIRDROP_TOKEN的地址：Airdrop-C2N
