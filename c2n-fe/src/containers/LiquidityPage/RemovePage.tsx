import { Row, Col, Radio, Slider } from "antd";
import styles from './SwapPage.module.scss'
import { useEffect, useState } from "react";
import { useWallet } from "@src/hooks/useWallet";
import TransactionButton from "@src/components/elements/TransactionButton";
import { usePair } from "@src/hooks/usePair";
import { formatUnits } from "@src/util";
import { useSwap } from "@src/hooks/useSwap";
import { useMessage } from "@src/hooks/useMessage";
import { ethers } from "ethers";

const P = {
    'a': 25,
    'b': 50,
    'c': 75,
    'd': 100
}

export default function RemovePage({ pair }) {
    const [percent, setPercent] = useState(0)
    const { chain, walletAddress } = useWallet()
    const [removeAmount, setRemoveAmount] = useState(ethers.BigNumber.from(0))
    const [radio, setRadio] = useState('')

    const {
        setSuccessMessage,
        setErrorMessage,
    } = useMessage()

    const { routerContract } = useSwap();
    const { userToken1Reserve, userToken2Reserve, token1Symbol, token2Symbol, LPbalance,
        token1Addr, token2Addr, approveToRouter, name
    } = usePair(pair);

    const removeLiquidity = async () => {
        const amount = removeAmount;
        try {
            const tx0 = await approveToRouter(pair, amount);
            await tx0.wait();
            const tx = await routerContract.removeLiquidity(
                token1Addr,
                token2Addr,
                amount,
                0, // 控制滑点
                0, // 控制滑点
                walletAddress,
                Math.floor(Date.now() / 1000) + 60 * 10 // 设置超时时间
            )
            await tx.wait();
            setSuccessMessage('Remove liquidity success');
        } catch (e) {
            console.error(e)
            setErrorMessage('Remove liquidity failed');
        }
    }
    useEffect(() => {
        if (!LPbalance) return
        const liquidity = ethers.utils.parseUnits(LPbalance, 0);
        if (percent === 100) {
            setRemoveAmount(liquidity)
        } else {
            setRemoveAmount(liquidity.mul(percent).div(100))
        }
    }, [percent, LPbalance])

    useEffect(() => {
        switch (percent) {
            case 25:
                setRadio('a')
                break;
            case 50:
                setRadio('b')
                break;
            case 75:
                setRadio('c')
                break;
            case 100:
                setRadio('d')
                break;
            default:
                setRadio('')
                break;
        }
    }, [percent])

    return <div>
        <h2 className={styles['title']}>
            <Row>
                <Col>
                    <span>Remove Liquidity</span>
                </Col>
            </Row>
        </h2>
        <Row justify={'center'}>
            <Col>
                <span>{percent}%</span>
            </Col>
        </Row>
        <div>
            <Slider
                min={0}
                max={100}
                onChange={(value) => setPercent(value)}
                value={percent}
            />
        </div>

        <Row justify='center' style={{ marginBottom: '20px' }}>
            <Radio.Group
                buttonStyle="solid"
                onChange={(e) => setPercent(P[e.target.value])}
                value={radio}
            >
                <Radio.Button value="a">25%</Radio.Button>
                <Radio.Button value="b">50%</Radio.Button>
                <Radio.Button value="c">75%</Radio.Button>
                <Radio.Button value="d">最大</Radio.Button>
            </Radio.Group>
        </Row>
        <div style={{ marginBottom: '10px' }}>
            <div className="balance">LP Balance: {formatUnits(LPbalance, 8)?.toFixed(8)}</div>
        </div>
        <div style={{ marginBottom: '10px' }}>
            <div className="balance">已存入{token1Symbol}: {formatUnits(userToken1Reserve, 8)?.toFixed(8)}</div>

            <div className="balance">已存入{token2Symbol}: {formatUnits(userToken2Reserve, 8)?.toFixed(8)}</div>
        </div>
        <div style={{ marginBottom: '20px' }}>
            <div className="balance">Remove LP: {formatUnits(removeAmount, 8)?.toFixed(8)} {name}</div>
        </div>
        <TransactionButton
            className="button"
            onClick={removeLiquidity}
            noConnectText={'Connect wallet to exchange'}
            style={{ width: '100%' }}
            requiredChainId={chain?.chainId}
            switchNetworkText={'Switch Network to Exchange'}
        >
            Remove Liquidity
        </TransactionButton>
    </div>
}