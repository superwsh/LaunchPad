import Mask from "@src/components/elements/Mask"
import { dex_valid_chain_ids } from "@src/config/swap"
import SwapPage from "@src/containers/SwapPage/SwapPage"
import { useWallet } from "@src/hooks/useWallet"

export default function Swap() {
    const {chain } = useWallet()
    if(!dex_valid_chain_ids.includes(chain?.chainId)){
        return <Mask />
    }
    return <SwapPage available/>
}