import { useSwap } from "@src/hooks/useSwap";
import { useEffect, useState, useRef, useCallback } from "react";
import { InputNumber, Row, Col } from "antd";

import {
  ethers,
} from "ethers";
// import tokenUnits from '@src/config/token_info'
import TransactionButton from "@src/components/elements/TransactionButton";
import { useWallet } from '@src/hooks/useWallet'
import { useMessage } from '@src/hooks/useMessage'

import styles from './SwapPage.module.scss';
import { usePair } from "@src/hooks/usePair";
import { formatUnits } from "@src/util";
export function AddPage({ pair }) {

  const {
    walletAddress,
    chain,
  } = useWallet();

  const {
    setSuccessMessage,
    setErrorMessage,
  } = useMessage()

  const { routerContract, } = useSwap();

  const { token1Addr, token2Addr, token1Symbol, token2Symbol,
    token1Balance, token2Balance, LPbalance, name, quote,
    userToken1Reserve, userToken2Reserve, approveToRouter } = usePair(pair);

  const [fromNum, setFromNum] = useState<number>();
  const [toNum, setToNum] = useState<number>();
  const waiting = useRef(false);
  const quoteTimer = useRef<any>();

  useEffect(() => {
    if (token1Addr && token2Addr && fromNum) {
      clearTimeout(quoteTimer.current);
      quoteTimer.current = (setTimeout(() => {
        updateQuoteAmount();
      }, 300))
    }
  }, [token2Addr, token1Addr, fromNum])


  function updateQuoteAmount() {
    if (Number(Number(fromNum).toFixed(8)) === 0 || !fromNum) {
      return;
    }
    quote(pair, fromNum).then(amountB => {
      const amount = Number(Number(amountB).toFixed(8));
      setToNum(amount);
    });
  }

  const onAddLiquidityButtonClick = useCallback(async () => {
    if (!fromNum || fromNum === 0) {
      setErrorMessage(`Please input exchange token number`);
      return;
    }
    const amountADesired = ethers.utils.parseUnits(fromNum.toString());
    const amountBDesired = ethers.utils.parseUnits(toNum.toString());
    /**
     * 用于控制滑点，这里设置为最多允许1%的滑点
     * 表示最多允许的因为滑点而产生的添加流动性的偏差是1% 添加值的最小值为指定添加的数量的99%
     */
    const amountAMin = amountADesired.mul(99).div(100); // 用于控制滑点，这里设置为最多允许1%的滑点
    const amountBMin = amountBDesired.mul(99).div(100);
    // 先approve
    const tx1 = await approveToRouter(token1Addr, amountADesired);
    const tx2 = await approveToRouter(token2Addr, amountBDesired);
    await Promise.all([tx1.wait(), tx2.wait()]);

    // swap调用
    routerContract.addLiquidity(
      token1Addr,
      token2Addr,
      amountADesired,
      amountBDesired,
      amountAMin,
      amountBMin,
      walletAddress,
      Math.floor(Date.now() / 1000) + 60 * 10 // 设置超时时间
    ).then((tx) => {
      setSuccessMessage('Exchange success');
      return tx.wait();
    }).catch((err) => {
      console.log(err)
      setErrorMessage('Exchange failed');
    }).finally(() => {
      setFromNum(0);
      setToNum(0);
    });

  }, [fromNum, toNum, token1Addr, token2Addr, routerContract])

  const debouncedOnAddLiquidityButtonClick = () => {
    if (waiting.current) {
    } else {
      onAddLiquidityButtonClick();
      waiting.current = true;
      setTimeout(() => waiting.current = false, 2000);
    }
  };

  return (<div>
    <h2 className={styles['title']}>
      <Row>
        <Col>
          <span>Add Liquidity</span>
        </Col>
      </Row>
    </h2>
    <div style={{ marginBottom: '20px' }}>
      <div className={styles['balance']}>LP Balance: {formatUnits(LPbalance, 8)?.toFixed(8)} {name}</div>

      <div className={styles['balance']}>Balance: {formatUnits(token1Balance, 8)?.toFixed(8)} {token1Symbol}</div>

      <div className={styles['balance']}>Balance: {formatUnits(token2Balance, 8)?.toFixed(8)} {token2Symbol}</div>

      <div className={styles['balance']}>已存入: {formatUnits(userToken1Reserve, 8)?.toFixed(8)} {token1Symbol}</div>

      <div className={styles['balance']}>已存入: {formatUnits(userToken2Reserve, 8)?.toFixed(8)} {token2Symbol}</div>
    </div>
    <Row gutter={[16, 16]}>
      <div className={styles['input']}>
        <InputNumber
          className={styles['number']}
          value={fromNum}
          max={formatUnits(token1Balance, 4)}

          min={0}
          step="0.0001"
          onChange={value => setFromNum(value)}
          stringMode
          controls={false}
          bordered={false}
        />
        <div
          className={styles['unit']}
        >
          {token1Symbol}
        </div>
      </div>

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
        <div
          className={styles['unit']}
        >{token2Symbol}</div>
      </div>
      <TransactionButton
        className="button"
        onClick={debouncedOnAddLiquidityButtonClick}
        noConnectText={'Connect wallet to add liquidity'}
        style={{ width: '100%' }}
        requiredChainId={chain?.chainId}
        switchNetworkText={'Switch Network to Add Liquidity'}
      >
        Add Liquidity
      </TransactionButton>
    </Row>
  </div>)
}