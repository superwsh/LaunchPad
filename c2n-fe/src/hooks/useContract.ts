import { useAppSelector } from "@src/redux/hooks";
import { Contract } from "ethers";
import AirdropAbi from '@src/util/abi/Airdrop.json'
import { airdropContract, factoryAbi, routerAbi, swapAddresses } from "@src/config";
import { useMemo } from "react";

export const useAirdropContract = () => {
  const chain = useAppSelector(state => state.wallet.chain);
  const signer = useAppSelector(state => state.contract.signer);
  const walletAddress = useAppSelector(state => state.contract.walletAddress);

  // server side
  if (!signer || !walletAddress) {
    console.log('no signer');
  }

  // client side
  const airdropAddress = airdropContract.find(item => item.chainId == chain?.chainId)?.address || airdropContract[0].address;
  const contract = new Contract(airdropAddress, AirdropAbi.abi, signer);
  return contract
}

export const useRouterContract = () => {
  const chain = useAppSelector(state => state.wallet.chain);
  const signer = useAppSelector(state => state.contract.signer);
  const walletAddress = useAppSelector(state => state.contract.walletAddress);

  // server side
  if (!signer || !walletAddress) {
    console.log('no signer');
  }

  const routerAddress = swapAddresses.find(item => item.chainId === chain?.chainId)?.routerAddress;
  // client side
  const contract = useMemo(() => {
    if (!routerAddress || !signer) return null;
    return new Contract(routerAddress, routerAbi, signer)
  }, [signer, routerAddress]);
  return contract
}

export const useFactoryContract = () => {
  const chain = useAppSelector(state => state.wallet.chain);
  const signer = useAppSelector(state => state.contract.signer);
  const walletAddress = useAppSelector(state => state.contract.walletAddress);

  // server side
  if (!signer || !walletAddress) {
    console.log('no signer');
  }

  const factoryAddress = swapAddresses.find(item => item.chainId === chain?.chainId)?.factoryAddress;

  // client side
  const contract = useMemo(() => {
    if (!factoryAddress || !signer) return null;
    return new Contract(factoryAddress, factoryAbi, signer)
  }, [factoryAddress, signer]);
  return contract
}