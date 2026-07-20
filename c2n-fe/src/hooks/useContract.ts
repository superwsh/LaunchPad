import { useAppSelector } from "@src/redux/hooks";
import { Contract } from "ethers";
import AirdropAbi from '@src/util/abi/Airdrop.json'
import { airdropContract } from "@src/config";

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
