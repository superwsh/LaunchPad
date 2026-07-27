import { useEffect, useRef, useState } from "react";
import { useWallet } from "./useWallet";
import { useSwap } from "./useSwap";
import { useMessage } from "./useMessage";

export const usePair = (pair: string) => {
    const [LPbalance, setLPBalance] = useState(null);
    const [token1Addr, setToken1Addr] = useState('');
    const [token2Addr, setToken2Addr] = useState('');
    const [token1Symbol, setToken1Symbol] = useState('');
    const [token2Symbol, setToken2Symbol] = useState('');
    const [token1Balance, setToken1Balance] = useState(null);
    const [token2Balance, setToken2Balance] = useState(null);
    const [userToken1Reserve, setUserToken1Reserve] = useState(null);
    const [userToken2Reserve, setUserToken2Reserve] = useState(null);
    const updateStatusInternalTimer = useRef(null);
    const { getPairContract, getTokenContract, routerContract } = useSwap();
    const {
        setErrorMessage,
    } = useMessage()

    /**
     * 定时器更新状态
     */
    useEffect(() => {
        if (pair) {
            updateStatus();
            updateStatusInternalTimer.current = setInterval(() => {
                updateStatus();
            }, 2000);
        }
        return () => {
            clearInterval(updateStatusInternalTimer.current);
        }
    }, [pair]);

    const { walletAddress } = useWallet();
    const updateStatus = () => {
        updateBalance();
        updateLPBalance(pair);
        updateReserves(pair);
    }

    async function updateTokenAddr() {
        if (!pair) return;
        const pairContract = getPairContract(pair);
        if (pairContract) {
            const token0 = await pairContract.token0();
            const token1 = await pairContract.token1();
            setToken1Addr(token0);
            setToken2Addr(token1);
        }
    }

    useEffect(() => {
        if (!pair) return;
        updateLPBalance(pair);
        updateTokenAddr();
    }, [pair, walletAddress]);

    const updateReserves = async (pair) => {
        const pairContract = getPairContract(pair);
        const reserves = await pairContract.getReserves();
        const reserve0 = reserves[0];
        const reserve1 = reserves[1];
        const liquidity = await pairContract.balanceOf(walletAddress);
        const totalSupply = await pairContract.totalSupply();
        const userToken1Reserve = reserve0 * liquidity / totalSupply;
        const userToken2Reserve = reserve1 * liquidity / totalSupply;
        setUserToken1Reserve(userToken1Reserve);
        setUserToken2Reserve(userToken2Reserve);
    }

    const updateBalance = async () => {
        const token1Contract = getTokenContract(token1Addr);
        const token2Contract = getTokenContract(token2Addr);
        if (token1Contract && token2Contract) {
            const balance1 = await token1Contract.balanceOf(walletAddress);
            const balance2 = await token2Contract.balanceOf(walletAddress);
            setToken1Balance(balance1.toString());
            setToken2Balance(balance2.toString());
        }
    }
    const updateLPBalance = async (pair) => {
        const pairContract = getPairContract(pair);
        if (pairContract) {
            const balance = await pairContract.balanceOf(walletAddress);
            setLPBalance(balance.toString());
        }
    }

    /**
     * 计算用户代币对的存入量
     */
    useEffect(() => {
        if (!pair || !walletAddress) return;
        updateReserves(pair);
    }, [pair, walletAddress]);

    useEffect(() => {
        const token1Contract = getTokenContract(token1Addr);
        const token2Contract = getTokenContract(token2Addr);
        const setSymbol = async () => {
            if (token1Contract && token2Contract) {
                const symbol1 = await token1Contract.symbol();
                const symbol2 = await token2Contract.symbol();
                setToken1Symbol(symbol1);
                setToken2Symbol(symbol2);
            }
        }
        setSymbol();
        updateBalance();
    }, [token1Addr, token2Addr, LPbalance, walletAddress, routerContract]);

    const name = `${token1Symbol}/${token2Symbol}`;

    const quote = async (pair, amountA) => {
        const pairContract = getPairContract(pair);
        const reserves = await pairContract.getReserves();
        const reserve0 = reserves[0];
        const reserve1 = reserves[1];
        if (reserve0 === 0 || reserve1 === 0) {
            setErrorMessage('Insufficient liquidity');
            return 0;
        };
        const amountB = reserve1 * amountA / reserve0;
        return amountB;
    }

    const approveToRouter = async (tokenAddr, amount) => {
        const tokenContract = getTokenContract(tokenAddr);
        const approve = await tokenContract.approve(routerContract.address, amount);
        return approve;
    }

    return {
        LPbalance,
        token1Addr,
        token2Addr,
        token1Symbol,
        token2Symbol,
        token1Balance,
        token2Balance,
        userToken1Reserve,
        userToken2Reserve,
        name,
        quote,
        approveToRouter
    }
}