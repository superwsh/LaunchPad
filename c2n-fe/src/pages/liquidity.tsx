import LiquidityPage from "@src/containers/LiquidityPage/LiquidityPage"
import { Modal, Row } from 'antd';
import { useState } from "react";
import styles from './liquidity.module.scss'
import { Button } from "@src/components/Button";
import { InitPage } from "@src/containers/LiquidityPage/InitPage";
import { useWallet } from "@src/hooks/useWallet";
import SwapConfig from "@src/config/swap";
import Mask from "@src/components/elements/Mask";
import {dex_valid_chain_ids} from '@src/config/swap'
import Pairs from "@src/containers/Pairs/Pairs";

export default function Liquidity() {
    const [open, setOpen] = useState(false)
    const [pair, setPair] = useState('');
    const { chain } = useWallet();

    if(!dex_valid_chain_ids.includes(chain?.chainId)){
        return <Mask />
    }

    return <main className={styles['container'] + " container"}>
        <Button
            style={{ marginBottom: '20px' }}
            onClick={() => {
                setPair('')
                setOpen(true)
            }}
            text='新建仓位'
        />
        <Row gutter={32}>
            <Pairs setPair={setPair} setOpen={setOpen}/>
            <Modal title='Liquidity' open={open} onCancel={() => setOpen(false)} footer={null}>
                {pair?<LiquidityPage pair={pair} />:<InitPage tokenUnits={SwapConfig[chain?.chainId]}/>}
            </Modal>
        </Row>
    </main>
}