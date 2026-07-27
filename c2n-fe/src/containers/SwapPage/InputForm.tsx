import { useSwap } from "@src/hooks/useSwap";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { InputNumber, Row, Col, Select } from "antd";
import styles from './SwapPage.module.scss';

import {
    BigNumber,
    Contract,
    ethers,
} from "ethers";
import {
    tokenAbi,
} from '@src/config'
import TransactionButton from "@src/components/elements/TransactionButton";
import { formatUnits } from "@src/util/index";
import { useWallet } from '@src/hooks/useWallet'
import { useMessage } from '@src/hooks/useMessage'
import { useResponsive } from '@src/hooks/useResponsive';
import { IconSwitch } from '@src/components/icons'
import AppPopover from "@src/components/elements/AppPopover";
import BasicButton from "@src/components/elements/Button.Basic";
import { useRouter } from "next/router";

export function InputForm({ tokenUnits, available }) {

    const {
        walletAddress,
        chain,
    } = useWallet();

    const {
        setSuccessMessage,
        setErrorMessage,
    } = useMessage()

    const {
        isDesktopOrLaptop,
    } = useResponsive();

    const {
        getAmountsOut,
        signer,
        routerContract,
        token1Address,
        token2Address,
        setToken1Address,
        setToken2Address,
        pair,
        approveToRouter } = useSwap();
    const [fromNum, setFromNum] = useState<number>();
    const [toNum, setToNum] = useState<number>();
    const waiting = useRef(false);
    const [fromUnitValue, setFromUnitValue] = useState<string>(tokenUnits[0].value);
    const [toUnit, setToUnit] = useState<string>(tokenUnits[1].value);
    const [exchangeStatus, setExchangeStatus] = useState(0);
    const [balance, setBalance] = useState(null);
    const [toBalance, setToBalance] = useState(null);
    const [decimals, setDecimals] = useState(18);
    const router = useRouter();
    const quoteTimer = useRef<any>();

    const fromUnit = useMemo(() => {
        return tokenUnits.find(v => v.value === fromUnitValue);
    }, [fromUnitValue]);

    useEffect(() => {
        if (token1Address && token2Address && fromNum && pair) {
            clearTimeout(quoteTimer.current);
            quoteTimer.current = (setInterval(() => {
                updateAmountsOut();
                getBalance();
            }, 1000))
        }
        return () => clearInterval(quoteTimer.current)
    }, [fromNum, pair,token1Address,token2Address])

    /**
     * 更新余额
     */
    useEffect(() => {
        if (!signer) return;
        getBalance();
    }, [fromUnit.contractAddress, signer])

    /**
     * 更新token2的名字
     */
    useEffect(() => {
        if (fromUnitValue == toUnit) {
            let toUnitIndex = tokenUnits.findIndex(v => v.value === toUnit);
            setToUnit(toUnitIndex + 1 >= tokenUnits.length ? tokenUnits[0].value : tokenUnits[toUnitIndex + 1].value);
        }
    }, [fromUnitValue, toUnit])



    /**
     * 更新token1的地址
     */
    useEffect(() => {
        const tokenInfo = tokenUnits.find(v => v.value === fromUnitValue);
        if (tokenInfo.contractAddress && tokenInfo?.chainId === chain?.chainId) {
            setToken1Address(tokenInfo.contractAddress);
        } else {
            setToken1Address('');
        }
    }, [fromUnitValue, chain])


    /**
     * 更新token2的地址
     */
    useEffect(() => {
        const tokenInfo = tokenUnits.find(v => v.value === toUnit);
        if (tokenInfo.contractAddress && tokenInfo?.chainId == chain?.chainId) {
            setToken2Address(tokenInfo.contractAddress);
        } else {
            setToken2Address('');
        }
    }, [toUnit, chain])

    useEffect(() => {
        const tokenInfo = tokenUnits.find(v => v.chainId == chain?.chainId);
        if (tokenInfo) {
            setFromUnitValue(tokenInfo.value);
        }
    }, [chain])

    function getBalance() {
        const contractAddress = fromUnit.contractAddress;
        if (contractAddress) {
            const tokenContract = new Contract(contractAddress, tokenAbi, signer);
            tokenContract.balanceOf(walletAddress)
                .then((result: BigNumber) => {
                    setBalance(result);
                });

            tokenContract.decimals()
                .then((result: number) => {
                    setDecimals(result);
                });
            const toContractAddress = tokenUnits.find(v => v.value === toUnit).contractAddress;
            if (toContractAddress) {
                const toContract = new Contract(toContractAddress, tokenAbi, signer);
                toContract.balanceOf(walletAddress)
                    .then((result: BigNumber) => {
                        setToBalance(result);
                    })
            }
        } else {
            // 原生代币，要部署WETH，先屏蔽
            // if(signer){
            //   signer.getBalance().then((result: BigNumber) => {
            //     setBalance(result);
            //     setDecimals(18);
            //   });
            // }
        }
    }

    const handleFromUnitChange = function (value) {
        if (value == toUnit) {
            setToUnit(fromUnitValue);
        }
        setFromUnitValue(value);
    }

    const handleToUnitChange = function (value) {
        if (value == fromUnitValue) {
            setFromUnitValue(toUnit);
        }
        setToUnit(value);
    }

    function updateAmountsOut() {
        if (Number(Number(fromNum).toFixed(8)) === 0 || !fromNum) {
            return;
        }
        // quoteSwapAmount({ token1Address: fromUnitValue, token2Address: toUnit, tokenInAmount: fromNum })
        getAmountsOut({
            token1Address,
            token2Address, tokenInAmount: fromNum
        })
            .then(data => {
                const amount = Number(Number(data.token2Amount).toFixed(8));
                setToNum(amount);
            })
    }

    const onSwapButtonClick = useCallback(async () => {
        if (!fromNum) {
            setErrorMessage(`Please input exchange token number`);
            return;
        }
        if (toNum === 0) {
            setErrorMessage('流动性不足');
            return;
        }
        const amountIn = ethers.utils.parseUnits(fromNum.toString(), decimals);
        await approveToRouter(token1Address,amountIn);
        setExchangeStatus(2);
        // swap调用
        routerContract.swapExactTokensForTokens(
            amountIn,
            0,
            [token1Address, token2Address],
            walletAddress,
            Math.floor(Date.now() / 1000) + 60 * 10 // 设置超时时间
        ).then(() => {
            setExchangeStatus(0);
            setSuccessMessage('Exchange success');
        }).catch((err) => {
            setExchangeStatus(0);
            console.log(err)
            setErrorMessage('Exchange failed');
        }).finally(updateAmountsOut);
    }, [fromNum, toNum, token1Address, token2Address])

    const debouncedOnSwapButtonClick = () => {
        if (!pair) {
            router.push('/liquidity');
            return;
        }

        if (waiting.current) {
        } else {
            onSwapButtonClick();
            waiting.current = true;
            setTimeout(() => waiting.current = false, 2000);
        }
    };

    function onSwitchButtonClick() {
        setFromUnitValue(toUnit);
        setToUnit(fromUnitValue);
        setToken1Address(token2Address);
        setToken2Address(token1Address);
    }

    return (<div>
        <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
            <Col span={isDesktopOrLaptop ? 8 : 24}>
                <Row justify="space-between">
                    <div className="balance">Balance: {formatUnits(balance, 4, decimals)?.toFixed(8)} {fromUnit.label}</div>
                </Row>
                <Row justify="space-between">
                    <div className="balance">Balance: {formatUnits(toBalance, 4, decimals)?.toFixed(8)} {toUnit}</div>
                </Row>
            </Col>
        </Row>
        <Row gutter={[16, 16]}>
            <Col span={isDesktopOrLaptop ? 8 : 24}>
                <Row justify="start" wrap={false}>
                    <span className={styles['input-label']}>Sell:</span>
                    <div className={styles['input']}>
                        <InputNumber
                            className={styles['number']}
                            value={fromNum}
                            max={formatUnits(balance, 4, decimals)}
                            step="0.0001"
                            onChange={value => setFromNum(value)}
                            stringMode
                            controls={false}
                            bordered={false}
                        />
                        <Select
                            bordered={false}
                            className={styles['unit']}
                            value={fromUnitValue}
                            options={tokenUnits}
                            onChange={handleFromUnitChange}
                        />
                    </div>
                </Row>
            </Col>
            {
                isDesktopOrLaptop ?
                    <></>
                    : (
                        <Col span={isDesktopOrLaptop ? 2 : 24} style={{ textAlign: 'right' }}>
                            <BasicButton
                                className={['button', styles['switch-button']].join(' ')}
                                style={{ width: '69px', verticalAlign: 'top', lineHeight: '60px' }}
                                onClick={onSwitchButtonClick}
                            >
                                <IconSwitch style={{ transform: 'rotate(90deg)' }}></IconSwitch>
                            </BasicButton>
                        </Col>
                    )
            }
            <Col span={isDesktopOrLaptop ? 8 : 24}>
                <Row justify="start" wrap={false}>
                    <span className={styles['input-label']}>Buy:</span>
                    <div className={styles['input']}>
                        <InputNumber
                            className={styles['number']}
                            value={toNum}
                            step="0.0001"
                            stringMode
                            controls={false}
                            bordered={false}
                            disabled
                        />
                        <Select
                            bordered={false}
                            className={styles['unit']}
                            value={toUnit}
                            options={tokenUnits}
                            onChange={handleToUnitChange}
                        />
                    </div>
                </Row>
            </Col>
            {
                isDesktopOrLaptop ?
                    (
                        <Col span={isDesktopOrLaptop ? 2 : 24}>
                            <BasicButton
                                className={['button', styles['switch-button']].join(' ')}
                                style={{ width: '69px', verticalAlign: 'top', lineHeight: '60px' }}
                                onClick={onSwitchButtonClick}
                            >
                                <IconSwitch />
                            </BasicButton>
                        </Col>
                    ) : <></>
            }
            <Col span={isDesktopOrLaptop ? 6 : 24}>
                {
                    available ?
                        (
                            <TransactionButton
                                className="button"
                                onClick={debouncedOnSwapButtonClick}
                                noConnectText={'Connect wallet to exchange'}
                                style={{ width: '100%' }}
                                loading={![0, 1].includes(exchangeStatus)}
                                loadingText={exchangeStatus == 2 ? 'Waiting Tx...' : 'Please wait...'}
                                requiredChainId={chain?.chainId}
                                switchNetworkText={'Switch Network to Exchange'}
                            >
                                {pair ? 'Swap' : 'Add Liquidity'}
                            </TransactionButton>)
                        : (
                            null
                        )
                }
            </Col>
        </Row>
    </div>)
}