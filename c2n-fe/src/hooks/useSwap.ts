import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppSelector } from "@src/redux/hooks";
import {
  Contract,
  ethers,
} from 'ethers'
import {
  tokenAbi,
  pairAbi
} from '@src/config'
import { formatUnits } from '@src/util';
import { useMessage } from './useMessage';
import { useFactoryContract, useRouterContract } from './useContract';

export const useSwap = ({ noPairAlert } = { noPairAlert: true }) => {
  const signer = useAppSelector(state => state.contract.signer);
  const chain = useAppSelector(state => state.wallet.chain);
  const [token1Address, setToken1Address] = useState<string>('');
  const [token2Address, setToken2Address] = useState<string>('');
  const [pairsAddress, setPairsAddress] = useState<string[]>([]);
  const [pairsContract, setPairsContract] = useState<any[]>([]);
  const [pair, setPair] = useState(null);
  const {
    setErrorMessage,
  } = useMessage()

  const routerContract = useRouterContract();

  const factoryContract = useFactoryContract();

  /**
   * 获取报价信息【本地开发固定】
   * 通过getAmountsOut能够获取到实际能够兑换的数量
   * @param param0 
   * @returns 
   */
  async function getAmountsOut({ token1Address, token2Address, tokenInAmount }): Promise<any> {
    return new Promise(async (resolve) => {
      const quoteAmount = ethers.utils.parseUnits(tokenInAmount, 18)
      const quoteResult = await routerContract.getAmountsOut(quoteAmount, [token1Address, token2Address]);
      resolve({
        token1Amount: ethers.utils.formatUnits(quoteResult[0].toString(), 18),
        token2Amount: ethers.utils.formatUnits(quoteResult[1].toString(), 18)
      });
    })
  }

  useEffect(() => {
    if (!factoryContract || !token1Address || !token2Address) return;
    factoryContract.getPair(token1Address, token2Address)
      .then(data => {
        if (data) {
          if (formatUnits(data) !== 0) {
            setPair(data);
          } else {
            noPairAlert && setErrorMessage('没有找到交易对');
          }
        }
      })
  }, [token1Address, token2Address, factoryContract, chain])

  async function getAllPairs() {
    if (!factoryContract) return;
    const length = await factoryContract.allPairsLength();
    let pairs = [];
    for (let i = 0; i < length.toNumber(); i++) {
      const pair = await factoryContract.allPairs(i);
      pairs.push(pair);
    }
    setPairsAddress(pairs);
  }

  useEffect(() => {
    getAllPairs();
  }, [factoryContract]);

  useEffect(() => {
    if (!signer || !pairsAddress.length) return;
    const pairs = pairsAddress.map(pair => {
      return new Contract(pair, pairAbi, signer);
    })
    setPairsContract(pairs);
  }, [pairsAddress, chain])

  const getPairContract = useCallback((pairAddress: string) => {
    if (!signer || !pairAddress) return null;
    return new Contract(pairAddress, pairAbi, signer);
  }, [signer, chain])

  const getTokenContract = useCallback((tokenAddress: string) => {
    if (!signer || !tokenAddress) return null;
    return new Contract(tokenAddress, tokenAbi, signer);
  }, [signer, chain])

  const approveToRouter = async (tokenAddr, amount) => {
    const tokenContract = getTokenContract(tokenAddr);
    const approve = await tokenContract.approve(routerContract.address, amount);
    return approve;
}


  return {
    signer,
    getAmountsOut,
    setToken1Address,
    setToken2Address,
    token1Address,
    token2Address,
    routerContract,
    pairsContract,
    pairsAddress,
    getPairContract,
    getTokenContract,
    pair,
    getAllPairs,
    approveToRouter
  }
}